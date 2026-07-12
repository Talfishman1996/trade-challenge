# Decisions, Risks, Assumptions, and Questions

This file owns product decisions, assumptions, unresolved questions, and program
risks. It does not own task status or evidence.

## 1. Locked Owner Decisions

| ID | Decision | Consequence |
|---|---|---|
| D-001 | Preserve the original checkpoint indefinitely | All new work uses separate branches and restore artifacts |
| D-002 | The 10,000-person audience consists of reviewers and critics | Prototype does not require persistent multi-user accounts |
| D-003 | Reframe the product as `$100K -> $10M Challenge` | `$20K` launch logic and language become audit targets |
| D-004 | Use the approved smooth PCHIP risk curve | App, tests, projections, and explanations must share one implementation |
| D-005 | Keep gross reward/risk fixed at `1:1` | No variable RR control in the canonical model |
| D-006 | Use `10%` break-even and `3.5` trades/month for planning | Projection assumptions must be visible and versioned |
| D-007 | Make mobile the primary product surface | Phone evidence gates direction before tablet/desktop |
| D-008 | Allow every existing visual element to be challenged | Mountain, colors, typography, layout, and motion are not protected |
| D-009 | `[SUPERSEDED BY D-018]` Use Fable 5 as an independent second brain | Historical packet/attempt evidence remains preserved |
| D-010 | `[SUPERSEDED BY D-018]` Do not inject Codex opinions into the first Fable review | Historical contamination audit remains preserved |
| D-011 | No authentication, security, or compliance implementation is required now | Risks are audited and documented, not necessarily remediated in prototype |
| D-012 | No fixed tooling or hosting budget is required now | Recommendations may prioritize quality while still recording cost |
| D-013 | Live production data migration is not a current concern | Prototype must still be isolated from production writes |
| D-014 | First stopping point is an interactive prototype | Production rebuild requires a later greenlight |
| D-015 | Build the plan, then wait | P0 cannot begin without explicit owner greenlight |
| D-016 | Do not run a separate human-review pilot | Codex performs structured task and design evaluation; the owner reviews and approves the prototype |
| D-017 | Compare competing visual directions under controlled conditions | At least three directions use identical tasks, content, states, viewports, fidelity, and a fixed rubric before selection |
| D-018 | Exclude Fable 5 and do everything else | Retire execution, unsealing, confluence, and prototype-critique dependencies; retain all other audit/prototype gates |

## 2. Final Gap-Review Scope Dispositions

These dispositions are binding for this audit/prototype program. `Excluded` means
do not create a dedicated workstream, deliverable, or gate requirement. It does not
remove ordinary correctness checks already necessary to audit the app itself.

| ID | Proposed expansion | Disposition | Exact boundary |
|---|---|---|---|
| SD-001 | Representative human reviewer pilot | `EXCLUDED` | Codex performs repeatable heuristic/task evaluation and the owner performs the final review; no external behavioral sample is claimed |
| SD-002 | Behavioral or psychological-safety program | `EXCLUDED` | Ordinary usability and emotional-tone findings remain allowed; no dedicated tilt, loss-chasing, gamification, or milestone-pressure study |
| SD-003 | Expanded probabilistic model-risk research | `EXCLUDED` | Verify configured assumptions and product outputs only; do not add clustered-loss, non-stationary-win-rate, dependence, or fat-tail research |
| SD-004 | Independent second mathematical implementation | `EXCLUDED` | Keep ordinary specification, boundary, invariant, and UI-consistency tests; do not build a separately authored validation engine |
| SD-005 | 10,000-reviewer capacity program | `EXCLUDED` | The audience is evaluative, not a concurrent-user load target; no load, bandwidth, CDN, Worker/KV capacity, or cost exercise |
| SD-006 | Software supply-chain program | `EXCLUDED` | Dependency inspection serves architecture and performance only; no license, vulnerability, abandonment, or reproducible-build certification |
| SD-007 | Real assistive-technology sessions | `EXCLUDED` | Retain baseline semantics, contrast, target-size, large-text, focus, color, and reduced-motion checks; no VoiceOver, TalkBack, switch-control, or specialist lab |
| SD-008 | Native/PWA mobile-platform integration program | `EXCLUDED` | Retain browser behavior needed for core save/sync flows; no install, haptics, share sheet, platform launch screen, battery/thermal, or storage-eviction work |
| SD-009 | Reviewer-feedback instrumentation | `EXCLUDED` | No telemetry, analytics, or in-product feedback collector; owner feedback is recorded manually in the evidence/decision process |
| SD-010 | Localization and formatting-resilience program | `EXCLUDED` | No currency/locale matrix, translation expansion, or RTL workstream |
| SD-011 | Disaster-recovery drill | `EXCLUDED` | Document current backup/restore behavior and later rollback design; do not conduct an operational recovery rehearsal |
| SD-012 | Structured visual-direction comparison | `INCLUDED` | Codex compares at least three directions with frozen tasks, content, states, viewports, fidelity, weighted criteria, and hard-failure rules before owner selection |
| SD-013 | Formal financial-communication ethics program | `EXCLUDED` | Ordinary factual copy, uncertainty, model-assumption, and capability-truth checks remain; no separate ethics workstream |
| SD-014 | Peripheral design-asset completeness package | `EXCLUDED` | No favicon, app icon, launch screen, social preview, browser chrome, or branded print/export asset program |

## 3. Working Assumptions

Assumptions are not decisions. They must be verified or replaced during execution.

| ID | Assumption | Verification phase |
|---|---|---|
| A-001 | The current repository and live URL represent the intended baseline | P0/P1 |
| A-002 | Reviewers need deterministic synthetic scenarios, not personal accounts | P10 |
| A-003 | Current and previous iOS Safari/Android Chrome cover the critical browser set | P1/P8 |
| A-004 | The selected PDF/simulation artifacts are the latest approved model evidence | P7 |
| A-005 | PCHIP dollar risk should clamp to anchor behavior outside the modeled range | P7 |
| A-006 | Historical realized P&L should never be rewritten by model migration | P7/P13 |
| A-007 | Local-first save remains desirable even if sync architecture changes | P3/P6 |
| A-008 | A code prototype provides better evidence than static mockups alone | P10/P11 |
| A-009 | Current Cloudflare production remains online throughout prototype work | P0/P11 |

## 4. Open Questions to Resolve Through Evidence

These questions are not blockers to plan approval. Their resolution is a required
output of the named phase.

| ID | Question | Owner phase | Decision deadline |
|---|---|---|---|
| Q-001 | What exact sizing applies after equity falls below `$100K`? | P7 | before G7 |
| Q-002 | What happens after equity reaches or exceeds `$10M`? | P7/P3 | before G9 |
| Q-003 | Should historical trades preserve stored risk, show both model versions, or be recomputed? | P7 | before G10 |
| Q-004 | How is a break-even trade classified when fees make net P&L negative? | P7 | before G7 |
| Q-005 | Which execution-cost assumptions belong in operational UI versus projections only? | P7/P3 | before G9 |
| Q-006 | Should next risk use total strategy equity, available balance, or a separately funded risk account? | P7 | before G7 |
| Q-007 | Which analytics directly change behavior and which are decorative? | P3 | before G3 |
| Q-008 | Does Telegram/reporting reduce review friction enough to justify an external layer? | P3/P9 | before G10 |
| Q-009 | Should screenshots/settings become cloud-synced in a production rebuild? | P6/P13 | before G13 |
| Q-010 | Which visual direction best balances command-instrument clarity and emotional identity? | P4/P9 | before G10 |
| Q-011 | Which current feature should be removed first if it competes with primary mobile tasks? | P3/P4 | before G9 |
| Q-012 | What review cadence should the product actively facilitate? | P3 | before G10 |
| Q-013 | Which prototype surfaces must be real versus simulated for reviewers to judge honestly? | P10 | before G10 |

## 5. Program Risk Register

Likelihood and impact are planning estimates until evidence updates them.

| ID | Risk | Likelihood | Impact | Prevention/mitigation | Trigger |
|---|---|---|---|---|---|
| R-001 | Protected checkpoint is accidentally changed | Low | Blocker | immutable refs, tree verification at every gate | tree/ref mismatch |
| R-002 | Prototype sends data to production Worker | Medium | Blocker | environment guard, fixture adapter, network assertion | production endpoint request |
| R-003 | `$20K` logic survives in hidden model consumers | High | Critical | consumer inventory and parity tests | conflicting risk output |
| R-004 | Historical trades receive fabricated new risk values | Medium | Critical | modelVersion and migration decision before coding | R-multiple changes after load |
| R-005 | Public shared sync identifier exposes or mixes data | High | Critical | document now; isolate prototype; production architecture plan | unexpected remote dataset |
| R-006 | Fable packet contains leading language | Medium | High | contamination audit and neutral exclusion list | persuasive wording found |
| R-007 | Codex reads Fable output before independent audit freezes | Low | High | sealed redirect, hash, explicit tracker state | response content enters context |
| R-008 | Fable novelty is mistaken for quality | Medium | High | evidence-based disposition matrix | advice accepted without test |
| R-009 | Screenshot matrix misses a destructive or failure state | High | High | matrix completeness script and gate audit | unindexed state discovered |
| R-010 | Context compaction causes false completion or lost decisions | High | Critical | write-ahead tracker, evidence hashes, recovery protocol | chat conflicts with files |
| R-011 | Plan complexity becomes bureaucracy without quality | Medium | High | one-authority-per-document rule and artifact pruning | duplicate status/decisions |
| R-012 | Visual spectacle continues to obstruct frequent tasks | Medium | High | task timing and hierarchy evidence | task target missed |
| R-013 | Redesign removes the emotional value reviewers remember | Medium | High | multiple directions and reviewer scenarios | clarity rises but engagement falls |
| R-014 | Mobile matrix grows without prioritization | Medium | Medium | critical/secondary device tiers | low-value combinations delay gate |
| R-015 | Performance results vary by machine/tooling | High | Medium | fixed profiles, repeated runs, environment metadata | non-repeatable metrics |
| R-016 | Happy-path sync tests hide concurrency loss | High | Critical | stale/offline/conflict failure injection | cloud/local divergence |
| R-017 | Reviewers mistake fixture behavior for production capability | Medium | High | visible prototype disclosure and capability contract | unsupported assumption in feedback |
| R-018 | Prototype is treated as production-ready | Medium | Critical | explicit prototype watermark, G13 stop, no production endpoint | request to replace production early |
| R-019 | Large evidence files become untraceable or vanish | Medium | High | hashes, manifests, durable summaries, checkpoint archives | missing/hash-failed artifact |
| R-020 | Browser-local settings/images are lost during origin change | Medium | High | inventory, migration plan, no forced redirect | new origin introduced |
| R-021 | Oversized components make prototype changes regress unrelated flows | High | High | architecture boundaries and tests before broad edits | unrelated visual/data regression |
| R-022 | Historical docs are mistaken for current truth | High | Medium | authority map and superseded labels | old `$20K` claim reused |
| R-023 | Exact Fable 5 CLI/model is unavailable | Medium | Medium | verify in P0; record fallback approval requirement | model lookup fails |
| R-024 | Accessibility is deferred as polish | Medium | High | accessibility evidence in P4/P8/P12 gates | core flow inaccessible |
| R-025 | Model projections imply certainty that assumptions do not support | High | Critical | assumption display, quantiles, validity boundaries | deterministic promise copy |
| R-026 | Manual P&L and modeled 1R become conflated | High | High | separate realized/model fields and copy | app changes entered P&L |
| R-027 | Telegram/external reporting duplicates the app without value | Medium | Medium | feature disposition and workflow justification | no measurable review benefit |
| R-028 | Reviewer feedback becomes an unranked wishlist | High | High | structured feedback IDs and disposition | conflicting requests accumulate |
| R-029 | Visual-direction comparison is biased by unequal polish, content, or test conditions | Medium | High | freeze fixtures, states, viewports, fidelity, rubric, and hard failures before scoring | ranking changes when conditions are normalized |

Risks `R-006`, `R-007`, `R-008`, and `R-023` are retired for remaining execution by
`D-018`. Their historical evidence is not deleted. No replacement external advisor
is authorized or required.

## 6. Decision Procedure

Every new decision must record:

- decision ID and date
- question being resolved
- available options
- evidence IDs
- selected option and rationale
- rejected options and why
- owner or delegated decision authority
- affected phases/files/specifications
- reversal cost
- trigger that would reopen the decision

Silence is not consent. An assumption cannot be promoted to a decision without an
explicit record.

## 7. Risk Review Procedure

- Review all open risks at every gate.
- Add evidence and update likelihood/impact without deleting history.
- A triggered Blocker or Critical risk fails the gate until resolved or explicitly
  owner-accepted.
- Mitigation completion requires a test, not merely a code change.
- Closed risks remain in the register with their closure evidence.
