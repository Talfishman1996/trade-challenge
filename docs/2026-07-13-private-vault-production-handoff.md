# TradeVault Shared Cloud Production Handoff

Date: 2026-07-13 (America/Los_Angeles)
Status: v3.2 zero-setup shared release live; immutable original checkpoint preserved

## Production Map

- Canonical Pages origin: `https://vault100k.pages.dev/`
- Compatibility origins: `https://tradevault100k.pages.dev/`, `https://tradevault-b7t.pages.dev/`
- Worker API: `https://tradevault-sync.talfishmanbusiness.workers.dev`
- Canonical Cloudflare Pages project: `vault100k`
- Worker: `tradevault-sync`
- Worker version: `5e415d25-784d-4947-b1f9-641dc78791c9`
- Canonical deployment: `https://0971bdde.vault100k.pages.dev/`
- Legacy canonical deployment: `https://207c886e.tradevault100k.pages.dev/`
- Compatibility deployment: `https://b0cc686b.tradevault-b7t.pages.dev/`
- Durable Object binding/class: `TRADE_VAULTS` / `TradeVault`
- Shared-vault build configuration: `tmp/tradevault-production.local` (Git-ignored)
- Git branch: `codex/tradevault-original-mobile-100k`
- Hardened release commits: `60623a1`, `9a60425`

GitHub is source control and verification only. It is not the production host.
Cloudflare Pages hosts the frontend and a Cloudflare Worker with a SQLite Durable
Object stores the synchronized vault.

## Immutable Recovery Point

Never move, rewrite, delete, or deploy over this checkpoint:

- Tag: `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`
- Commit: `ed845a576e38741c9d7b70888774cc9fe623bc6f`
- Tree: `c41314cdedb14c64e64386cbce7534de9a2002d5`
- Subject: `Remove trade drafts and manualize PnL entry`

Use a separate worktree from the tag for any visual comparison or rollback build.
Never use destructive reset or checkout commands in the active dirty worktree.

## Device Access

Open `https://vault100k.pages.dev/` on any device. A production build reads
the shared-vault configuration at build time, connects before React mounts, and
routes directly to Home. There is no login, private-link paste, fragment, or
first-device setup flow. Settings copies and shares only the clean canonical URL.

This convenience model intentionally provides no meaningful access control:
anyone who can open the deployed app can read and modify its shared data. Client
payload sealing remains in place to avoid a risky storage migration, but its key
ships with the frontend and must not be described as a security boundary.

## v3 Data Pipeline

1. A mutation is normalized, saved to vault-scoped local storage, and queued before
   network I/O.
2. The browser derives vault/kind/record keys with HKDF-SHA256 from the capability
   secret and seals JSON or image bytes with AES-256-GCM.
3. The Worker authenticates the Bearer capability by its SHA-256 hash. The secret
   and plaintext are not stored by Cloudflare.
4. One SQLite Durable Object serializes operations and issues server revisions.
5. Operation IDs make retries idempotent; stale cross-device writes conflict
   instead of silently overwriting newer records.
6. Encrypted chart images are uploaded to vault assets and cached in IndexedDB on
   each device.
7. Automatic sync runs at boot, focus, reconnect, saves, active intervals, and
   explicit manual sync. The local outbox survives reloads and offline periods.
8. Fully synchronized snapshots create rolling daily restore points. Manual
   backup, download, and guarded restore live in Settings.

Cloud storage can still observe metadata such as request timing, ciphertext size,
vault ID, record IDs, and revision counts. Because the frontend ships the shared
key, payload encryption must not be treated as protection from an app visitor.

## v3 API

- `GET /health`
- `GET /v3/vault/:vaultId/snapshot`
- `POST /v3/vault/:vaultId/sync`
- `PUT /v3/vault/:vaultId/assets/:assetId`
- `GET /v3/vault/:vaultId/assets/:assetId`
- `DELETE /v3/vault/:vaultId/assets/:assetId`
- `GET /v3/vault/:vaultId/backups`
- `POST /v3/vault/:vaultId/backup`
- `GET /v3/vault/:vaultId/backup/:backupId`
- `POST /v3/vault/:vaultId/restore`

The authenticated v2 routes remain available only while a vault still contains
legacy plaintext records. Once that vault is fully encrypted, v2 reads/writes
return HTTP 426 so a stale tab cannot downgrade ciphertext back to plaintext. The
unauthenticated legacy whole-document API remains disabled and must continue
returning HTTP 410.

## Recovery

- Daily backup: created after a successful fully encrypted sync; newest 30 restore
  points are retained.
- Manual backup: Settings -> Cloud Recovery -> Create Backup Now.
- Download: exports the backend backup package; use JSON export for a directly
  readable portable copy of journal data.
- Restore: creates a pre-restore snapshot, requires an explicit `RESTORE`
  confirmation, then writes the selected snapshot at newer server revisions.

The historical hardened-vault recovery details and incident sequence are in
`docs/original-mobile-100k/SECURITY-RECOVERY.md`.

## Verification Gates

```bash
npm ci
npm run check
npx wrangler deploy --config worker/wrangler.toml --dry-run
```

`npm run check` covers 21 Node tests, the local encrypted Worker black-box suite,
8 Playwright mobile/PWA/export/shared-access tests, a production build, and dependency
audit. After deploying the Worker, run the isolated remote v3 smoke test before
deploying Pages. It exercises ciphertext records/images, authorization, conflict
handling, downgrade blocking, backup download, restore, and asset retention:

```bash
npm run deploy:worker
npm run test:sync-backend
npm run deploy:pages
```

`npm run deploy:all` executes that sequence. Wrangler must use `--branch master`
for all Pages projects; otherwise a local `codex/...` branch becomes only a
preview deployment. Keep all three origins on the same build until compatibility is
formally retired.

## Post-Deploy Smoke

```bash
curl -fsS https://tradevault-sync.talfishmanbusiness.workers.dev/health
curl -fsS https://vault100k.pages.dev/ | \
  rg 'TradeVault - \$100K to \$10M|manifest.webmanifest|index-.*\.js'
```

Then verify on the physical phone: clean zero-setup Home launch, one manual sync, one small
test edit or trade, background/close/reopen, second-device appearance, JSON/CSV
download, and installed offline relaunch. Delete only the explicit synthetic test
trade after both devices agree.

## Live Cutover Evidence

- Pre-v3 private snapshot saved locally under ignored `tmp/` storage.
- Before cutover: 0 active trades, 16 tombstones, server revision 18, initial
  equity $100,000.
- Production migration encrypted initial equity and preferences in two operations.
- After cutover: 0 active trades, 16 tombstones, server revision 20.
- Daily encrypted restore point exists at revision 20.
- v2 downgrade guard returns HTTP 426 for this encrypted vault.
- Fresh-browser clean-URL smoke opened Home and Settings without a setup gate,
  recorded successful real-vault sync, had no fragment or lateral overflow at
  390x844, and logged zero console errors.
- Canonical and both compatibility origins serve the same production asset hash.
- The production service worker precaches HTML plus every hashed JS/CSS chunk and
  serves cached navigation immediately while revalidating in the background.

## Intentional Limits

- Single-user internal app; no account or password flow.
- Anyone who can load the frontend can access the shared vault; this is an
  intentional zero-friction internal-app choice.
- No Phemex import or execution reconciliation; journal P&L is manual net P&L.
- Encrypted assets are retained for restore safety and currently have no garbage
  collector, so abandoned image storage can grow over time.
- A downloaded backup contains encrypted records, while image ciphertext remains
  in the vault asset store.
- Both compatibility origins stay live until every device is confirmed on the
  canonical origin.
