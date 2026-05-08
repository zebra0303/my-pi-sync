#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$HOME/.pi/agent"
DST="$ROOT_DIR/config/pi/agent"

mkdir -p "$DST"

if [[ ! -d "$SRC" ]]; then
  echo "No pi config directory found at $SRC" >&2
  exit 1
fi

# Copy only stable, non-secret configuration. Intentionally exclude:
# - auth.json: OAuth/API credentials
# - sessions/: private session logs
# - bin/, git/, npm/: generated package/runtime artifacts
rsync -av \
  --exclude 'auth.json' \
  --exclude 'sessions/' \
  --exclude 'bin/' \
  --exclude 'git/' \
  --exclude 'npm/' \
  "$SRC/" "$DST/"

echo "Backed up non-secret pi config to $DST"
