---
description: Generate a Jira implementation plan and persist it under Docs/.dev
argument-hint: "<ticket-key> [repo-path ...]"
---

Use the `atlassian-workflows` skill.
Read `references/implement-plan.md` from that skill and execute the Implement Plan workflow.

Requirements:
- Planning only; do not modify product code.
- Store the plan at `Docs/.dev/<TICKET>-plan.md` when the repository has a `Docs` directory; otherwise use `.dev/<TICKET>-plan.md`.
- If a plan already exists, read it first, preserve useful history, and append a new `Plan History` entry.
- Read any existing `Docs/.dev/<TICKET>-spike.md`, `Docs/.dev/<TICKET>-review.md`, and `Docs/.dev/<TICKET>-progress.md` as context when present.

Arguments: $ARGUMENTS
