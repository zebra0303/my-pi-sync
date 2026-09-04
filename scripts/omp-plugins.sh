#!/usr/bin/env bash
set -euo pipefail

# Reinstalls omp (oh-my-pi) plugins from the backed-up plugin registries.
#
#   ./scripts/omp-plugins.sh plan     [BACKUP_ROOT]  # what would be installed
#   ./scripts/omp-plugins.sh restore  [BACKUP_ROOT]  # install what is missing
#   ./scripts/omp-plugins.sh status   [BACKUP_ROOT]  # OK/MISSING per plugin
#
# BACKUP_ROOT defaults to config/omp (overridable with OMP_BACKUP_DIR).
#
# The registries themselves are backed up but never copied back into ~/.omp:
# marketplaces.json, plugins/installed_plugins.json, and plugins/package.json
# record absolute paths of this machine (catalog cache, install cache, bun's
# node_modules symlinks), so copying them onto another machine produces a
# registry that points at directories which do not exist. Instead they are read
# as a wish list and replayed through the omp CLI, which rebuilds the cache,
# node_modules symlinks, and omp-plugins.lock.json for the new machine.
#
# Only user-scoped marketplace installs are replayed; project-scoped installs
# live inside their own repository's .omp directory.
#
# Parsing helpers are exposed as subcommands so the tests can drive them without
# an omp binary:
#
#   sources    MARKETPLACES_JSON            -> "name<TAB>source"
#   ids        INSTALLED_PLUGINS_JSON       -> "name@marketplace"
#   npm-specs  PLUGINS_PACKAGE_JSON [LOCK]  -> "package<TAB>install-spec"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  sed -n '3,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

require_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "node is required to read the omp plugin registries" >&2
    exit 1
  fi
}

# Configured marketplaces, as "name<TAB>source". The source is what `omp plugin
# marketplace add` accepts back: a GitHub shorthand, git URL, catalog URL, or
# local directory.
cmd_sources() {
  require_node
  node -e '
const fs = require("fs");
let data;
try {
  data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
} catch {
  process.exit(0);
}
const list = Array.isArray(data && data.marketplaces) ? data.marketplaces : [];
for (const entry of list) {
  if (!entry || typeof entry !== "object") continue;
  const name = entry.name;
  const source = entry.sourceUri || entry.source || entry.uri;
  if (!name || !source) continue;
  process.stdout.write(name + "\t" + source + "\n");
}
' "$1"
}

# User-scoped marketplace plugin ids ("name@marketplace"). Entries without a
# scope are treated as user scope, which is what omp defaults to.
cmd_ids() {
  require_node
  node -e '
const fs = require("fs");
let data;
try {
  data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
} catch {
  process.exit(0);
}
const plugins = data && typeof data.plugins === "object" && data.plugins ? data.plugins : {};
for (const [id, value] of Object.entries(plugins)) {
  const entries = Array.isArray(value) ? value : [value];
  const userScoped = entries.some((entry) => !entry || !entry.scope || entry.scope === "user");
  if (userScoped) process.stdout.write(id + "\n");
}
' "$1"
}

# npm/git/link plugins, as "package<TAB>spec". A caret/tilde range is not a
# valid omp install spec, so the exact version from omp-plugins.lock.json is
# preferred; without it the package is installed unpinned.
cmd_npm_specs() {
  require_node
  node -e '
const fs = require("fs");

function load(file) {
  if (!file) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const pkg = load(process.argv[1]);
const lock = load(process.argv[2]);
const deps = pkg && typeof pkg.dependencies === "object" && pkg.dependencies ? pkg.dependencies : {};
const locked = lock && typeof lock.plugins === "object" && lock.plugins ? lock.plugins : {};
const GIT = /^(git\+|git:|github:|gitlab:|bitbucket:|codeberg:|sourcehut:|srht:|https?:|ssh:|git@)/;
const EXACT = /^\d+\.\d+\.\d+/;

for (const [name, raw] of Object.entries(deps)) {
  const value = typeof raw === "string" ? raw.trim() : "";
  let spec;
  if (GIT.test(value)) {
    spec = value;
  } else if (value.startsWith("file:") || value.startsWith("link:")) {
    spec = value.slice(value.indexOf(":") + 1);
  } else if (EXACT.test(value)) {
    spec = name + "@" + value;
  } else {
    const lockedVersion = locked[name] && locked[name].version;
    spec = EXACT.test(String(lockedVersion || "")) ? name + "@" + lockedVersion : name;
  }
  process.stdout.write(name + "\t" + spec + "\n");
}
' "$1" "${2:-}"
}

require_omp() {
  if ! command -v omp >/dev/null 2>&1; then
    echo "omp is not installed; skipping omp plugin restore" >&2
    exit 1
  fi
}

live_marketplaces() {
  omp plugin marketplace list 2>/dev/null |
    awk '/^[[:space:]]+[^[:space:]]/ { print $1 }'
}

# `omp plugin list --json` reports {npm: [...], marketplace: [{id, ...}]}.
live_ids() {
  require_node
  omp plugin list --json 2>/dev/null | node -e '
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }
  const emit = (entry) => {
    if (!entry) return;
    const id = typeof entry === "string" ? entry : entry.id || entry.name || entry.package;
    if (id) process.stdout.write(id + "\n");
  };
  for (const entry of Array.isArray(data.marketplace) ? data.marketplace : []) emit(entry);
  for (const entry of Array.isArray(data.npm) ? data.npm : []) emit(entry);
});
'
}

contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

backup_root() {
  printf '%s\n' "${1:-${OMP_BACKUP_DIR:-$ROOT_DIR/config/omp}}"
}

# Emits the whole wish list as "kind<TAB>key<TAB>argument" so plan, restore, and
# status all agree on what the backup asks for.
plan_lines() {
  local backup="$1"
  local marketplaces="$backup/marketplaces.json"
  local installed="$backup/plugins/installed_plugins.json"
  local pkg="$backup/plugins/package.json"
  local lock="$backup/plugins/omp-plugins.lock.json"

  if [[ -f "$marketplaces" ]]; then
    while IFS=$'\t' read -r name source; do
      [[ -n "$name" ]] && printf 'marketplace\t%s\t%s\n' "$name" "$source"
    done < <(cmd_sources "$marketplaces")
  fi

  if [[ -f "$installed" ]]; then
    while IFS= read -r id; do
      [[ -n "$id" ]] && printf 'plugin\t%s\t%s\n' "$id" "$id"
    done < <(cmd_ids "$installed")
  fi

  if [[ -f "$pkg" ]]; then
    while IFS=$'\t' read -r name spec; do
      [[ -n "$name" ]] && printf 'package\t%s\t%s\n' "$name" "$spec"
    done < <(cmd_npm_specs "$pkg" "$lock")
  fi
}

cmd_plan() {
  local backup
  backup="$(backup_root "${1:-}")"
  plan_lines "$backup"
}

cmd_restore() {
  local backup
  backup="$(backup_root "${1:-}")"

  local plan
  plan="$(plan_lines "$backup")"

  if [[ -z "$plan" ]]; then
    echo "No omp plugins recorded in $backup; nothing to restore"
    return 0
  fi

  require_omp

  local existing_marketplaces=()
  local existing_ids=()
  mapfile -t existing_marketplaces < <(live_marketplaces)
  mapfile -t existing_ids < <(live_ids)

  local installed=0
  local skipped=0
  local failed=0

  while IFS=$'\t' read -r kind key argument; do
    case "$kind" in
      marketplace)
        if contains "$key" "${existing_marketplaces[@]+"${existing_marketplaces[@]}"}"; then
          echo "skip      marketplace $key (already configured)"
          skipped=$((skipped + 1))
          continue
        fi

        echo "add       marketplace $key ($argument)"
        if omp plugin marketplace add "$argument"; then
          installed=$((installed + 1))
        else
          echo "FAILED    marketplace $key ($argument)" >&2
          failed=$((failed + 1))
        fi
        ;;
      plugin | package)
        if contains "$key" "${existing_ids[@]+"${existing_ids[@]}"}"; then
          echo "skip      plugin $key (already installed)"
          skipped=$((skipped + 1))
          continue
        fi

        echo "install   plugin $key ($argument)"
        if omp plugin install "$argument"; then
          installed=$((installed + 1))
        else
          echo "FAILED    plugin $key ($argument)" >&2
          failed=$((failed + 1))
        fi
        ;;
    esac
  done <<<"$plan"

  echo "omp plugins: $installed installed, $skipped already present, $failed failed"

  if [[ $failed -gt 0 ]]; then
    return 4
  fi
}

cmd_status() {
  local backup
  backup="$(backup_root "${1:-}")"

  local plan
  plan="$(plan_lines "$backup")"

  if [[ -z "$plan" ]]; then
    echo "OK: no omp plugins recorded in $backup"
    return 0
  fi

  if ! command -v omp >/dev/null 2>&1; then
    echo "MISSING: omp is not installed, cannot verify plugins"
    return 0
  fi

  local existing_marketplaces=()
  local existing_ids=()
  mapfile -t existing_marketplaces < <(live_marketplaces)
  mapfile -t existing_ids < <(live_ids)

  while IFS=$'\t' read -r kind key _argument; do
    case "$kind" in
      marketplace)
        if contains "$key" "${existing_marketplaces[@]+"${existing_marketplaces[@]}"}"; then
          echo "OK: omp marketplace $key"
        else
          echo "MISSING: omp marketplace $key"
        fi
        ;;
      plugin | package)
        if contains "$key" "${existing_ids[@]+"${existing_ids[@]}"}"; then
          echo "OK: omp plugin $key"
        else
          echo "MISSING: omp plugin $key"
        fi
        ;;
    esac
  done <<<"$plan"
}

action="${1:-}"
[[ $# -gt 0 ]] && shift

case "$action" in
  sources) cmd_sources "$@" ;;
  ids) cmd_ids "$@" ;;
  npm-specs) cmd_npm_specs "$@" ;;
  plan) cmd_plan "$@" ;;
  restore) cmd_restore "$@" ;;
  status) cmd_status "$@" ;;
  -h | --help | help | "")
    usage
    exit 0
    ;;
  *)
    echo "Unknown action: $action" >&2
    usage >&2
    exit 2
    ;;
esac
