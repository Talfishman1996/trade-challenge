# Context Recovery and Compaction Defense

Purpose: allow a completely new Codex session with zero conversation history to
resume safely, prove the real state, and avoid repeating or falsely completing work.

`TRACKER.md` remains the sole status authority. If this document conflicts with the
tracker, stop and reconcile the conflict before doing work.

## 1. Immutable Recovery Anchor

Never modify these references:

- tag: `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`
- local branch: `checkpoint/PRE-100K-MIGRATION-2026-07-12`
- local commit: `ed845a576e38741c9d7b70888774cc9fe623bc6f`
- GitHub snapshot commit: `5a35dd9dc4d32ff55b98cc13afbabcebdf5abd4e`
- canonical tree: `c41314cdedb14c64e64386cbce7534de9a2002d5`
- permanent marker: `https://github.com/Talfishman1996/trade-challenge/issues/1`

The checkpoint restore record is:

`docs/checkpoints/PRE-100K-MIGRATION-2026-07-12.md`

## 2. Cold-Start Read Order

A new session must read these files before inspecting application code:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/checkpoints/PRE-100K-MIGRATION-2026-07-12.md`
4. `docs/audit-rebuild/README.md`
5. `docs/audit-rebuild/MASTER-PLAN.md`
6. `docs/audit-rebuild/TRACKER.md`
7. `docs/audit-rebuild/evidence-index.md`, when it exists
8. `docs/audit-rebuild/findings-registry.md`, when it exists
9. `docs/audit-rebuild/EVIDENCE-AND-GATES.md`
10. `docs/audit-rebuild/DECISIONS-RISKS-QUESTIONS.md`
11. `docs/audit-rebuild/FABLE5-PROTOCOL.md` only for historical P2 evidence
12. the latest committed session log and prior gate report, when they exist

Historical `.claude/` plans and `docs/2026-04-16-*` files are supporting evidence,
not current truth.

## 3. Session Start Verification

Before any execution work:

1. Run `git status --short` and record unexpected changes.
2. Run `git branch --show-current` and compare with the tracker.
3. Verify protected tag, branch, commit, and tree.
4. Read the tracker from top to bottom.
5. Identify the one `IN_PROGRESS` subphase or confirm none exists.
6. Verify that the previous gate passed and its evidence is present.
7. Verify all referenced hashes before trusting generated artifacts.
8. Read open Blocker/Critical risks and unresolved questions for the active phase.
9. Check that production and checkpoint references are outside the write scope.
10. Create or update the session write-ahead log before the first material action.

If any step fails, do not continue based on memory or chat history.

## 4. Write-Ahead Session Log

At execution time, each session receives:

`docs/audit-rebuild/session-log/YYYY-MM-DD-HHMM-{phase}.md`

The log begins before work and contains:

```text
Session ID:
Timestamp/timezone:
Branch and HEAD:
Active phase/subphase:
Prior gate verified:
Objective:
Read scope:
Write scope:
Expected evidence IDs:
Commands/tools planned:
Production access prohibited/allowed:
Known risks:
Stop condition:
```

During work, append short factual entries containing:

- timestamp
- action
- files/URLs/states inspected
- evidence IDs created
- result and uncertainty
- decision/risk/question IDs opened or changed
- next exact action

Never write credentials, tokens, session cookies, or private cloud payloads into a
committed session log.

## 5. Save Frequency

Durable state must be updated:

- before any long-running simulation, browser sweep, batch edit, or model call
- after each completed capture matrix row or coherent evidence batch
- immediately after a decision changes scope
- before reading a large external-model response
- before anticipated context compaction
- before switching branches or tools
- after any failure that changes the next action
- at least once every 30 minutes during continuous execution

Chat updates do not satisfy this requirement.

## 6. Anti-Compaction Rules

1. The tracker contains status, not prose memory.
2. The session log contains chronology, not status authority.
3. The evidence index contains proof pointers, not conclusions.
4. The findings registry contains conclusions, not raw command dumps.
5. Decisions and risks use stable IDs and never disappear through rewriting.
6. Every generated artifact receives a manifest entry and hash.
7. Every phase ends with a gate report and Git checkpoint.
8. No new session assumes an uncommitted change belongs to Codex.
9. No task is repeated until existing evidence is checked.
10. No task is skipped because a prior chat message claimed completion.

## 7. Completion Truth Table

| Situation | Correct status |
|---|---|
| Code written but not tested | `IN_PROGRESS` |
| Command passed but evidence not indexed | `IN_PROGRESS` |
| Evidence exists but gate not audited | `EVIDENCE_READY` |
| Visual review covers only one viewport | `IN_PROGRESS` |
| An external recommendation appears without validation | historical evidence only, not complete |
| Gate criteria fail | `GATE_FAILED` |
| Gate passes and checkpoint exists | `GATE_PASSED` |
| Later evidence contradicts a pass | `REOPENED` |
| Owner chooses not to pursue an item | `DEFERRED` with decision ID |

## 8. Branch and Checkpoint Flow

Planning branch:

`plan/mobile-first-audit-prototype-2026-07-12`

After greenlight, P0 creates a dedicated audit branch. P10 approval creates a
separate prototype branch. Exact names are recorded in the tracker before use.

Rules:

- never work directly on the protected checkpoint branch
- never force-update a passed phase tag
- never mix unrelated user changes into a phase commit
- never deploy a prototype build to the production Pages project
- never put private cloud data in Git
- verify checkpoint tree at every gate

## 9. Failure Recovery

### Session loss with intact repository

1. Follow the cold-start read order.
2. Verify tracker and latest committed session log.
3. Inspect uncommitted changes without discarding them.
4. Match changes to the recorded write scope.
5. Resume the exact `next action` or mark the state uncertain and revalidate.

### Corrupted working branch

1. Do not alter the protected checkpoint.
2. Create a fresh recovery clone or branch from the latest passed phase tag.
3. Restore only verified evidence and commits after that tag.
4. Re-run the affected gate.

### Complete local loss

Use the GitHub protected branch or the verified Git bundle described in the
checkpoint record. Reconstruct generated evidence from manifests where possible.

### Invalid or missing evidence

Set the affected subphase to `REOPENED` or `GATE_FAILED`. Reproduce the evidence;
do not infer it from summaries.

## 10. Gate Close Handoff

Every passed phase must leave a handoff containing:

- phase and gate
- branch, commit, tag, and tree
- evidence manifest hash
- exact commands and environments
- findings/decisions/risks/questions changed
- unresolved limitations
- protected-checkpoint verification result
- next phase's first permitted action
- explicit statement that production was or was not touched

## 11. Current Recovery Fact

As of 2026-07-12 after automated P12 validation:

- local working branch: `codex/summit-ledger-prototype-2026-07-12`
- local evidence commit: `6caf0ca`; local automated-evidence tag:
  `AUDIT-P12-AUTOMATED-EVIDENCE-READY-2026-07-12`
- remote recovery branch with byte-verified final source/evidence:
  `codex/summit-ledger-prototype-2026-07-12`
- remote squashed recovery commit: `bb997ff2ccd4a02ee14827016747cd7dc8e8f14e`
  before this final breadcrumb update; local and remote histories intentionally differ,
  while sampled file hashes match exactly
- stable staging URL: `https://summit-ledger-prototype.pages.dev/`
- final staging deployment ID: `786fa9c7-497e-433e-8403-935396881aad`
- original checkpoint tree remains
  `c41314cdedb14c64e64386cbce7534de9a2002d5`; production was not replaced
- P0-P7 and P9-P11 passed; P8 remains an intentional current-app quality failure
- P12.1-P12.5 automated evidence passes; P12.6 and G12 await owner review
- Fable 5 remains retired under D-018 and must not be reintroduced
- P13 and all production replacement/migration work remain blocked until owner
  prototype acceptance is recorded

The tracker remains the status authority if any later commit changes these facts.

## 12. Cold-Start Recovery Prompt

```text
Resume the TradeVault mobile-first audit/prototype program from durable state only.
Read AGENTS.md, CLAUDE.md, the protected checkpoint record, and every file under
docs/audit-rebuild in the prescribed order. Treat TRACKER.md as the only status
authority. Verify Git refs, the prior gate, evidence hashes, branch, and working
tree before acting. Do not modify the protected checkpoint or production. Continue
only the exact next authorized subphase, and do not claim completion without a
passed evidence gate and checkpoint.
```

## 13. Plan-Only Stop Rule

While `TRACKER.md` says `PLAN_VALIDATED_AWAITING_GREENLIGHT`, a session may inspect
or explain the plan but must not begin P0, capture audit evidence, invoke a retired advisor,
write prototype code, or deploy staging.
