import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { usePrototypeStore } from '../adapters/PrototypeStore.jsx';
import { parseMoneyToCents, validateTrade } from '../domain/ledger.js';
import { Button, Field, IconButton, useDialogFocus } from '../ui/primitives.jsx';

function localDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initialForm(record) {
  return record ? {
    outcome: record.outcome,
    instrument: record.instrument,
    direction: record.direction,
    netPnl: String(record.netPnl),
    strategy: record.strategy,
    tags: (record.tags || []).join(', '),
    note: record.note,
    openedAt: record.openedAt ? localDateTime(record.openedAt) : '',
    closedAt: localDateTime(record.closedAt),
    notional: record.notional ?? '',
    entry: record.entry ?? '',
    exit: record.exit ?? '',
    orderType: record.orderType ?? '',
    makerTakerMix: record.makerTakerMix ?? '',
    fees: record.fees ?? '',
    slippageEstimate: record.slippageEstimate ?? '',
    funding: record.funding ?? '',
    beCostAcknowledged: Boolean(record.beCostAcknowledged || (record.outcome === 'break-even' && record.netPnl < 0)),
  } : {
    outcome: '', instrument: '', direction: '', netPnl: '', strategy: '', tags: '', note: '', openedAt: '',
    closedAt: localDateTime(), notional: '', entry: '', exit: '', orderType: '', makerTakerMix: '', fees: '',
    slippageEstimate: '', funding: '', beCostAcknowledged: false,
  };
}

function payloadFromForm(form) {
  const netPnlCents = parseMoneyToCents(form.netPnl);
  const moneyOrNull = (value) => value === '' ? null : parseMoneyToCents(value) / 100;
  return {
    ...form,
    netPnl: netPnlCents / 100,
    netPnlCents,
    tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    openedAt: form.openedAt ? new Date(form.openedAt).toISOString() : null,
    closedAt: new Date(form.closedAt).toISOString(),
    notional: moneyOrNull(form.notional),
    entry: moneyOrNull(form.entry),
    exit: moneyOrNull(form.exit),
    fees: moneyOrNull(form.fees),
    slippageEstimate: moneyOrNull(form.slippageEstimate),
    funding: moneyOrNull(form.funding),
  };
}

export default function Capture({ open, recordUid, onClose, onSaved }) {
  const { state, actions } = usePrototypeStore();
  const record = state.records.find((item) => item.uid === recordUid);
  const [form, setForm] = useState(() => initialForm(record));
  const [errors, setErrors] = useState({});
  const [detailsOpen, setDetailsOpen] = useState(Boolean(record));
  const [saveState, setSaveState] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);
  const titleRef = useRef(null);
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);
  const dialogRef = useDialogFocus({ active: open, initialFocusRef: titleRef, onEscape: close });

  useEffect(() => {
    if (!open) return;
    setForm(initialForm(record));
    setErrors({});
    setDetailsOpen(Boolean(record));
    setSaveState('idle');
    setLastSaved(null);
    dirtyRef.current = false;
    submittingRef.current = false;
  }, [open, recordUid]);

  useEffect(() => {
    if (!open || !record || !dirtyRef.current) return undefined;
    setSaveState('waiting');
    const timer = setTimeout(() => {
      const nextErrors = validateTrade(form);
      if (Object.keys(nextErrors).length) {
        setSaveState('invalid');
        return;
      }
      dirtyRef.current = false;
      actions.updateTrade(record.uid, payloadFromForm(form));
      setSaveState('saved');
    }, 650);
    return () => clearTimeout(timer);
  }, [form, open, recordUid]);

  if (!open) return null;

  const setValue = (key, value) => {
    dirtyRef.current = true;
    setSaveState(record ? 'waiting' : 'idle');
    setForm((current) => ({ ...current, [key]: value }));
  };
  const update = (key) => (event) => setValue(key, event.target.value);

  function close() {
    const hasMeaningfulInput = form.outcome || form.instrument || form.netPnl || form.strategy || form.note;
    if (!record && hasMeaningfulInput && !window.confirm('Discard this unsubmitted trade?')) return;
    onClose();
  }

  function submit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    const nextErrors = validateTrade(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      requestAnimationFrame(() => document.getElementById(`capture-${first}`)?.focus());
      return;
    }
    submittingRef.current = true;
    const wasDirty = dirtyRef.current;
    dirtyRef.current = false;
    const payload = payloadFromForm(form);
    if (record) {
      if (wasDirty) actions.updateTrade(record.uid, payload);
    } else {
      const saved = actions.createTrade(payload);
      if (event.nativeEvent.submitter?.value === 'another') {
        setLastSaved(`Trade ${saved.displayId} saved on this device. Ready for another.`);
        setForm(initialForm(null));
        setDetailsOpen(false);
        setErrors({});
        submittingRef.current = false;
        requestAnimationFrame(() => titleRef.current?.focus());
        return;
      }
    }
    onSaved?.();
    onClose();
  }

  const autosaveCopy = saveState === 'waiting'
    ? 'Saving after 650ms of quiet input.'
    : saveState === 'invalid'
      ? 'Not saved yet - correct the marked field or use Save now.'
      : saveState === 'saved'
        ? 'Latest valid revision saved on this device.'
        : 'Valid changes autosave after 650ms, or use Save now.';

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} className="capture-sheet" role="dialog" aria-modal="true" aria-labelledby="capture-title">
        <header className="sheet-header"><div><p className="eyebrow">{record ? `Trade ${record.displayId} · revision ${record.revision}` : 'New ledger record'}</p><h1 id="capture-title" ref={titleRef} tabIndex="-1">{record ? 'Review and edit' : 'Log trade'}</h1></div><IconButton label="Close trade capture" onClick={close}><X aria-hidden="true" /></IconButton></header>
        <form onSubmit={submit} noValidate>
          <fieldset className={`outcome-picker ${errors.outcome ? 'is-invalid' : ''}`}>
            <legend>Outcome <span>Required</span></legend>
            {[['win', 'Win'], ['loss', 'Loss'], ['break-even', 'Break-even']].map(([value, label]) => <button id={value === 'win' ? 'capture-outcome' : undefined} type="button" key={value} aria-pressed={form.outcome === value} className={form.outcome === value ? `is-selected is-${value}` : ''} onClick={() => setValue('outcome', value)}>{label}</button>)}
            {errors.outcome && <p role="alert">{errors.outcome}</p>}
          </fieldset>

          <div className="form-grid">
            <Field id="capture-instrument" label="Instrument" error={errors.instrument} hint="Required · e.g. BTCUSDT"><input id="capture-instrument" value={form.instrument} onChange={update('instrument')} aria-describedby={errors.instrument ? 'capture-instrument-error' : 'capture-instrument-description'} autoCapitalize="characters" placeholder="BTCUSDT" /></Field>
            <Field id="capture-direction" label="Direction" error={errors.direction}><select id="capture-direction" value={form.direction} onChange={update('direction')} aria-describedby={errors.direction ? 'capture-direction-error' : undefined}><option value="">Choose direction</option><option value="long">Long</option><option value="short">Short</option><option value="not-recorded">Not recorded</option></select></Field>
          </div>

          <Field id="capture-netPnl" label="Realized net profit or loss" error={errors.netPnl} hint="Enter it manually. Include fees, slippage, and funding actually realized."><div className="money-input"><span aria-hidden="true">$</span><input id="capture-netPnl" inputMode="decimal" value={form.netPnl} onChange={update('netPnl')} aria-describedby={errors.netPnl ? 'capture-netPnl-error' : 'capture-netPnl-description'} placeholder={form.outcome === 'loss' ? '-15000' : '15000'} /></div></Field>
          {form.outcome === 'break-even' && (parseMoneyToCents(form.netPnl) ?? 0) < 0 && <label className={`acknowledgement ${errors.beCostAcknowledged ? 'is-invalid' : ''}`}><input type="checkbox" checked={form.beCostAcknowledged} onChange={(event) => setValue('beCostAcknowledged', event.target.checked)} /><span><strong>Acknowledge cost-only loss</strong><small>Execution costs made this Break-even net negative.</small>{errors.beCostAcknowledged && <em role="alert">{errors.beCostAcknowledged}</em>}</span></label>}

          <button className="details-toggle" type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((value) => !value)}><span>Execution details <small>Optional</small></span><ChevronDown aria-hidden="true" /></button>
          {detailsOpen && <div className="details-fields">
            <Field id="capture-strategy" label="Strategy"><input id="capture-strategy" value={form.strategy} onChange={update('strategy')} placeholder="Liquidity sweep" /></Field>
            <Field id="capture-tags" label="Setup tags" hint="Comma separated"><input id="capture-tags" value={form.tags} onChange={update('tags')} placeholder="sweep, reclaim" /></Field>
            <div className="form-grid"><Field id="capture-openedAt" label="Opened at"><input id="capture-openedAt" type="datetime-local" value={form.openedAt} onChange={update('openedAt')} /></Field><Field id="capture-closedAt" label="Closed at" error={errors.closedAt}><input id="capture-closedAt" type="datetime-local" value={form.closedAt} onChange={update('closedAt')} aria-describedby={errors.closedAt ? 'capture-closedAt-error' : undefined} /></Field></div>
            <div className="form-grid"><Field id="capture-notional" label="Notional" error={errors.notional}><input id="capture-notional" inputMode="decimal" value={form.notional} onChange={update('notional')} placeholder="300000" /></Field><Field id="capture-orderType" label="Order type"><select id="capture-orderType" value={form.orderType} onChange={update('orderType')}><option value="">Not recorded</option><option value="market">Market</option><option value="limit">Limit</option><option value="mixed">Mixed</option></select></Field></div>
            <div className="form-grid"><Field id="capture-entry" label="Average entry" error={errors.entry}><input id="capture-entry" inputMode="decimal" value={form.entry} onChange={update('entry')} /></Field><Field id="capture-exit" label="Average exit" error={errors.exit}><input id="capture-exit" inputMode="decimal" value={form.exit} onChange={update('exit')} /></Field></div>
            <Field id="capture-makerTakerMix" label="Execution mix"><select id="capture-makerTakerMix" value={form.makerTakerMix} onChange={update('makerTakerMix')}><option value="">Not recorded</option><option value="maker">Maker</option><option value="taker">Taker</option><option value="mixed">Mixed maker/taker</option></select></Field>
            <div className="form-grid form-grid--three"><Field id="capture-fees" label="Fees" error={errors.fees}><input id="capture-fees" inputMode="decimal" value={form.fees} onChange={update('fees')} /></Field><Field id="capture-slippageEstimate" label="Slippage" error={errors.slippageEstimate}><input id="capture-slippageEstimate" inputMode="decimal" value={form.slippageEstimate} onChange={update('slippageEstimate')} /></Field><Field id="capture-funding" label="Funding" error={errors.funding}><input id="capture-funding" inputMode="decimal" value={form.funding} onChange={update('funding')} /></Field></div>
            <Field id="capture-note" label="Decision note"><textarea id="capture-note" rows="4" value={form.note} onChange={update('note')} placeholder="What mattered, what changed, what to review" /></Field>
            <div className="attachment-placeholder"><strong>Screenshots are metadata-only in this prototype.</strong><span>No image is captured or uploaded.</span></div>
          </div>}

          {lastSaved && <p className="inline-receipt" role="status">{lastSaved}</p>}
          <div className="capture-truth"><strong>{record ? 'Quiet autosave' : 'Local-first receipt'}</strong><p>{record ? autosaveCopy : 'Save commits to this isolated device ledger. Simulated sync continues independently.'}</p></div>
          <footer className={`sheet-actions ${record ? '' : 'sheet-actions--three'}`}><Button type="button" variant="quiet" onClick={close}>Cancel</Button>{!record && <Button type="submit" variant="secondary" name="afterSave" value="another">Save & log another</Button>}<Button type="submit">{record ? 'Save now' : 'Save trade'}</Button></footer>
        </form>
      </section>
    </div>
  );
}
