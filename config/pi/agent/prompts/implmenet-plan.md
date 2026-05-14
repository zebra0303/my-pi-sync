---
description: Alias for /implement-plan; generate a Jira implementation plan under Docs/.dev
argument-hint: "<ticket-key> [repo-path ...]"
---

Use the `atlassian-workflows` skill.
Read `references/implement-plan.md` from that skill and execute the Implement Plan workflow.

This command preserves the historical typo from the original Confluence command name. Prefer `/implement-plan` for new usage.

Requirements:
- Planning only; do not modify product code.
- Store the plan at `Docs/.dev/<TICKET>-plan.md` when the repository has a `Docs` directory; otherwise use `.dev/<TICKET>-plan.md`.
- If a plan already exists, read it first, preserve useful history, and append a new `Plan History` entry.

Arguments: $ARGUMENTS
