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

No P1 or later evidence is registered yet.
