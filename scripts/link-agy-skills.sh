#!/usr/bin/env bash
set -euo pipefail

# Symlinks pi, omp, and shared ~/.agents skills into Antigravity's (agy) global
# skills directory (~/.gemini/config/skills).
#
#   ./scripts/link-agy-skills.sh [link] [--dry-run] [--prune] [--force]
#   ./scripts/link-agy-skills.sh status
#
# Antigravity discovers global skills one level deep under
# ~/.gemini/config/skills/<name>/SKILL.md, so nested skill groups (such as
# ~/.pi/agent/skills/nx/*) are flattened into individual top-level symlinks.
# Container directories without a direct SKILL.md (including .system/ and
# synced/) are skipped.
#
# Source directories scanned (first match wins):
#   1. $OMP_CONFIG_ROOT/agent/skills
#   2. $OMP_CONFIG_ROOT/agent/managed-skills
#   3. $PI_AGENT_DIR/skills
#   4. $PI_AGENT_DIR/skills/nx
#   5. $AGENTS_SKILLS_DIR
#
# Overridable environment variables:
#   PI_AGENT_DIR       default: ~/.pi/agent
#   OMP_CONFIG_ROOT    default: ~/.omp
#   AGENTS_SKILLS_DIR  default: ~/.agents/skills
#   AGY_SKILLS_DIR     default: ~/.gemini/config/skills

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/omp-manifest.sh
source "$ROOT_DIR/scripts/omp-manifest.sh"

PI_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"
OMP_DIR="$(omp_config_root)"
AGENTS_DIR="${AGENTS_SKILLS_DIR:-$HOME/.agents/skills}"
AGY_DIR="${AGY_SKILLS_DIR:-$HOME/.gemini/config/skills}"

usage() {
  sed -n '4,27p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

mode="link"
dry_run=0
do_prune=0
force=0

if [[ $# -gt 0 ]]; then
  case "$1" in
    link | status)
      mode="$1"
      shift
      ;;
  esac
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=1
      ;;
    --prune)
      do_prune=1
      ;;
    --force)
      force=1
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1 (expected 'link', 'status', --dry-run, --prune, --force)" >&2
      exit 2
      ;;
  esac
  shift
done

if [[ "$mode" == "status" && ($dry_run -eq 1 || $do_prune -eq 1 || $force -eq 1) ]]; then
  echo "--dry-run, --prune, and --force only apply to 'link' mode" >&2
  exit 2
fi

realpath_dir() {
  (cd "$1" 2>/dev/null && pwd -P)
}

contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

SOURCE_DIRS=(
  "$OMP_DIR/agent/skills"
  "$OMP_DIR/agent/managed-skills"
  "$PI_DIR/skills"
  "$PI_DIR/skills/nx"
  "$AGENTS_DIR"
)

# Collect both raw and canonical forms of managed roots so we can recognize
# existing symlinks owned by our sources even if a source directory was deleted.
MANAGED_ROOTS=()
add_managed_root() {
  local dir="$1"
  dir="${dir%/}"
  [[ -n "$dir" ]] || return 0
  if ! contains "$dir" "${MANAGED_ROOTS[@]+"${MANAGED_ROOTS[@]}"}"; then
    MANAGED_ROOTS+=("$dir")
  fi
  if [[ -d "$dir" ]]; then
    local real
    real="$(realpath_dir "$dir" || true)"
    if [[ -n "$real" ]] && ! contains "$real" "${MANAGED_ROOTS[@]+"${MANAGED_ROOTS[@]}"}"; then
      MANAGED_ROOTS+=("$real")
    fi
  fi
}

for src_dir in "${SOURCE_DIRS[@]}"; do
  add_managed_root "$src_dir"
done

is_under_managed_root() {
  local candidate="$1"
  [[ -n "$candidate" ]] || return 1
  local root
  for root in "${MANAGED_ROOTS[@]+"${MANAGED_ROOTS[@]}"}"; do
    case "$candidate" in
      "$root"/*) return 0 ;;
    esac
  done
  return 1
}

AGY_REAL=""
if [[ -d "$AGY_DIR" ]]; then
  AGY_REAL="$(realpath_dir "$AGY_DIR" || true)"
fi

# Discover skills in precedence order. First match for a given skill name wins.
SKILL_NAMES=()
SKILL_TARGETS=()

for src_dir in "${SOURCE_DIRS[@]}"; do
  [[ -d "$src_dir" ]] || continue

  src_real="$(realpath_dir "$src_dir" || true)"
  if [[ -n "$AGY_REAL" && -n "$src_real" && "$src_real" == "$AGY_REAL" ]]; then
    continue
  fi

  for entry in "$src_dir"/*; do
    [[ -d "$entry" && -f "$entry/SKILL.md" ]] || continue

    name="$(basename "$entry")"
    if contains "$name" "${SKILL_NAMES[@]+"${SKILL_NAMES[@]}"}"; then
      continue
    fi

    target="$(realpath_dir "$entry" || true)"
    [[ -n "$target" ]] || continue

    SKILL_NAMES+=("$name")
    SKILL_TARGETS+=("$target")
  done
done

cmd_status() {
  if [[ ${#SKILL_NAMES[@]} -eq 0 ]]; then
    echo "OK: no pi/omp/shared skills found to link into $AGY_DIR"
    return 0
  fi

  local i name target dst real_dst
  for ((i = 0; i < ${#SKILL_NAMES[@]}; i++)); do
    name="${SKILL_NAMES[$i]}"
    target="${SKILL_TARGETS[$i]}"
    dst="$AGY_DIR/$name"

    if [[ -L "$dst" ]]; then
      if [[ ! -e "$dst" ]]; then
        echo "MISMATCH: agy skill $name (broken symlink at $dst, expected -> $target)"
      else
        real_dst="$(realpath_dir "$dst" || true)"
        if [[ "$real_dst" == "$target" ]]; then
          echo "OK: agy skill $name -> $target"
        else
          echo "MISMATCH: agy skill $name (points to ${real_dst:-unknown}, expected -> $target)"
        fi
      fi
    elif [[ -e "$dst" ]]; then
      echo "MISMATCH: agy skill $name (real path exists at $dst, expected symlink -> $target)"
    else
      echo "MISSING: agy skill $name (expected -> $target)"
    fi
  done
}

cmd_link() {
  if [[ $dry_run -eq 0 ]]; then
    mkdir -p "$AGY_DIR"
  fi

  local linked=0
  local updated=0
  local unchanged=0
  local skipped=0
  local pruned=0

  local i name target dst real_dst
  for ((i = 0; i < ${#SKILL_NAMES[@]}; i++)); do
    name="${SKILL_NAMES[$i]}"
    target="${SKILL_TARGETS[$i]}"
    dst="$AGY_DIR/$name"

    if [[ -L "$dst" ]]; then
      if [[ ! -e "$dst" ]]; then
        if [[ $dry_run -eq 1 ]]; then
          echo "update    $name -> $target (dry-run, was broken symlink)"
        else
          ln -sfn "$target" "$dst"
          echo "update    $name -> $target (replaced broken symlink)"
        fi
        updated=$((updated + 1))
        continue
      fi

      real_dst="$(realpath_dir "$dst" || true)"
      if [[ "$real_dst" == "$target" ]]; then
        unchanged=$((unchanged + 1))
        continue
      fi

      if [[ $force -eq 1 ]] || is_under_managed_root "$real_dst"; then
        if [[ $dry_run -eq 1 ]]; then
          echo "update    $name -> $target (dry-run, was $real_dst)"
        else
          ln -sfn "$target" "$dst"
          echo "update    $name -> $target (was $real_dst)"
        fi
        updated=$((updated + 1))
      else
        echo "skip      $name (symlink points outside managed sources: $real_dst; pass --force to replace)" >&2
        skipped=$((skipped + 1))
      fi
      continue
    fi

    if [[ -e "$dst" ]]; then
      echo "skip      $name (real path exists at $dst)" >&2
      skipped=$((skipped + 1))
      continue
    fi

    if [[ $dry_run -eq 1 ]]; then
      echo "link      $name -> $target (dry-run)"
    else
      ln -s "$target" "$dst"
      echo "link      $name -> $target"
    fi
    linked=$((linked + 1))
  done

  if [[ $do_prune -eq 1 && -d "$AGY_DIR" ]]; then
    local entry entry_name raw_target entry_real
    for entry in "$AGY_DIR"/*; do
      [[ -L "$entry" ]] || continue

      entry_name="$(basename "$entry")"
      if contains "$entry_name" "${SKILL_NAMES[@]+"${SKILL_NAMES[@]}"}"; then
        continue
      fi

      raw_target="$(readlink "$entry" || true)"
      if [[ ! -e "$entry" ]]; then
        if is_under_managed_root "$raw_target"; then
          if [[ $dry_run -eq 1 ]]; then
            echo "prune     $entry_name (dry-run, broken symlink -> $raw_target)"
          else
            rm -f "$entry"
            echo "prune     $entry_name (broken symlink -> $raw_target)"
          fi
          pruned=$((pruned + 1))
        fi
      else
        entry_real="$(realpath_dir "$entry" || true)"
        if is_under_managed_root "$entry_real"; then
          if [[ $dry_run -eq 1 ]]; then
            echo "prune     $entry_name (dry-run, stale managed symlink -> $entry_real)"
          else
            rm -f "$entry"
            echo "prune     $entry_name (stale managed symlink -> $entry_real)"
          fi
          pruned=$((pruned + 1))
        fi
      fi
    done
  fi

  local summary="agy skills ($AGY_DIR): $linked linked, $updated updated, $unchanged unchanged, $skipped skipped"
  if [[ $do_prune -eq 1 ]]; then
    summary="$summary, $pruned pruned"
  fi
  if [[ $dry_run -eq 1 ]]; then
    summary="$summary (dry-run)"
  fi
  echo "$summary"
}

case "$mode" in
  link) cmd_link ;;
  status) cmd_status ;;
esac
