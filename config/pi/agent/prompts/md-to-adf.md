---
description: Convert Markdown to Atlassian Document Format JSON for Jira or Confluence updates
argument-hint: "<markdown-file-or-text>"
---

Use the `atlassian-workflows` skill.
Use the bundled script at `~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py` to convert Markdown to Atlassian Document Format JSON.

Arguments: $ARGUMENTS

If the argument is a file path, convert that file. Otherwise, treat the arguments as Markdown text and use the script's `--text` option.
