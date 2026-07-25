# pi environment bootstrap

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

This is a personal bootstrap repository for quickly reproducing the same pi and omp (oh-my-pi) environment on a new Mac or PC.

## What's included

- Node/npm/pi/omp version pins: [`versions.env`](versions.env), [`.nvmrc`](.nvmrc)
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
- Environment check script: [`scripts/check.sh`](scripts/check.sh)
- Script tests: [`tests/`](tests/) — run with `npm test`

## Never commit

The following files contain secrets, machine identity, or private work history and must not be committed.

pi:

- `~/.pi/agent/auth.json` — OAuth/API credentials
- `~/.pi/agent/sessions/` — conversation/session logs
- `~/.pi/agent/bin`, `git`, `npm` — generated or installed artifacts

omp:

- `~/.omp/agent/agent.db` — auth store (OAuth tokens and API keys)
- `~/.omp/agent/.env`, `~/.omp/.env` — environment secrets
- `~/.omp/agent/secrets.yml`, `~/.omp/agent/secret-placeholder.key` — secret redaction store and its per-install key
- `~/.omp/auth-broker.token`, `~/.omp/auth-gateway.token` — broker/gateway bearer tokens
- `~/.omp/install-id` — per-install identity; regenerating it on another machine is expected
- `~/.omp/agent/sessions/`, `blobs/`, `terminal-sessions/`, `history.db`, `models.db` — session state and history
- `~/.omp/logs/`, `cache/`, `run/`, `natives/`, `puppeteer/`, `collab/`, `autoqa.db`, `gpu_cache.json` — volatile runtime state

`scripts/backup-omp.sh` is **allowlist-based** for exactly this reason: only the paths listed in
`scripts/omp-manifest.sh` are ever copied, so a new file that omp starts writing under `~/.omp`
cannot leak into git until it is explicitly added.

## What is synced from `~/.omp`

Backed-up files (any that exist; omp only writes the variants you actually touch):

- `agent/config.yml` — main settings file
- `agent/keybindings.{yml,yaml,json}`, `agent/models.{yml,yaml}`
- `agent/mcp.json`, `agent/.mcp.json`, `agent/lsp.{json,yml,yaml}`
- `agent/AGENTS.md`, `RULES.md`, `SYSTEM.md`, `APPEND_SYSTEM.md`, `TITLE_SYSTEM.md`, `WATCHDOG.{md,yml,yaml}`
- `agent/share.{ts,js}` — custom `/share` implementation
- `marketplaces.json`, `plugins/package.json`, `plugins/installed_plugins.json`, `plugins/omp-plugins.lock.json`

Backed-up directories (mirrored, so deletions propagate into the repo):

- `agent/agents`, `commands`, `extensions`, `hooks`, `instructions`, `managed-skills`, `prompts`, `rules`, `skills`, `themes`, `tools`

Restore is intentionally **non-destructive**: `scripts/install.sh` copies tracked files into `~/.omp`
without deleting untracked local skills, themes, or extensions.

Named omp profiles (`~/.omp/profiles/<name>/agent`) are not synced; only the default profile is.

## Git convention

All pi work is configured so that `~/.pi/agent/AGENTS.md` references `~/.pi/agent/docs/git-convention.md`.

- Commit: `<type>(<scope>): <subject>`
- PR title: `<type>(<scope>): <subject> [Ticket Number]`
- Default merge strategy: Squash & Merge
- Review comment prefix: `P1`–`P5`

## Restore on a new Mac

```bash
git clone <this-repo-url> ~/Git/my-pi-sync
cd ~/Git/my-pi-sync
./scripts/install.sh
./scripts/check.sh
```

The install script assumes Homebrew is already installed. It restores `nvm`, the pinned Node/npm versions, `pi`, `pnpm`, and pi configuration files, installs `omp` from `can1357/tap` when it is missing, and copies the tracked `config/omp/` files into `~/.omp`.

## Install as a pi package

If you only want to install prompts, skills, extensions, and themes remotely, use:

```bash
pi install https://github.com/zebra0303/my-pi-sync
```

This uses the `pi` manifest in `package.json`. Use the bootstrap install script above if you also need to restore `settings.json`, `AGENTS.md`, Node/npm versions, and Homebrew dependencies.

After installation, log in to pi again.

```bash
pi
# Run /login inside pi
```

## Back up the current environment

`scripts/backup.sh` detects which agents are configured on this machine and backs up each one, so
you run a single command regardless of whether the machine has pi, omp, or both.

```bash
./scripts/backup.sh                     # mirror config into the repo, no git changes
./scripts/backup.sh --commit            # + commit the backup locally
./scripts/backup.sh --commit --push     # + push
./scripts/backup.sh --commit -m "..."   # override the commit message
./scripts/backup.sh omp --commit        # only omp
```

Detection treats an existing-but-empty config directory as "not configured here", because backing it
up would prune the committed copy. If one agent's backup fails, the other still runs and the script
exits non-zero.

### Committing and pushing

Pushing is opt-in on purpose. `backup-pi.sh` is block-list based, so a file that pi starts writing
under `~/.pi/agent` lands in the backup by default — and a push cannot be undone. Guard rails:

- `--commit` **refuses** to introduce a path that is not tracked yet (exit code `3`). Review the
  listed paths for secrets, then re-run with `--allow-new`.
- Only the backup destinations (`config/pi/agent`, `config/omp`) are staged. Unrelated working-tree
  changes are never swept into the commit.
- The default message follows the git convention: `chore(agent): update pi and omp environment`.
- `--push` implies `--commit`. Without it, nothing leaves the machine.

What each delegate does:

- `scripts/backup-pi.sh` — copies stable global config out of `~/.pi/agent` (block-list based) and
  materializes theme JSON files from installed pi packages into `config/pi/agent/themes/`.
- `scripts/backup-omp.sh` — mirrors the allowlisted paths from `~/.omp` into `config/omp/`, pruning
  entries you deleted locally.

Source and destination roots are overridable, which is how the tests drive the scripts:
`PI_AGENT_DIR` / `PI_BACKUP_DIR` and `OMP_CONFIG_ROOT` / `OMP_BACKUP_DIR`.

## Environment check

```bash
./scripts/check.sh
```

## Current baseline environment

- macOS arm64
- Node.js `24.16.0` via nvm
- npm `12.0.1`
- `@earendil-works/pi-coding-agent` `0.82.0`
- pnpm `11.0.8`
- `omp` `17.1.2` via `brew install can1357/tap/omp`

## Claude/Codex workflow migration

The Atlassian workflows that were previously used from `~/.claude/commands` and `~/.codex/skills/atlassian-workflows` are now included in this repository as pi prompt templates and skills.

- Prompt templates: `read-confluence`, `search-confluence`, `spike-report`, `sync-dev-task`, `md-to-adf`
- Skill: `atlassian-workflows`
- Script: `config/pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py`
