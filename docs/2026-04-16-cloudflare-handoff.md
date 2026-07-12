# Cloudflare Handoff

## Recommended target

- Frontend: Cloudflare Pages
- Pages project: `tradevault`
- Canonical frontend URL: `https://tradevault-b7t.pages.dev`
- Branch alias URL: `https://master.tradevault-b7t.pages.dev`
- Latest deployment URL: `https://ee8cb290.tradevault-b7t.pages.dev`
- Sync API: Cloudflare Worker
- Current worker endpoint: `https://tradevault-sync.talfishmanbusiness.workers.dev`

## Commands

```bash
npm run build
npm run deploy:cloudflare
npm run deploy:worker
```

## Deployment status

- Wrangler authentication is complete.
- Frontend deployment is live on Cloudflare Pages.
- Sync worker deployment is live on Cloudflare Workers.
- Current sync worker version is `4fe71140-d2f8-4250-ae0a-a54c54eff246`.
- Pages production branch is now `master`.
- Root Pages URL no longer depends on the `master.` alias.

## What is already done

- Frontend Vite base defaults to `/` for Cloudflare-friendly deployment.
- Wrangler is installed in dev dependencies.
- Frontend and worker deploy scripts exist in `package.json`.
- Sync UI and repo docs were updated to match the Cloudflare-first direction.
- The app now opens directly to Home instead of a sync gate.
- Sync now uses one always-on shared vault for this internal app.
- Frontend now reflects 2/3 Power Decay sizing with fixed 1.0:1 reward/risk.
- Model-layer projections now also enforce fixed 1.0:1 reward/risk through `TARGET_RR`; Monte Carlo, milestones, probability cone, streak math, and geometric growth no longer accept a variable reward-ratio input.
- The persistent sync control no longer floats over page content; desktop uses a compact sidebar sync button, and mobile uses a compact floating button above the bottom nav.
- Log Trade no longer saves drafts or auto-fills the P&L amount from 1R; the user manually enters profit/loss for each trade.

## What remains

1. Optional: attach a custom domain if you want a cleaner public URL than `tradevault-b7t.pages.dev`.
2. Before forcing a custom-domain redirect, decide whether old browser-local screenshots/settings need a migration strategy.
3. Continue performance and architecture cleanup from the rebuild roadmap.
