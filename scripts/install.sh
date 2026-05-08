#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/versions.env"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This bootstrap script is currently written for macOS." >&2
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install it first: https://brew.sh" >&2
  exit 1
fi

# nvm is usually a shell function, so load it explicitly. On fresh machines,
# Homebrew installs nvm's script under its prefix, while Node versions live in
# $NVM_DIR.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
mkdir -p "$NVM_DIR"

if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
else
  if ! brew list nvm >/dev/null 2>&1; then
    brew install nvm
  fi

  NVM_HOMEBREW_SH="$(brew --prefix nvm)/nvm.sh"
  if [[ ! -s "$NVM_HOMEBREW_SH" ]]; then
    echo "nvm was installed but nvm.sh was not found at $NVM_HOMEBREW_SH" >&2
    exit 1
  fi

  # shellcheck disable=SC1090
  . "$NVM_HOMEBREW_SH"
fi

nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
nvm use "$NODE_VERSION"

npm install -g "npm@$NPM_VERSION"
npm install -g "@earendil-works/pi-coding-agent@$PI_CODING_AGENT_VERSION" "pnpm@$PNPM_VERSION"

mkdir -p "$HOME/.pi/agent"
rsync -av "$ROOT_DIR/config/pi/agent/" "$HOME/.pi/agent/"

cat <<EOF

Done.

Next steps:
1. Start pi: pi
2. Login again with /login (auth.json is intentionally not stored in git).
3. If you use referenced resources, restore/create them separately:
   - ~/.claude/commands
   - ~/.codex/skills/atlassian-workflows
EOF
