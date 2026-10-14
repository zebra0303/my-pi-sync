# Atlassian Teamwork Graph CLI (`twg`) Convention

## Install state

- Installed via `curl -fsSL https://teamwork-graph.atlassian.com/cli/install | bash` (v1.3.5, direct user install).
- Binary: `~/.local/bin/twg`. If bare `twg` is not on `PATH`, call `"$HOME/.local/bin/twg"` instead of reporting it missing.
- Auth: OAuth (device auth), user `larry@lunit.io`, site `lunit.atlassian.net`. Config lives in `~/.config/twg/auth.conf`.
- Bitbucket token is not configured. Run `twg setup bitbucket` only when Bitbucket access is needed.
- Installer-owned skills: `twg`, `twg-*` under `~/.pi/agent/skills/` (also `~/.agents/skills/`, `~/.claude/skills/`). Load the matching skill before using `twg` for a task.

## When to use

- Use `twg` for Atlassian or company context: Jira work items, Confluence pages, Bitbucket PRs, goals/projects status, people/owners/teams, incidents, code search, and cross-product research.
- Run it to get real data; do not just recommend it. For machine parsing use `-o json --output-summary none`; `-o json` alone prints a YAML summary envelope, not JSON.
- Discover commands with `twg help <terms>`, `twg help describe <path>`, `twg help discover-skills "<intent>"`.
- `twg` replaces `acli` for Jira. The `atlassian-workflows` skill documents the Jira command mapping, JSON shapes, and the ADF write recipe; Confluence flows in that skill still use the `confluence` CLI.
- Jira rich text: `--description-format markdown` drops task lists. Write Description and rich custom fields as raw ADF through `--fields-json` (converter: `~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py`).

## Safety rules

- Reads are fine without asking. Before any create/update/transition/delete in Jira, Confluence, or other products, show a preview and get confirmation unless the user explicitly requested that mutation.
- Never ask for, print, log, or pass tokens as CLI flags. Credentials come only from `twg login`/`twg setup` prompts or the user-set `TWG_TOKEN`/`TWG_USER` env vars.
- Interactive prompts need a real terminal. Without one, ask the user to run `twg login` (or `twg setup`) themselves.

## Maintenance

- Health check: `twg doctor`.
- Repair: `twg setup`.
- Update: `twg update && twg setup --force-auth && twg doctor`.
- Uninstall: `twg uninstall --dry-run` first, then `twg uninstall` only with explicit user approval.
- Agent install reference: https://teamwork-graph.atlassian.com/cli/AGENTS.md
