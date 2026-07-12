# TradeVault Mobile-First Audit, Redesign, and Prototype Master Plan

Plan date: 2026-07-12

Program status: `EXECUTION_ACTIVE_P3`

## 1. Mission

Produce an evidence-backed, brutally honest reconstruction of TradeVault as the
best possible mobile-first personal operating system for the `$100K -> $10M`
challenge, then demonstrate the recommended direction through a separate,
interactive prototype without altering the protected original application or its
production deployment.

The program is not a cosmetic reskin. It evaluates and reconciles:

- product purpose and daily operating loop
- mobile information architecture and task efficiency
- visual identity and emotional effect
- typography, color, spacing, copy, charts, and motion
- frontend architecture and maintainability
- backend, persistence, sync, and data correctness
- mathematical model integrity and projection honesty
- performance, accessibility, reliability, and failure recovery
- feature value, redundancy, omission, and sequencing
- reviewer comprehension and criticism readiness

Complexity is permitted when it produces measurable quality. Complexity that
cannot be traced to a user need, system risk, or quality requirement is rejected.

## 2. Program Boundaries

### In scope

- exhaustive audit of the current frontend, backend, model, workflow, and design
- complete mobile viewport, state, and interaction evidence capture
- source and dependency inventory down to individual files and responsibilities
- findings registry ranked by severity, frequency, impact, confidence, and effort
- north-star product model, navigation, workflows, design system, and architecture
- controlled comparison of at least three mobile visual directions using identical
  tasks, content, states, viewports, fidelity, and a fixed rubric
- code-based interactive prototype on an isolated branch and staging environment
- prototype validation, adversarial audit, and final production rebuild roadmap
- durable evidence, decisions, checkpoints, breadcrumbs, and recovery records

### Out of scope before later authorization

- changing the protected checkpoint
- replacing the production Cloudflare Pages deployment
- writing prototype data to the production sync Worker
- migrating or rewriting live trade history
- implementing public multi-user accounts, billing, or compliance controls
- formal external-user research or a representative human pilot; Codex performs
  the structured evaluation and the owner remains the approval authority
- a dedicated behavioral/psychological-safety, localization/RTL, or formal
  financial-ethics workstream
- advanced probability-regime, clustered-loss, or fat-tail research beyond
  verifying the app's configured assumptions and outputs
- a separately implemented second mathematical engine; ordinary specification,
  boundary, invariant, and UI-consistency tests remain required
- 10,000-concurrent-reviewer capacity planning, load testing, or cost modeling
- software supply-chain, dependency-license, or package-vulnerability certification
- formal VoiceOver, TalkBack, switch-control, or assistive-technology lab sessions;
  baseline semantic, contrast, target-size, text-scaling, and motion checks remain
- installed-PWA/native mobile integrations such as haptics, share sheets, launch
  screens, platform installation, battery/thermal profiling, or storage-eviction labs
- in-product reviewer telemetry, analytics, or feedback collection infrastructure
- disaster-recovery rehearsal; current backup/restore behavior and a later rollback
  design are still documented
- a peripheral design-asset package covering favicon, app icon, social preview,
  launch artwork, browser chrome, or print/export branding
- treating reviewer feedback as proof without independent validation
- declaring production readiness from prototype evidence alone

## 3. Product North Star

TradeVault should feel like a calm, exact trading command instrument that can also
carry a memorable sense of ascent and ambition. It must not force a choice between
operational precision and emotional identity.

The product should answer five questions immediately:

1. Where is the account now?
2. What is the correct risk for the next trade?
3. What changed because of the latest trade?
4. What deserves attention before another trade is taken?
5. What is the clearest next action?

The experience should support four repeated loops:

- **Act:** calculate risk and record a trade quickly.
- **Confirm:** verify that the trade saved locally and synchronized safely.
- **Understand:** see progress, drawdown, execution quality, and behavior clearly.
- **Review:** convert history into specific changes for the next decision cycle.

## 4. Governing Principles

1. Mobile behavior is designed first, not compressed from desktop.
2. The protected baseline is immutable and independently recoverable.
3. One mathematical function must drive every risk number and projection.
4. Realized P&L remains factual; the model must never silently rewrite it.
5. Sync state is visible, trustworthy, and non-obstructive.
6. Local save must be immediate even when cloud sync is unavailable.
7. Every destructive action is recoverable or explicitly irreversible.
8. Every screen has intentional empty, loading, success, offline, and error states.
9. Motion communicates state or hierarchy; decoration alone cannot justify cost.
10. Copy must say what the system actually does, not what it aspires to do.
11. Reviewer preference is evidence, not automatic product truth.
12. No phase passes based on memory, confidence, or visual intuition alone.
13. Competing visual directions use the same evaluation conditions before any
    direction is selected or blended.

## 5. Audit Coverage Matrix

| Domain | Questions that must be answered |
|---|---|
| Product | What is the indispensable job, daily loop, and emotional contract? |
| Navigation | Can every frequent action be reached quickly with one thumb? |
| Trade capture | Can a familiar user log an accurate trade in under ten seconds? |
| History | Can trades be found, understood, corrected, and recovered safely? |
| Review | Does analytics produce decisions rather than decorative statistics? |
| Home | Is the first screen useful before it is impressive? |
| Progress | Are milestones, projections, and challenge status honest and legible? |
| Typography | Are hierarchy, density, numeric scanning, and input behavior excellent? |
| Color | Is color semantic, accessible, restrained, and consistent? |
| Layout | Does every element survive narrow widths, keyboards, and safe areas? |
| Motion | Does animation clarify, motivate, or confirm without delaying action? |
| Copy | Are labels concise, specific, trustworthy, and consistent? |
| Charts | Are charts readable, inspectable, truthful, and useful on a phone? |
| Accessibility | Do semantics, contrast, target sizes, large text, and reduced motion support baseline access? |
| Frontend | Are responsibilities, state ownership, rendering, and tests sustainable? |
| Backend | Can persistence and sync survive offline use, conflicts, and stale clients? |
| Data | Are dates, trades, images, tombstones, imports, and exports deterministic? |
| Model | Does app math exactly match the selected PCHIP model and report assumptions? |
| Performance | Is initial load and interaction smooth on realistic mobile constraints? |
| Reliability | What happens on refresh, interruption, failure, duplicate input, and recovery? |
| Security | What obvious risks exist even if remediation is not yet required? |
| Operations | Can builds, releases, rollbacks, and diagnostics be repeated reliably? |
| External layers | Would Telegram/reporting add real value, and where should it live? |

## 6. Program Sequence

| Phase | Name | Primary output | Exit gate |
|---|---|---|---|
| P0 | Activation and isolation | Verified working boundary and immutable baseline | G0 |
| P1 | Forensic baseline extraction | Source, screen, state, data, and metric baseline | G1 |
| P2 | External-advisor scope disposition | Preserved attempt evidence and owner scope decision | G2 |
| P3 | Product and workflow audit | Task, IA, feature, and copy findings | G3 |
| P4 | Mobile visual and interaction audit | Pixel/state/motion findings and alternatives | G4 |
| P5 | Frontend architecture audit | Code responsibility and modernization report | G5 |
| P6 | Backend, data, and sync audit | Data-flow, failure, and recovery report | G6 |
| P7 | Mathematical model audit | Tested single-source model specification | G7 |
| P8 | Performance, accessibility, and resilience | Measured compatibility and quality report | G8 |
| P9 | Cross-domain synthesis and prioritization | Frozen audit, contradiction matrix, finding registry | G9 |
| P10 | North-star prototype specification | Approved IA, design system, flows, and prototype contract | G10 |
| P11 | Interactive prototype build | Isolated mobile-first prototype and review harness | G11 |
| P12 | Prototype validation and adversarial audit | Evidence-backed prototype verdict | G12 |
| P13 | Final rebuild roadmap and handoff | Production plan, dossier, and owner decision package | G13 |

No phase may begin until the prior gate passes. Failed gates return work to the
specific subphase that produced the failure. A phase is not complete merely because
all planned commands ran.

## 7. Detailed Phase Plan

## P0: Activation and Isolation

Objective: establish a safe execution boundary before collecting or changing data.

### P0.1 Authorization record

- Record the owner greenlight verbatim in `TRACKER.md`.
- Change program state to `P0_IN_PROGRESS`.
- Record timestamp, branch, HEAD, tool versions, and current live URL.
- Confirm that planning approval does not imply production deployment approval.

### P0.2 Baseline protection verification

- Verify local checkpoint tag, branch, commit, and tree.
- Verify GitHub checkpoint branch and snapshot commit.
- Verify the Git bundle and source archive checksums.
- Confirm no new branch uses the protected checkpoint name.
- Record proof under `evidence/P0/checkpoint/`.

### P0.3 Working branch isolation

- Create a dedicated audit branch from the plan branch.
- Reserve a later prototype branch after G10.
- Configure prototype code to reject the production sync endpoint by default.
- Define separate local, audit, prototype, and production environment names.

### P0.4 Toolchain and privacy boundary

- Inventory browser-control, screenshot, accessibility, profiling, and build tools.
- Verify the audit toolchain without requiring an external-advisor dependency.
- Define synthetic fixture rules and redact secrets from evidence.
- Ensure cloud snapshots remain ignored and private.

### P0 outputs

- activation record
- checkpoint verification report
- branch/environment map
- tool capability matrix
- first phase checkpoint

### G0 pass condition

Protected references verify, no app code has changed, evidence storage is ready,
and all audit work can be performed without touching production data.

## P1: Forensic Baseline Extraction

Objective: capture objective current-state facts before interpretation begins.

### P1.1 Repository and dependency inventory

- Read every tracked source file in full, not only search-result excerpts.
- Account for every export, side effect, persistence call, model call, and runtime
  responsibility; identify code that cannot yet be classified.
- Enumerate every tracked source file and generated/runtime responsibility.
- Map imports, component relationships, state owners, persistence boundaries, APIs,
  build scripts, Worker routes, and deployment configuration.
- Record line counts, complexity signals, duplicate assets, abandoned files, and
  dependency weight without yet assigning design judgments.

### P1.2 Product surface inventory

- Enumerate every route, tab, sheet, dialog, toast, chart, filter, setting, button,
  input, destructive action, status indicator, and external link.
- Capture visible labels and exact copy.
- Build an interaction/state diagram for every surface.

### P1.3 Data and model inventory

- Extract current trade, settings, sync, attachment, tombstone, and export schemas.
- Trace write and read paths from input through local storage, Worker, and UI.
- Extract every math function and every display that consumes model output.
- Record mismatches between current `$20K` app truth and selected `$100K` truth as
  facts, not proposed fixes.

### P1.4 Screenshot and video baseline

- Capture the complete viewport and state matrices defined in
  `EVIDENCE-AND-GATES.md`.
- Capture initial load, key workflows, keyboard-open states, scroll extremes,
  interruptions, offline use, sync transitions, and error recovery.
- Store raw images without annotations so later interpretations remain auditable.
- Create separate annotated copies later for Codex findings.

### P1.5 Objective measurement baseline

- Record build sizes, route chunks, Web Vitals, long tasks, render profiles, network
  requests, accessibility scanner output, console errors, and memory behavior.
- Run fixture sizes from empty through stress-scale histories.
- Record measurement environment and repeatability limits.

### P1.6 Standards and reference baseline

- Research current primary sources for iOS web behavior, Android/Chrome behavior,
  WCAG/WAI accessibility, Web Vitals, React, Vite, Cloudflare Pages/Workers/KV, and
  relevant browser-storage constraints.
- Record publication/version dates and direct citations.
- Separate standards requirements from design preferences.
- Establish a dated reference baseline so later recommendations do not rely on
  stale memory.

### P1 outputs

- repository map
- product surface/state inventory
- data-flow and model-consumer maps
- raw screenshot/video corpus
- baseline performance/accessibility dataset
- dated primary-source standards/reference index
- factual current-state report

### G1 pass condition

Every known surface, state, source responsibility, data path, and model consumer is
represented in the evidence index. Missing states are explicitly listed rather than
silently omitted.

## P2: External-Advisor Scope Disposition

Objective: preserve the attempted independent-review evidence, record the owner's
explicit removal of Fable 5, and eliminate every downstream dependency on it without
weakening the remaining audit.

### P2.1 Preserve neutral packet evidence

- Preserve the factual packet, 71-image corpus, source snapshot, prompt, and hashes.
- Retain it as historical process evidence; do not execute or unseal it.

### P2.2 Preserve contamination-audit evidence

- Preserve the completed prompt/path/execution-boundary audit.
- Keep its findings isolated from the product findings registry.

### P2.3 Preserve failed execution evidence

- Preserve all three identical quota responses, metadata, and hashes.
- Record that no substantive external review was generated.

### P2.4 Owner scope removal and dependency cleanup

- Record the owner's instruction to do everything else with no Fable 5.
- Retire Fable execution, unsealing, confluence, and prototype-critique requirements.
- Replace later external-review steps with evidence-isolated internal contradiction
  and adversarial passes; do not represent those passes as external validation.
- Search all authoritative control documents for hidden mandatory dependencies.

### G2 pass condition

The owner scope decision is indexed, all Fable artifacts remain preserved as
historical evidence, no substantive response exists, every later mandatory Fable
dependency is retired, and P3 has an unambiguous first authorized action.

## P3: Product and Workflow Audit

Objective: determine whether the product's structure and features serve the real
personal trading workflow.

### P3.1 Jobs and operating loop

- Define primary, secondary, infrequent, and emergency jobs.
- Evaluate the Act -> Confirm -> Understand -> Review loop.
- Identify latency, cognitive load, interruption, trust, and recovery costs.

### P3.2 Information architecture

- Audit navigation depth, tab ownership, repeated controls, hidden destinations,
  back behavior, scroll restoration, and task switching.
- Test whether Home, Trades, Analysis, Settings, and Trade Entry have coherent and
  non-overlapping responsibilities.

### P3.3 Workflow scripts

- Execute every canonical and edge workflow in the evidence matrix.
- Count taps, fields, decisions, scroll distance, error opportunities, and elapsed
  time.
- Separate novice friction from repeated-user friction.

### P3.4 Feature portfolio

- Classify every feature as essential, supportive, ceremonial, redundant,
  misleading, missing, or deferred.
- Evaluate checkpoints, progress tracking, review loops, Telegram/reporting,
  screenshots, sync controls, risk settings, projections, and celebrations.
- Require a user or system justification for every proposed addition.

### P3.5 Content and trust

- Audit labels, instructions, warnings, confirmations, units, terminology, and tone.
- Identify copy that exaggerates capability, hides uncertainty, or conflicts with
  actual behavior.

### P3.6 Comparative product research

- Review current personal trading journals, mobile finance tools, high-frequency
  capture workflows, progress systems, and review/coaching products.
- Capture comparable flows and patterns as dated evidence without copying visual
  identity or assuming popularity equals quality.
- Identify category conventions worth preserving, conventions worth rejecting, and
  opportunities not addressed by current products.

### G3 pass condition

Every core workflow has measured friction, every feature has a disposition, and all
findings cite evidence rather than taste alone.

## P4: Mobile Visual and Interaction Audit

Objective: audit every pixel and interaction under realistic phone constraints.

### P4.1 Layout geometry

- Inspect widths, spacing, alignment, rhythm, safe areas, sticky/fixed elements,
  keyboard avoidance, scroll containers, clipping, overlays, and z-index behavior.
- Compare all required viewports and landscape states.

### P4.2 Typography and numeric scanning

- Audit type families, weights, sizes, line heights, tracking, truncation, wrapping,
  numeric alignment, tabular figures, input zoom behavior, and large-text scaling.
- Determine where expressive and utilitarian typography should differ.

### P4.3 Color and visual semantics

- Inventory every color token and one-off value.
- Test contrast, semantic consistency, color-only meaning, chart distinguishability,
  dark-surface elevation, and emotional tone.

### P4.4 Components and touch behavior

- Audit target size, spacing, pressed/disabled/loading states, gesture conflicts,
  reachability, accidental taps, one-handed use, and destructive affordances.
- Inspect every input type with the mobile keyboard open.

### P4.5 Charts, progress, and monument

- Audit chart legibility, inspection, labels, scales, tooltips, empty states, and
  cognitive value.
- Evaluate the mountain, summit trail, milestone storytelling, celebrations, and
  atmosphere without assuming any element must remain.

### P4.6 Motion and feedback

- Inventory entrance, transition, loading, confirmation, celebration, and ambient
  animation.
- Measure duration, interruption, reduced-motion behavior, frame stability, and
  whether motion conveys useful state.

### P4.7 Visual direction alternatives

- Produce at least three evidence-derived visual directions rather than polishing
  only the current theme.
- Explain what each direction optimizes and sacrifices.

### P4.8 Structured direction comparison

- Freeze identical representative content, workflow tasks, product states,
  viewports, and fidelity across every direction before scoring begins.
- Evaluate each direction using the weighted comparison rubric in
  `EVIDENCE-AND-GATES.md`, plus measured task friction and documented hard failures.
- Record the strongest complete direction, rejected directions, transferable ideas,
  unresolved tradeoffs, and confidence without blending concepts prematurely.
- Keep the comparison rubric and scoring isolated from later synthesis preferences.

### G4 pass condition

Every visible component and state has been inspected at required mobile sizes, all
visual findings have coordinates or screenshots, and at least three comparable
directions have been scored under identical conditions with evidence-backed
strengths, failures, and tradeoffs.

## P5: Frontend Architecture Audit

Objective: determine whether the frontend can support the desired experience
without recurring regressions.

### P5.1 Responsibility map

- Map component size, import graph, shared logic, state ownership, side effects,
  async boundaries, and rendering hot spots.
- Identify mixed concerns and duplicate derivations.

### P5.2 State and persistence

- Trace trade, settings, sync, image, navigation, modal, toast, and derived state.
- Identify stale closures, non-atomic updates, duplicated truth, and mutation order
  risks.

### P5.3 Component and design-system architecture

- Audit primitives, tokens, variants, responsive behavior, chart wrappers, forms,
  feedback components, and accessibility conventions.
- Define boundaries between feature code, shared UI, domain math, data services,
  and infrastructure.

### P5.4 Rendering and delivery

- Audit lazy loading, bundle boundaries, image strategy, memoization, animation
  load, chart cost, error boundaries, and loading fallbacks.

### P5.5 Testability and maintainability

- Inventory current automated coverage and untested critical paths.
- Define unit, integration, component, end-to-end, visual, and contract test layers.
- Propose a migration sequence that avoids a high-risk full rewrite.

### G5 pass condition

Every frontend responsibility has a proposed owner and boundary, critical regression
paths have test strategies, and architecture recommendations map to observed risks.

## P6: Backend, Data, and Sync Audit

Objective: prove how data behaves under normal use, interruption, and failure.

### P6.1 API and storage contract

- Document every Worker route, payload, normalization rule, size limit, KV behavior,
  CORS rule, and error response.
- Compare frontend and Worker schemas field by field.

### P6.2 Merge and conflict behavior

- Test concurrent creates, edits, deletes, stale clients, duplicate IDs, clock skew,
  tombstone ordering, retries, and partial failures.
- Verify behavior across phone/desktop sequences and offline recovery.

### P6.3 Data lifecycle

- Audit creation, update, deletion, undo, import, export, clear, image ownership,
  schema migration, backup, and restore.
- Test local dates around timezone and daylight-saving boundaries.

### P6.4 Sync UX truth

- Compare actual local-save and cloud-sync states with displayed status.
- Test backgrounding, focus return, connectivity changes, repeated taps, slow
  requests, and failed requests.

### P6.5 Informational threat and operations review

- Document unauthenticated access, shared identifiers, abuse potential, data loss,
  rate limits, observability, and rollback gaps even though remediation is not a
  prototype requirement.

### G6 pass condition

Data behavior is demonstrated by reproducible scenarios, frontend/backend contracts
are reconciled, and no sync claim remains based only on the happy path.

## P7: Mathematical Model Audit

Objective: make the selected `$100K -> $10M` model an exact, versioned, testable
product truth.

### P7.1 Canonical model specification

- Define anchors, PCHIP dollar-risk interpolation, percentage derivation, precision,
  clamping, and units in one language-independent specification.
- Verify values against the approved analysis artifacts.

### P7.2 Boundary decisions

- Resolve behavior below `$100K`, above `$10M`, at zero/invalid equity, after severe
  loss, and after target completion.
- Distinguish current equity from high-water equity.

### P7.3 Outcome semantics

- Define gross `1:1`, realized manual P&L, break-even classification, fees, funding,
  slippage, and execution profiles without conflating them.
- Separate a recommendation from a historical fact.

### P7.4 Historical model versioning

- Define whether existing trade risk values remain frozen, are recomputed, or are
  displayed under both historical and current models.
- Require explicit model version metadata for future trades and projections.

### P7.5 Parity and invariant tests

- Test every anchor and representative intermediate equity.
- Test percentage nonincrease and dollar-risk nondecrease over at least 50,000
  sampled points.
- Compare JavaScript, simulation, PDF, and displayed UI outputs.
- Verify that configured projection assumptions are passed, displayed, and applied
  consistently without adding a separate regime/fat-tail research program.
- Do not build a separately authored second model engine; these are direct
  specification and product-consistency tests.

### G7 pass condition

One canonical specification drives all test vectors, every boundary is explicit,
and no UI/projection can silently use an alternate risk function.

## P8: Performance, Accessibility, and Resilience

Objective: measure whether the experience remains excellent under realistic mobile
constraints and non-happy-path use.

### P8.1 Loading and runtime performance

- Measure cold/warm load, route chunks, LCP, INP, CLS, long tasks, chart rendering,
  image decoding, animation frames, and memory.
- Test representative mid-tier mobile CPU and network throttling.

### P8.2 Dataset scaling

- Test empty, typical, large, and stress histories.
- Measure list rendering, filtering, analytics, charting, import/export, and sync
  serialization.

### P8.3 Accessibility

- Test semantic structure, labels, focus behavior, contrast, target sizes, 200%
  text, zoom, reduced motion, and color independence.
- Record that formal assistive-technology lab testing is outside this program.

### P8.4 Browser and device compatibility

- Test current and previous major iOS Safari and Android Chrome where available.
- Test browser-tab mode, portrait/landscape, safe areas, and virtual keyboards.

### P8.5 Resilience

- Interrupt saves, kill/reopen the app, reload during sync, duplicate submissions,
  lose connectivity, restore connectivity, and inject malformed data.
- Confirm user-visible recovery paths and absence of silent corruption.

### G8 pass condition

All provisional budgets are measured, deviations are explained, critical workflows
remain usable under constrained conditions, and accessibility blockers are logged.

## P9: Cross-Domain Synthesis and Prioritization

Objective: reconcile the independently completed audit domains, expose internal
contradictions, and produce one evidence-linked product direction without treating
any single domain or aesthetic preference as authority.

### P9.1 Freeze the complete audit

- Finish and hash all P3-P8 findings before synthesis begins.
- Record severity, evidence, confidence, proposed remedy, and uncertainty for every
  finding.

### P9.2 Cross-domain contradiction audit

- Compare product, visual, frontend, backend, model, performance, accessibility,
  and resilience conclusions for incompatible assumptions or recommendations.
- Reopen unsupported findings rather than averaging conflicts.

### P9.3 Evidence confluence matrix

- Classify findings as corroborated, domain-specific, contradictory, preference,
  uncertain, experiment-required, or superseded.
- Investigate conflicts against raw evidence and controlled experiments.
- Record accepted, rejected, deferred, and experiment-required recommendations.

### P9.4 Prioritization

- Score findings by severity, user impact, frequency, confidence, dependency,
  reversibility, effort, and prototype relevance.
- Identify deletions, simplifications, repairs, additions, and experiments.

### P9.5 Owner alignment gate

- Present the brutally honest current-state verdict and recommended product
  direction.
- Obtain owner approval before prototype specification proceeds.

### G9 pass condition

The complete findings registry is evidence-linked, cross-domain conflicts are
resolved or marked unresolved, and the owner approves the direction rather than
individual pixels.

## P10: North-Star Prototype Specification

Objective: translate findings into a complete, testable prototype contract before
writing prototype code.

### P10.1 Information architecture

- Define destination ownership, navigation, modal/sheet behavior, deep links,
  hierarchy, and state restoration.

### P10.2 Workflow specification

- Specify first launch, home, next-risk inspection, trade capture, edit, delete,
  history, review, progress, projections, settings, sync, offline, and recovery.
- Include tap targets, keyboard behavior, validation, copy, loading, and failure
  states.

### P10.3 Design system

- Define typography, numeric styles, color semantics, spacing, radii, elevation,
  grids, icons, controls, data visualization, motion, and accessibility tokens.
- Specify components and variants rather than screen-specific one-offs.

### P10.4 Prototype architecture

- Define fixture-backed data adapters and prohibit production writes.
- Define canonical model module, feature boundaries, route chunks, state ownership,
  error boundaries, and review-only scenario controls.

### P10.5 Prototype scope contract

- List exactly which flows are functional and which are simulated.
- Define reviewer scenarios, fixture datasets, reset controls, and a manual owner
  review guide; do not add feedback telemetry or in-product collection.
- Freeze acceptance criteria and non-goals.

### G10 pass condition

Every prototype screen and state has a specification, all required data exists in
fixtures, and no unresolved structural decision is deferred into implementation.

## P11: Interactive Prototype Build

Objective: implement the approved direction as a functional, isolated mobile-first
prototype.

### P11.1 Prototype checkpoint and scaffolding

- Create a dedicated prototype branch from the approved audit state.
- Record commit, dependencies, fixture checksum, and environment guards.
- Verify protected checkpoint and production URL remain unchanged.

### P11.2 Foundation

- Implement tokens, typography, layout primitives, navigation shell, safe areas,
  feedback system, motion preferences, and accessibility defaults.

### P11.3 Core vertical slice

- Implement Home -> Next Risk -> Log Trade -> Local Save -> Updated Progress.
- Use the canonical `$100K` model and fixture-backed persistence.

### P11.4 Review surfaces

- Implement trade history, edit/recovery, review insights, progress/projections,
  and required settings states to the approved prototype depth.

### P11.5 Review harness

- Add non-production scenario switching for empty, normal, drawdown, target-near,
  offline, sync-error, large-data, and accessibility states.
- Make fixture reset deterministic.

### P11.6 Staging delivery

- Build and deploy to a separate staging URL.
- Confirm no request targets the production Worker.
- Record bundle, deployment, and source commit checksums.

### G11 pass condition

The specified flows are interactive, deterministic, mobile-complete, isolated from
production, and traceable to the approved specification.

## P12: Prototype Validation and Adversarial Audit

Objective: prove the prototype direction rather than merely demonstrate it.

### P12.1 Functional validation

- Execute every prototype workflow and state script.
- Verify save, edit, reset, navigation, model values, and error recovery.

### P12.2 Visual regression and device validation

- Capture every required viewport/state.
- Compare against specifications and inspect all differences.
- Test keyboard, safe-area, large-text, reduced-motion, and landscape states.

### P12.3 Performance and accessibility validation

- Re-run budgets and compare against baseline.
- Resolve blocker/critical issues or fail the gate.

### P12.4 Adversarial review

- Attempt misuse, interruption, rapid input, malformed fixtures, repeated actions,
  and navigation races.
- Reopen any earlier finding contradicted by prototype evidence.

### P12.5 Evidence-isolated second-pass critique

- Re-evaluate the prototype from a clean rubric containing acceptance criteria,
  scenarios, screenshots, metrics, and known non-goals but not the first verdict.
- Record critique findings separately, then compare them with P12.1-P12.4 evidence.
- Label this as an internal adversarial pass, not independent external validation.

### P12.6 Owner prototype review

- Present staging URL, scenario guide, evidence dossier, known limitations, and
  unresolved alternatives.
- Record structured owner feedback manually and disposition every item.

### G12 pass condition

No blocker remains, all critical issues are resolved or explicitly owner-accepted,
quality budgets are reported, and the owner accepts the prototype as the direction
for production planning.

## P13: Final Rebuild Roadmap and Handoff

Objective: convert the validated prototype into an implementation-ready production
program without beginning that program.

### P13.1 Production architecture roadmap

- Define migration waves for model, frontend, data, sync, attachments, testing,
  observability, and deployment.
- Identify parallel workstreams and file ownership boundaries.

### P13.2 Migration and rollback plan

- Specify historical trade treatment, schema versioning, backups, staged rollout,
  compatibility, and rollback triggers.
- Preserve the original checkpoint indefinitely.

### P13.3 Delivery estimates and dependencies

- Estimate effort ranges, critical path, external dependencies, and uncertainty.
- Separate prototype reuse from production hardening work.

### P13.4 Final evidence dossier

- Assemble findings, decisions, contradiction records, specifications, prototype URL,
  screenshots, test results, performance results, risks, and recovery instructions.

### P13.5 Stop and await production greenlight

- Mark the prototype program complete only after G13 evidence is accepted.
- Do not merge into production or deploy over the current app.

### G13 pass condition

The roadmap is implementation-ready, all evidence is indexed, the current and
prototype states are independently recoverable, and the next action is explicitly
an owner decision.

## 8. Checkpoint Strategy

- The original protected tag and branch remain untouched forever.
- Each passed phase receives a new annotated tag named
  `AUDIT-P{NN}-GATE-PASSED-YYYY-MM-DD`.
- Each gate record contains source commit, evidence hashes, test commands, outputs,
  known limitations, and exact restore instructions.
- Prototype work begins from an approved audit checkpoint, never from the protected
  branch directly.
- A failed phase is repaired on its working branch; it does not rewrite a passed
  checkpoint.

## 9. Final Deliverables

- exhaustive current-state audit
- evidence-linked finding registry
- cross-domain contradiction and evidence-confluence records
- product north-star and feature disposition map
- controlled three-direction comparison matrix and selection rationale
- mobile information architecture and workflow specifications
- complete design system and motion/content specifications
- frontend/backend/model production architecture recommendations
- isolated interactive prototype and reviewer scenario harness
- device, accessibility, performance, model, and resilience test reports
- production rebuild roadmap with migrations, checkpoints, and rollbacks
- cold-start recovery pack that does not depend on conversation history

## 10. Current Stop Condition

This master plan is validated, but execution is not authorized.

Current state: `PLAN_VALIDATED_AWAITING_GREENLIGHT`

No phase, including P0, may begin until the owner gives explicit greenlight.
