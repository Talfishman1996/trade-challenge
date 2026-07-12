# P0 Activation and Isolation Report

Status: `GATE_PASSED`

Captured: 2026-07-12, America/Los_Angeles

Branch: `codex/audit-mobile-first-2026-07-12`

Starting plan commit: `706917dad68f00398754e0ea8e0cfa18d2174844`

## Authorization

The owner authorized execution with the verbatim instruction `do it!`. This starts
the validated P0-P13 program in gated order. It does not authorize modifying the
protected checkpoint, replacing production, migrating data, or allowing prototype
writes to the production Worker.

Evidence: `EV-P0-CMD-001`.

## Protected Baseline Verification

| Check | Expected | Observed | Result |
|---|---|---|---|
| Local protected tag target | `ed845a576e38741c9d7b70888774cc9fe623bc6f` | exact match | pass |
| Local protected branch target | `ed845a576e38741c9d7b70888774cc9fe623bc6f` | exact match | pass |
| Local protected tree | `c41314cdedb14c64e64386cbce7534de9a2002d5` | tag and branch exact match | pass |
| GitHub protected branch | `5a35dd9dc4d32ff55b98cc13afbabcebdf5abd4e` | exact match | pass |
| GitHub protected tree | `c41314cdedb14c64e64386cbce7534de9a2002d5` | exact match from GitHub commit object | pass |
| Six recovery artifact hashes | checkpoint `SHA256SUMS.txt` | all six `OK` | pass |
| Git bundle | complete history with protected branch and tag | verified complete | pass |

The first checksum command was mistakenly run from inside the checkpoint directory
even though its manifest stores project-root-relative paths; it failed to find the
files. The command was corrected from the project root and all six checks passed.
The failed invocation did not write or alter any artifact.

Evidence: `EV-P0-CMD-002`, `EV-P0-CMD-003`.

## Branch and Environment Map

| Environment | Ref or URL | Write rule |
|---|---|---|
| Immutable original | `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12` | never write, move, delete, or force-update |
| Final plan | `PLAN-MOBILE-FIRST-AUDIT-PROTOTYPE-FINAL-SCOPE-2026-07-12` at `706917d` | preserve as planning checkpoint |
| Audit work | `codex/audit-mobile-first-2026-07-12` | audit docs, evidence controls, and later approved code only |
| Local isolated audit app | `http://127.0.0.1:4174/` | scratch in-memory sync fixture only |
| Production Pages | `https://tradevault-b7t.pages.dev/` | read-only baseline observation; no deployment |
| Production sync Worker | `https://tradevault-sync.talfishmanbusiness.workers.dev` | prohibited for audit/prototype writes |
| Prototype staging | not yet assigned | must use fixture/non-production adapter and a separate origin |

The current app hardcodes the production Worker and performs automatic boot sync.
The browser-control surface does not expose network interception, so isolated audit
work uses `docs/audit-rebuild/tooling/vite-isolated.config.mjs`. It injects a guard
before React loads,
intercepts only the production Worker origin, and substitutes an in-memory dataset.
Browser proof observed the `isolated` DOM marker and two intercepted boot `GET`
requests to `/tradevault-main`. No tracked application source was changed for this
harness.

Evidence: `EV-P0-CMD-004`.

## Tool Capability and Privacy Boundary

| Capability | Verified state |
|---|---|
| Git | `2.50.1` |
| Node.js | `22.15.0` |
| npm | `10.9.2` |
| Wrangler | `4.83.0` |
| Claude Code | `2.1.205`, authenticated first-party Max subscription |
| Fable 5 | CLI help exposes alias `fable`, full model `claude-fable-5`, and effort `max`; no review executed |
| Browser control | Chrome extension connection, DOM inspection, screenshots, console logs, and exact viewport override available |
| Image inspection | local image-view tooling available for later visual audit |

Privacy controls:

- `output/checkpoints/` remains ignored.
- `output/audit-rebuild/` is now ignored before raw evidence capture.
- Claude authentication evidence is redacted to status/method/provider/subscription;
  email and organization identifiers are not stored in audit evidence.
- Private cloud data remains outside Git and is not used as a prototype fixture.
- No browser cookies, password stores, or session stores were inspected.
- Raw production screenshots must not include private trade data; deterministic
  workflow captures use the isolated fixture harness.

Evidence: `EV-P0-CMD-005`.

Raw evidence manifest SHA-256:

`929e7efc1c4948b342186495544f2867fa9899a60aaca189c737b6616801a5cc`

## P0 Criterion Review

| Criterion | Result |
|---|---|
| Owner authorization durably recorded | pass |
| Protected local and GitHub refs verified | pass |
| Recovery archives verified | pass |
| Audit branch isolated | pass |
| Raw evidence privacy boundary active | pass |
| Audit app can run without production sync writes | pass |
| Fable capability verified without executing review | pass |
| Production or protected application modified | no |

## Known Limitations and Next Check

- The scratch harness is an audit control, not product code and not a production
  architecture recommendation.
- Opening the app without the harness can contact the live Worker; every automated
  workflow capture must assert the audit marker before interaction.
- The current Chrome connection provides emulated viewport evidence. Physical-device
  evidence remains a later matrix item and must be labeled accurately.
- G0 is not passed until the tracker is reconciled and the gate report independently
  checks this report and its frozen evidence manifest.
