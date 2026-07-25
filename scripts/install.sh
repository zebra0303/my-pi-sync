#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/versions.env"
# shellcheck source=scripts/omp-manifest.sh
source "$ROOT_DIR/scripts/omp-manifest.sh"

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

# omp (oh-my-pi) is distributed via Homebrew, not npm.
if ! command -v omp >/dev/null 2>&1; then
  brew install can1357/tap/omp
fi

# Restore the allowlisted omp config. Nothing is deleted in ~/.omp: local skills
# or themes that are not tracked here survive the restore.
OMP_DST="$(omp_config_root)"
OMP_SRC="$ROOT_DIR/config/omp"

if [[ -d "$OMP_SRC" ]]; then
  for rel in "${OMP_CONFIG_FILES[@]}"; do
    [[ -f "$OMP_SRC/$rel" ]] || continue
    mkdir -p "$OMP_DST/$(dirname "$rel")"
    rsync -av "$OMP_SRC/$rel" "$OMP_DST/$rel"
  done

  for rel in "${OMP_CONFIG_DIRS[@]}"; do
    [[ -d "$OMP_SRC/$rel" ]] || continue
    mkdir -p "$OMP_DST/$rel"
    rsync -av "$OMP_SRC/$rel/" "$OMP_DST/$rel/"
  done
else
  echo "No omp config backup at $OMP_SRC; skipping omp restore" >&2
fi

cat <<EOF

Done.

Next steps:
1. Start pi: pi
2. Login again with /login (auth.json is intentionally not stored in git).
3. Use /reload in an existing pi session to reload prompts, skills, extensions, and themes.
4. Start omp: omp
5. Login again with /login (omp credentials live in ~/.omp/agent/agent.db, which is not stored in git).
EOF
