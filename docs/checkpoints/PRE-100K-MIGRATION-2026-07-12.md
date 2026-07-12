# LOCKED CHECKPOINT: PRE-100K MIGRATION

> **DO NOT DELETE, MOVE, OR REUSE THESE REFERENCES.** This checkpoint preserves the exact `$20K -> $10M` TradeVault application before any migration to the new `$100K -> $10M` risk model.

## Checkpoint Identity

- Status: **LOCKED AND VERIFIED**
- Created: 2026-07-12, America/Los_Angeles
- App identity: `$20K -> $10M Challenge`
- Math model: `2/3 Power Decay` with fixed `1:1` gross reward/risk
- Canonical live URL at checkpoint: `https://tradevault-b7t.pages.dev`
- Local checkpoint commit: `ed845a576e38741c9d7b70888774cc9fe623bc6f`
- Local annotated tag: `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`
- Local protected branch: `checkpoint/PRE-100K-MIGRATION-2026-07-12`
- Canonical Git tree: `c41314cdedb14c64e64386cbce7534de9a2002d5`
- GitHub snapshot commit: `5a35dd9dc4d32ff55b98cc13afbabcebdf5abd4e`
- GitHub protected branch: `checkpoint/PRE-100K-MIGRATION-2026-07-12`
- GitHub URL: `https://github.com/Talfishman1996/trade-challenge/tree/checkpoint/PRE-100K-MIGRATION-2026-07-12`
- Permanent GitHub marker: `https://github.com/Talfishman1996/trade-challenge/issues/1`

The local and GitHub commits have different commit SHAs because the local branch contained nine commits that were not yet on GitHub. Their Git tree SHA is identical, proving that every tracked file and byte in the application snapshot matches.

## Verification

- `npm run build`: passed on 2026-07-12
- Vite transformed 2,791 modules successfully
- Canonical tracked files: 51
- Canonical tracked size: approximately 8.7 MB
- Git bundle verification: complete history, valid
- Local checkpoint tree: `c41314cdedb14c64e64386cbce7534de9a2002d5`
- GitHub checkpoint tree: `c41314cdedb14c64e64386cbce7534de9a2002d5`
- Production deployment was not changed while creating this checkpoint

## Recovery Artifacts

All local artifacts are stored in:

`output/checkpoints/PRE-100K-MIGRATION-2026-07-12/`

| Artifact | Purpose | SHA-256 |
|---|---|---|
| `tradevault-pre-100k-migration.gitbundle` | Full Git history, checkpoint branch, and annotated tag | `c6c0321644ed2bd9ad64359d4aacff169452df2653c1f936ba6afab00a9098d0` |
| `tradevault-pre-100k-migration-source.tar.gz` | Standalone exact tracked source tree | `5004b7e8a10fbce7db3f4c79ee00915352d190b1817df296ff7515598aa1c1b6` |
| `pre-100k-model-research.tar.gz` | Model research, simulation outputs, reports, and PDFs | `6b9cb08c30c08bf107a630af928bc9b11b7ccba1be82916181f7c4bb6d6d3a2b` |
| `cloud-trade-data.json` | Private snapshot of the shared Cloudflare trade dataset | `dc365c39f10b94aa631139fdaf009b3df67c8cfcd415474ad6fa1d48bd0f0354` |
| `tracked-tree-manifest.txt` | Exact tracked Git tree manifest | `29ae6cf5ecc3ef85a44a07cfeacaba1619cac307b5bcfddd792c045489d4b3fb` |
| `working-tree-untracked-manifest.txt` | Inventory of untracked research and scratch files | `adb57e464b5a342fbc1a4c408b230c66a60ee3600918fff5fc262cb398797d31` |

`SHA256SUMS.txt` is the machine-readable checksum list.

## Cloud Data Snapshot

The private Cloudflare snapshot reported:

- Initial equity: `$20,000`
- Active trades: `0`
- Tombstones: `14`
- Cloud `lastModified`: `1783324870482`

This file must remain private. It is intentionally excluded from the public GitHub checkpoint.

## Safe Restore Methods

### Restore from GitHub without touching the current project

```bash
git clone --branch checkpoint/PRE-100K-MIGRATION-2026-07-12 \
  https://github.com/Talfishman1996/trade-challenge.git \
  tradevault-restored-20k
```

### Restore from the complete local Git bundle

```bash
git clone \
  output/checkpoints/PRE-100K-MIGRATION-2026-07-12/tradevault-pre-100k-migration.gitbundle \
  tradevault-restored-20k
```

### Inspect the original checkpoint inside this repository

```bash
git switch --detach CHECKPOINT-PRE-100K-MIGRATION-2026-07-12
```

Use a separate clone for recovery whenever possible. Do not overwrite a newer working tree until the restored build has been inspected and tested.

## Scope Boundary

The checkpoint preserves the complete canonical source application, Worker source, deployment configuration, current model research, generated reports, and the shared cloud trade dataset.

The following are deliberately not treated as canonical application state:

- `node_modules/` dependencies, because `package-lock.json` reproduces them
- generated `dist/assets/`, because `npm run build` reproduces them
- `.claude/` session caches and `tmp/` scratch computations
- AppleDouble `._*` filesystem metadata
- browser-local settings stored only in `localStorage`
- screenshots stored only in a device's IndexedDB

Device-local browser settings and IndexedDB screenshots are not synchronized by the current app and cannot be recovered from the Cloudflare dataset. This limitation existed before the checkpoint.
