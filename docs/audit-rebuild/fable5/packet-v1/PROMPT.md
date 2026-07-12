# Independent Review Request

You are independently reviewing a mobile-first personal trading tracker called
TradeVault. Reviewers will operate a later prototype as a personal tracker and
provide criticism; they do not require persistent individual accounts.

Use only the files in this packet. Begin with `README.md` and `FACTS.md`, then read
`ASSET-MANIFEST.tsv` and inspect every listed artifact. Inspect every screenshot,
not only a sample. Treat filenames and fixture IDs as neutral state labels. Do not
seek another model's analysis, parent-directory project instructions, prior review,
or internet commentary.

The packet distinguishes the current tracked `$20,000` implementation from the
planned `$100,000` to `$10,000,000` challenge. Gross reward/risk is fixed at `1:1`.
Planning scenarios use `10%` break-even trades and `3.5` trades per month. The
factual model section defines the planned sizing anchors and interpolation intent.

Perform your own review from first principles. Analyze product purpose, repeated
mobile workflows, information architecture, interaction states, UI composition,
typography, numeric scanning, color, spacing, copy, motion, charts, progress
communication, accessibility, frontend structure, backend/data behavior,
synchronization semantics, model communication, reliability, performance, missing
capabilities, overlapping capabilities, and alternative product/design directions.
Account for portrait phone constraints first, including one-handed use, long
content, interruption, offline operation, save confirmation, recovery, and device
switching. Consider landscape, tablet, and desktop as secondary compatibility
surfaces.

For each finding, provide:

- a unique external finding ID
- observed evidence with exact file IDs or source paths
- separation of observation, inference, and preference
- user or system impact
- expected frequency
- confidence and uncertainty
- a proposed validation method
- a recommended disposition and its tradeoffs

Identify contradictions and missing evidence. Do not convert an unavailable
measurement into a pass or failure. Do not assume current structure, features,
visual language, or wording must remain. Propose at least three coherent mobile
product/design directions where tradeoffs are real, compare them under the same
tasks and states, and state what evidence would decide between them. Rank
recommendations, but do not imply that every recommendation should be implemented.

Return one structured Markdown report with these sections:

1. Evidence coverage ledger, including all 71 screenshot IDs
2. Product and operating-loop assessment
3. Mobile workflow and information-architecture assessment
4. Visual, content, chart, motion, and accessibility assessment
5. Frontend architecture and delivery assessment
6. Backend, data, synchronization, and recovery assessment
7. Planned model communication and decision-boundary assessment
8. Feature portfolio and missing-state assessment
9. Three or more coherent product/design directions
10. Ranked recommendations
11. Contradictions and evidence gaps
12. Concise uncertainty register

Use maximum supported reasoning. The report will remain sealed until an independent
internal audit is frozen, so write it as a standalone assessment without asking for
follow-up interaction.
