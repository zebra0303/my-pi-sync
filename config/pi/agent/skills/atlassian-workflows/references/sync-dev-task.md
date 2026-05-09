Sync a DevTask from the latest requirements in its linked Story.

Update Background and Description first. Ask the user before creating or updating Subtasks.

## Input

Format: `<TICKET_KEY> [REPO_PATH_1] [REPO_PATH_2] ...`

- `TICKET_KEY`: a DevTask key such as `LHVE-78`, or a Story key such as `LHVE-57`
- `REPO_PATH`: optional repository path for code analysis

User input: `$ARGUMENTS` means arguments passed through the pi prompt template or the user's current request.

## Step 0: Determine ticket type

1. Fetch the ticket:

```bash
acli jira workitem view "<TICKET_KEY>" --fields '*all' --json
```

2. Branch by issue type:
   - **DevTask**: proceed to Phase 1.
   - **Story**: find linked DevTasks.
     - If linked DevTasks exist, run Phase 1 for each DevTask sequentially.
     - If no linked DevTask exists, run Phase 0 to create one or more DevTasks.

## Phase 0: Create DevTasks when a Story has none

### Step 0-1: Collect Story requirements

Collect all requirements from the Story description, comments, attachments, and any linked Spike Report.

### Step 0-2: Classify requirements by technical layer

Classify each requirement into the following layers:

| Layer | Included work | Examples |
| --- | --- | --- |
| MVC / Server | Razor pages, controllers, view models, server rendering | `.cshtml`, `Controller.cs`, `ViewModel.cs` |
| React / SPA | React components, hooks, state, client logic | `.tsx`, `.jsx`, `store/`, `hooks/` |
| Email / Notification | Email templates, notification services, message formats | `EmailTemplate.cshtml`, `NotificationService.cs` |
| DB / Migration | Schema, migrations, seed data | `Migration_*.cs`, `DbContext.cs` |
| Infrastructure | Configuration, env vars, feature flags, CI/CD | `appsettings.json`, `FeatureFlags.cs` |
| Shared / Common | Shared models, utilities, constants | `Constants.cs`, `SharedModels.cs` |

Summarize the classification as a table:

```text
=== Requirement Layer Classification ===
| Requirement Item | MVC | React | Email | DB | Infra | Shared |
| --- | --- | --- | --- | --- | --- | --- |
| Item 1: replace logo | ✓ | ✓ | ✓ | | | ✓ |
| Item 2: change color | ✓ | ✓ | | | | |
| Item 3: update notification | | | ✓ | | | |
```

### Step 0-3: Decide single DevTask vs split DevTasks

Use the analysis to propose whether to create a single DevTask or split into multiple DevTasks.

Split decision guide:

| Condition | Recommendation | Reason |
| --- | --- | --- |
| All items are concentrated in one layer | Single DevTask | Splitting is unnecessary |
| Multiple layers but fewer than 10 files | Single DevTask preferred | Splitting may add overhead |
| Multiple layers with at least two days of work per layer | Split DevTasks | Enables independent work and review |
| Different owners are likely by layer | Split DevTasks | Enables parallel work |
| Design assets are pending | Split DevTasks | Tracks asset dependency separately |
| File conflicts with other Stories in the same Epic | Split DevTasks | Isolates conflict areas |

Show a proposal before creating anything:

```text
=== DevTask Creation Proposal ===

Story LHVE-53: "Rebrand Quiver — Main Application Pages"
12 requirements, 35 impacted files

[Recommendation] Split into 3 DevTasks

  DevTask A — MVC Pages (6 items, 15 files, ~3 days)
    Items: 1, 2, 4, 6, 8, 10
    Key files: *.cshtml, *Controller.cs, *ViewModel.cs

  DevTask B — React Components (4 items, 12 files, ~2 days)
    Items: 3, 5, 7, 9
    Key files: *.tsx, *.jsx, hooks/*, store/*

  DevTask C — Email Templates (2 items, 8 files, ~1.5 days)
    Items: 11, 12
    Key files: EmailTemplate*.cshtml, NotificationService.cs

  Conflict: DevTask A shares HelpModal.cshtml with LHVE-79.
  Proposed link: blocker or relates to, based on overlap.

Options: create as proposed / adjust split / create single DevTask / skip
```

### Step 0-4: Create DevTasks

Summary naming:

- Split DevTask: `[Story summary] — [Layer]`
- Single DevTask: use the Story summary as-is

Description requirements:

- Include only the requirements assigned to that DevTask layer.
- For split DevTasks, include a Scope section explaining the split context:

```markdown
## Scope
This DevTask covers the **MVC / Server-rendered pages** layer of Story LHVE-53.
Related DevTasks: LHVE-XX (React Components), LHVE-YY (Email Templates)

## Requirements
(list only requirements assigned to this layer)
```

Background requirements:

- Split DevTasks from the same Story share the same Background.
- The Description Scope section must identify each DevTask's layer and related DevTasks.

Links:

```bash
# Story link
acli jira workitem link --from "<STORY_KEY>" --to "<DEVTASK_KEY>" --type "is developed by"

# Related split DevTasks
acli jira workitem link --from "<DEVTASK_A>" --to "<DEVTASK_B>" --type "Relates"

# Conflict link
acli jira workitem link --from "<DEVTASK_A>" --to "<OTHER_DEVTASK>" --type "Relates"
```

### Step 0-5: Assign Shared items

| Situation | Assignment rule |
| --- | --- |
| Shared model or constant is used by one layer only | Assign to that layer's DevTask |
| Shared item is used by multiple layers | Assign to the earliest DevTask and add blocker links to dependent DevTasks |
| Shared work is large, at least five files | Create a separate Shared / Common DevTask |

## Phase 1: Sync DevTask Background and Description

### Step 1: Collect current DevTask state

```bash
acli jira workitem view "<DEV_TASK_KEY>" --fields '*all' --json
```

Check description, Background (`customfield_16221`, ADF), summary, status, and existing subtasks.

Important fields:

| Field | ID | Purpose |
| --- | --- | --- |
| Background | `customfield_16221` | DevTask context |
| Requirements | `customfield_15280` | Story requirement table |
| Acceptance Criteria | `customfield_15288` | Story acceptance criteria |

### Step 2: Collect latest requirements from the linked Story

Story is the source of truth. Every Story item must be included in the DevTask unless it is strikethrough.

Collect:

- Story requirement table from description
- Story comments with additions, changes, or removals
- Story attachments

Filtering rules:

| Marking | Treatment | Meaning |
| --- | --- | --- |
| Strikethrough | Exclude | Cancelled or deleted requirement; this is the only exclusion rule |
| TBC | Include | Keep the TBC label as-is |
| TBD | Include | Keep the TBD label as-is |
| Normal item | Include | Include unconditionally |

Do not exclude an item just because a Spike Report or another source labels it as excluded. Only the Story's strikethrough marking can exclude an item.

### Step 3: Use Spike Report if available

Use a linked Spike Report only for technical details such as files, lines, dependencies, and risks. Do not use it to decide inclusion or exclusion.

### Step 4: Analyze code when repository paths are provided

If `REPO_PATH` is provided, analyze missing or unclear items to add concrete file and line information.

### Step 5: Compare Story vs DevTask

Identify:

- Missing items: present in Story but missing in DevTask
- Mismatched items: content differs
- Removed items: strikethrough in Story and should be removed from DevTask

### Step 6: Preview and apply Background and Description changes

Field responsibilities:

| Field | Purpose | Content | Storage |
| --- | --- | --- | --- |
| Background | Why | Story purpose, business context, decisions, technical constraints | `customfield_16221` via REST API |
| Description | What | Requirements, files, acceptance criteria, testing | Jira `description` via `acli` |

Rules:

- Do not include a `## Background` section in Description.
- Store Background only in the Background custom field.
- Preserve existing Background when possible; update or append only relevant new information.
- If Background is empty, create it from Story context.

Standard Description structure:

```markdown
## Summary
1-2 sentence work summary.

## Scope — Requirement Items
Requirement table.

## Files to modify
File, line, and required change.

## Acceptance criteria
Acceptance criteria.

## Testing
Testing checklist.
```

Preview format:

```text
=== Background Changes ===
[Current] ...
[Updated] ...

=== Description Changes ===
[Add] ...
[Modify] ...
[Remove] ...
```

Ask for user confirmation before updating.

If the affected file list changes, automatically run Phase 3 conflict detection after the update and propose blocker or related links when needed.

### ADF upload requirement

Never upload raw Markdown to Jira Description or custom fields when ADF is required. Convert Markdown to ADF first.

Description update:

```bash
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py --text "## Scope\nContent..." > /tmp/desc.json
acli jira workitem edit --key "<DEV_TASK_KEY>" --description-file /tmp/desc.json --yes
```

Background update via REST API:

```bash
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py --text "## Background\nContent..." > /tmp/bg.json

python3 -c "
import json
with open('/tmp/bg.json') as f:
    adf = json.load(f)
payload = json.dumps({'fields': {'customfield_16221': adf}})
print(payload)
" > /tmp/bg-payload.json

curl -s -X PUT \
  -u "${CONFLUENCE_EMAIL:-larry@lunit.io}:${CONFLUENCE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/bg-payload.json \
  "https://lunit.atlassian.net/rest/api/3/issue/<DEV_TASK_KEY>"
```

`CONFLUENCE_API_TOKEN` is an Atlassian API token and can also be used for Jira REST API.

## Phase 2: Subtask management, optional

### Step 7: Ask the user

Ask: `Do you want to create or update Subtasks as well?`

Options:

- Yes: create missing Subtasks and normalize existing ones
- Format only: normalize existing Subtask descriptions only
- No: stop after Description sync

### Step 8: Analyze existing Subtasks

Check format and coverage.

### Step 9: Group missing Subtasks

Grouping rules:

| Rule | Description |
| --- | --- |
| Same file | Group edits to the same file |
| Same domain | Group UI, DB, or infra work together |
| Asset dependency | Separate design-asset waiting work |
| Test work | Put snapshot/integration tests last |
| Appropriate size | Keep one Subtask around 0.5-2 days |

### Step 10: Preview

Show Subtasks that will be created or updated.

### Step 11: Execute

After confirmation, create or update Subtasks.

Subtask format:

```markdown
## Scope
1-2 sentence task scope.

## Files to modify
- path (Line N) - change description

## Estimate: N days
Rationale for estimate.

## Testing
- concrete test items
```

Convert Subtask descriptions to ADF before upload.

### Step 12: Summarize results

Summarize created and updated items.

## Phase 3: Conflict detection and work ordering

Detect file conflicts with other DevTasks in the same Epic and use blocker or related links to make ordering explicit.

### Step 13: Detect conflicting files

```bash
acli jira workitem list --jql "project=LHVE AND issuetype=DevTask AND 'Epic Link'=LHVE-47" --fields summary,status --json
```

Extract affected file lists from each DevTask Description and compare them with the current DevTask.

Conflict report format:

```text
=== File Conflict Detection ===

Current DevTask: LHVE-78 (Rebrand Identity — MVC Pages)

Conflicting DevTask 1: LHVE-79 (Rebrand Identity — Help Modal)
  Shared files:
    - Views/Shared/_Layout.cshtml
    - Views/Shared/_Header.cshtml
    - wwwroot/css/site.css
  Existing link: none
```

### Step 14: Choose link type

| Condition | Link type | Direction | Reason |
| --- | --- | --- | --- |
| Same file and same section/function | Blocks | Earlier task blocks later task | Merge conflict is likely |
| Same file but different area | Relates | Bidirectional | Awareness only |
| One task depends on the other's output | Blocks | Producer blocks consumer | Consumer needs producer result |
| One task adds a file and another modifies it | Relates | Bidirectional | Conflict risk is lower |

Ordering priority for blocker links:

| Priority | Criterion | Do first |
| --- | --- | --- |
| 1 | Includes Shared/Common changes | Shared-change DevTask |
| 2 | Larger or more core change | Core DevTask |
| 3 | Creates or changes dependency files | Producer DevTask |
| 4 | Already In Progress | In-progress DevTask |
| 5 | Higher-priority Story | Higher-priority Story |

### Step 15: Preview and apply links

```text
=== Link Proposal ===

[Blocks] LHVE-78 → LHVE-79
Reason: same area in _Layout.cshtml and _Header.cshtml.
Order: LHVE-78 first, then LHVE-79.

[Relates] LHVE-78 ↔ LHVE-80
Reason: shared constants.ts but different areas.
Parallel work is possible with merge awareness.

Options: apply as proposed / adjust / skip
```

After confirmation:

```bash
acli jira workitem link --from "<DEVTASK_A>" --to "<DEVTASK_B>" --type "Blocks"
acli jira workitem link --from "<DEVTASK_A>" --to "<DEVTASK_B>" --type "Relates"
```

### Step 16: Re-split DevTask, optional

If conflicts are severe or the existing DevTask is too large, propose re-splitting using the Phase 0 criteria.

When re-splitting with existing Subtasks:

- Move Subtasks to the matching new DevTask when possible.
- Ask the user before handling Subtasks that cannot be moved safely.

## Core principles

- **Story is the source of truth**: include every non-strikethrough Story item. Only strikethrough items are excluded.
- **Background explains why; Description explains what**: keep context and work items separated.
- **1:N split is allowed**: split one Story into multiple DevTasks by technical layer, conflict area, asset dependency, or deployment unit.
- **Use links to control conflicts**: use blocker or related links when DevTasks touch the same files.
- **Do not move requirements between Stories**: handle conflicts at the DevTask level.
- **ADF is required**: convert Background and Description Markdown to ADF before uploading.
- **Write Jira content in English**: write Background, Description, and Subtask content in English. Match the user's language in conversation when possible.
