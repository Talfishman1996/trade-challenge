# Risk Engine - 20K to 10M Challenge

## Project Type
React single-page app -- mobile-first trading risk dashboard with trade tracker.

## Stack
- React 19 + Vite 7
- Tailwind CSS v4 (@tailwindcss/vite)
- Recharts (charts)
- Framer Motion (animations)
- Lucide React (icons)
- localStorage for persistence (no backend)

## Commands
```bash
npm install          # Install dependencies
npx vite             # Dev server -> http://localhost:5173
npx vite build       # Production build -> dist/
npx vite preview     # Preview production build
```

## Architecture
- **Math model:** 2/3 Power Decay position sizing (see .claude/PLAN.md for details)
- **Key function:** `rN(equity)` returns risk fraction at given equity level
- **Anchor equity:** $87,500 (risk = 33% here, decays above, escalates below)
- **Plan:** `.claude/PLAN.md` has full implementation plan with task tracking

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
- localStorage for all persistence (key: "risk-engine-data")
- No backend, no auth -- single-user personal tool
