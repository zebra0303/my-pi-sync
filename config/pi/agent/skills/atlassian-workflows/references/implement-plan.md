# Implement Plan Workflow

Generate an implementation plan from a Jira ticket. This workflow is planning-only: do not modify product code.

## Purpose

Given a Jira ticket key and optional repository paths, fetch Jira context, inspect the codebase, and create a detailed implementation plan at:

```text
Docs/.dev/<TICKET>-plan.md
```

If the repository has no `Docs` directory, use:

```text
.dev/<TICKET>-plan.md
```

The plan must include a history section so future agents and developers can see when and why the plan changed.

## Input

Expected prompt arguments:

```text
<TICKET_KEY> [REPO_PATH_1] [REPO_PATH_2] ...
```

Examples:

```text
/implement-plan LHVE-164
/implement-plan LHVE-164 .
/implement-plan LHVE-164 ~/Git/LI/Analytics ~/Git/LI/Shared.UI
```

If no ticket key is provided, ask the user for it.

## Output paths

Resolve the output directory per repository:

1. If `<repo>/Docs` exists, use `<repo>/Docs/.dev`.
2. Otherwise, use `<repo>/.dev`.
3. Create the directory if needed.

Plan file:

```text
Docs/.dev/<TICKET>-plan.md
```

Related files to read if present:

```text
Docs/.dev/<TICKET>-spike.md
Docs/.dev/<TICKET>-spike.ko.md
Docs/.dev/<TICKET>-review.md
Docs/.dev/<TICKET>-progress.md
```

## Workflow

### Step 0: Resolve repository paths

1. Parse first argument as `TICKET_KEY`.
2. Remaining arguments are repository paths; default to current working directory.
3. Resolve `~`, absolute, and relative paths.
4. Verify each path exists and is a directory.

### Step 1: Fetch Jira context

Use `acli` where available:

```bash
acli jira workitem view <TICKET_KEY> --fields '*all' --json
acli jira workitem search --jql "parent = <TICKET_KEY>" --fields "key,issuetype,summary,status,assignee,description" --json --paginate
acli jira workitem search --jql "issue in linkedIssues(<TICKET_KEY>)" --fields "key,issuetype,summary,status,description" --json --paginate
```

Extract:

- Summary
- Issue type
- Description and acceptance criteria
- Parent Epic / Story context
- Subtasks
- Linked issues
- Attachments and asset requirements
- Comments if relevant

If credentials are missing, tell the user what setup is needed instead of inventing details.

### Step 2: Load existing local context

Before analyzing code, read these files if they exist:

```text
Docs/repo-analysis.md
Docs/.dev/<TICKET>-spike.md
Docs/.dev/<TICKET>-review.md
Docs/.dev/<TICKET>-progress.md
```

Use them as context, but verify important claims against the actual codebase.

### Step 3: Analyze the codebase

Search only within the resolved repository paths.

Investigate:

- Affected files and line ranges
- Existing patterns and golden examples
- Shared modules/components and cross-impact
- API contracts, DTOs, schemas, validation
- UI, routing, state, form, i18n, accessibility implications
- Configuration, env, build, deployment implications
- Tests that should be added or updated
- Guardrails and protected files

Do not guess file paths, symbols, or commands. Read files and cite evidence.

### Step 4: Generate or update the plan

Create or update:

```text
Docs/.dev/<TICKET>-plan.md
```

If the file already exists:

1. Read it first.
2. Preserve useful prior context.
3. Add a new entry to `## Plan History`.
4. Update sections that changed.
5. Do not silently discard earlier decisions; move obsolete items to history or an `Outdated / Superseded Notes` section.

### Step 5: Present summary and ask for approval before implementation

After writing the plan:

- Summarize major phases.
- Highlight blockers and open questions.
- List validation commands.
- Ask the user to review/approve before any implementation begins.

## Required plan structure

Use Korean unless the user requests another language. Keep Jira/subtask summaries in English when appropriate.

```markdown
---
title: '<TICKET> Implementation Plan'
ticket: '<TICKET>'
created: '<YYYY-MM-DD>'
updated: '<YYYY-MM-DD>'
status: 'Plan Ready'
repositories:
  - '<repo path>'
---

# <TICKET>: Implementation Plan

> This document is an AI-assisted implementation plan. Verify against Jira and source code before development.

## Plan History

| Date | Author | Change |
|---|---|---|
| <YYYY-MM-DD> | AI | Initial plan generated |

## 1. Context

| Field | Value |
|---|---|
| Ticket | <TICKET> |
| Type | <Story/Bug/DevTask/etc.> |
| Parent | <parent key/summary or N/A> |
| Repository | <repo paths> |
| Related Docs | <spike/review/progress files read> |

## 2. Requirements Summary

<Story-first requirement summary. Include all non-strikethrough requirements.>

## 3. Scope

### In Scope

- <item>

### Out of Scope

- <item>

### Open Questions / Blockers

| Question / Blocker | Owner | Impact | Needed By |
|---|---|---|---|

## 4. Affected Files and Evidence

| Area | File | Evidence | Expected Change |
|---|---|---|---|
| <area> | `<path>` | <line/symbol/pattern> | <change> |

## 5. Implementation Phases

### Phase 1: <Name>

**Goal**: <goal>

**Files**:

- `<path>` — <change>

**Steps**:

1. <step>
2. <step>

**Validation**:

```bash
<command>
```

### Phase 2: <Name>

...

## 6. Execution Order

```text
Phase 1
  └── Phase 2
      └── Phase 3
```

## 7. Test Plan

| Test Type | Command/File | Expected Coverage |
|---|---|---|

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|

## 9. Validation Commands

```bash
<lint/test/build commands>
```

## 10. Implementation Handoff

- Branch suggestion: `<branch>`
- Commit scope suggestion: `<scope>`
- Progress file to update during implementation: `Docs/.dev/<TICKET>-progress.md`
```

## Rules

- Planning-only: do not edit product code.
- Evidence-based: every affected file claim should come from actual reads/searches.
- Story-first: Jira requirements are the source of truth.
- If a spike report exists, use it but verify critical details.
- Always write the plan to `Docs/.dev/<TICKET>-plan.md` when `Docs` exists.
- Preserve and append plan history on updates.
