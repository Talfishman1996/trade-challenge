# Mobile-First Audit and Prototype Program

Status: `PLAN_VALIDATED_AWAITING_GREENLIGHT`

This directory is the authoritative control system for the `$100K -> $10M`
TradeVault audit, redesign, and interactive prototype program.

No audit execution, Fable 5 review, application implementation, staging deploy,
production deploy, or data migration is authorized while the status above remains
`PLAN_VALIDATED_AWAITING_GREENLIGHT`.

## Immutable Baseline

The original `$20K -> $10M` application remains protected by:

- tag: `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`
- branch: `checkpoint/PRE-100K-MIGRATION-2026-07-12`
- local commit: `ed845a576e38741c9d7b70888774cc9fe623bc6f`
- GitHub snapshot: `5a35dd9dc4d32ff55b98cc13afbabcebdf5abd4e`
- tree: `c41314cdedb14c64e64386cbce7534de9a2002d5`

Nothing in this program may move, rewrite, force-update, delete, or reuse those
references. All work occurs on separate branches and uses a non-production data
adapter until a later owner-authorized production phase.

## Authority Map

Each document has one job. Information must not be duplicated across documents
unless it is a short link to the authoritative source.

| Document | Sole authority |
|---|---|
| `MASTER-PLAN.md` | Scope, phase order, subphases, dependencies, outputs, and stop points |
| `TRACKER.md` | Current status, next action, gate state, checkpoint ledger, and completion truth |
| `EVIDENCE-AND-GATES.md` | Evidence IDs, capture matrices, quality thresholds, gate packets, and proof rules |
| `DECISIONS-RISKS-QUESTIONS.md` | Owner decisions, open questions, assumptions, risks, and mitigations |
| `FABLE5-PROTOCOL.md` | Independent second-brain packet, neutral prompt, sealing, and confluence process |
| `CONTEXT-RECOVERY.md` | Session recovery, write-ahead notes, compaction defense, and cold-start procedure |

Historical documents under `docs/2026-04-16-*` and `.claude/` are evidence only.
They are not current status authorities because they contain superseded `$20K`
assumptions, previously completed work, and older product decisions.

## Locked Product Inputs

- Reviewers will use and criticize the product as a personal trading tracker.
- Reviewers do not need persistent individual accounts or isolated production data.
- The target identity is `$100K -> $10M Challenge`.
- Gross reward/risk is fixed at `1:1`.
- The selected sizing anchors are `$100K 15%`, `$200K 12.5%`, `$500K 10%`,
  `$1M 7.5%`, `$2M 6%`, `$5M 5%`, and `$10M 3%`.
- Between anchors, dollar risk uses shape-preserving PCHIP against log equity;
  percentage risk equals dollar risk divided by equity.
- Planning assumptions include `10%` break-even trades and `3.5` trades/month.
- Mobile is primary. Tablet and desktop are secondary compatibility surfaces.
- Every current visual element is open to criticism or replacement.
- At least three mobile visual directions will be evaluated under identical tasks,
  content, states, viewports, fidelity, weighted criteria, and hard-failure rules.
- Codex performs the structured direction/task evaluation; no separate human pilot
  or in-product reviewer-feedback instrumentation is part of this program.
- Fable 5 is an independent advisor, not an authority and not an implementation
  instruction source.
- The first authorized stopping point is a validated interactive prototype and
  production rebuild roadmap, not a production replacement.

The binding disposition of every accepted or rejected pre-greenlight gap is in
`DECISIONS-RISKS-QUESTIONS.md`, section 2. Excluded expansions must not be silently
reintroduced during execution.

## Reading Order

1. `README.md`
2. `MASTER-PLAN.md`
3. `TRACKER.md`
4. `EVIDENCE-AND-GATES.md`
5. `DECISIONS-RISKS-QUESTIONS.md`
6. `FABLE5-PROTOCOL.md`
7. `CONTEXT-RECOVERY.md`

## Activation Rule

Only an explicit owner greenlight may change the tracker from
`PLAN_VALIDATED_AWAITING_GREENLIGHT` to `P0_IN_PROGRESS`.

Until then, the correct next action is: **wait**.
