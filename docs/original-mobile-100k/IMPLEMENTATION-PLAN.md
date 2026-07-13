# TradeVault Original Design Restoration Plan

Status: HARDENED PRODUCTION RELEASE IN PROGRESS

## Immutable Baseline

- Protected tag: `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`
- Protected commit: `ed845a576e38741c9d7b70888774cc9fe623bc6f`
- Protected tree: `c41314cdedb14c64e64386cbce7534de9a2002d5`
- Working branch: `codex/tradevault-original-mobile-100k`
- Rule: never move, rewrite, or deploy over the protected checkpoint.

## Product Contract

Preserve the original TradeVault visual identity: mountain monument, summit trail,
dark blue palette, glow, typography, card language, Home/Trades/Analysis/Settings
navigation, and center Log Trade action. The prior Summit Ledger prototype is an
evidence source only; its visual design is not carried into this build.

## Phase 1 - Canonical Model Migration

1. Replace the legacy 20K power-decay engine with `100k-pchip-v1`.
2. Use exact anchors: 100K/15%, 200K/12.5%, 500K/10%, 1M/7.5%,
   2M/6%, 5M/5%, and 10M/3%.
3. Interpolate dollar risk with shape-preserving PCHIP against log equity.
4. Use 15% of strategy equity below 100K; withhold recommendations at or above
   10M and for nonpositive equity.
5. Use gross 1:1 reward/risk and win/loss outcomes only. No break-even outcome or
   break-even simulation probability is permitted.
6. Replace every legacy label, preset, milestone, phase, projection, and stress
   calculation rather than relabeling stale numbers.
7. Stamp new trades with the model ID and execution-time planned risk. Never
   rewrite historical snapshots.

## Phase 2 - Original-Design Mobile Hardening

1. Preserve the mountain hero and primary hierarchy.
2. Support 320px through large-phone widths without document-level overflow.
3. Respect top/bottom safe areas and virtual-keyboard viewport changes.
4. Keep all interactive targets at least 44px where space permits.
5. Make the trade sheet full-height on phones with sticky header and actions.
6. Keep charts responsive and turn dense controls into swipeable, scroll-safe
   regions without shrinking text below useful sizes.
7. Remove the persistent floating mobile sync button. Show only a brief tappable
   sync notice after meaningful background activity; keep permanent controls and
   timestamps in Settings.

## Phase 3 - Data and Sync Reliability

1. Save every mutation locally before network work.
2. Keep record-level IDs, timestamps, tombstones, and deterministic merging.
3. Reject zero P&L and contradictory win/loss values at the form boundary.
4. Guard duplicate submissions and keep edit autosave debounced.
5. Preserve offline writes and retry on focus, connectivity restoration, and the
   adaptive interval.
6. Surface local-only, synced, merged, offline, and error states without blocking
   navigation.

## Phase 4 - Encryption, Recovery, and Offline Continuity

1. Encrypt records, preferences, initial equity, backups, and chart images in the
   browser before upload.
2. Keep the capability secret out of Worker storage and normal request URLs.
3. Add encrypted asset upload/download with IndexedDB as the local cache.
4. Add rolling daily/manual backups, backup download, guarded restore, and
   pre-restore recovery points.
5. Add verified private-link rotation that retains the old vault for rollback.
6. Add an installable PWA shell whose generated cache follows hashed build assets.
7. Add repeatable Playwright coverage for mobile overflow, downloads, rotation,
   and offline relaunch.

## Phase 5 - Verification Gates

- G1: protected checkpoint hashes unchanged.
- G2: canonical anchors and interpolation invariants pass automated tests.
- G3: win/loss-only trade entry rejects zero and preserves manual net P&L.
- G4: stored historical model snapshots are preserved through normalization and
  cloud merge.
- G5: production build passes with no legacy 20K/power-decay product copy.
- G6: Home, Trades, Analysis, Settings, and Trade Entry are visually checked at
  representative phone sizes.
- G7: sync status is nonblocking and manual sync remains available in Settings.
- G8: encrypted Worker integration proves ciphertext-only records/images, backup,
  restore, and stale-write rejection.
- G9: installable application shell reloads offline after initial online control.
- G10: deploy Worker first, pass the isolated remote v3 smoke test, then deploy the
  canonical Cloudflare Pages project.

## Deployment Contract

Cloudflare is the only application host. GitHub stores source and runs verification
but does not deploy Pages. Preserve `tradevault-b7t.pages.dev` as a compatibility
origin until every physical device has opened the canonical private link once.
Production promotion never moves or rewrites the protected checkpoint.
