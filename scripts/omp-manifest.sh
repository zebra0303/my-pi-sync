# shellcheck shell=bash
#
# Allowlist of user-level omp (oh-my-pi) configuration that is safe to commit.
# Sourced by backup-omp.sh, install.sh, and check.sh.
#
# Every path is relative to the omp config root (~/.omp, overridable with
# OMP_CONFIG_ROOT for testing). Backup is allowlist-based on purpose: anything
# new that omp writes under ~/.omp is ignored until it is added here, so a new
# credential or state file can never leak into git by accident.
#
# Reference: omp://config-usage.md, omp://settings.md, omp://mcp-config.md,
# omp://lsp-config.md, omp://keybindings.md, omp://models.md, omp://theme.md,
# omp://context-files.md, omp://system-prompt-customization.md,
# omp://task-agent-discovery.md, omp://advisor-watchdog.md, omp://marketplace.md

# Single config files. Missing entries are skipped silently; omp only writes the
# variants the user actually touched.
OMP_CONFIG_FILES=(
  # settings / runtime behaviour
  agent/config.yml
  agent/keybindings.yml
  agent/keybindings.yaml
  agent/keybindings.json
  agent/models.yml
  agent/models.yaml
  agent/mcp.json
  agent/.mcp.json
  agent/lsp.json
  agent/lsp.yml
  agent/lsp.yaml

  # prompt / context customization
  agent/AGENTS.md
  agent/RULES.md
  agent/SYSTEM.md
  agent/APPEND_SYSTEM.md
  agent/TITLE_SYSTEM.md
  agent/WATCHDOG.md
  agent/WATCHDOG.yml
  agent/WATCHDOG.yaml

  # custom /share implementation
  agent/share.ts
  agent/share.js

  # plugin + marketplace registries (config root, not the agent dir)
  marketplaces.json
  plugins/package.json
  plugins/installed_plugins.json
  plugins/omp-plugins.lock.json
)

# Directories copied recursively and mirrored (backup deletes files that no
# longer exist in ~/.omp).
OMP_CONFIG_DIRS=(
  agent/agents
  agent/commands
  agent/extensions
  agent/hooks
  agent/instructions
  agent/managed-skills
  agent/prompts
  agent/rules
  agent/skills
  agent/themes
  agent/tools
)

# Belt-and-braces filters for the recursive directory copies. The allowlist above
# already excludes every known secret/state path (agent.db holds OAuth tokens,
# agent/.env and agent/secrets.yml hold secrets, install-id identifies the
# machine, sessions/blobs/logs/cache/run/natives are volatile), but a stray file
# dropped inside e.g. agent/skills must not slip through either.
OMP_RSYNC_EXCLUDES=(
  --exclude '.env'
  --exclude '.env.*'
  --exclude 'auth.json'
  --exclude 'auth-broker.token'
  --exclude 'auth-gateway.token'
  --exclude 'secrets.yml'
  --exclude 'secret-placeholder.key'
  --exclude '*.token'
  --exclude '*.pem'
  --exclude '*.key'
  --exclude 'node_modules/'
  --exclude '__pycache__/'
  --exclude '*.db'
  --exclude '*.db-shm'
  --exclude '*.db-wal'
  --exclude '.DS_Store'
)

# Resolved once so callers agree on the source root.
omp_config_root() {
  printf '%s\n' "${OMP_CONFIG_ROOT:-$HOME/.omp}"
}
