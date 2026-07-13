import { AlertTriangle, ArrowRight, BookOpenCheck, CircleHelp, Gauge, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { usePrototypeStore } from '../adapters/PrototypeStore.jsx';
import { navigate } from '../app/router.js';
import { MODEL_ID, money, percentage } from '../model/riskModel.js';
import { Button, Card, Eyebrow, Segmented, SectionHeading } from '../ui/primitives.jsx';
import { EquityChart, RiskCurveChart } from '../ui/Charts.jsx';

const PROJECTIONS = {
  65: { deadline: '27.8%', p10: 74.3, median: 86.6, p90: 99.7 },
  70: { deadline: '82.0%', p10: 54.9, median: 62.0, p90: 69.7 },
  75: { deadline: '99.4%', p10: 43.4, median: 48.3, p90: 53.1 },
};

function InsightNav({ active }) {
  return <nav className="subnav" aria-label="Insights sections">{[['performance', 'Performance'], ['review', 'Review'], ['plan', 'Plan']].map(([key, label]) => <button key={key} aria-current={active === key ? 'page' : undefined} onClick={() => navigate(`/prototype/insights/${key}`)}>{label}</button>)}</nav>;
}

function Performance() {
  const { stats } = usePrototypeStore();
  return <>
    <Card className="evidence-plate"><div className="evidence-plate__question"><Eyebrow>What has the ledger realized?</Eyebrow><span>Device ledger · {stats.count} records</span></div><div className="metric-hero"><strong>{money(stats.netPnl, { sign: true })}</strong><span>net change from configured start</span></div><EquityChart points={stats.points} /></Card>
    <div className="metric-grid"><Card><Eyebrow>Resolved win rate</Eyebrow><strong>{stats.resolvedWinRate === null ? 'Not enough data' : percentage(stats.resolvedWinRate, 1)}</strong><span>{stats.wins} wins · {stats.losses} losses · excludes {stats.breakEvens} BE</span></Card><Card><Eyebrow>Current drawdown</Eyebrow><strong>{percentage(stats.drawdown, 1)}</strong><span>{money(stats.drawdownDollar)} below {money(stats.peak)} peak</span></Card></div>
    {stats.drawdown > 0 && <Card className="drawdown-detail"><div><Eyebrow>Drawdown began</Eyebrow><strong>{stats.drawdownStartedAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(stats.drawdownStartedAt)) : 'At start'}</strong><span>{stats.tradesSincePeak} trades since the {money(stats.peak)} peak</span></div><div><Eyebrow>Largest loss contributors</Eyebrow>{stats.drawdownContributors.length ? <ol>{stats.drawdownContributors.map((record) => <li key={record.uid}><span>Trade {record.displayId} · {record.instrument}</span><strong>{money(record.netPnl, { sign: true })}</strong></li>)}</ol> : <p>No realized loss record in the current drawdown window.</p>}</div></Card>}
    {stats.drawdown >= 0.2 && <Card className="warning-plate"><TrendingDown aria-hidden="true" /><div><Eyebrow>Threshold crossed</Eyebrow><h2>Review the {stats.currentLossStreak || stats.losses} recent loss contribution</h2><p>This is realized drawdown, not a simulated percentile. The model still sizes from current strategy equity.</p><Button variant="quiet" onClick={() => navigate('/prototype/insights/review')}>Open review <ArrowRight aria-hidden="true" /></Button></div></Card>}
  </>;
}

function Review() {
  const { stats, state, actions } = usePrototypeStore();
  const [reviewNote, setReviewNote] = useState(state.lastReviewNote || '');
  const due = stats.unreviewed >= 4 || (stats.unreviewed > 0 && (stats.currentLossStreak >= 3 || stats.drawdown >= 0.2));
  return <>
    <Card className={`review-status ${due ? 'is-due' : ''}`}><BookOpenCheck aria-hidden="true" /><div><Eyebrow>Evidence review</Eyebrow><h2>{due ? 'Review is due' : 'Review is current'}</h2><p>{stats.unreviewed} unreviewed records · {stats.currentLossStreak} current losses · {percentage(stats.drawdown, 1)} drawdown</p></div></Card>
    <Card className="review-prompts"><h2>Decision record</h2><ol><li>Which setup contributed most to realized net P&L?</li><li>Did execution costs materially break gross 1:1?</li><li>Which record needs correction or more context?</li><li>What changes before the next accepted risk?</li></ol><label htmlFor="review-note">Review note <span className="required-copy">Required</span></label><textarea id="review-note" rows="5" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Record the evidence, not a prediction" /><Button disabled={!reviewNote.trim()} onClick={() => actions.completeReview(reviewNote)}>Save note and mark reviewed</Button>{!reviewNote.trim() && <p className="field__hint">Completion stays unavailable until the decision evidence is recorded.</p>}{state.lastReviewAt && <p className="completion-note">Saved on this device {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.lastReviewAt))}</p>}</Card>
    <Card className="data-sufficiency"><Gauge aria-hidden="true" /><div><h2>Data sufficiency</h2><p>{stats.count < 20 ? `Early sample: ${stats.count}/20 records. Behavior conclusions should remain tentative.` : `${stats.count} records support descriptive patterns, not causal claims.`}</p></div></Card>
  </>;
}

function Plan() {
  const { stats } = usePrototypeStore();
  const [winRate, setWinRate] = useState('70');
  const result = PROJECTIONS[winRate];
  return <>
    <Card className="evidence-plate"><div className="evidence-plate__question"><Eyebrow>How does planned exposure change?</Eyebrow><span>{MODEL_ID}</span></div><RiskCurveChart /></Card>
    <Card className="projection-plate"><div className="projection-plate__head"><div><Eyebrow>Frozen published simulation</Eyebrow><h2>Time to $10M under gross frictionless assumptions</h2></div><CircleHelp aria-hidden="true" /></div><Segmented label="Resolved-trade win rate" value={winRate} onChange={setWinRate} options={[{ value: '65', label: '65%' }, { value: '70', label: '70%' }, { value: '75', label: '75%' }]} /><div className="projection-numbers"><div><span>By 65 months</span><strong>{result.deadline}</strong></div><div><span>Median</span><strong>{result.median} mo</strong></div><div><span>10th-90th</span><strong>{result.p10}-{result.p90}</strong></div></div><div className="assumption-list"><span>10% break-even</span><span>3.5 trades/month</span><span>Gross 1:1</span><span>60,000 paths</span><span>Fixed seed result</span><span>{MODEL_ID}</span></div><div className="validity-warning"><AlertTriangle aria-hidden="true" /><p>These displayed values exclude fees, slippage, and funding. They are withheld as a net forecast and are invalid if cross-margin liquidation exceeds planned R.</p></div></Card>
    <Card className="current-risk-row"><div><Eyebrow>Current model output</Eyebrow><strong>{stats.nextRisk.dollarRisk ? money(stats.nextRisk.dollarRisk) : 'No recommendation'}</strong></div><span>{stats.nextRisk.riskFraction ? percentage(stats.nextRisk.riskFraction) : stats.nextRisk.status === 'target-reached' ? 'Target reached' : 'Terminal equity'} · {stats.nextRisk.segment || 'no segment'}</span></Card>
  </>;
}

export default function Insights({ route }) {
  const active = route.pathname.split('/').at(-1);
  return <main className="page" id="main-content"><SectionHeading eyebrow="Evidence, not certainty" title="Insights" /><InsightNav active={active} />{active === 'review' ? <Review /> : active === 'plan' ? <Plan /> : <Performance />}</main>;
}
