import { ArrowRight, CloudOff, Flag, Mountain, ShieldCheck, TrendingDown } from 'lucide-react';
import { usePrototypeStore } from '../adapters/PrototypeStore.jsx';
import { money, percentage, TARGET_EQUITY } from '../model/riskModel.js';
import { Button, Card, Eyebrow, SectionHeading, StatusPill } from '../ui/primitives.jsx';
import { EquityChart } from '../ui/Charts.jsx';
import { navigate } from '../app/router.js';

function MonumentPanel({ equity, nextRisk, network, pendingCount }) {
  const progress = Math.max(0, Math.min(1, (Math.log10(Math.max(equity, 100_000)) - 5) / 2));
  const status = network === 'offline' ? 'offline' : pendingCount ? 'queued' : 'verified';
  return (
    <section className="monument" aria-labelledby="strategy-equity-title">
      <div className="monument__sky" aria-hidden="true">
        <span className="monument__orb" />
        <svg viewBox="0 0 420 180" preserveAspectRatio="none">
          <path className="monument__ridge monument__ridge--back" d="M0 145 L70 82 L118 119 L196 48 L250 105 L312 67 L420 146 V180 H0 Z" />
          <path className="monument__ridge monument__ridge--front" d="M0 162 L92 110 L139 138 L225 70 L285 128 L342 92 L420 148 V180 H0 Z" />
          <path className="monument__trail" pathLength="1" strokeDasharray={`${progress} 1`} d="M36 151 C108 139 110 128 148 132 C194 137 197 94 231 91 C275 86 300 118 340 99 C367 86 385 65 398 49" />
        </svg>
      </div>
      <div className="monument__content">
        <div className="monument__status">
          <Eyebrow>Strategy equity</Eyebrow>
          <StatusPill state={status}>{network === 'offline' ? 'On device · offline' : pendingCount ? `${pendingCount} waiting` : 'Ledger verified'}</StatusPill>
        </div>
        <h1 id="strategy-equity-title">{money(equity)}</h1>
        <div className="monument__meta">
          <span>{money(TARGET_EQUITY)} target</span>
          <span>{Math.round(progress * 100)}% of log-distance</span>
          <span>{nextRisk.status === 'target-reached' ? 'Challenge complete' : nextRisk.status === 'terminal' ? 'No active recommendation' : `Segment ${nextRisk.segment}`}</span>
        </div>
      </div>
    </section>
  );
}

function Consequence({ record, onEdit }) {
  if (!record) return null;
  const state = record.syncState === 'verified' ? 'verified' : record.syncState;
  return (
    <Card className="consequence">
      <div className="consequence__head"><Eyebrow>Last accepted record</Eyebrow><StatusPill state={state}>{record.syncState === 'verified' ? 'Uploaded' : record.syncState === 'queued' ? 'Waiting to sync' : record.syncState}</StatusPill></div>
      <div className="consequence__result">
        <span className={`outcome-mark outcome-mark--${record.outcome}`}>{record.outcome === 'break-even' ? 'BE' : record.outcome.slice(0, 1).toUpperCase()}</span>
        <div><strong>{record.instrument}</strong><p>Trade {record.displayId} · revision {record.revision}</p></div>
        <strong className={record.netPnl < 0 ? 'money-loss' : 'money-win'}>{money(record.netPnl, { sign: true })}</strong>
      </div>
      <Button variant="quiet" onClick={() => onEdit(record.uid)}>Review or edit <ArrowRight aria-hidden="true" /></Button>
    </Card>
  );
}

export default function Today({ onCapture, onOpenRecord }) {
  const { state, stats } = usePrototypeStore();
  const pendingCount = state.records.filter((record) => ['queued', 'failed', 'conflict'].includes(record.syncState) && !record.deleted).length;
  const reviewDue = stats.unreviewed >= 4 || (stats.unreviewed > 0 && (stats.currentLossStreak >= 3 || stats.drawdown >= 0.2));
  return (
    <main className="page page--today" id="main-content">
      <MonumentPanel equity={stats.equity} nextRisk={stats.nextRisk} network={state.network} pendingCount={pendingCount} />

      <Card className="risk-plate">
        <div className="risk-plate__top"><Eyebrow>Next planned risk</Eyebrow><span className="model-chip">100k-pchip-v1</span></div>
        {['target-reached', 'terminal'].includes(stats.nextRisk.status) ? (
          <div className="target-complete"><Flag aria-hidden="true" /><div><h2>{stats.nextRisk.status === 'target-reached' ? 'Challenge complete' : 'No active recommendation'}</h2><p>{stats.nextRisk.status === 'target-reached' ? 'No post-target risk recommendation is active.' : 'Strategy equity is not positive. Correct the ledger or reconfigure capital before sizing another trade.'}</p></div></div>
        ) : (
          <>
            <div className="risk-plate__value"><strong>{money(stats.nextRisk.dollarRisk)}</strong><span>{percentage(stats.nextRisk.riskFraction)} of strategy equity</span></div>
            <p className="risk-plate__meaning">Gross 1:1 means this planned loss and planned gross win are equal before fees, slippage, and funding.</p>
          </>
        )}
        <div className="risk-plate__actions"><Button onClick={onCapture}>Log trade</Button><Button variant="quiet" onClick={() => navigate('/prototype/insights/plan')}>Inspect model</Button></div>
      </Card>

      <Consequence record={stats.latest} onEdit={onOpenRecord} />

      {(reviewDue || state.network === 'offline') && (
        <Card className={`condition ${state.network === 'offline' ? 'condition--offline' : ''}`}>
          {state.network === 'offline' ? <CloudOff aria-hidden="true" /> : stats.drawdown >= 0.2 ? <TrendingDown aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          <div>
            <Eyebrow>{state.network === 'offline' ? 'Durability condition' : 'Review condition'}</Eyebrow>
            <h2>{state.network === 'offline' ? 'Working from this device' : stats.drawdown >= 0.2 ? `${percentage(stats.drawdown, 1)} below peak` : `${stats.unreviewed} records await review`}</h2>
            <p>{state.network === 'offline' ? 'New changes stay queued until the connection is restored and acknowledged.' : 'Inspect the realized path and record what the evidence changed.'}</p>
            <Button variant="quiet" onClick={() => navigate(state.network === 'offline' ? '/prototype/system/sync' : '/prototype/insights/review')}>Open details <ArrowRight aria-hidden="true" /></Button>
          </div>
        </Card>
      )}

      <section className="today-path">
        <SectionHeading eyebrow="Realized, not simulated" title="Ledger path" level={2} action={<Button variant="quiet" onClick={() => navigate('/prototype/insights/performance')}>Performance</Button>} />
        <EquityChart points={stats.points} compact />
      </section>

      <section className="challenge-segment">
        <SectionHeading eyebrow="Current expedition" title="Challenge trail" level={2} />
        <div className="milestone-track" aria-label={`Current strategy equity ${money(stats.equity)} toward ${money(TARGET_EQUITY)}`}>
          {[100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000].map((milestone) => <span key={milestone} className={stats.equity >= milestone ? 'is-reached' : stats.peak >= milestone ? 'is-previous' : milestone === [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000].find((value) => value > stats.equity) ? 'is-next' : ''}><Mountain aria-hidden="true" /><small>{milestone >= 1_000_000 ? `$${milestone / 1_000_000}M` : `$${milestone / 1_000}K`}</small></span>)}
        </div>
      </section>
    </main>
  );
}
