# Implement Ticket Workflow

Implement a Jira ticket with AI while preserving progress history. This workflow performs code changes only after context gathering, planning, and explicit user approval gates.

## Critical rule: read progress before doing work

Before any implementation action, always check for and read the progress file:

```text
Docs/.dev/<TICKET>-progress.md
```

If the repository has no `Docs` directory, use:

```text
.dev/<TICKET>-progress.md
```

If the progress file exists:

1. Read it completely.
2. Summarize what is already done, what is in progress, what failed, and what remains.
3. Reconcile it with current git status and source files.
4. Tell the user where you will resume.
5. Do not restart from scratch unless the user explicitly asks.

If the progress file does not exist, create it during Phase 0 before implementation and initialize the history.

## Purpose

Given a Jira ticket key and optional repository path, implement the ticket using repository conventions, an implementation plan, and a progress log.

Progress must be recorded at:

```text
Docs/.dev/<TICKET>-progress.md
```

Related plan must be read or generated at:

```text
Docs/.dev/<TICKET>-plan.md
```

## Input

```text
<TICKET_KEY> [REPO_PATH]
```

Examples:

```text
/implement-ticket LHVE-164
/implement-ticket LHVE-164 .
/implement-ticket LHVE-164 ~/Git/vantage-playground
```

If no ticket key is provided, ask the user for it.

## Output paths

Resolve the development notes directory:

1. If `<repo>/Docs` exists, use `<repo>/Docs/.dev`.
2. Otherwise, use `<repo>/.dev`.
3. Create the directory if needed.

Files:

```text
Docs/.dev/<TICKET>-plan.md
Docs/.dev/<TICKET>-progress.md
Docs/.dev/<TICKET>-spike.md          # optional input
Docs/.dev/<TICKET>-review.md         # optional input
```

## Approval gates

Never proceed autonomously past these gates:

| Gate | When | Requirement |
|---|---|---|
| Gate 1 | After plan creation/update | User approves plan before code changes |
| Gate 2 | After code generation | User reviews changes before broad test/fix loops |
| Gate 3 | Before commit | User approves staged files and commit message |

If the user explicitly asks to continue through a gate, record that in the progress file.

## Phase workflow

### Phase 0: Context and progress recovery

1. Parse `TICKET_KEY` and repo path.
2. Inspect git status:

   ```bash
   git status --short
   git branch --show-current
   ```

3. Check and read progress file first:

   ```text
   Docs/.dev/<TICKET>-progress.md
   ```

4. Read related local notes if present:

   ```text
   Docs/repo-analysis.md
   Docs/.dev/<TICKET>-plan.md
   Docs/.dev/<TICKET>-spike.md
   Docs/.dev/<TICKET>-review.md
   ```

5. Fetch Jira context via `acli`.
6. Update progress file with a Phase 0 history entry.

### Phase 1: Requirement analysis and clarification

- Parse Jira requirements.
- Identify assets, credentials, APIs, or decisions needed.
- Ask clarifying questions if requirements are ambiguous.
- Record open questions in progress.

### Phase 2: Implementation plan

- If `Docs/.dev/<TICKET>-plan.md` exists, read and validate it against code.
- If missing, run the Implement Plan workflow and create it.
- Present the plan summary.
- **Gate 1**: ask for user approval before code changes.
- Record approval or requested changes in progress.

### Phase 3: Branch and workspace safety

- Ensure working tree state is understood.
- Implementation work MUST be done in a dedicated git worktree, not directly in the root worktree, unless the user explicitly opts out.
- Create the worktree under the root repository's `.worktree/` directory:

  ```text
  <repo-root>/.worktree/<branch-name>
  ```

- The branch name MUST use this format:

  ```text
  <TICKET>-<title-slug>
  ```

  Examples:

  ```text
  LHVE-183-nx-consider-migrating-from-servetargetname-to-devtargetname-in-nx-vite-configuration
  LHVE-164-add-monitoring-dashboard-shell
  ```

- Build `<title-slug>` from the Jira summary/title by lowercasing, converting non-alphanumeric runs to `-`, trimming leading/trailing `-`, and keeping it concise enough for practical shell use while preserving the ticket meaning.
- Before creating the worktree, sync/confirm the intended base branch and do not discard user changes.
- If `.worktree/` is not ignored, add it to local git excludes (`.git/info/exclude`) rather than modifying tracked ignore files unless the user asks.
- If the required branch or worktree already exists, inspect it and resume there instead of recreating it.
- Record branch/worktree path decisions in progress.

### Phase 4: Code generation

- Implement according to the approved plan.
- Follow repository conventions and guardrails.
- Keep changes minimal and scoped.
- Update progress after each meaningful subtask.
- **Gate 2**: show changed files and ask the user to review before broad validation/fix loops.

### Phase 5: Tests

- Add or update focused tests for changed behavior.
- Run project-appropriate tests.
- Fix failures related to the change.
- Record commands and outcomes in progress.

### Phase 6: Build and lint verification

- Run lint/build commands from repo conventions.
- Auto-fix only relevant issues.
- Retry up to 3 times for fixable failures.
- Record commands, failures, and resolutions in progress.

### Phase 7: Self-review

- Review diff for bugs, security, architecture boundary issues, tests, accessibility, and integration risks.
- Record findings and fixes in progress.

### Phase 8: Commit

- Stage intended files only.
- Propose commit message following repo convention.
- **Gate 3**: ask for approval before committing.
- Commit only after approval.
- Record commit hash in progress.

### Phase 9: Post-development

Optionally:

- Create/update PR.
- Update Jira.
- Publish notes to Confluence.
- Record final status and remaining follow-ups.

## Progress file structure

Create/update `Docs/.dev/<TICKET>-progress.md` with this structure. Preserve existing history and append new entries rather than overwriting.

```markdown
---
title: '<TICKET> Implementation Progress'
ticket: '<TICKET>'
created: '<YYYY-MM-DD>'
updated: '<YYYY-MM-DD>'
status: '<Not Started | In Progress | Blocked | Ready for Review | Done>'
branch: '<branch name>'
---

# <TICKET>: Implementation Progress

> This file is the source of truth for AI implementation continuity. Future sessions must read it before making changes.

## Current State Summary

- Current phase: <phase>
- Completed: <short bullets>
- In progress: <short bullets>
- Remaining: <short bullets>
- Blockers / questions: <short bullets>

## Work Log

| Time | Actor | Phase | Action | Result |
|---|---|---|---|---|
| <YYYY-MM-DD HH:mm> | AI | Phase 0 | Read existing context | <result> |

## Plan and Context Read

| File / Source | Read? | Notes |
|---|---:|---|
| `Docs/.dev/<TICKET>-plan.md` | Yes/No | <notes> |
| `Docs/.dev/<TICKET>-spike.md` | Yes/No | <notes> |
| `Docs/.dev/<TICKET>-review.md` | Yes/No | <notes> |
| Jira `<TICKET>` | Yes/No | <notes> |

## Completed Changes

| Area | Files | Summary | Validation |
|---|---|---|---|

## Pending Changes

| Area | Files | Next Step | Blocker |
|---|---|---|---|

## Validation History

| Time | Command | Result | Notes |
|---|---|---|---|

## Decisions

| Time | Decision | Rationale |
|---|---|---|

## Risks / Follow-ups

| Item | Severity | Owner | Status |
|---|---|---|---|

## Commit / PR History

| Time | Commit / PR | Notes |
|---|---|---|
```

## Rules

- Always read progress before implementation actions.
- Always update progress after each phase, approval gate, validation run, blocker, and commit.
- Do not overwrite progress history; append to `Work Log` and update `Current State Summary`.
- If plan and current code diverge, stop and explain before changing code.
- Do not modify generated/heavy outputs or secrets.
- Do not use npm in pnpm repositories unless explicitly instructed.
- Follow project `AGENTS.md`, repo analysis, and git conventions.
- Prefer small, reviewable changes.
