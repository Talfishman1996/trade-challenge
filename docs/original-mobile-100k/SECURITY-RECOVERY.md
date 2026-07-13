# Security and Recovery Runbook

## What Protects the Vault

- The URL fragment contains `<vault-id>.<vault-secret>` and is never sent to the
  server by normal browser navigation.
- The browser stores the capability on that device, strips the fragment, derives
  scoped encryption keys with HKDF-SHA256, and seals content with AES-256-GCM.
- The Worker stores only a SHA-256 hash of the capability for authorization and
  ciphertext for synchronized content.
- AES-GCM additional authenticated data binds ciphertext to vault, content kind,
  and record ID so a sealed value cannot be moved to another context undetected.
- The SQLite Durable Object serializes record-level operations and revisions.

## Normal Recovery

1. Open Settings -> Encrypted Recovery.
2. Refresh backups and select the intended restore point.
3. Download the encrypted backup first if an additional local artifact is useful.
4. Choose Restore and type the exact confirmation shown by the app.
5. Keep the app open until sync reports success.
6. Refresh the second device and verify trade count, recent records, settings, and
   at least one chart image.

Restore creates a pre-restore backup before applying the selected snapshot. It
does not lower server revisions, so devices receive the restored state as newer
data rather than fighting it as stale data.

## Suspected Link Leak

1. Do not delete the old vault or clear the only connected device.
2. On a trusted connected device, open Settings -> Private Link Rotation.
3. Confirm rotation and keep the app open during copy and verification.
4. Store/share the new private link through a trusted channel.
5. Open the new link once on every device and verify records and chart images.
6. Stop using the old origin/link after all devices agree.

Rotation creates a new vault and secret, encrypts the current dataset again,
copies image assets, verifies all record IDs, creates a backup, and only then
switches the current device. The old vault is intentionally retained as rollback.

## Lost Device

If a device is lost but another trusted device remains connected, rotate the link
immediately from the trusted device. If no connected device and no private link
remain, Cloudflare ciphertext cannot be decrypted; there is intentionally no
password reset or server-side recovery key.

## Production Rollback

1. Prefer fixing forward if the Worker schema and encrypted data remain healthy.
2. If the frontend is broken, deploy the last known compatible v3 frontend while
   retaining the v3 Worker and Durable Object.
3. Never deploy the unauthenticated legacy Worker over the production Worker.
4. Use a separate worktree from the immutable checkpoint for visual comparison.
5. Do not point the original 20K checkpoint directly at the v3 encrypted vault.

## Secret Handling Rules

- Never commit, paste into documentation, log, screenshot, or echo the full private
  link or capability secret.
- Keep `tmp/tradevault-production.local` local and Git-ignored.
- Do not send a backup without its security context: ciphertext plus the matching
  capability together reveal the content.
- Do not treat the clean Pages URL as a secret; it contains no capability.
- Rotate after accidental disclosure instead of trying to edit the old secret.
