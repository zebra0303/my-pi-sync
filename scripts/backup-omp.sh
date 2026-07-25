#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/omp-manifest.sh
source "$ROOT_DIR/scripts/omp-manifest.sh"

SRC="$(omp_config_root)"
DST="${OMP_BACKUP_DIR:-$ROOT_DIR/config/omp}"

if [[ ! -d "$SRC" ]]; then
  echo "No omp config directory found at $SRC" >&2
  exit 1
fi

mkdir -p "$DST"

copied=0
pruned=0

for rel in "${OMP_CONFIG_FILES[@]}"; do
  src="$SRC/$rel"
  dst="$DST/$rel"

  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dst")"
    rsync -a "$src" "$dst"
    echo "file  $rel"
    copied=$((copied + 1))
  elif [[ -e "$dst" ]]; then
    rm -rf "$dst"
    echo "prune $rel (gone from $SRC)"
    pruned=$((pruned + 1))
  fi
done

for rel in "${OMP_CONFIG_DIRS[@]}"; do
  src="$SRC/$rel"
  dst="$DST/$rel"

  if [[ -d "$src" ]]; then
    mkdir -p "$dst"
    rsync -a --delete "${OMP_RSYNC_EXCLUDES[@]}" "$src/" "$dst/"
    echo "dir   $rel"
    copied=$((copied + 1))
  elif [[ -e "$dst" ]]; then
    rm -rf "$dst"
    echo "prune $rel (gone from $SRC)"
    pruned=$((pruned + 1))
  fi
done

# Drop directories that became empty after pruning so git stays clean.
find "$DST" -type d -empty -delete 2>/dev/null || true
mkdir -p "$DST"

echo "Backed up $copied omp config entries to $DST (pruned $pruned)"
