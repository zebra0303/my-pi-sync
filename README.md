# pi & omp environment bootstrap

```text
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀
⠀⠀⠀⠀⠀⠀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠁
⠀⠀⠀⣰⣿⣿⣿⠟⠋⠀⠀⠀⣿⣿⣿⡇⠀⠀⠀⠀⣿⣿⣿⣿⣿⠁⠀⠀⠀⠀
⠀⠀⢰⣿⣿⡿⠁⠀⠀⠀⠀⢠⣿⣿⣿⡇⠀⠀⠀⢸⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀
⠀⠀⠈⠛⠋⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠁⠀⠀⠀⣾⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠀⠀⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⡇⠀⠀⠀⢸⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⠁⠀⠀⠀⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⡟⠀⠀⠀⢰⣿⣿⣿⣿⣿⣄⠀⠀⣴⡆⠀⠀
⠀⠀⠀⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣶⣾⣿⠃⠀⠀
⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⠏⠀⠀⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀
⠀⠀⠀⠀⠀⠈⠻⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⡿⠟⠁⠀
```

This personal bootstrap repository restores pi and omp (oh-my-pi) configuration on macOS. It contains agent resources and backup/restore scripts, not the pi or omp implementations themselves. The bootstrap installer does not support Windows or Linux.

## What's included

- Node/npm/pi/pnpm version pins and the expected omp version: [`versions.env`](versions.env), [`.nvmrc`](.nvmrc)
- Homebrew dependencies (including the `can1357/tap/omp` formula): [`Brewfile`](Brewfile)
- Global pi settings: [`config/pi/agent/settings.json`](config/pi/agent/settings.json)
- Global pi instructions: [`config/pi/agent/AGENTS.md`](config/pi/agent/AGENTS.md)
- Git convention: [`config/pi/agent/docs/git-convention.md`](config/pi/agent/docs/git-convention.md)
- pi prompt templates: [`config/pi/agent/prompts/`](config/pi/agent/prompts/)
- pi skills: [`config/pi/agent/skills/`](config/pi/agent/skills/)
- pi themes, including materialized package-installed themes: [`config/pi/agent/themes/`](config/pi/agent/themes/)
- Global omp settings and config: [`config/omp/`](config/omp/) (mirror of the non-secret parts of `~/.omp`)
- Install script: [`scripts/install.sh`](scripts/install.sh)
- Backup entry point (auto-detects pi and omp): [`scripts/backup.sh`](scripts/backup.sh)
- Per-agent backup scripts: [`scripts/backup-pi.sh`](scripts/backup-pi.sh), [`scripts/backup-omp.sh`](scripts/backup-omp.sh)
- omp backup allowlist shared by all scripts: [`scripts/omp-manifest.sh`](scripts/omp-manifest.sh)
- omp plugin/marketplace replay: [`scripts/omp-plugins.sh`](scripts/omp-plugins.sh)
- Environment check script: [`scripts/check.sh`](scripts/check.sh)
- Script tests: [`tests/`](tests/) — run with `pnpm test`

### Repository layout

```text
config/pi/agent/   pi settings, conventions, extensions, prompts, skills, and themes
config/omp/agent/  omp settings, MCP servers, debate agents, and Orca extensions
scripts/          macOS bootstrap, per-agent backup, plugin replay, and diagnostics
tests/            Node.js tests for backups, theme materialization, and plugin plans
versions.env      bootstrap version pins and omp diagnostic baseline
Brewfile          Homebrew dependency manifest
package.json      pi package manifest and development commands
```

### Included agent resources

| Area | Resources |
| --- | --- |
| Atlassian and company workflows | `atlassian-workflows`, root `twg`, and `twg-*` skills for Jira, Confluence, engineering research, owners, operational health, and status rollups |
| Frontend development | `xe-frontend-architecture`, `react-typescript-testing`, `code-review`, and nested Nx skills for workspace discovery, generation, imports, plugins, task execution, package linking, and CI monitoring |
| Prompt templates | Confluence/Jira helpers, `implement-plan`, `implement-ticket`, frontend architecture/FSD reviews, Nx helpers, `test`, `code-review`, and `analyze-repo` / `analyze-repo-li` |
| Multi-model debate | `model-debate`, three omp panelist agents, model-update checker, and a local browser stage |
| System skills | Image generation, OpenAI documentation, plugin creation, skill creation/installation, and delegated review under `skills/.system/` |
| Themes | Catppuccin variants and Dracula, including JSON materialized from installed packages |

See [`prompts/`](config/pi/agent/prompts/) and [`skills/`](config/pi/agent/skills/) for the full inventory and each workflow's prerequisites. These resources can require separately installed CLIs, provider access, or authentication; the bootstrap script does not provision all external integrations.

#### pi extensions

The extensions in [`config/pi/agent/extensions/`](config/pi/agent/extensions/) provide:

- **Command guards:** confirmation for selected dangerous bash command strings; confirmation for matched npm/npx commands, or blocking when no UI is available, to encourage pnpm.
- **Path protection:** blocks pi `write`/`edit` calls to environment files, git metadata, dependency directories, credentials, session logs, and generated pi artifacts. This is not a shell sandbox.
- **Question-before-action guard:** blocks detected mutations when a recommendation-style prompt has no recognized explicit approval.
- **Frontend review:** `/frontend-review --base=origin/main --test` collects the branch diff, changed-file context, heuristic architecture checks, Nx affected lint, and optional tests before asking the model to review. It requires a pnpm/Nx target repository; tests are off unless `--test` or `--tests` is passed.
- **Header customization:** a custom startup header; `/builtin-header` restores the built-in header for the session.
- **Orca integration:** agent-status reporting, startup composer prefill, and a titlebar activity spinner. omp includes its own copies of the three Orca extensions.

Guards are convenience checks around specific tool calls and patterns, not comprehensive security controls.

#### omp configuration and MCP

[`config/omp/agent/config.yml`](config/omp/agent/config.yml) records model roles, thinking level, theme/status-line preferences, provider settings, and discovery of external Claude/Codex skills and commands. Paths such as `~/.codex/skills` and `~/.claude/skills/nx` refer to resources outside this repository; copying the config does not install them.

[`config/omp/agent/mcp.json`](config/omp/agent/mcp.json) configures the MDN HTTP MCP server and Figma Desktop at `http://127.0.0.1:3845/mcp`. The local Figma endpoint must be made available separately.

## Never commit

The following files contain secrets, machine identity, or private work history and must not be committed.

pi:

- `~/.pi/agent/auth.json` — OAuth/API credentials
- `~/.pi/agent/sessions/` — conversation/session logs
- `~/.pi/agent/bin`, `git`, `npm`, `install` — generated or installed artifacts
- `__pycache__/` — regenerated Python bytecode

omp:

- `~/.omp/agent/agent.db` — auth store (OAuth tokens and API keys)
- `~/.omp/agent/.env`, `~/.omp/.env` — environment secrets
- `~/.omp/agent/secrets.yml`, `~/.omp/agent/secret-placeholder.key` — secret redaction store and its per-install key
- `~/.omp/auth-broker.token`, `~/.omp/auth-gateway.token` — broker/gateway bearer tokens
- `~/.omp/install-id` — per-install identity; regenerating it on another machine is expected
- `~/.omp/agent/sessions/`, `blobs/`, `terminal-sessions/`, `history.db`, `models.db` — session state and history
- `~/.omp/logs/`, `cache/`, `run/`, `natives/`, `puppeteer/`, `collab/`, `autoqa.db`, `gpu_cache.json` — volatile runtime state

`scripts/backup-omp.sh` is **allowlist-based**: only paths listed in
[`scripts/omp-manifest.sh`](scripts/omp-manifest.sh) are copied. Recursive backups additionally filter
known secret filenames, keys, databases, and generated directories. This does not inspect file contents:
review settings, MCP configuration, instructions, and custom scripts for embedded credentials before committing.

## What is synced from `~/.omp`

Backed-up files (any that exist; omp only writes the variants you actually touch):

- `agent/config.yml` — main settings file
- `agent/keybindings.{yml,yaml,json}`, `agent/models.{yml,yaml}`
- `agent/mcp.json`, `agent/.mcp.json`, `agent/lsp.{json,yml,yaml}`
- `agent/AGENTS.md`, `RULES.md`, `SYSTEM.md`, `APPEND_SYSTEM.md`, `TITLE_SYSTEM.md`, `WATCHDOG.{md,yml,yaml}`
- `agent/share.{ts,js}` — custom `/share` implementation

Plugin registries (backed up, but replayed instead of copied on restore — see below):

- `marketplaces.json` — configured marketplaces
- `plugins/package.json` — npm/git/linked plugins
- `plugins/installed_plugins.json` — marketplace installs (user and project scope)
- `plugins/omp-plugins.lock.json` — enable/feature state and resolved versions

Backed-up directories (mirrored, so deletions propagate into the repo):

- `agent/agents`, `commands`, `extensions`, `hooks`, `instructions`, `managed-skills`, `prompts`, `rules`, `skills`, `themes`, `tools`

Restore copies tracked files into `~/.omp` **without deleting extra local files**, but overwrites
matching paths when their contents differ. The same copy-without-delete policy applies to pi restore.
Save any local configuration you want to keep before running `scripts/install.sh`.

Named omp profiles (`~/.omp/profiles/<name>/agent`) are not synced; only the default profile is.

### omp plugins

The four registry files above are backed up but never copied back into `~/.omp`. They record
absolute paths of the machine that wrote them — the marketplace catalog cache, the plugin install
cache, and bun's `node_modules` symlinks — so copying them onto another machine yields a registry
pointing at directories that do not exist. `scripts/install.sh` instead replays them through the omp
CLI, which rebuilds the cache, the `node_modules` symlinks, and `omp-plugins.lock.json` locally. The
current repository snapshot has no plugin registry files; replay is a no-op until a backup includes them:

```bash
./scripts/omp-plugins.sh plan      # what the backup asks for
./scripts/omp-plugins.sh restore   # omp plugin marketplace add / omp plugin install what is missing
./scripts/omp-plugins.sh status    # OK/MISSING per marketplace and plugin
```

Details:

- Marketplaces are re-added from their recorded source (`owner/repo`, git URL, catalog URL, or local
  directory). A local-directory marketplace only restores if that directory exists on the new machine.
- Marketplace plugins are reinstalled as `omp plugin install <name>@<marketplace>`. Only user-scoped
  installs are replayed; project-scoped ones belong to their own repository's `.omp` directory.
- npm/git plugins come from `plugins/package.json`. A caret/tilde range is not a valid omp install
  spec, so the exact version from `omp-plugins.lock.json` is used when available; otherwise the package
  name is installed without a version pin. `file:`/`link:` dependencies still require their local paths.
- Restore skips already-configured marketplaces and already-installed plugin IDs; it does not reconcile
  their versions or reapply saved enable/feature flags. Individual CLI install failures are reported while
  later items continue, then return exit `4`. `install.sh` warns rather than failing on plugin replay errors.
- `scripts/check.sh` verifies marketplace names and plugin IDs through the omp CLI rather than by looking
  for registry files.

## Git convention

All pi work is configured so that `~/.pi/agent/AGENTS.md` references `~/.pi/agent/docs/git-convention.md`.

- Commit: `<type>(<scope>): <subject>`
- PR title: `<type>(<scope>): <subject> [Ticket Number]`
- Default merge strategy: Squash & Merge
- Review comment prefix: `P1`–`P5`

## Restore on a new Mac

Prerequisites: macOS, Git, Homebrew, `rsync`, and network access to the package sources. Run the installer
from a trusted checkout: it changes global tools and copies configuration into your home directory.

```bash
git clone https://github.com/zebra0303/my-pi-sync ~/Git/my-pi-sync
cd ~/Git/my-pi-sync
./scripts/install.sh
./scripts/check.sh
```

The install script loads or installs `nvm`, installs the Node/npm/pi/pnpm versions in `versions.env`,
sets the default nvm Node version, and copies pi configuration. For pnpm it uses Corepack when available,
otherwise a global npm install. It installs `omp` with `brew install can1357/tap/omp` only when the `omp`
command is missing, copies allowlisted omp configuration, and replays any recorded marketplaces/plugins.

`Brewfile` documents the Homebrew dependencies; `install.sh` does not run `brew bundle`.
`OMP_VERSION` is a diagnostic baseline, **not an enforced Homebrew version pin**: an existing omp is
left unchanged, and a fresh install gets the formula's available version.

After restoration, start **each agent you use** and run `/login`; neither agent's credentials are
restored. In an existing pi session, `/reload` reloads prompts, skills, extensions, and themes.
Ensure future shells load nvm as described by your nvm installation; the installer loads it only
inside its own process.

pi packages (themes, extensions, and other `pi install` sources) are restored through
`settings.json`: its `packages` array is backed up, and pi fetches those sources itself on the next
start. The generated `~/.pi/agent/{npm,git,bin}` trees stay out of git for that reason; installed
theme packages' JSON files are additionally materialized into `config/pi/agent/themes/` so themes can
survive a package source going away. This includes installed package themes disabled with `themes: []`.

## Install as a pi package

If you only want to install prompts, skills, extensions, and themes remotely, use:

```bash
pi install https://github.com/zebra0303/my-pi-sync
```

This uses the `pi` manifest in `package.json` and exposes only the declared extension, skill, prompt,
and theme directories. It does not restore pi settings/instructions, omp configuration, global tool
versions, or Homebrew dependencies. Use the bootstrap install script for the full environment.

## Back up the current environment

`scripts/backup.sh` detects which agents are configured on this machine and backs up each one, so
you run a single command regardless of whether the machine has pi, omp, or both.

```bash
./scripts/backup.sh                     # copy config into the repo; no git staging, commit, or push
./scripts/backup.sh --commit            # + commit the backup locally
./scripts/backup.sh --commit --push     # + push
./scripts/backup.sh --commit -m "..."   # override the commit message
./scripts/backup.sh omp --commit        # only omp
./scripts/backup.sh pi                  # only pi
./scripts/backup.sh --commit --allow-new # after reviewing newly introduced files
```

Detection treats an existing-but-empty config directory as "not configured here", because backing it
up would prune the committed copy. If one agent's backup fails, the other still runs and the script
exits non-zero.

### Committing and pushing

Pushing is opt-in. `backup-pi.sh` is block-list based, so a new file under `~/.pi/agent` is copied
unless it matches an exclusion. Review both new files and changes to tracked files for secrets:

- `--commit` **refuses** to introduce a path that is not tracked yet (exit code `3`). Review the
  listed paths for secrets, then re-run with `--allow-new`.
- Only the backup destinations (`config/pi/agent`, `config/omp`) are staged. Unrelated working-tree
  changes are never swept into the commit.
- The default message names the successfully backed-up agents, for example `chore(agent): update pi and omp environment`.
- `--push` implies `--commit`. Without it, nothing leaves the machine.

What each delegate does:

- `scripts/backup-pi.sh` — copies global config out of `~/.pi/agent` with the exclusions listed above,
  then materializes JSON themes from installed npm/git/local packages referenced in `settings.json`.
  It **does not delete** backup files that have disappeared from the source. Conflicting theme filenames
  receive a package-name prefix.
- `scripts/backup-omp.sh` — mirrors allowlisted paths from `~/.omp` into `config/omp/`, pruning
  entries you deleted locally. Files outside the allowlist are not part of this synchronization.

Source and destination roots are overridable, which is how the tests drive the scripts:

| Variable | Default | Used by |
| --- | --- | --- |
| `PI_AGENT_DIR` | `~/.pi/agent` | pi backup source |
| `PI_BACKUP_DIR` | `config/pi/agent` in this checkout | pi backup destination |
| `OMP_CONFIG_ROOT` | `~/.omp` | omp backup source and install/check destination |
| `OMP_BACKUP_DIR` | `config/omp` in this checkout | omp backup destination and plugin replay input |

`omp-plugins.sh` also accepts an explicit backup root after `plan`, `restore`, or `status`.
These variables do not redirect pi installation or pi environment checks, which use `~/.pi/agent`.

## Environment check

```bash
./scripts/check.sh
```

The check reports Node/npm/pi/omp version comparisons, selected pi resource paths, backed-up omp
allowlist entries, and any recorded plugin IDs. It checks existence, not configuration-content equality,
and does not compare the pnpm version.

**Read the output:** `MISMATCH` and `MISSING` lines do not themselves cause a failing exit status.
This is a diagnostic command, not a strict CI gate.

## Repository baseline versions

[`versions.env`](versions.env) is the source of truth for these values; they describe the repository's
baseline, not necessarily the versions currently installed on your machine.

| Tool | Baseline | Installation behavior |
| --- | --- | --- |
| Node.js | `24.16.0` | Installed and selected via nvm |
| npm | `12.0.1` | Global install if the version differs |
| `@earendil-works/pi-coding-agent` | `0.82.0` | Global npm install if the version differs |
| pnpm | `11.0.8` | Corepack or global npm install; also declared in `package.json` |
| omp | `17.1.2` | Checked only; missing binary installed from `can1357/tap/omp` |

## Development and validation

Use the repository's pinned pnpm version:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm format:check
```

- `pnpm test` runs Node's test runner over `tests/*.test.mjs`: agent detection, backup failure isolation,
  commit safeguards, omp secret exclusions/deletion propagation, same-second edits, package themes,
  and plugin-registry parsing/planning. It does not exercise a real Homebrew installation or live plugin restore.
- `pnpm lint` runs ESLint; the Husky pre-commit hook runs this command too.
- `pnpm format:check` checks repository formatting; `pnpm format` rewrites it.
- `pnpm backup` and `pnpm check` invoke the corresponding shell entry points.

The plugin restore/status paths use Bash `mapfile` when registries are present; Apple's stock Bash 3.2
does not provide it. Use Bash 4+ for those paths (and ensure the installer resolves a compatible `bash`
on `PATH`). An empty plugin plan does not enter those code paths.

## Claude/Codex workflow migration

The Atlassian workflows that were previously used from `~/.claude/commands` and `~/.codex/skills/atlassian-workflows` are now included in this repository as pi prompt templates and skills.

- Prompt templates: `read-confluence`, `search-confluence`, `spike-report`, `sync-dev-task`, `md-to-adf`
- Skill: `atlassian-workflows`
- Script: `config/pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py`

## Multi-model debate

[`model-debate`](config/pi/agent/skills/model-debate/) orchestrates independent proposals, source checks,
cross-critique, synthesis, and up to two artifact-review loops. It can produce documents, Confluence
drafts, or Marp slide decks; external publication requires explicit approval.

The omp panelists live in [`config/omp/agent/agents/`](config/omp/agent/agents/):

| Agent | Nickname | Pinned model |
| --- | --- | --- |
| `debate-opus` | Clark | `anthropic/claude-opus-5-5` |
| `debate-grok` | Rocky | `cursor/grok-4.7-fast` |
| `debate-gpt` | Geppetto | `openai-codex/gpt-6.1-sol` |

Grok uses `thinking-level: low`; Opus and GPT use `medium`. The skill and panelist definitions are
stored in different agent trees; installing only the pi package does not install the omp panelists.

Before a debate, the skill runs its
[`scripts/check-models.mjs`](config/pi/agent/skills/model-debate/scripts/check-models.mjs) against the omp
model catalog. It reports newer models in the same provider/family supporting the pinned thinking level.
`--apply` rewrites model lines only after approval; by default it targets `~/.omp/agent/agents`.
Run `./scripts/backup.sh omp` after changing live panelist definitions to sync this repository.

Debate artifacts are written under `.dev/debate-<timestamp>/` in the working directory.
[`scripts/debate-stage.mjs`](config/pi/agent/skills/model-debate/scripts/debate-stage.mjs) serves a local
browser stage showing panelist progress, playback, synthesis, and the final answer; see the skill for
the artifact/status-file contract and lifecycle commands.
