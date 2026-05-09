# pi environment bootstrap

```text
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀
⠀⠀⠀⠀⠀⠀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠀⠀⠀⣰⣿⣿⣿⠟⠋⠀⠀⠀⣿⣿⣿⡇⠀⠀⠀⠀⣿⣿⣿⣿⣿⠁⠀⠀⠀⠀
⠀⠀⢰⣿⣿⡿⠁⠀⠀⠀⠀⢠⣿⣿⣿⡇⠀⠀⠀⢸⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀
⠀⠀⠈⠛⠋⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠁⠀⠀⠀⣾⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠀⠀⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⡇⠀⠀⠀⢸⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⠁⠀⠀⠀⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⡟⠀⠀⠀⢰⣿⣿⣿⣿⣿⣄⠀⠀⣴⡆⠀⠀
⠀⠀⠀⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣶⣾⣿⠃⠀⠀
⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⠏⠀⠀⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀
⠀⠀⠀⠀⠀⠈⠻⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⡿⠟⠁⠀⠀
```

This is a personal bootstrap repository for quickly reproducing the same pi environment on a new Mac or PC.

## What's included

- Node/npm/pi version pins: [`versions.env`](versions.env), [`.nvmrc`](.nvmrc)
- Homebrew dependencies: [`Brewfile`](Brewfile)
- Global pi settings: [`config/pi/agent/settings.json`](config/pi/agent/settings.json)
- Global pi instructions: [`config/pi/agent/AGENTS.md`](config/pi/agent/AGENTS.md)
- Git convention: [`config/pi/agent/docs/git-convention.md`](config/pi/agent/docs/git-convention.md)
- pi prompt templates: [`config/pi/agent/prompts/`](config/pi/agent/prompts/)
- pi skills: [`config/pi/agent/skills/`](config/pi/agent/skills/)
- Install script: [`scripts/install.sh`](scripts/install.sh)
- Current pi configuration backup script: [`scripts/backup-pi.sh`](scripts/backup-pi.sh)
- Environment check script: [`scripts/check.sh`](scripts/check.sh)

## Never commit

The following files contain secrets or private work history and must not be committed.

- `~/.pi/agent/auth.json` — OAuth/API credentials
- `~/.pi/agent/sessions/` — conversation/session logs
- `~/.pi/agent/bin`, `git`, `npm` — generated or installed artifacts

## Git convention

All pi work is configured so that `~/.pi/agent/AGENTS.md` references `~/.pi/agent/docs/git-convention.md`.

- Commit: `<type>(<scope>): <subject>`
- PR title: `<type>(<scope>): <subject> [Ticket Number]`
- Default merge strategy: Squash & Merge
- Review comment prefix: `P1`–`P5`

## Restore on a new Mac

```bash
git clone <this-repo-url> ~/Garage/pi
cd ~/Garage/pi
./scripts/install.sh
./scripts/check.sh
```

The install script assumes Homebrew is already installed. It restores `nvm`, the pinned Node/npm versions, `pi`, `pnpm`, and pi configuration files.

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

After changing pi configuration, back it up into this repository:

```bash
./scripts/backup-pi.sh
git status
git add .nvmrc Brewfile config versions.env scripts README.md .gitignore
git commit -m "chore(agent): update pi environment"
```

## Environment check

```bash
./scripts/check.sh
```

## Current baseline environment

- macOS arm64
- Node.js `24.15.0` via nvm
- npm `11.12.1`
- `@earendil-works/pi-coding-agent` `0.74.0`
- pnpm `11.0.8`

## Claude/Codex workflow migration

The Atlassian workflows that were previously used from `~/.claude/commands` and `~/.codex/skills/atlassian-workflows` are now included in this repository as pi prompt templates and skills.

- Prompt templates: `read-confluence`, `search-confluence`, `spike-report`, `sync-dev-task`, `md-to-adf`
- Skill: `atlassian-workflows`
- Script: `config/pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py`
