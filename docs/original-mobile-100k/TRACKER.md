# Original Mobile 100K Release Tracker

Updated: 2026-07-13 PDT

| Phase | State | Evidence |
|---|---|---|
| Immutable baseline | COMPLETE | Protected tag, commit, and tree unchanged |
| Canonical model migration | COMPLETE | Exact anchors and 10,001-point invariant sweep |
| Original-design mobile hardening | COMPLETE | 320x568, 390x844, and 844x390 evidence |
| Trade/data integrity | COMPLETE | Win/loss-only nonzero P&L, snapshots, merge, tombstones |
| Encrypted v3 sync | COMPLETE | AES-GCM records/images and local Worker black-box suite |
| Recovery/rotation | COMPLETE | Daily/manual backup, download, restore, verified rotation |
| PWA/offline shell | COMPLETE | Manifest, icons, generated asset precache, offline relaunch test |
| Automated browser coverage | COMPLETE | 8 Playwright mobile/export/PWA/rotation tests |
| Dependency/security gate | COMPLETE | `npm audit --audit-level=high` reports zero vulnerabilities |
| Adversarial visual audit | COMPLETE | Current screenshots plus zero browser warnings/errors |
| Documentation/CI | COMPLETE | v3 handoff, recovery runbook, verification-only GitHub CI |
| Production deployment | COMPLETE | Worker v3, remote encrypted smoke, Pages, real-vault migration, live UI smoke |
| Physical-phone acceptance | OWNER GATE | Close/reopen, second-device sync, downloads, installed offline launch |

## Locked Decisions

- Preserve the original mountain visual language.
- Use the smooth `100k-pchip-v1` model from 100K to 10M.
- Gross model RR is fixed at 1:1.
- New entries are win or loss only and require manually entered nonzero net P&L.
- Trade entry excludes saved drafts, strategy/sizing fields, tags, and break-even.
- Cosmetic risk settings remain soft controls and never rewrite the curve.
- No login flow; one private capability link connects each device once.
- Encrypt records, preferences, settings, backups, and chart images before upload.
- Keep the immutable original checkpoint unchanged and independently recoverable.

## Remaining Owner Gate

After live deployment, perform one physical-phone round trip because emulation
cannot prove iOS browser lifecycle behavior:

1. Open the canonical private link once and confirm the fragment disappears.
2. Add or edit one unmistakable test record and wait for successful sync.
3. Close the browser/app completely, reopen the clean URL, and verify the record.
4. Open the canonical link on the second device and verify the same record/image.
5. Download JSON and CSV once on the phone.
6. Install to the Home Screen, load once online, then relaunch without connectivity.
7. Remove the synthetic record only after both devices agree.
