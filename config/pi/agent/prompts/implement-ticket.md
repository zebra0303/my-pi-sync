---
description: Implement a Jira ticket with approval gates and Docs/.dev progress tracking
argument-hint: "<ticket-key> [repo-path]"
---

Use the `atlassian-workflows` skill.
Read `references/implement-ticket.md` from that skill and execute the Implement Ticket workflow.

Critical requirements:
- Before any implementation action, always check for `Docs/.dev/<TICKET>-progress.md` when the repository has a `Docs` directory; otherwise check `.dev/<TICKET>-progress.md`.
- If the progress file exists, read it completely, summarize completed/in-progress/remaining work, reconcile it with git status and source files, and resume from that state.
- If the progress file does not exist, create it during Phase 0 before implementation and initialize the history.
- Read or generate `Docs/.dev/<TICKET>-plan.md` before code changes.
- Update progress after each phase, approval gate, validation run, blocker, and commit.
- Do not proceed past Gate 1 (plan approval), Gate 2 (post-code review), or Gate 3 (commit approval) without explicit user approval.

Arguments: $ARGUMENTS
