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
| `EV-P1-IMG-001` | `IMG` | 70 raw JPEG captures, deterministic fixtures, capture metadata, file validation, and `reports/P1.4-screenshot-and-video-baseline.md` | All viewport classes, 26 state results, primary surfaces, and critical runtime/truth failures | indexed |
| `EV-P1-VID-001` | `VID` | capability-gap record in the P1.4 report | Browser surface has no workflow-video recorder; no fabricated substitute was used | indexed gap |
| `EV-P1-MET-001` | `MET` | production build output/file inventory; `reports/P1.5-objective-measurement-baseline.md` | Module, chunk, gzip, duplicated asset, and missing quality-script baseline | indexed |
| `EV-P1-MET-002` | `MET` | runtime, 500-trade scale, and memory-availability JSON | Local paint/resource observations and unvirtualized History scaling | indexed |
| `EV-P1-MET-003` | `MET` | DOM geometry/name, contrast, console, critical viewport, and sync-request JSON | Mobile target/name/contrast signals, runtime diagnostics, and request amplification | indexed |
| `EV-P1-SRC-004` | `SRC` | `reports/P1.6-standards-and-reference-baseline.md` | Dated primary/authoritative baseline for WCAG, mobile browsers, Web Vitals, React/Vite, Cloudflare, and browser storage | indexed |

P1 evidence production is complete and awaiting G1 audit. Physical mobile,
virtual-keyboard, and workflow-video gaps remain explicit.
