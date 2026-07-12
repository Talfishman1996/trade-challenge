# Fable 5 Independent Review Protocol

Purpose: obtain a genuinely independent product, mobile UX, visual design, and
architecture review from Fable 5 without leading it toward Codex conclusions and
without allowing its output to influence the first Codex audit.

Fable 5 is a second brain and advisor. It is not a decision maker, source of truth,
or substitute for evidence.

## 1. Independence Contract

The first Fable review must satisfy both directions of independence:

1. Fable does not receive Codex opinions, findings, severities, redesign concepts,
   or preferred solutions.
2. Codex does not read Fable's substantive output until the independent Codex audit
   is frozen and hashed in P9.

The response is generated in P2 and marked `SEALED_UNTIL_P9`.

## 2. Allowed Packet Content

- factual product description and intended repeated tasks
- factual reviewer role
- current technology stack
- current route/surface inventory
- raw source responsibility map
- current and selected model specifications stated without judgment
- complete unannotated screenshots and interaction recordings
- viewport, browser, state, and fixture metadata
- raw performance and accessibility outputs
- factual data schemas and API routes
- explicit request for independent criticism, alternatives, and uncertainty

## 3. Prohibited Packet Content

- Codex findings or summaries
- old hyper-audit conclusions
- severity labels
- phrases such as bad, elite, cluttered, beautiful, confusing, outdated, or broken
- statements that a particular element should remain or be removed
- proposed visual directions
- owner reactions to individual current screens
- arguments for the PCHIP curve beyond its factual approved status
- instructions to agree with Codex or maximize overlap
- selective screenshots that conceal states or failures

## 4. Image and Context Manifest

The packet must include, where applicable:

- every primary screen at M01, M04/M05, M06, and M07
- all Trade Entry sections with keyboard closed/open
- Home at empty, normal, drawdown, milestone-near, and target-near states
- Trades at empty, short, normal, and large histories
- Analysis at every tab and chart inspection state
- Settings at top, middle, bottom, destructive, import/export, and sync states
- navigation, overlays, toasts, dialogs, loading, offline, and error states
- portrait and landscape examples
- reduced-motion and large-text examples
- a complete canonical workflow recording
- source and data-flow diagrams stripped of recommendations

Every asset receives a neutral ID. File names may describe state, not quality.

## 5. Neutral Prompt Template

The exact final prompt is frozen and hashed before execution. Its content should
follow this template:

```text
You are independently reviewing a mobile-first personal trading tracker called
TradeVault. Reviewers will operate the prototype as a personal tracker and provide
criticism; they do not require persistent individual accounts.

The planned challenge begins at $100,000 and targets $10,000,000. Gross reward/risk
is fixed at 1:1. Planning scenarios use 10% break-even trades and 3.5 trades per
month. The attached factual model specification defines risk sizing. The attached
screenshots, recordings, source map, state inventory, raw measurements, and data
contracts represent the current application.

Perform your own review from first principles. Do not assume existing structure,
features, visual language, or wording should remain. Analyze product purpose,
mobile workflows, information architecture, UI, typography, color, spacing, copy,
motion, charts, accessibility, frontend structure, backend/data behavior, model
communication, reliability, performance, missing features, redundant features,
and alternative directions.

For each finding, provide evidence from the supplied material, impact, frequency,
confidence, and a proposed validation method. Separate observed facts from
inference and preference. Identify contradictions and missing evidence. Propose
multiple coherent directions where tradeoffs are real. Rank recommendations, but
do not imply that every recommendation must be implemented.

Do not ask for or rely on another model's analysis. Use maximum supported
reasoning. Return a structured report and a concise uncertainty register.
```

The model name, CLI syntax, attachment mechanism, and output format are added only
after P0 verifies actual tool support.

## 6. Execution Procedure

1. Verify the exact Fable 5 model identifier and maximum reasoning option.
2. Start a fresh CLI context with no inherited project conversation.
3. Generate the packet manifest and SHA-256 hashes.
4. Run a contamination scan for prohibited content.
5. Execute the prompt with all approved images/context.
6. Redirect stdout to `output/audit-rebuild/fable5/first-review-sealed.md`.
7. Redirect stderr and run metadata to separate files.
8. Do not print substantive response content to the Codex-visible terminal.
9. Confirm only file existence, byte count, parseability, model ID, exit code, and
   SHA-256 hash.
10. Mark the output `SEALED_UNTIL_P9` in the tracker.

If the CLI cannot avoid displaying output, use a wrapper that writes directly to a
file and returns only metadata. If independence cannot be protected, G2 fails.

## 7. Codex Audit Freeze

Before unsealing Fable output:

- finish the independent Codex findings registry
- finish the controlled visual-direction comparison and preserve its frozen rubric,
  raw scores, hard failures, and evidence links
- resolve internal duplicates
- record evidence IDs, severity, confidence, and proposed validation
- generate a SHA-256 hash
- commit and tag the frozen report
- update P9.1 to `EVIDENCE_READY`

Only then may P9.2 open the sealed response.

## 8. Confluence Procedure

Each Fable item receives an external finding ID and one disposition:

| Disposition | Meaning |
|---|---|
| Shared | Independently identified by both reviews |
| Fable-only | New claim requiring evidence validation |
| Codex-only | Not identified by Fable; remains valid if evidenced |
| Conflict | Reviews recommend incompatible interpretations |
| Preference | Primarily aesthetic or strategic taste |
| Invalid | Unsupported, factually wrong, or outside scope |
| Experiment | Cannot be resolved without prototype/user evidence |
| Deferred | Valuable but outside the prototype contract |

Conflicts are resolved through source evidence, task measurements, visual
experiments, or owner decision. They are never resolved by averaging confidence or
choosing the more eloquent response.

## 9. Prototype Critique Pass

P12 may run a second independent critique using prototype screenshots and the
approved specification. Unlike the first review, it may include known prototype
goals, but it must still exclude Codex's prototype verdict before execution.

The second pass focuses on:

- whether the prototype actually solves the evidenced problems
- new regressions or blind spots
- mobile hierarchy and task clarity
- visual coherence and memorability
- missing states
- accessibility/performance concerns visible in evidence
- claims that require new testing

## 10. Adoption Rule

No Fable recommendation enters the prototype backlog until it has:

- an external finding ID
- evidence or an explicit experiment
- an impact statement
- a disposition
- a validation method
- a recorded decision owner

Novelty, confidence, detail, and model reputation are not sufficient reasons.
