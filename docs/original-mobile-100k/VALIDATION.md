# Hardened Release Validation Record

Captured: 2026-07-13 PDT

## Release Under Test

- Canonical production: `https://tradevault100k.pages.dev/`
- Compatibility origin: `https://tradevault-b7t.pages.dev/`
- Worker: `https://tradevault-sync.talfishmanbusiness.workers.dev`
- Protected checkpoint: `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`
- Protected commit/tree: `ed845a576e38741c9d7b70888774cc9fe623bc6f` /
  `c41314cdedb14c64e64386cbce7534de9a2002d5`

## Automated Gates

- 21 Node tests pass: model anchors/invariants, validation, merge/tombstones,
  exports, image references, and cryptographic round trips.
- Local Worker black-box verification passes: ciphertext-only content, encrypted
  images, unauthorized rejection, automatic/manual backups, conflict handling,
  restore, and asset retention.
- 8 Playwright tests pass: fresh-device private-link gate, phone trade entry,
  removed strategy/tags, real JSON/CSV downloads, service-worker offline relaunch,
  verified capability rotation, and overflow checks at three viewports.
- Production build completes and injects all hashed JS/CSS assets into the service
  worker cache list.
- Dependency audit reports zero vulnerabilities.
- Worker dry-run is a required pre-deploy gate.

## Browser Evidence

| Viewport | Surface | Result |
|---|---|---|
| 320x568 | Trade Entry | pass; sticky actions, scrollable content, no lateral overflow |
| 390x844 | Home | pass; original mountain hierarchy and milestones preserved |
| 390x844 | Settings | pass; sync/recovery/rotation readable and nonblocking |
| 390x844 | Trade Entry | pass; removed fields absent and controls remain touchable |
| 844x390 | Home | pass; compact side rail and hero action remain usable |

Current evidence:

- `evidence-hardening/01-home-390x844.png`
- `evidence-hardening/02-settings-recovery-390x844.jpg`
- `evidence-hardening/03-trade-entry-390x844.jpg`
- `evidence-hardening/04-trade-entry-320x568.jpg`
- `evidence-hardening/05-home-landscape-844x390.jpg`
- `evidence-hardening/06-live-production-v3-settings.png`

The current visual browser audit produced no console warnings or errors. The
settings screenshot intentionally shows a sync error because it was rendered
against the not-yet-promoted v3 frontend while production still served v2; the
mocked and local v3 automated flows pass.

## Live Production Verification

- Worker version `3acd0bbe-bedf-4979-ac44-78a5f23417a8` reports
  `tradevault-sync-v3` with encrypted assets/backups enabled and legacy API off.
- Isolated remote smoke passed ciphertext trade/image round trips, wrong-secret
  rejection, v2 downgrade blocking, encrypted backup/restore, stale-edit
  rejection, and image retention through restore.
- The real vault matched the private pre-cutover snapshot before migration.
- Two legacy settings records were encrypted; 16 tombstones were preserved; the
  server revision advanced from 18 to 20; an encrypted daily backup was created.
- The real vault's v2 endpoint returns HTTP 426 after encryption.
- Live private-link launch strips the fragment and reaches synced Settings with
  one backup card, no horizontal overflow, and zero console errors.
- Cloudflare Pages immutable deployment:
  `https://287e240f.tradevault100k.pages.dev/`.

## Data Guarantees Exercised

- Every mutation is local-first and outbox-backed.
- AES-GCM authentication fails with the wrong capability or context.
- Server responses and backups do not contain a known plaintext sentinel.
- Encrypted image bytes round-trip exactly.
- Stale cross-device edits conflict instead of replacing newer records.
- A stale v2 client receives HTTP 426 after the vault is fully encrypted, blocking
  plaintext downgrade writes.
- Restore creates newer revisions and preserves encrypted image assets.
- Capability rotation verifies all record IDs before switching the current device.
- JSON and CSV exports are generated and read back by the browser test.
- Offline application-shell reload works after service-worker control.

## Physical Device Residual

Automated browser tests cannot prove iOS process eviction, Add to Home Screen
behavior, or the user's second physical device. Those actions remain the final
owner acceptance gate after live deployment; they are not silently marked done.
