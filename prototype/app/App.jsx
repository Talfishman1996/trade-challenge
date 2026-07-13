import { Component, lazy, Suspense, useEffect, useState } from 'react';
import { BarChart3, BookOpen, CloudOff, FlaskConical, Home, Plus, Settings2, ShieldAlert, X } from 'lucide-react';
import { PrototypeStoreProvider, usePrototypeStore } from '../adapters/PrototypeStore.jsx';
import { navigate, routeSection, useRoute } from './router.js';
import { Button, IconButton, StatusPill } from '../ui/primitives.jsx';
import Capture from '../features/Capture.jsx';

const Today = lazy(() => import('../features/Today.jsx'));
const Journal = lazy(() => import('../features/Journal.jsx'));
const Insights = lazy(() => import('../features/Insights.jsx'));
const System = lazy(() => import('../features/System.jsx'));
const ReviewHarness = lazy(() => import('../features/ReviewHarness.jsx'));

class PrototypeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <main className="fatal-recovery" id="main-content"><ShieldAlert aria-hidden="true" /><p className="eyebrow">Bounded component recovery</p><h1>This prototype surface stopped safely</h1><p>No replacement equity or risk value was invented. Reload the deterministic review harness to restore a known fixture.</p><Button onClick={() => window.location.assign('/prototype/review')}>Reload review harness</Button></main>;
    }
    return this.props.children;
  }
}

function RouteSkeleton() {
  return <main className="page route-skeleton" aria-busy="true"><span /><span /><span /><span /></main>;
}

function PrototypeReceipt() {
  const { state, actions } = usePrototypeStore();
  if (!state.receipt) return null;
  const receipt = state.receipt;
  return (
    <aside className={`global-receipt global-receipt--${receipt.kind}`} role={receipt.kind === 'error' ? 'alert' : 'status'} aria-live={receipt.kind === 'error' ? 'assertive' : 'polite'}>
      <button className="global-receipt__open" onClick={() => receipt.uid ? navigate('/prototype/journal', { query: { q: receipt.uid } }) : navigate('/prototype/system/sync')}>
        <strong>{receipt.title}</strong><span>{receipt.detail}</span>
      </button>
      {receipt.undo && <Button variant="secondary" onClick={() => actions.restoreTrade(receipt.uid)}>Undo</Button>}
      <IconButton label="Dismiss message" onClick={actions.dismissReceipt}><X aria-hidden="true" /></IconButton>
    </aside>
  );
}

function Shell() {
  const route = useRoute();
  const { state, actions } = usePrototypeStore();
  const [capture, setCapture] = useState({ open: false, uid: null });
  const section = routeSection(route.pathname);
  const pending = state.records.filter((record) => ['queued', 'failed', 'conflict'].includes(record.syncState) && !record.deleted).length;
  const durabilityState = state.network === 'offline' ? 'offline' : state.sync.phase === 'checking' ? 'checking' : state.sync.phase === 'failed' ? 'failed' : pending ? state.records.find((record) => ['conflict', 'failed', 'queued'].includes(record.syncState))?.syncState ?? 'queued' : 'verified';

  useEffect(() => {
    document.documentElement.dataset.motion = state.settings.reducedMotion ? 'reduced' : 'full';
    document.documentElement.dataset.text = state.settings.largeText ? 'large' : 'standard';
  }, [state.settings.reducedMotion, state.settings.largeText]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route.pathname, state.settings.reducedMotion]);

  function openCapture(uid = null) { setCapture({ open: true, uid }); }
  function closeCapture() { setCapture({ open: false, uid: null }); }

  if (state.malformed) {
    return <main className="fatal-recovery" id="main-content"><ShieldAlert aria-hidden="true" /><p className="eyebrow">Bounded recovery</p><h1>The fixture could not be trusted</h1><p>Summit Ledger refused to invent equity, risk, or records from malformed data. Reset to a known empty ledger to continue.</p><Button onClick={actions.recoverMalformed}>Recover to empty fixture</Button><Button variant="quiet" onClick={() => navigate('/prototype/review')}>Return to review harness</Button></main>;
  }

  return (
    <div className="prototype-canvas">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="app-bar">
        <button className="brand-lockup" onClick={() => navigate('/prototype/today')} aria-label="Summit Ledger, go to Today"><span className="brand-mark"><span /></span><span><strong>Summit Ledger</strong><small>Interactive prototype</small></span></button>
        <button className="durability-button" onClick={() => navigate('/prototype/system/sync')} aria-label={`Open sync details. Current state ${durabilityState}`}><StatusPill state={durabilityState}>{durabilityState === 'verified' ? 'Verified' : durabilityState === 'queued' ? `${pending} waiting` : durabilityState}</StatusPill></button>
      </header>
      <div className="prototype-banner"><FlaskConical aria-hidden="true" /><span>Synthetic data · no production connection</span><button onClick={() => navigate('/prototype/review')}>Review mode</button></div>
      <Suspense fallback={<RouteSkeleton />}>
        {section === 'journal' ? <Journal onCapture={() => openCapture()} onOpenRecord={openCapture} /> : section === 'insights' ? <Insights route={route} /> : section === 'system' ? <System route={route} /> : section === 'review' ? <ReviewHarness /> : <Today onCapture={() => openCapture()} onOpenRecord={openCapture} />}
      </Suspense>
      <PrototypeReceipt />
      <nav className="bottom-nav" aria-label="Primary navigation">
        <button aria-current={section === 'today' ? 'page' : undefined} onClick={() => navigate('/prototype/today')}><Home aria-hidden="true" /><span>Today</span></button>
        <button aria-current={section === 'journal' ? 'page' : undefined} onClick={() => navigate('/prototype/journal')}><BookOpen aria-hidden="true" /><span>Journal</span></button>
        <button className="capture-action" onClick={() => openCapture()} aria-label="Log trade"><span><Plus aria-hidden="true" /></span><small>Capture</small></button>
        <button aria-current={section === 'insights' ? 'page' : undefined} onClick={() => navigate('/prototype/insights/performance')}><BarChart3 aria-hidden="true" /><span>Insights</span></button>
        <button aria-current={section === 'system' || section === 'review' ? 'page' : undefined} onClick={() => navigate('/prototype/system')}><Settings2 aria-hidden="true" /><span>System</span></button>
      </nav>
      <Capture open={capture.open} recordUid={capture.uid} onClose={closeCapture} />
    </div>
  );
}

export default function App() {
  return <PrototypeErrorBoundary><PrototypeStoreProvider><Shell /></PrototypeStoreProvider></PrototypeErrorBoundary>;
}
