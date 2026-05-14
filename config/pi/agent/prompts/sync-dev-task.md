---
description: Create or sync Jira Story Sub-task(Dev)/DevTask work items, Background, Description, implementation subtasks, and conflict links
argument-hint: "<ticket-key> [repo-path ...]"
---

Use the `atlassian-workflows` skill.
Read `references/sync-dev-task.md` from that skill and execute the Sync DevTask workflow.

When the input is a Story ticket, discover existing Sub-task(Dev)/DevTask work items, compare coverage against Story requirements, and propose creating one or more appropriately sized Sub-task(Dev) children when none exist or requirements are uncovered. Ask for confirmation before creating or updating Jira work items.

Arguments: $ARGUMENTS
