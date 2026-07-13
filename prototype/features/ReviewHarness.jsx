import { Accessibility, CheckCircle2, FlaskConical, MonitorSmartphone, RotateCcw } from 'lucide-react';
import { SCENARIOS } from '../fixtures/scenarios.js';
import { usePrototypeStore } from '../adapters/PrototypeStore.jsx';
import { Button, Card, Eyebrow, SectionHeading } from '../ui/primitives.jsx';
import { navigate } from '../app/router.js';

export default function ReviewHarness() {
  const { state, actions } = usePrototypeStore();
  function chooseScenario(id) {
    actions.resetScenario(id);
    navigate('/prototype/today', { query: { scenario: id } });
  }
  return <main className="page" id="main-content"><SectionHeading eyebrow="Synthetic evidence" title="Review harness" /><Card className="prototype-disclosure prototype-disclosure--strong"><FlaskConical aria-hidden="true" /><div><h2>Interactive prototype, not production</h2><p>Ledger interactions are real inside an isolated fixture. Network, conflicts, projections, media, import, and export are visibly simulated.</p></div></Card><section className="harness-summary"><Card><Eyebrow>Active scenario</Eyebrow><strong>{SCENARIOS[state.scenarioId]?.label}</strong><span>{state.fixtureChecksum}</span></Card><Card><Eyebrow>Storage boundary</Eyebrow><strong>Prototype namespace</strong><span>tradevault:summit-prototype:v1</span></Card></section><section><h2 className="list-heading">Deterministic scenarios</h2><div className="scenario-list">{Object.values(SCENARIOS).map((scenario) => <button key={scenario.id} className={state.scenarioId === scenario.id ? 'scenario-card is-active' : 'scenario-card'} onClick={() => chooseScenario(scenario.id)}><span>{state.scenarioId === scenario.id ? <CheckCircle2 aria-hidden="true" /> : scenario.largeText ? <Accessibility aria-hidden="true" /> : <MonitorSmartphone aria-hidden="true" />}</span><div><strong>{scenario.label}</strong><small>{scenario.description} · {scenario.trades.length} records</small></div></button>)}</div></section><Card className="review-script"><h2>Ten-step review</h2><ol><li>Empty: inspect risk and log a manual Loss.</li><li>Observe receipt and changed next risk.</li><li>Edit, delete, and undo that exact record.</li><li>Normal: search BTC and inspect provenance.</li><li>Drawdown: inspect and complete a review.</li><li>Offline: log, reconnect, verify.</li><li>Sync error/conflict: recover without false success.</li><li>Large data: search/filter bounded records.</li><li>Target reached: confirm no recommendation.</li><li>Exercise large text, reduced motion, Back, reload, landscape.</li></ol></Card><Button variant="secondary" onClick={() => actions.resetScenario(state.scenarioId)}><RotateCcw aria-hidden="true" /> Reset active fixture</Button></main>;
}
