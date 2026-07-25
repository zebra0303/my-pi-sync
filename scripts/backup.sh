#!/usr/bin/env bash
set -euo pipefail

# Unified backup entry point: detects which agents are configured on this machine
# and backs up each one. Delegates to the per-agent scripts so their allowlists,
# excludes, and pruning rules stay in one place.
#
#   ./scripts/backup.sh                    # every detected agent, no git changes
#   ./scripts/backup.sh pi                 # only pi
#   ./scripts/backup.sh omp                # only omp
#   ./scripts/backup.sh --commit           # + commit the backup locally
#   ./scripts/backup.sh --commit --push    # + push
#   ./scripts/backup.sh --commit -m "..."  # override the commit message
#
# A configured-but-broken agent fails loudly without skipping the other one.
#
# Pushing is opt-in on purpose. backup-pi.sh is block-list based, so a file that
# pi starts writing under ~/.pi/agent lands in the backup by default. A push
# cannot be undone, so --commit refuses to introduce a previously untracked file
# unless you pass --allow-new after reviewing it.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/omp-manifest.sh
source "$ROOT_DIR/scripts/omp-manifest.sh"

PI_SRC="${PI_AGENT_DIR:-$HOME/.pi/agent}"
PI_DST="${PI_BACKUP_DIR:-$ROOT_DIR/config/pi/agent}"
OMP_SRC="$(omp_config_root)"
OMP_DST="${OMP_BACKUP_DIR:-$ROOT_DIR/config/omp}"

usage() {
  sed -n '4,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

targets=()
do_commit=0
do_push=0
allow_new=0
message=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    pi | omp)
      targets+=("$1")
      ;;
    --commit)
      do_commit=1
      ;;
    --push)
      do_push=1
      do_commit=1
      ;;
    --allow-new)
      allow_new=1
      ;;
    -m | --message)
      flag="$1"
      shift
      if [[ $# -eq 0 ]]; then
        echo "$flag requires a message" >&2
        exit 2
      fi
      message="$1"
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1 (expected 'pi', 'omp', --commit, --push, --allow-new, -m)" >&2
      exit 2
      ;;
  esac
  shift
done

if [[ -n "$message" && $do_commit -eq 0 ]]; then
  echo "-m/--message only applies with --commit" >&2
  exit 2
fi

if [[ ${#targets[@]} -eq 0 ]]; then
  targets=(pi omp)
fi

# A directory that exists but holds nothing means "not configured here", not
# "configured and empty" — backing it up would prune the committed copy.
is_configured() {
  local dir="$1"
  [[ -d "$dir" ]] && [[ -n "$(ls -A "$dir" 2>/dev/null)" ]]
}

detected=0
failed=0
backed_up_names=()
backed_up_dests=()

run_target() {
  local name="$1"
  local src="$2"
  local dst="$3"
  local script="$4"

  if ! is_configured "$src"; then
    echo "-- $name: not configured at $src, skipping"
    return 0
  fi

  detected=$((detected + 1))
  echo "== $name: backing up $src"

  if "$ROOT_DIR/scripts/$script"; then
    backed_up_names+=("$name")
    backed_up_dests+=("$dst")
    return 0
  fi

  echo "!! $name backup failed" >&2
  failed=$((failed + 1))
  return 0
}

for target in "${targets[@]}"; do
  case "$target" in
    pi) run_target pi "$PI_SRC" "$PI_DST" backup-pi.sh ;;
    omp) run_target omp "$OMP_SRC" "$OMP_DST" backup-omp.sh ;;
  esac
done

if [[ $detected -eq 0 ]]; then
  echo "No configured agent found (looked in $PI_SRC and $OMP_SRC)" >&2
  exit 1
fi

if [[ $failed -gt 0 ]]; then
  echo "$failed of $detected agent backup(s) failed" >&2
  exit 1
fi

echo "Backed up $detected agent config tree(s)."

if [[ $do_commit -eq 0 ]]; then
  echo "Review with: git status    Commit with: $0 --commit"
  exit 0
fi

if ! git -C "$ROOT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  echo "Not a git repository: $ROOT_DIR" >&2
  exit 1
fi

# Only the backup destinations are staged. Unrelated working-tree changes stay
# untouched, so --commit never sweeps up half-finished edits.
stage_paths=()
for dest in "${backed_up_dests[@]}"; do
  case "$dest" in
    "$ROOT_DIR"/*) stage_paths+=("${dest#"$ROOT_DIR"/}") ;;
    *) echo "-- skipping git staging for $dest (outside $ROOT_DIR)" ;;
  esac
done

if [[ ${#stage_paths[@]} -eq 0 ]]; then
  echo "Nothing inside the repository to commit"
  exit 0
fi

# A previously untracked file is the only way a secret can enter this repository,
# so it needs a human look before it becomes a commit.
if [[ $allow_new -eq 0 ]]; then
  new_files=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && new_files+=("$line")
  done < <(git -C "$ROOT_DIR" status --porcelain --untracked-files=all -- "${stage_paths[@]}" |
    sed -n 's/^?? //p')

  if [[ ${#new_files[@]} -gt 0 ]]; then
    echo "Refusing to commit: these paths are not tracked yet." >&2
    printf '  %s\n' "${new_files[@]}" >&2
    echo "Check them for secrets, then re-run with --allow-new." >&2
    exit 3
  fi
fi

git -C "$ROOT_DIR" add -- "${stage_paths[@]}"

if git -C "$ROOT_DIR" diff --cached --quiet -- "${stage_paths[@]}"; then
  echo "No config changes to commit"
else
  if [[ -z "$message" ]]; then
    # Commit convention: <type>(<scope>): <subject>, lowercase, no trailing period.
    joined="$(
      IFS=' '
      echo "${backed_up_names[*]}"
    )"
    message="chore(agent): update ${joined// / and } environment"
  fi

  git -C "$ROOT_DIR" commit -m "$message" -- "${stage_paths[@]}"

  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
    echo "Note: other working-tree changes were left uncommitted."
  fi
fi

if [[ $do_push -eq 1 ]]; then
  git -C "$ROOT_DIR" push
fi
