#!/bin/zsh

set -euo pipefail

ROOT="/Volumes/Storage8TB/projects/20k-10mil-challenge"
PACKET="$ROOT/output/audit-rebuild/fable5/packet-v1"
SEALED="$ROOT/output/audit-rebuild/fable5/sealed"
EXPECTED_MANIFEST_SHA="9c100834710956cba37097ddf7a92b27def19f01c86c1899fe94460d3e4f18c9"
EXPECTED_PROMPT_SHA="56fe13808e1e99f70d01bf919b4467e9dc3b80778683182635ac8c489b338888"
RESPONSE="$SEALED/first-review-sealed.md"
STDERR_FILE="$SEALED/first-review-stderr.txt"
METADATA="$SEALED/first-review-metadata.json"

actual_manifest_sha=$(shasum -a 256 "$PACKET/ASSET-MANIFEST.tsv" | awk '{print $1}')
actual_prompt_sha=$(shasum -a 256 "$PACKET/PROMPT.md" | awk '{print $1}')

if [[ "$actual_manifest_sha" != "$EXPECTED_MANIFEST_SHA" ]]; then
  print -u2 "Packet manifest hash mismatch"
  exit 71
fi

if [[ "$actual_prompt_sha" != "$EXPECTED_PROMPT_SHA" ]]; then
  print -u2 "Prompt hash mismatch"
  exit 72
fi

if [[ -e "$RESPONSE" || -e "$METADATA" ]]; then
  print -u2 "A sealed first-review artifact already exists"
  exit 73
fi

mkdir -p "$SEALED"
run_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
stdout_tmp="$SEALED/.first-review-$run_id.stdout.tmp"
stderr_tmp="$SEALED/.first-review-$run_id.stderr.tmp"
started_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
started_epoch=$(date '+%s')
claude_version=$(claude --version | tr -d '\n')

set +e
(
  cd "$PACKET"
  claude \
    --print \
    --safe-mode \
    --no-session-persistence \
    --no-chrome \
    --disable-slash-commands \
    --prompt-suggestions false \
    --permission-mode dontAsk \
    --tools "Read,Glob,Grep" \
    --model claude-fable-5 \
    --effort max \
    --output-format text \
    "$(cat PROMPT.md)"
) >"$stdout_tmp" 2>"$stderr_tmp"
exit_code=$?
set -e

ended_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
ended_epoch=$(date '+%s')
duration_seconds=$((ended_epoch - started_epoch))
stdout_bytes=$(wc -c <"$stdout_tmp" | tr -d ' ')
stderr_bytes=$(wc -c <"$stderr_tmp" | tr -d ' ')
stdout_sha=$(shasum -a 256 "$stdout_tmp" | awk '{print $1}')

if [[ "$exit_code" -ne 0 || "$stdout_bytes" -eq 0 ]]; then
  failed_stdout="$SEALED/failed-$run_id.stdout"
  failed_stderr="$SEALED/failed-$run_id.stderr"
  mv "$stdout_tmp" "$failed_stdout"
  mv "$stderr_tmp" "$failed_stderr"
  chmod 600 "$failed_stdout" "$failed_stderr"
  printf 'SEALED_FABLE_FAILED run_id=%s exit_code=%s stdout_bytes=%s stderr_bytes=%s\n' \
    "$run_id" "$exit_code" "$stdout_bytes" "$stderr_bytes"
  exit 74
fi

mv "$stdout_tmp" "$RESPONSE"
mv "$stderr_tmp" "$STDERR_FILE"
chmod 600 "$RESPONSE" "$STDERR_FILE"

cat >"$METADATA" <<EOF
{
  "seal_state": "SEALED_UNTIL_P9",
  "run_id": "$run_id",
  "model": "claude-fable-5",
  "effort": "max",
  "claude_cli_version": "$claude_version",
  "started_at_utc": "$started_at",
  "ended_at_utc": "$ended_at",
  "duration_seconds": $duration_seconds,
  "exit_code": $exit_code,
  "packet_manifest_sha256": "$actual_manifest_sha",
  "prompt_sha256": "$actual_prompt_sha",
  "response_sha256": "$stdout_sha",
  "response_bytes": $stdout_bytes,
  "stderr_bytes": $stderr_bytes,
  "safe_mode": true,
  "session_persistence": false,
  "allowed_tools": ["Read", "Glob", "Grep"],
  "substantive_output_readable_before": "P9.2"
}
EOF
chmod 600 "$METADATA"

printf 'SEALED_FABLE_COMPLETE run_id=%s exit_code=0 response_bytes=%s stderr_bytes=%s response_sha256=%s\n' \
  "$run_id" "$stdout_bytes" "$stderr_bytes" "$stdout_sha"
