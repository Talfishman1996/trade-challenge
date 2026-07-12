# TradeVault Independent Review Packet

Packet version: `P2-V1`

This directory contains the complete context authorized for an independent review
of TradeVault. It is a factual packet, not a prior review.

Read in this order:

1. `PROMPT.md`
2. `FACTS.md`
3. `ASSET-MANIFEST.tsv`
4. every file named by `ASSET-MANIFEST.tsv`

Directory roles:

- `app-source/`: tracked application, Worker, package, build, and deployment source
- `evidence/screenshots/`: unannotated current-state captures using synthetic data
- `evidence/fixtures/`: deterministic synthetic datasets used for those captures
- `evidence/metrics/`: raw build, runtime, scale, geometry, console, network, and
  contrast outputs
- `evidence/source/`: raw file, import, dependency, and responsibility extracts
- `evidence/data/`: raw persistence and model-consumer extracts
- `evidence/surfaces/`: raw visible-text and runtime-state extracts

The packet intentionally contains no prior findings registry, severity labels,
redesign proposal, gate verdict, or advisor output.
