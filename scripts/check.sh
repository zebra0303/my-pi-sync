#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/versions.env"
# shellcheck source=scripts/omp-manifest.sh
source "$ROOT_DIR/scripts/omp-manifest.sh"

check_version() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [[ "$actual" == "$expected" ]]; then
    echo "OK: $name $actual"
  else
    echo "MISMATCH: $name expected $expected, actual ${actual:-missing}"
  fi
}

check_version "node" "$NODE_VERSION" "$(node -v 2>/dev/null | sed 's/^v//' || true)"
check_version "npm" "$NPM_VERSION" "$(npm -v 2>/dev/null || true)"
check_version "pi" "$PI_CODING_AGENT_VERSION" "$(npm list -g --depth=0 @earendil-works/pi-coding-agent 2>/dev/null | sed -n 's/.*@earendil-works\/pi-coding-agent@//p' || true)"
check_version "omp" "$OMP_VERSION" "$(omp --version 2>/dev/null | sed 's|^omp/||' || true)"

for path in \
  "$HOME/.pi/agent/settings.json" \
  "$HOME/.pi/agent/prompts/read-confluence.md" \
  "$HOME/.pi/agent/prompts/search-confluence.md" \
  "$HOME/.pi/agent/prompts/spike-report.md" \
  "$HOME/.pi/agent/prompts/sync-dev-task.md" \
  "$HOME/.pi/agent/prompts/md-to-adf.md" \
  "$HOME/.pi/agent/prompts/frontend-architecture-review.md" \
  "$HOME/.pi/agent/prompts/frontend-generate-plan.md" \
  "$HOME/.pi/agent/prompts/fsd-check.md" \
  "$HOME/.pi/agent/skills/atlassian-workflows/SKILL.md" \
  "$HOME/.pi/agent/skills/xe-frontend-architecture/SKILL.md" \
  "$HOME/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py" \
  "$HOME/.pi/agent/themes/catppuccin-mocha.json"
do
  if [[ -e "$path" ]]; then
    echo "OK: $path"
  else
    echo "MISSING: $path"
  fi
done

# Every backed-up omp config entry must exist in the live config root.
OMP_DST="$(omp_config_root)"
OMP_SRC="$ROOT_DIR/config/omp"

for rel in "${OMP_CONFIG_FILES[@]}" "${OMP_CONFIG_DIRS[@]}"; do
  [[ -e "$OMP_SRC/$rel" ]] || continue

  if [[ -e "$OMP_DST/$rel" ]]; then
    echo "OK: $OMP_DST/$rel"
  else
    echo "MISSING: $OMP_DST/$rel"
  fi
done

# Plugins are not restored by copying their registries, so verify them through
# the omp CLI instead of checking for files under ~/.omp.
"$ROOT_DIR/scripts/omp-plugins.sh" status "$OMP_SRC"
