# GATE-P00: Activation and Isolation

Gate state: `GATE_PASSED`

Audit date: 2026-07-12, America/Los_Angeles

Branch: `codex/audit-mobile-first-2026-07-12`

## Objective and Scope

Prove that the final plan is authorized, the original checkpoint remains exact and
recoverable, audit work is isolated on its own branch, raw evidence is private by
default, required tooling exists, and application workflows can be inspected without
writing to production.

Included subphases: `P0.1`, `P0.2`, `P0.3`, `P0.4`.

Excluded from this gate: P1 evidence capture, Fable execution, app redesign,
prototype implementation, staging, production deployment, and data migration.

## Completed Task Evidence

| Subphase | Evidence | Result |
|---|---|---|
| P0.1 Authorization record | `EV-P0-CMD-001` | pass |
| P0.2 Baseline protection verification | `EV-P0-CMD-002`, `EV-P0-CMD-003` | pass |
| P0.3 Working branch isolation | `EV-P0-CMD-004` | pass |
| P0.4 Toolchain and privacy boundary | `EV-P0-CMD-005` | pass |

Evidence manifest:
`output/audit-rebuild/P0/checkpoint/MANIFEST.sha256`

Evidence manifest SHA-256:
`929e7efc1c4948b342186495544f2867fa9899a60aaca189c737b6616801a5cc`

Manifest verification: all eleven raw evidence files returned `OK` during the gate
audit.

## Commands and Environment

- Git `2.50.1`
- Node.js `22.15.0`
- npm `10.9.2`
- Wrangler `4.83.0`
- Claude Code `2.1.205`
- Browser: connected Chrome extension with explicit `390x844` viewport for the
  isolation proof
- Fixture: in-memory schema/version `2` empty audit dataset
- Isolation server: `http://127.0.0.1:4174/`

Exact command outputs and remote GitHub JSON are preserved under the manifest.

## Findings and Risks

| Item | Gate disposition |
|---|---|
| `F-OPS-HIGH-001` | closed for P0 after ignore rule validation |
| `F-SYNC-CRITICAL-001` | contained for audit; remains open for P6/P10/P11 product remediation |
| `R-001` checkpoint mutation | not triggered; refs and trees exact |
| `R-002` prototype/production Worker contact | contained before audit capture; no prototype exists |
| `R-010` context loss | tracker, session log, evidence index, and gate report durable |
| `R-019` evidence loss | raw files hashed; durable manifest hash recorded |
| `R-023` Fable model unavailable | not triggered; CLI exposes requested model and effort |

No finding was deleted or hidden to pass this gate.

## Budget and Question Review

Performance and UX budgets are not applicable to P0. No product question was
resolved by assumption. `A-001` is partly verified for repository identity and
remains open for P1 live-surface comparison. No P1-P13 question is silently closed.

## Source Diff Review

- Tracked application source diff from starting plan commit: none.
- Control-plane changes: `.gitignore`, audit control documents, evidence index,
  findings registry, session log, and this gate report.
- Durable audit control: `docs/audit-rebuild/tooling/vite-isolated.config.mjs`.
- Existing unrelated untracked research/output directories were neither staged nor
  modified as part of the gate checkpoint.

## Protected Checkpoint Re-verification

| Ref | Commit | Tree | Result |
|---|---|---|---|
| Local tag, peeled | `ed845a576e38741c9d7b70888774cc9fe623bc6f` | `c41314cdedb14c64e64386cbce7534de9a2002d5` | pass |
| Local checkpoint branch | `ed845a576e38741c9d7b70888774cc9fe623bc6f` | `c41314cdedb14c64e64386cbce7534de9a2002d5` | pass |
| GitHub checkpoint branch | `5a35dd9dc4d32ff55b98cc13afbabcebdf5abd4e` | `c41314cdedb14c64e64386cbce7534de9a2002d5` | pass |

## Pass/Fail Criteria

| Criterion | Verdict | Evidence |
|---|---|---|
| Authorization is explicit and durable | pass | `EV-P0-CMD-001` |
| Protected references verify | pass | `EV-P0-CMD-002`, `EV-P0-CMD-003` |
| Recovery artifacts verify | pass | `EV-P0-CMD-002` |
| Work is isolated from plan/checkpoint branches | pass | `EV-P0-CMD-004` |
| Raw evidence cannot be staged accidentally by default | pass | `F-OPS-HIGH-001` closure |
| Audit workflows can avoid production sync | pass | isolation marker and intercepted boot/interval requests |
| Fable capability verified without running review | pass | `EV-P0-CMD-005` |
| Tracked application source unchanged | pass | scoped Git diff |

## Adversarial Self-Audit

What could make this result wrong:

- The scratch guard could be bypassed if a workflow uses a different server or the
  production Worker origin changes. Mitigation: every browser workflow must assert
  the DOM isolation marker before interaction; endpoint inventory is repeated in P1.
- A matching archive hash proves artifact integrity, not that every future restore
  will work on every machine. The Git bundle itself was also structurally verified;
  a full disaster-recovery rehearsal is explicitly outside scope under `SD-011`.
- Browser viewport evidence is emulated, not physical-device proof. It is labeled as
  such and cannot satisfy later real-device requirements.
- Claude CLI help proves model selection support, not response quality or account
  quota at future execution time. P2 must record the actual model identifier and run
  status.

The gate still passes because each uncertainty is bounded, recorded, and does not
invalidate safe audit execution.

## Checkpoint Record

Evidence content commit: `43dd70f64603a5faee9a38dc6fed0ffa129aa1a5`

Gate tag: `AUDIT-P00-GATE-PASSED-2026-07-12`

Next phase authorization: P1 may start after the tracker validation commit is made
and the annotated gate tag exists.
