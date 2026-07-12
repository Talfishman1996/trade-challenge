# GATE-P02: External-Advisor Scope Disposition

Gate audit date: 2026-07-12 PDT

Result: `GATE_PASSED`

## Gate Meaning

This gate does not claim that Fable 5 reviewed the product. It proves that the owner
explicitly removed Fable 5, historical attempt evidence remains intact, and the
remaining program has no hidden external-advisor dependency.

## Evidence Reviewed

| Domain | Evidence | Result |
|---|---|---|
| Owner scope decision | `EV-P2-DEC-004`, `D-018` | pass |
| Historical packet | `EV-P2-FBL-001` | preserved |
| Historical contamination audit | `EV-P2-FBL-002` | preserved |
| Three failed attempts | `EV-P2-FBL-003` | preserved; no review generated |
| Plan dependency audit | `reports/P2.4-owner-scope-disposition.md` | pass |
| Subphase parity | 75 master-plan IDs / 75 tracker IDs | pass |
| Protected application | source diff empty; canonical tree verified | pass |

## Gate Criteria

| Criterion | Result |
|---|---|
| Owner explicitly removed Fable 5 | pass |
| Superseded decisions remain historically visible | pass |
| No substantive Fable response exists | pass |
| No future mandatory Fable execution/unseal/confluence/critique remains | pass |
| P9 retains contradiction and evidence-confluence rigor | pass |
| P12 retains a separate adversarial second-pass critique | pass |
| All other phases, gates, and deliverables remain in scope | pass |
| Application, Worker, model, and production remain untouched | pass |
| P3.1 has one unambiguous next action | pass |

## Adversarial Self-Audit

Potential failure: removing Fable could be misrepresented as equivalent independent
validation. Mitigation: all current documents explicitly prohibit that claim and
P12.5 is labeled internal.

Potential failure: scope removal could quietly reduce the requested exhaustive
audit. Mitigation: all 75 subphase IDs remain, only four Fable-specific operations
were replaced, and every non-Fable deliverable remains binding.

Potential failure: historical evidence could later be mistaken for a completed
review. Mitigation: the packet protocol is marked retired, the response path is
absent, and every P2 report states that no substantive review was generated.

## Checkpoint Record

Scope/content commit: `986e9c6b108e8ae64d751ecd698d934431a4edd5`

Gate tag: `AUDIT-P02-GATE-PASSED-2026-07-12`

Next phase authorization: P3.1 jobs and operating-loop audit may start only after
the validation commit, immutable tag, and recovery snapshot are recorded.
