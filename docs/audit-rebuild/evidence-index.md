# Audit Evidence Index

This file indexes evidence without replacing raw artifacts or findings. Raw files
under `output/audit-rebuild/` are ignored by Git; their hashes are committed through
phase reports and gate records.

## P0: Activation and Isolation

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P0-CMD-001` | `CMD` | tracker authorization, session log, `EV-P0-CMD-001-authorization.txt` | Owner greenlight, scope, timestamp, starting commit, and non-authorization of production replacement | indexed |
| `EV-P0-CMD-002` | `CMD` | `EV-P0-CMD-002-local-refs.txt`, `EV-P0-CMD-002-artifact-checksums.txt`, `EV-P0-CMD-002-bundle-verify.txt` | Local protected refs share the canonical tree; six recovery artifacts match; Git bundle is complete | indexed |
| `EV-P0-CMD-003` | `CMD` | `EV-P0-CMD-003-remote-ref.json`, `EV-P0-CMD-003-remote-commit.json` | GitHub checkpoint branch still targets snapshot `5a35dd9`; its tree remains `c41314c` | indexed |
| `EV-P0-CMD-004` | `CMD` | `EV-P0-CMD-004-branch-status.txt`, `EV-P0-CMD-004-isolation-proof.json`, scratch Vite audit harness | Work occurs on the dedicated audit branch and boot sync is intercepted before reaching production | indexed |
| `EV-P0-CMD-005` | `CMD` | `EV-P0-CMD-005-tool-versions.txt`, `EV-P0-CMD-005-claude-auth-redacted.json`, `EV-P0-CMD-005-claude-help.txt` | Required local tools exist; Fable 5 alias/full model and maximum effort are supported without running the review | indexed |

Raw evidence manifest:

`output/audit-rebuild/P0/checkpoint/MANIFEST.sha256`

Manifest SHA-256:

`929e7efc1c4948b342186495544f2867fa9899a60aaca189c737b6616801a5cc`

## P1: Forensic Baseline

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P1-SRC-001` | `SRC` | blob, line-count, byte-count, and file-type manifests; `reports/P1.1-repository-and-dependency-inventory.md` | Exact tracked repository shape and runtime-source size at baseline | indexed |
| `EV-P1-SRC-002` | `SRC` | `EV-P1-SRC-002-imports.txt`; responsibility map in the P1.1 report | Static module relationships and current responsibility hubs | indexed |
| `EV-P1-SRC-005` | `SRC` | `EV-P1-SRC-005-npm-tree.json`; dependency summary in the P1.1 report | Installed direct/transitive dependency tree and the one extraneous local package | indexed |
| `EV-P1-SRC-003` | `SRC` | seven isolated DOM snapshots; `reports/P1.2-product-surface-inventory.md` | Complete primary-surface/state inventory and the observed empty baseline | indexed |
| `EV-P1-DATA-001` | `DATA` | persistence/model-consumer extracts; `reports/P1.3-data-and-model-inventory.md` | Schema, state ownership, persistence, sync lifecycle, active formula, and every model consumer | indexed |
| `EV-P1-IMG-001` | `IMG` | 71 raw JPEG captures, deterministic fixtures, capture metadata, file validation, and `reports/P1.4-screenshot-and-video-baseline.md` | All viewport classes, 26 state results, primary surfaces, and critical runtime/truth failures | indexed |
| `EV-P1-VID-001` | `VID` | capability-gap record in the P1.4 report | Browser surface has no workflow-video recorder; no fabricated substitute was used | indexed gap |
| `EV-P1-MET-001` | `MET` | production build output/file inventory; `reports/P1.5-objective-measurement-baseline.md` | Module, chunk, gzip, duplicated asset, and missing quality-script baseline | indexed |
| `EV-P1-MET-002` | `MET` | runtime, 500-trade scale, and memory-availability JSON | Local paint/resource observations and unvirtualized History scaling | indexed |
| `EV-P1-MET-003` | `MET` | DOM geometry/name, contrast, console, critical viewport, and sync-request JSON | Mobile target/name/contrast signals, runtime diagnostics, and request amplification | indexed |
| `EV-P1-SRC-004` | `SRC` | `reports/P1.6-standards-and-reference-baseline.md` | Dated primary/authoritative baseline for WCAG, mobile browsers, Web Vitals, React/Vite, Cloudflare, and browser storage | indexed |

P1 passed G1 at `AUDIT-P01-GATE-PASSED-2026-07-12`. Physical mobile,
virtual-keyboard, and workflow-video gaps remain explicit for later phases.

## P2: External-Advisor Scope Disposition

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P2-FBL-001` | `FBL` | `fable5/packet-v1/*`, generated 172-row packet manifest, `reports/P2.1-neutral-packet.md` | Neutral packet contains complete authorized visual/source/raw context, separates current and planned models, excludes prior reviews, and matches frozen origins | indexed |
| `EV-P2-FBL-002` | `FBL` | `P2.2-contamination-audit.txt`, `tooling/run-sealed-fable-review.sh`, `reports/P2.2-prompt-contamination-audit.md` | Authored language, packet paths, frozen hashes, read-only execution flags, and output-sealing behavior pass before execution | indexed |
| `EV-P2-FBL-003` | `FBL` | failed run metadata and hashes; `reports/P2.3-fable-usage-block.md` | Committed Fable 5 max-effort execution reached the service but produced no review because usage credits were exhausted | indexed blocker |
| `EV-P2-DEC-004` | `USR` | owner instruction, `D-018`, `reports/P2.4-owner-scope-disposition.md`, `gates/GATE-P02.md` | Owner explicitly removed Fable 5 while retaining every non-Fable audit, prototype, validation, and roadmap requirement | indexed |

P2 historical external-advisor artifacts remain preserved, but no substantive
review exists and no later phase depends on one.

## P3: Product and Workflow Audit

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P3-SRC-001` | `SRC` | App/TradeEntry/trade-store lifecycle trace; `reports/P3.1-jobs-and-operating-loop.md` | Current Act-Confirm-Understand-Review ownership, implicit defaults, local persistence, cloud wait, and destination transitions | indexed |
| `EV-P3-MET-001` | `MET` | `P3.1-operating-loop.json`; controlled M04 basic and slow-sync runs | Minimum interaction counts and the measured separation between immediate local equity update and delayed sheet release | indexed |
| `EV-P3-SRC-002` | `SRC` | App/Analysis render-state trace; `reports/P3.2-information-architecture.md` | Destination ownership, duplicate concept placement, unmount behavior, and absence of route semantics | indexed |
| `EV-P3-MET-002` | `MET` | `P3.2-information-architecture.json`; controlled destination/subtab/reload/scroll tests | URL, nested-tab, scroll, reload, and browser-history context are not preserved | indexed |
| `EV-P3-SRC-003` | `SRC` | workflow/store/connectivity/import/export/settings traces; `reports/P3.3-canonical-workflows.md` | Canonical workflow implementation, retained state, delete semantics, recovery triggers, and source-only capability boundaries | indexed |
| `EV-P3-MET-003` | `MET` | `P3.3-canonical-workflows.json`; controlled W01-W17 execution | Pass/partial/fail state for all canonical workflows at the mobile audit viewport without production access | indexed |
| `EV-P3-DEC-004` | `DEC` | `reports/P3.4-feature-portfolio.md` | Evidence-backed retain/redesign/remove/defer/add decision for every current and requested feature family | indexed |
| `EV-P3-COPY-005` | `SRC` | rendered/source copy inventory; `reports/P3.5-content-and-trust.md` | Material conflicts between labels/promises and actual model, sync, recovery, and simulation semantics | indexed |
| `EV-P3-WEB-006` | `WEB` | dated official-source matrix; `reports/P3.6-comparative-product-research.md` | Current journaling/mobile patterns for capture, retrieval, review, costs, screenshots, imports, and reviewer access | indexed |

P3 passed G3 with all W01-W17 workflows either executed or explicitly capability-
gapped. Open findings remain implementation obligations rather than gate blockers.

## P4: Mobile Visual Audit

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P4-IMG-001` | `IMG/MET` | 71-image corpus, viewport geometry; `reports/P4.1-layout-geometry.md` | Portrait/minimum/landscape hierarchy, scroll, clipping, and fixed-layer behavior | indexed |
| `EV-P4-TYPE-002` | `SRC/IMG` | font/source and visual scan; `reports/P4.2-typography-and-numeric-scanning.md` | Current display/UI/numeric roles and tiny-text/system-font inconsistencies | indexed |
| `EV-P4-COLOR-003` | `MET/SRC` | contrast/token inventory; `reports/P4.3-color-and-visual-semantics.md` | Semantic color overload and bounded contrast failures | indexed |
| `EV-P4-CMP-004` | `MET/IMG` | geometry/name scan; `reports/P4.4-components-and-touch.md` | Component, target, naming, nested-action, and overflow debt | indexed |
| `EV-P4-VIS-005` | `IMG/SRC` | monument/chart/progress corpus; `reports/P4.5-charts-progress-monument.md` | Identity strength, duplication, chart legibility, and target monument states | indexed |
| `EV-P4-MOTION-006` | `SRC` | complete motion inventory; `reports/P4.6-motion-and-feedback.md` | Continuous decorative-motion density and incomplete reduced-motion coverage | indexed |
| `EV-P4-DIR-007` | `DEC` | `reports/P4.7-visual-directions.md` | Three materially different visual hypotheses | indexed |
| `EV-P4-DEC-008` | `DEC` | `reports/P4.8-direction-comparison.md` | Weighted direction comparison and evidence-backed Summit Ledger recommendation | indexed |

## P5: Frontend Audit

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P5-SRC-001` | `SRC` | line/byte/import/hook inventory; `reports/P5.1-responsibility-map.md` | Current responsibility hubs and target module boundaries | indexed |
| `EV-P5-STATE-002` | `SRC/DATA` | App/store/settings trace; `reports/P5.2-state-and-persistence.md` | Duplicated state, transient context, split media, and target ownership | indexed |
| `EV-P5-ARCH-003` | `SRC/DEC` | style/component inventory; `reports/P5.3-component-and-design-system-architecture.md` | Absence of enforceable component semantics and proposed architecture | indexed |
| `EV-P5-PERF-004` | `MET/SRC` | build/runtime/scale baseline; `reports/P5.4-rendering-and-delivery.md` | Startup, asset, list, chart, and target delivery budgets | indexed |
| `EV-P5-OPS-005` | `SRC/OPS` | scripts/workflow/deploy inventory; `reports/P5.5-testability-maintainability.md` | Missing verification stack and split hosting/deployment authority | indexed |

## P6: Backend, Data, and Sync Audit

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P6-API-001` | `SRC/WEB` | client/Worker/provider trace; `reports/P6.1-api-storage-contract.md` | Current full-blob KV contract mismatch and free-tier Durable Object target | indexed |
| `EV-P6-DATA-002` | `DATA` | actual merge scenario JSON; `reports/P6.2-merge-conflict-scenarios.md` | Duplicate IDs, tie order, resurrection, undo, clock-skew, and schema behavior | indexed |
| `EV-P6-LIFE-003` | `SRC/DATA` | schema/import/export/media/payload trace; `reports/P6.3-data-lifecycle.md` | Migration, transaction, attachment, tombstone, export, and scaling lifecycle gaps | indexed |
| `EV-P6-SYNC-004` | `SRC/MET` | W12/W13/W17 plus sync trace; `reports/P6.4-sync-ux-truth.md` | UI claims versus actual local/transport/acknowledgement states | indexed |
| `EV-P6-OPS-005` | `SRC/WEB` | endpoint/config/provider review; `reports/P6.5-threat-and-operations.md` | Informational access, integrity, availability, privacy, observability, and recovery risks | indexed |

## P7: Mathematical Model Audit

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P7-SPEC-001` | `SPEC` | `reports/P7.1-canonical-model-specification.md` | Language-independent `100k-pchip-v1` anchors, interpolation, boundaries, precision, and invariants | indexed |
| `EV-P7-DEC-002` | `DEC` | D-019 through D-024; `reports/P7.2-boundary-decisions.md` | All model boundary questions Q-001 through Q-006 resolved | indexed |
| `EV-P7-SEM-003` | `SPEC` | `reports/P7.3-outcome-and-cost-semantics.md` | Gross 1:1, explicit outcomes, BE, net P&L, costs, cadence, and validity boundary | indexed |
| `EV-P7-HIST-004` | `SPEC/DATA` | `reports/P7.4-historical-versioning.md` | Immutable execution snapshots and non-destructive migration policy | indexed |
| `EV-P7-MET-005` | `MET` | 100,000-sample vector/invariant output; `reports/P7.5-parity-invariants.md` | Anchor exactness, monotonicity, boundaries, and cross-consumer parity fixture | indexed |

## P8: Performance, Accessibility, and Resilience

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P8-MET-001` | `MET` | repeated production build/local isolated runtime; `reports/P8.1-loading-runtime-performance.md` | Deterministic bundle/asset/console budget failures and bounded local runtime | indexed |
| `EV-P8-SCALE-002` | `MET/SRC` | 500-history DOM/serialization/full-blob trace; `reports/P8.2-dataset-scaling.md` | Unbounded render and full-dataset operation scaling | indexed |
| `EV-P8-A11Y-003` | `MET/SRC/IMG` | geometry/name/contrast/manual association audit; `reports/P8.3-accessibility.md` | Target, name, label, focus, chart, contrast, color, text, and motion blockers | indexed |
| `EV-P8-COMPAT-004` | `IMG/SRC` | 13 viewport classes and platform source trace; `reports/P8.4-browser-device-compatibility.md` | Emulated coverage, landscape failure, safe-area/keyboard gaps, and physical-device limits | indexed |
| `EV-P8-RES-005` | `MET/SRC` | W03/W06/W07/W12-W17 and failure fixtures; `reports/P8.5-resilience.md` | Offline, slow, reconnect, network, crash, conflict, delete, media, and malformed-state behavior | indexed |

## P9: Synthesis and Confluence

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P9-HASH-001` | `HASH` | 34-report/finding manifest; `reports/P9.1-audit-freeze.md` | Complete immutable input boundary for synthesis | indexed |
| `EV-P9-XREF-002` | `XREF` | `reports/P9.2-contradiction-register.md` | Cross-domain contradictions and contract-level resolutions | indexed |
| `EV-P9-CONF-003` | `XREF/DEC` | `reports/P9.3-evidence-confluence.md` | Supporting and counter-evidence for each product direction | indexed |
| `EV-P9-PRI-004` | `DEC` | `reports/P9.4-prioritization.md` | Scored sequencing and one primary owner for all unresolved findings | indexed |
| `EV-P9-USR-005` | `USR` | explicit owner instructions; `reports/P9.5-owner-alignment.md` | Prototype direction aligns with recorded owner constraints without new assumptions | indexed |

## P10: North-Star Prototype Specification

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P10-IA-001` | `SPEC` | `spec/P10.1-information-architecture.md` | Route ownership, navigation, overlays, restoration, responsive hierarchy | indexed |
| `EV-P10-FLOW-002` | `SPEC` | `spec/P10.2-workflow-specification.md` | W01-W17 interaction, copy, validation, keyboard, failure, and recovery contracts | indexed |
| `EV-P10-DS-003` | `SPEC` | `spec/P10.3-design-system.md` | Summit Ledger foundations, primitives, patterns, charts, motion, and accessibility | indexed |
| `EV-P10-ARCH-004` | `SPEC` | `spec/P10.4-prototype-architecture.md` | Isolated module/data/model/fixture architecture and quality budgets | indexed |
| `EV-P10-SCOPE-005` | `SPEC/DEC` | `spec/P10.5-prototype-scope-contract.md` | Functional/simulated boundary, fixtures, acceptance matrix, and reviewer script | indexed |

## P11: Interactive Prototype Build

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P11-SCAF-001` | `SRC/OPS` | implementation commit; `reports/P11.1-prototype-scaffolding.md` | Dedicated branch, namespace, runtime guards, and protected-tree integrity | indexed |
| `EV-P11-FOUND-002` | `SRC/IMG/MET` | shell/tokens/primitives; `reports/P11.2-prototype-foundation.md` | Summit Ledger foundation, mobile hierarchy, interaction geometry, and accessibility defaults | indexed |
| `EV-P11-FLOW-003` | `SRC/MET` | ledger/model/capture/tests; `reports/P11.3-core-vertical-slice.md` | Functional explicit-capture, local receipt, progress, and canonical-risk loop | indexed |
| `EV-P11-SURF-004` | `SRC` | Journal/Insights/System routes; `reports/P11.4-review-surfaces.md` | Bounded history, edit/recovery, review, plan, projection, and continuity surfaces | indexed |
| `EV-P11-HARN-005` | `DATA/SRC` | deterministic fixtures and Review route; `reports/P11.5-review-harness.md` | Eleven resettable states and visible capability disclosure | indexed |
| `EV-P11-DEPLOY-006` | `OPS/HASH` | separate Cloudflare project; `reports/P11.6-staging-delivery.md` | Public isolated staging, source/artifact traceability, direct routes, and production separation | indexed |
| `EV-P11-REPAIR-007` | `SRC/MET/OPS` | repaired source/deployment; `reports/P11.7-contract-parity-repair.md` | Transparent G11 reopening and verified closure of W03-W10/W15-W17 parity gaps | indexed |

## P12: Prototype Validation and Adversarial Audit

| Evidence ID | Type | Artifact(s) | What it proves | State |
|---|---|---|---|---|
| `EV-P12-FUNC-001` | `MET/SRC` | browser scripts/tests; `reports/P12.1-functional-validation.md` | W01-W17 functional/simulated boundaries and repaired workflow outcomes | indexed |
| `EV-P12-VIS-002` | `IMG/MET` | six-image corpus; `reports/P12.2-visual-device-validation.md` | Summit Ledger hierarchy, critical states, large text, zero Capture overflow, and device limit | indexed |
| `EV-P12-QUAL-003` | `MET/SRC` | build/geometry/contrast/scale scans; `reports/P12.3-performance-accessibility.md` | Budget reduction, bounded data, names, headings, target sizes, contrast, focus | indexed |
| `EV-P12-ADV-004` | `MET/SRC` | misuse/failure matrix; `reports/P12.4-adversarial-review.md` | Defects discovered, repaired, retested, and residual limitations | indexed |
| `EV-P12-CRIT-005` | `XREF/DEC` | clean-rubric critique; `reports/P12.5-internal-second-pass.md` | Separate internal critique and evidence-backed disposition | indexed |
| `EV-P12-OWNER-006` | `USR` | `reports/P12.6-owner-review-package.md` | Complete staging/scenario/limitation package awaiting owner verdict | awaiting owner |
