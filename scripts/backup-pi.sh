#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${PI_AGENT_DIR:-$HOME/.pi/agent}"
DST="${PI_BACKUP_DIR:-$ROOT_DIR/config/pi/agent}"

if [[ ! -d "$SRC" ]]; then
  echo "No pi config directory found at $SRC" >&2
  exit 1
fi

mkdir -p "$DST"

# Copy only stable, non-secret configuration. Intentionally exclude:
# - auth.json: OAuth/API credentials
# - sessions/: private session logs
# - bin/, git/, npm/: generated package/runtime artifacts
# --checksum instead of rsync's size+mtime quick check: destination mtimes have
# one-second granularity, so a same-size edit written in the same second as the
# previous backup would look unchanged and never reach the repo.
rsync -av --checksum \
  --exclude 'auth.json' \
  --exclude 'sessions/' \
  --exclude 'bin/' \
  --exclude 'git/' \
  --exclude 'npm/' \
  "$SRC/" "$DST/"

# Materialize theme JSON files from installed pi packages. Package sources are
# still kept in settings.json, but this keeps the selected theme restorable even
# if the remote package is temporarily unavailable.
if command -v node >/dev/null 2>&1; then
  node "$ROOT_DIR/scripts/backup-installed-themes.mjs" "$SRC" "$DST"
else
  echo "Skipping installed package theme backup because node is not available" >&2
fi

echo "Backed up non-secret pi config to $DST"
