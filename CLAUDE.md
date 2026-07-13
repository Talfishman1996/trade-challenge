# TradeVault - 100K to 10M Challenge

## Project Type
React single-page app -- mobile-first trading risk dashboard with trade tracker.

## Stack
- React 19 + Vite 7
- Tailwind CSS v4 (@tailwindcss/vite)
- Recharts (charts)
- Framer Motion (animations)
- Lucide React (icons)
- Vault-scoped localStorage operation queue + IndexedDB image cache
- Cloudflare Pages frontend + strongly consistent SQLite Durable Object backend
- Web Crypto AES-256-GCM end-to-end encryption + installable offline PWA shell

## Commands
```bash
npm install          # Install dependencies
npx vite             # Dev server -> http://localhost:5173
npm run build        # Production build + service-worker asset injection -> dist/
npm run check        # Unit, Worker, mobile browser, build, and dependency gates
npm run test:sync-backend # Isolated encrypted smoke test against deployed Worker
npx vite preview     # Preview production build
```

## Architecture
- **Math model:** `100k-pchip-v1` smooth dollar-risk interpolation with fixed gross 1:1 risk/reward.
- **Key function:** `plannedRisk(equity)` returns status, dollar risk, risk fraction, segment, and model ID.
- **Anchors:** $100K/15%, $200K/12.5%, $500K/10%, $1M/7.5%, $2M/6%, $5M/5%, $10M/3%.
- **Trade outcome rule:** new entries are win or loss only and require manually entered nonzero net P&L.
- **Plan:** `docs/original-mobile-100k/IMPLEMENTATION-PLAN.md` is the active implementation contract.
- **Protected baseline:** never modify `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`.
- **Production recovery:** `docs/2026-07-13-private-vault-production-handoff.md` is the current deployment and sync handoff.
- **Access model:** no account/login; one unguessable private capability link is captured once per device and then removed from the address bar.
- **Encryption model:** the capability secret derives vault-scoped AES-GCM keys in the browser; Cloudflare stores ciphertext for trades, settings, preferences, backups, and images.
- **Recovery model:** rolling daily/manual encrypted backups, guarded restore, and verified private-link rotation are available in Settings.
- **Offline model:** local-first writes plus an injected PWA application shell support installed/offline relaunch; pending writes retry after reconnect.
- **Advisor rule:** do not invoke Fable 5 for this program.

## File Layout
```
src/
  crypto/        # Client-side key derivation and authenticated encryption
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
- localStorage data, outbox, signatures, and settings are scoped by private vault ID
- IndexedDB is a local cache for image blobs; encrypted image copies sync through the vault API
- Every mutation saves locally first, queues durably, and retries on boot/focus/connectivity/interval/manual sync
- Cloudflare Worker stores per-record revisions in a SQLite Durable Object; stale devices cannot overwrite newer records
- API v3 stores sealed payloads and exposes authenticated asset, backup, restore, and sync routes
- Capability secret exists only in the URL fragment/device storage and `tmp/tradevault-production.local`; never commit or print it in logs
