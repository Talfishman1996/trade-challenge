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
npm run test:sync-backend
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
- Every device automatically connects to the same cloud dataset from the clean app URL.
- Cloud payload sealing remains an internal implementation detail, not a login or setup step.
- The app uses isolated local-storage and cloud-vault namespaces.
- Record IDs, update timestamps, revisions, and tombstones support cross-device merges.
- Rolling cloud restore points and guarded restore live in Settings.
- The installable PWA shell supports offline relaunch while the local outbox preserves disconnected edits.

## Architecture

```text
src/components/   Original TradeVault UI and workflows
src/math/         Canonical sizing, simulations, analytics, and formatting
src/store/        Settings and local-first trade state
src/crypto/       Vault-scoped key derivation and AES-256-GCM encryption
src/utils/        Data normalization, merge, import/export, and image caching
worker/           Cloudflare Worker + SQLite Durable Object vault backend
test/             Node model and data-integrity tests
e2e/              Playwright mobile, PWA, export, and zero-setup sync tests
```

The immutable pre-migration checkpoint is
`CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`. Current production is Cloudflare
Pages at `https://vault100k.pages.dev/`; GitHub Actions verifies the build
but does not host or deploy it.
