# TradeVault - 20K to 10M Challenge

## Project Type
React single-page app -- mobile-first trading risk dashboard with trade tracker.

## Stack
- React 19 + Vite 7
- Tailwind CSS v4 (@tailwindcss/vite)
- Recharts (charts)
- Framer Motion (animations)
- Lucide React (icons)
- localStorage + IndexedDB for local persistence
- Cloudflare Pages frontend + Cloudflare Worker sync backend

## Commands
```bash
npm install          # Install dependencies
npx vite             # Dev server -> http://localhost:5173
npx vite build       # Production build -> dist/
npx vite preview     # Preview production build
```

## Architecture
- **Math model:** 2/3 Power Decay position sizing with fixed 1:1 risk/reward.
- **Key function:** `rN(equity)` returns the active decay risk fraction at the given equity level.
- **Anchor equity:** $87,500, where active risk is about 33%.
- **Trade outcome rule:** a win adds one decay-sized 1R amount; a loss subtracts the same decay-sized 1R amount.
- **Historical plan:** `docs/2026-04-16-rebuild-plan.md` preserves earlier implementation and recovery context; it is not current status authority.

## Planned $100K Audit and Prototype Program

- Start at `docs/audit-rebuild/README.md`.
- Treat `docs/audit-rebuild/TRACKER.md` as the only execution-status authority.
- The current plan state is `PLAN_VALIDATED_AWAITING_GREENLIGHT`.
- Do not begin audit capture, invoke Fable 5, write prototype code, or deploy staging
  without explicit owner greenlight.
- Never modify the protected checkpoint identified in
  `docs/checkpoints/PRE-100K-MIGRATION-2026-07-12.md`.

## File Layout
```
src/
  math/          # Pure math functions (risk, monte carlo, constants, format)
  store/         # State management (trades, settings) with localStorage
  components/    # React components (App, Home, Trades, Analysis, Settings, etc.)
  main.jsx       # Entry point
  index.css      # Tailwind import
```

## Conventions
- Mobile-first responsive design (bottom tabs on mobile)
- Dark theme (slate-950 background, emerald/rose/amber accents)
- Monospace numbers (font-mono tabular-nums)
- localStorage for local persistence (key: "risk-engine-data")
- Cloudflare Worker sync is active for cross-device use
- No user auth layer yet -- internal single-user tool
