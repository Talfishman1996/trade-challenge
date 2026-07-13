# Hyper-Brutal Hardened Release Audit

## Verdict

The app is now a credible single-user, mobile-first internal tool rather than a
prototype pretending browser storage is synchronization. The original mountain
design remains stronger than the attempted redesigns, and it has been preserved.
The important change is beneath the visuals: local-first records, revisioned
cross-device sync, synced images, recovery points, offline relaunch, and repeatable
mobile tests now form one coherent pipeline. Device setup friction has also been
removed: the clean canonical URL opens the same shared data everywhere.

It is not perfect or appropriate for public multi-user deployment. The remaining
risks are explicit below rather than hidden behind the word "secure."

## Problems Eliminated

1. Whole-document cloud overwrites could erase newer mobile records.
2. A fresh device required a private-link paste before the app could render.
3. Origin-scoped browser storage made the clean canonical URL appear broken on a new device.
4. Chart images were silently trapped on one device.
5. Copy/share actions distributed a long capability URL instead of the clean app URL.
6. Recovery depended on exports and hope rather than rolling restore points.
7. Fresh offline launch was not supported.
8. JSON/CSV mobile downloads were not automated.
9. Rich mobile checks were manual evidence rather than a committed test suite.
10. GitHub Pages automation could create a second, divergent production host.
11. Documentation still described v2 limits after the architecture had changed.

## Current Strengths

- The highest-frequency action is one tap from Home and remains usable at 320px.
- Trade entry contains only outcome, direction, net P&L, ticker, timing, optional
  images/risk/notes, and sticky save actions. Drafts, strategy, sizing, and tags are
  gone.
- Sync status is transient during normal use and permanently inspectable/manual in
  Settings without covering navigation.
- Trades and settings save locally first, so closing the page does not wait on a
  network request.
- Each record has an independent revision; stale devices cannot replace a newer
  different-device mutation.
- Every clean-URL visit connects to the shared cloud dataset before React mounts.
- Cloud restore points are self-service and deliberately guarded.
- The PWA cache is generated from the actual build output, avoiding stale hashed
  chunk names.
- Mobile layout, downloads, encryption, Worker routes, and offline relaunch are
  reproducible gates rather than anecdotal checks.

## Residual Risks

### Access control

There is intentionally no meaningful access boundary. The shared capability is
bundled into the deployed frontend, so anyone who can load the app can read,
edit, or restore its data. Client payload sealing may reduce accidental plaintext
exposure in storage, but it is not security against an app visitor. This is the
explicit tradeoff for a clean URL with no login or device setup.

### Metadata leakage

Cloudflare cannot read sealed content, but it can observe vault/asset IDs, request
timing, ciphertext sizes, revision counts, IP/device metadata, and backup timing.

### Asset retention

Encrypted image assets are intentionally retained so backups can restore their
references. There is no garbage collector yet. Long-term heavy image use can grow
Durable Object storage even after trades are deleted.

### Backup boundaries

Backend backup downloads contain sealed record snapshots; image bytes remain in
the vault asset store. JSON export is the readable portable journal copy. A
complete independent disaster archive would still need an asset bundle and import path.

### Operational verification

Emulation cannot prove iOS process eviction, Home Screen installation, mobile file
handling, or the user's exact two-device network conditions. A short physical-phone
acceptance sequence remains mandatory after production promotion.

### Product scope

This is a manual trading journal and risk dashboard, not a broker ledger. It does
not verify Phemex fills, fees, funding, liquidation behavior, or the claimed win
rate. The risk model is planning math, not a promise of reaching $10M.

## Credential Cleanup Note

The project storage was searched for Chase credential material by filename and
content. No Chase password or login record was present, so nothing was deleted.
This avoided deleting unrelated form or application data.
