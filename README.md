# TradeVault

Mobile-first personal trading dashboard for the `$100K -> $10M` challenge. This
branch preserves the original mountain-led TradeVault design while replacing the
legacy sizing engine with the canonical `100k-pchip-v1` model.

## Commands

```bash
npm install
npm run dev
npm run test
npm run build
npm run check
```

## Canonical Model

| Strategy equity | Risk | Planned dollar risk |
|---:|---:|---:|
| $100K | 15.0% | $15K |
| $200K | 12.5% | $25K |
| $500K | 10.0% | $50K |
| $1M | 7.5% | $75K |
| $2M | 6.0% | $120K |
| $5M | 5.0% | $250K |
| $10M | 3.0% | $300K |

Dollar risk uses shape-preserving PCHIP interpolation against log equity. Between
anchors, risk percentage never increases and planned dollar risk never decreases.
Below `$100K`, planned risk is 15% of current strategy equity. At or above `$10M`,
the challenge withholds further recommendations.

The planning model uses gross `1:1` reward/risk and win/loss outcomes only. The
journal requires manually entered nonzero net P&L, which should already include
fees, funding, and slippage.

## Data Integrity

- New records store their execution-time model ID, risk percentage, and dollar risk.
- Historical model snapshots are not rewritten when the equity chain is recalculated.
- Every mutation saves locally before background cloud synchronization.
- The prototype uses isolated local-storage and cloud-vault namespaces.
- Record IDs, update timestamps, revisions, and tombstones support cross-device merges.

## Architecture

```text
src/components/   Original TradeVault UI and workflows
src/math/         Canonical sizing, simulations, analytics, and formatting
src/store/        Settings and local-first trade state
src/utils/        Data normalization, merge, import/export, and images
worker/           Cloudflare Worker KV synchronization backend
test/             Node model and data-integrity tests
```

The immutable pre-migration checkpoint is
`CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`. Prototype work must never move or
rewrite that tag and must deploy separately from the production Pages project.
