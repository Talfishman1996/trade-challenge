import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { getScenario, DEFAULT_SCENARIO, scenarioChecksum } from '../fixtures/scenarios.js';
import { ledgerStats, makeRecord } from '../domain/ledger.js';

const STORAGE_KEY = 'tradevault:summit-prototype:v1';
const StoreContext = createContext(null);
const DEFAULT_SETTINGS = Object.freeze({ reducedMotion: false, largeText: false, dailyLossWarning: true, lossStreakReview: true, maxPlannedRiskAcknowledgement: 250_000 });

function copyFixture(fixture) {
  return JSON.parse(JSON.stringify(fixture));
}

function initialState() {
  const scenarioId = new URLSearchParams(window.location.search).get('scenario') || DEFAULT_SCENARIO;
  const fixture = copyFixture(getScenario(scenarioId));
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.scenarioId === fixture.id && stored?.schemaVersion === 1) return stored;
  } catch {
    // Recovery is represented in state rather than replacing the fixture with zeros.
  }
  return {
    schemaVersion: 1,
    scenarioId: fixture.id,
    fixtureChecksum: scenarioChecksum(fixture),
    records: fixture.trades,
    tombstones: [],
    network: fixture.network,
    syncMode: fixture.syncMode,
    conflictUid: fixture.conflictUid,
    malformed: fixture.malformed,
    settings: { ...DEFAULT_SETTINGS, reducedMotion: fixture.reducedMotion, largeText: fixture.largeText },
    sync: { phase: fixture.network === 'offline' ? 'offline' : 'idle', lastChecked: null, lastUploaded: null, lastMerged: null },
    receipt: null,
    lastReviewAt: null,
    lastReviewNote: null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'reset': {
      const fixture = copyFixture(getScenario(action.scenarioId));
      return {
        ...initialState(),
        scenarioId: fixture.id,
        fixtureChecksum: scenarioChecksum(fixture),
        records: fixture.trades,
        tombstones: [],
        network: fixture.network,
        syncMode: fixture.syncMode,
        conflictUid: fixture.conflictUid,
        malformed: fixture.malformed,
        settings: {
          ...initialState().settings,
          reducedMotion: fixture.reducedMotion,
          largeText: fixture.largeText,
        },
        sync: { phase: fixture.network === 'offline' ? 'offline' : 'idle', lastChecked: null, lastUploaded: null, lastMerged: null },
        receipt: { kind: 'info', title: `Loaded ${fixture.label}`, detail: 'Synthetic fixture reset deterministically.' },
      };
    }
    case 'create':
      return { ...state, records: [...state.records, action.record], receipt: action.receipt };
    case 'update':
      return {
        ...state,
        records: state.records.map((record) => record.uid === action.uid ? { ...record, ...action.patch, revision: record.revision + 1, syncState: 'queued' } : record),
        receipt: action.receipt,
      };
    case 'delete': {
      const record = state.records.find((item) => item.uid === action.uid);
      if (!record) return state;
      return {
        ...state,
        records: state.records.map((item) => item.uid === action.uid ? { ...item, deleted: true, revision: item.revision + 1, syncState: 'queued' } : item),
        tombstones: [...state.tombstones, { uid: action.uid, revision: record.revision + 1, expiresAt: action.expiresAt }],
        receipt: action.receipt,
      };
    }
    case 'restore':
      return {
        ...state,
        records: state.records.map((item) => item.uid === action.uid ? { ...item, deleted: false, revision: item.revision + 1, syncState: 'queued' } : item),
        tombstones: state.tombstones.filter((item) => item.uid !== action.uid),
        receipt: { kind: 'success', title: `Restored trade ${action.displayId}`, detail: 'Saved on this device. Waiting to sync.' },
      };
    case 'expire-undo':
      if (!state.receipt?.undo || state.receipt.uid !== action.uid) return state;
      return { ...state, receipt: { kind: 'info', title: 'Undo window ended', detail: 'Prototype recovery remains available in System.', uid: action.uid } };
    case 'sync-phase':
      return { ...state, sync: { ...state.sync, ...action.patch }, receipt: action.receipt ?? state.receipt };
    case 'sync-success':
      return {
        ...state,
        records: state.records.map((record) => record.syncState === 'queued' || record.syncState === 'failed' ? { ...record, syncState: 'verified' } : record),
        sync: { phase: 'idle', lastChecked: action.at, lastUploaded: action.hadChanges ? action.at : state.sync.lastUploaded, lastMerged: action.at },
        receipt: { kind: 'success', title: action.hadChanges ? 'Uploaded and verified' : 'Checked - no changes', detail: 'Open System for sync detail.' },
      };
    case 'sync-failed':
      return { ...state, sync: { ...state.sync, phase: 'failed', lastChecked: action.at }, receipt: { kind: 'error', title: 'Sync failed - retry required', detail: action.detail } };
    case 'toggle-network':
      return { ...state, network: action.network, sync: { ...state.sync, phase: action.network === 'offline' ? 'offline' : 'idle' }, receipt: { kind: 'info', title: action.network === 'offline' ? 'Offline' : 'Connection restored', detail: action.network === 'offline' ? 'Changes remain on this device.' : 'Checking queued changes now.' } };
    case 'resolve-conflict':
      return { ...state, records: state.records.map((record) => record.uid === action.uid ? { ...record, syncState: 'queued', revision: record.revision + 1 } : record), conflictUid: null, syncMode: 'healthy', receipt: { kind: 'success', title: 'Conflict choice saved', detail: 'Selected revision is queued for upload.' } };
    case 'review-complete':
      return { ...state, records: state.records.map((record) => ({ ...record, reviewed: true })), lastReviewAt: action.at, lastReviewNote: action.note, receipt: { kind: 'success', title: 'Review complete', detail: 'Decision note and current review state were saved on this device.' } };
    case 'setting':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    case 'reset-settings':
      return { ...state, settings: { ...DEFAULT_SETTINGS }, receipt: { kind: 'success', title: 'Settings reset', detail: 'Display and warning controls returned to prototype defaults.' } };
    case 'dismiss-receipt':
      return { ...state, receipt: null };
    case 'recover-malformed':
      return reducer(state, { type: 'reset', scenarioId: 'empty' });
    default:
      return state;
  }
}

export function PrototypeStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, initialState);
  const timers = useRef(new Set());
  const storageWriteFailed = useRef(false);
  const stats = useMemo(() => ledgerStats(state.records), [state.records]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageWriteFailed.current = false;
    } catch {
      if (!storageWriteFailed.current) {
        storageWriteFailed.current = true;
        dispatch({ type: 'sync-failed', at: new Date().toISOString(), detail: 'Browser storage rejected the local write.' });
      }
    }
  }, [state]);

  useEffect(() => () => {
    for (const timer of timers.current) clearTimeout(timer);
  }, []);

  const actions = useMemo(() => ({
    resetScenario(scenarioId) {
      const url = new URL(window.location.href);
      url.searchParams.set('scenario', scenarioId);
      window.history.replaceState({}, '', url);
      localStorage.removeItem(STORAGE_KEY);
      dispatch({ type: 'reset', scenarioId });
    },
    createTrade(input) {
      const now = new Date().toISOString();
      const uid = globalThis.crypto?.randomUUID?.() ?? `prototype-${Date.now()}-${state.records.length + 1}`;
      const record = makeRecord(input, {
        uid,
        displayId: Math.max(0, ...state.records.map((item) => item.displayId)) + 1,
        mutationId: `create-${uid}`,
        equityBefore: stats.equity,
        now,
      });
      const newEquity = stats.equity + record.netPnl;
      const signedResult = `${record.netPnl > 0 ? '+' : record.netPnl < 0 ? '-' : ''}$${Math.abs(record.netPnl).toLocaleString()}`;
      dispatch({ type: 'create', record, receipt: { kind: 'success', title: 'Saved on this device', detail: `Trade ${record.displayId} · record ${record.uid.slice(0, 8)} accepted. ${signedResult} moved strategy equity to $${newEquity.toLocaleString()}.`, uid: record.uid } });
      return record;
    },
    updateTrade(uid, patch) {
      const record = state.records.find((item) => item.uid === uid);
      if (!record) return;
      dispatch({ type: 'update', uid, patch, receipt: { kind: 'success', title: `Trade ${record.displayId} revision ${record.revision + 1} saved`, detail: 'Saved on this device. Waiting to sync.', uid } });
    },
    deleteTrade(uid) {
      const record = state.records.find((item) => item.uid === uid);
      if (!record) return;
      const expiresAt = Date.now() + 8_000;
      dispatch({ type: 'delete', uid, expiresAt, receipt: { kind: 'warning', title: `Deleted trade ${record.displayId}`, detail: 'Undo is available for 8 seconds.', uid, undo: true, expiresAt } });
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        dispatch({ type: 'expire-undo', uid });
      }, 8_000);
      timers.current.add(timer);
    },
    restoreTrade(uid) {
      const record = state.records.find((item) => item.uid === uid);
      const tombstone = state.tombstones.find((item) => item.uid === uid);
      if (!record || !tombstone || tombstone.expiresAt < Date.now()) return;
      dispatch({ type: 'restore', uid, displayId: record.displayId });
    },
    recoverDeletedTrade(uid) {
      const record = state.records.find((item) => item.uid === uid && item.deleted);
      if (!record) return;
      dispatch({ type: 'restore', uid, displayId: record.displayId });
    },
    syncNow(forceOnline = false) {
      const at = new Date().toISOString();
      if (state.network === 'offline' && !forceOnline) {
        dispatch({ type: 'sync-failed', at, detail: 'Device is offline. Changes remain on this device.' });
        return;
      }
      dispatch({ type: 'sync-phase', patch: { phase: 'checking' }, receipt: { kind: 'info', title: 'Checking shared state', detail: 'Local records remain available.' } });
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        if (state.syncMode === 'error') {
          dispatch({ type: 'sync-failed', at: new Date().toISOString(), detail: 'Simulated remote service rejected the request.' });
          return;
        }
        if (state.syncMode === 'conflict' && state.conflictUid) {
          dispatch({ type: 'sync-failed', at: new Date().toISOString(), detail: 'One record has competing revisions. Choose a version.' });
          return;
        }
        const hadChanges = state.records.some((record) => ['queued', 'failed'].includes(record.syncState));
        dispatch({ type: 'sync-success', at: new Date().toISOString(), hadChanges });
      }, 650);
      timers.current.add(timer);
    },
    setNetwork(network) {
      dispatch({ type: 'toggle-network', network });
      if (network === 'online') {
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          actions.syncNow(true);
        }, 120);
        timers.current.add(timer);
      }
    },
    resolveConflict(uid) { dispatch({ type: 'resolve-conflict', uid }); },
    completeReview(note) { dispatch({ type: 'review-complete', at: new Date().toISOString(), note: note.trim() }); },
    updateSetting(key, value) { dispatch({ type: 'setting', key, value }); },
    resetSettings() { dispatch({ type: 'reset-settings' }); },
    dismissReceipt() { dispatch({ type: 'dismiss-receipt' }); },
    recoverMalformed() { dispatch({ type: 'recover-malformed' }); },
  }), [state, stats]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible' || state.network !== 'online' || state.sync.phase === 'checking') return;
      if (state.records.some((record) => ['queued', 'failed'].includes(record.syncState) && !record.deleted)) actions.syncNow();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.network, state.records, state.sync.phase, actions]);

  useEffect(() => {
    if (!state.receipt || state.receipt.kind === 'error' || state.receipt.undo) return undefined;
    const timer = setTimeout(actions.dismissReceipt, 3_000);
    timers.current.add(timer);
    return () => {
      clearTimeout(timer);
      timers.current.delete(timer);
    };
  }, [state.receipt, actions]);

  const value = useMemo(() => ({ state, stats, actions }), [state, stats, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePrototypeStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('usePrototypeStore must be used inside PrototypeStoreProvider');
  return value;
}

export { STORAGE_KEY };
