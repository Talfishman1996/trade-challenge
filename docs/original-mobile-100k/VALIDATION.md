# Validation Record

Captured: 2026-07-12 PDT

## Automated

`npm run check` passed:

- 7 Node tests passed and 0 failed.
- All six active PCHIP anchor outputs below the terminal boundary are exact.
- A 10,001-point log-equity sweep found no rising risk percentage and no falling
  dollar risk.
- Nonpositive equity withholds sizing; sub-100K equity uses 15%; 10M withholds a
  post-target recommendation.
- New-trade validation accepts positive and negative nonzero cents and rejects
  zero or nonnumeric P&L.
- Historical model ID, planned dollar risk, risk fraction, and revision survive
  normalization and merging.
- The Vite production build completed without warnings.

## Browser Matrix

| Viewport | Surface | Result |
|---|---|---|
| 320x700 | Home and full-height Trade Entry | pass; no horizontal overflow; sticky actions remain visible |
| 390x844 | Home, Journal, Projections, Settings | pass; original mountain retained; all primary routes fit |
| 430x932 | Home | pass; animated labels and trail complete without clipping |
| 844x390 | Home and Trade Entry | pass; landscape sidebar and sheet remain usable |

Interaction checks:

- Every visible navigation action has an accessible name.
- Trade Entry is a modal dialog with Escape handling, focus containment, and
  body-scroll lock.
- `$0` keeps Save disabled; `$1.25` enables Save; Loss changes the sign to `-$`.
- 65%, 70%, and 75% scenario presets update milestones and expected months.
- Projection probabilities are labeled simulated reach and values with no misses
  in 2,000 paths display as `>99.9%`, not certainty.
- Settings exposes 44px switch targets, manual sync, last-sync state, and isolated
  activity history.

## Evidence

- `evidence/01-home-390x844.png`
- `evidence/02-trade-entry-320x700.png`
- `evidence/03-projections-390x844.png`
- `evidence/04-settings-390x844.png`
- `evidence/05-journal-390x844.png`
- `evidence/06-landscape-844x390.png`

## Isolation

- Local data key: `tradevault-data-100k-v1`
- Settings key: `tradevault-settings-100k-v1`
- Sync config key: `tradevault-sync-100k-v1`
- Sync activity key: `tradevault-sync-activity-100k-v1`
- Cloud vault ID: `tradevault-main-100k-v1`
- Production frontend and protected checkpoint were not changed.

## Deployment

- Stable prototype URL: `https://tradevault-100k-prototype.pages.dev/`
- Deployment ID: `b728149f-3029-4edd-b402-4d8b43085885`
- Deployed source commit: `2477069`
- Stable prototype and existing production URLs both returned HTTP 200 after
  deployment.
