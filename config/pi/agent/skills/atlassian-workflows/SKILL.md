---
name: atlassian-workflows
description: "Use when working with Lunit Atlassian workflows in pi: reading or searching Confluence pages, generating Jira spike investigation reports from Epic/Story tickets, syncing Jira DevTask Background/Description/Subtasks from linked Story requirements, or converting Markdown to Atlassian Document Format JSON for Jira/Confluence updates."
metadata:
  short-description: Confluence and Jira workflow helpers
---

# Atlassian Workflows

Use this skill for Atlassian tasks that were previously handled by Claude commands in `~/.claude/commands` or Codex skills in `~/.codex/skills`.

## Available Workflows

- **Read Confluence page**: when the user asks to read, summarize, or inspect a Confluence URL/page ID. Read `references/read-confluence.md`.
- **Search Confluence**: when the user asks to search Confluence. Read `references/search-confluence.md`.
- **Spike report**: when the user asks to create a spike investigation report for a Jira Epic, Story, DevTask, or ticket key. Read `references/spike-report.md`.
- **Sync DevTask**: when the user asks to sync a DevTask from a Story, create/split DevTasks, update Background/Description, manage subtasks, or detect DevTask file conflicts. Read `references/sync-dev-task.md`.
- **Markdown to ADF**: use `scripts/md-to-adf.py` whenever Markdown must be uploaded to Jira fields or other Atlassian APIs that require Atlassian Document Format.

## General Rules

- Keep conversation with the user in the user's language, but write Jira ticket content in English unless the workflow explicitly asks for both English and Korean output.
- Prefer `acli` for Jira reads/standard edits and `confluence` for Confluence reads/searches/creates.
- If `acli`, `confluence`, or Atlassian API calls fail because credentials are missing, tell the user which environment variables or login steps are needed instead of inventing data.
- Treat Story requirements as the source of truth. Include every non-strikethrough Story item; only exclude strikethrough items.
- Use actual repository searches and file reads for technical findings. Do not guess file paths, line numbers, dependencies, or risks.
- Before mutating Jira or Confluence, show a concise preview and ask for confirmation unless the user explicitly asked to perform the update.

## ADF Conversion

The bundled converter is at:

```bash
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py
```

Examples:

```bash
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py Docs/LHVE-49-spike-report.md > /tmp/desc.json
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py --text "## Scope\nContent" > /tmp/desc.json
```

When following the original Claude references, replace `.claude/scripts/md-to-adf.py` with the bundled pi skill path above.
