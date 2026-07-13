# TradeVault - 100K to 10M Challenge

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
- **Math model:** `100k-pchip-v1` smooth dollar-risk interpolation with fixed gross 1:1 risk/reward.
- **Key function:** `plannedRisk(equity)` returns status, dollar risk, risk fraction, segment, and model ID.
- **Anchors:** $100K/15%, $200K/12.5%, $500K/10%, $1M/7.5%, $2M/6%, $5M/5%, $10M/3%.
- **Trade outcome rule:** new entries are win or loss only and require manually entered nonzero net P&L.
- **Plan:** `docs/original-mobile-100k/IMPLEMENTATION-PLAN.md` is the active implementation contract.
- **Protected baseline:** never modify `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`.
- **Advisor rule:** do not invoke Fable 5 for this program.

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
- localStorage for local persistence (key: `tradevault-data-100k-v1`)
- Cloudflare Worker sync is active for cross-device use
- No user auth layer yet -- internal single-user tool
