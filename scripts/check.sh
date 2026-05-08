#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/versions.env"

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

for path in \
  "$HOME/.pi/agent/settings.json" \
  "$HOME/.claude/commands" \
  "$HOME/.codex/skills/atlassian-workflows"
do
  if [[ -e "$path" ]]; then
    echo "OK: $path"
  else
    echo "MISSING: $path"
  fi
done
