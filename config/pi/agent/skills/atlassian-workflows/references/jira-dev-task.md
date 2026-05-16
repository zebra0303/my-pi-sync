Create or update Jira development work items (**Sub-task(Dev)** / **DevTask**) from the latest requirements in their parent or linked Story.

When the input is a Story ticket, discover existing Sub-task(Dev) children first. Create one or more Sub-task(Dev) work items when none exist or when Story requirements are not covered by existing Sub-task(Dev) work items. Split work by technical layer, ownership, dependency, conflict risk, and appropriate task size.

Update Background and Description first. Ask the user before creating or updating Sub-task(Dev) work items or implementation Subtasks.

## Input

Format: `<TICKET_KEY> [REPO_PATH_1] [REPO_PATH_2] ...`

- `TICKET_KEY`: a Sub-task(Dev)/DevTask key such as `LHVE-78`, or a Story key such as `LHVE-57`
- `REPO_PATH`: optional repository path for code analysis

User input: `$ARGUMENTS` means arguments passed through the pi prompt template or the user's current request.

## Step 0: Determine ticket type

1. Fetch the ticket:

```bash
acli jira workitem view "<TICKET_KEY>" --fields '*all' --json
```

2. Branch by issue type:
   - **Sub-task(Dev) / DevTask**: proceed to Phase 1 for that work item.
   - **Story**: discover existing Sub-task(Dev) work items and synchronize or create as needed:
     1. Fetch child work items under the Story and filter to work type / issue type **Sub-task(Dev)**.
     2. Also check linked work items that represent development work, because some projects may link Dev work items instead of using direct children.
     3. Compare Story requirements against the scope covered by existing Sub-task(Dev) descriptions.
     4. If existing Sub-task(Dev) work items fully cover the Story, run Phase 1 for each sequentially.
     5. If no Sub-task(Dev) exists, or if some Story requirements are not covered, run Phase 0 to propose creating one or more additional Sub-task(Dev) work items.
     6. After creating additional Sub-task(Dev) work items, run Phase 1 for every newly created or existing affected Sub-task(Dev).

Discovery commands:

```bash
# Direct Story children
acli jira workitem search \
  --jql "parent = <STORY_KEY>" \
  --fields "key,issuetype,summary,status,assignee,description,parent" \
  --json --paginate

# Linked development work items, for projects that link instead of nesting
acli jira workitem search \
  --jql "issue in linkedIssues(<STORY_KEY>)" \
  --fields "key,issuetype,summary,status,description" \
  --json --paginate
```

Treat both `Sub-task(Dev)` and legacy `DevTask` naming as development work items when the Jira instance uses either name.

## Phase 0: Create or add Sub-task(Dev) work items for a Story

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

### Step 0-3: Decide single Sub-task(Dev) vs split Sub-task(Dev) work items

Use the analysis to propose whether to create a single Sub-task(Dev) or split into multiple Sub-task(Dev) work items. A Story may have **one or more** Sub-task(Dev) children. Prefer a split when each child has a clear independent scope and a reviewable size.

Before proposing creation, compute coverage:

| Coverage item | Required check |
| --- | --- |
| Story requirement item | Which existing Sub-task(Dev), if any, already covers it |
| Uncovered requirement | Which new Sub-task(Dev) should own it |
| Existing Sub-task(Dev) overlap | Whether its Description should be updated rather than creating a duplicate |
| Existing Sub-task(Dev) too broad | Whether to propose re-splitting or adding follow-up Sub-task(Dev)s |

Split decision guide:

| Condition | Recommendation | Reason |
| --- | --- | --- |
| All items are concentrated in one layer and are <= 2 days | Single Sub-task(Dev) | Splitting is unnecessary |
| Multiple layers but fewer than 10 files and <= 2 days total | Single Sub-task(Dev) preferred | Splitting may add overhead |
| Multiple layers with about 1-3 days of work per layer | Split Sub-task(Dev)s | Enables independent work and review |
| One scope exceeds about 3 days | Split further by feature, file group, or dependency | Keeps each unit reviewable |
| Different owners are likely by layer | Split Sub-task(Dev)s | Enables parallel work |
| Design assets are pending | Split Sub-task(Dev)s | Tracks asset dependency separately |
| File conflicts with other Stories in the same Epic | Split Sub-task(Dev)s | Isolates conflict areas |
| Shared/Common work is required by multiple layers | Separate Shared/Common Sub-task(Dev), or assign to earliest owner with blocker links | Makes dependency explicit |

Show a proposal before creating anything:

```text
=== Sub-task(Dev) Creation Proposal ===

Story LHVE-53: "Rebrand Quiver — Main Application Pages"
12 requirements, 35 impacted files
Existing Sub-task(Dev): 1 found, covers Items 1-3
Uncovered requirements: Items 4-12

[Recommendation] Split into 3 additional Sub-task(Dev) work items

  Sub-task(Dev) A — MVC Pages (4 items, 15 files, ~2 days)
    Items: 4, 6, 8, 10
    Key files: *.cshtml, *Controller.cs, *ViewModel.cs

  Sub-task(Dev) B — React Components (4 items, 12 files, ~2 days)
    Items: 5, 7, 9, 11
    Key files: *.tsx, *.jsx, hooks/*, store/*

  Sub-task(Dev) C — Email Templates (1 item, 8 files, ~1 day)
    Items: 12
    Key files: EmailTemplate*.cshtml, NotificationService.cs

  Conflict: Sub-task(Dev) A shares HelpModal.cshtml with LHVE-79.
  Proposed link: blocker or relates to, based on overlap.

Options: create as proposed / adjust split / create single Sub-task(Dev) / sync existing only / skip
```

### Step 0-4: Create Sub-task(Dev) work items

Only create Sub-task(Dev) work items after showing the proposal and receiving user confirmation.

Summary naming:

- Split Sub-task(Dev): `[Story summary] — [Layer or Scope]`
- Single Sub-task(Dev): use the Story summary as-is, optionally suffix `— Implementation` if Jira requires unique summaries

Creation command template:

```bash
acli jira workitem create \
  --project <PROJECT_KEY> \
  --type "Sub-task(Dev)" \
  --parent <STORY_KEY> \
  --summary "<Story summary> — <Layer or Scope>" \
  --description @/tmp/<STORY_KEY>-<scope>-description.json
```

If the Jira instance uses a different exact work type name, first list or verify project issue types and use the project-specific name that maps to development subtasks. Treat legacy `DevTask` as equivalent only when that is the configured work type.

Description requirements:

- Include only the requirements assigned to that Sub-task(Dev) scope.
- Every created Sub-task(Dev) must include the required Jira Description sections:
  - `## Description`
  - `## Implementation Plan`
  - `## Development Deliverables`
  - `## Developer Testing`
- For split Sub-task(Dev)s, include scope and related sibling context inside `## Description`:

```markdown
## Description
This Sub-task(Dev) covers the **MVC / Server-rendered pages** layer of Story LHVE-53.
Related Sub-task(Dev)s: LHVE-XX (React Components), LHVE-YY (Email Templates)

### Scope — Requirement Items
(list only requirements assigned to this layer)

### Files / Areas to Modify
- `<path>` — required change

### Acceptance Criteria
- <criteria>

## Implementation Plan
1. <step>
2. <step>

## Development Deliverables
- Code changes: <files/modules>
- Tests: <test files or test types>
- Documentation/config/migration/assets: <if applicable>

## Developer Testing
- [ ] <command or manual scenario>
```

Background requirements:

- Split Sub-task(Dev)s from the same Story share the same Background.
- The Description Scope section must identify each Sub-task(Dev)'s layer and related Sub-task(Dev)s.

Links:

```bash
# Story link, only if the created work item is not already a direct child via --parent
acli jira workitem link --from "<STORY_KEY>" --to "<DEV_SUBTASK_KEY>" --type "is developed by"

# Related split Sub-task(Dev)s
acli jira workitem link --from "<DEV_SUBTASK_A>" --to "<DEV_SUBTASK_B>" --type "Relates"

# Conflict link
acli jira workitem link --from "<DEV_SUBTASK_A>" --to "<OTHER_DEV_WORK_ITEM>" --type "Relates"
```

### Step 0-5: Assign Shared items

| Situation | Assignment rule |
| --- | --- |
| Shared model or constant is used by one layer only | Assign to that layer's Sub-task(Dev) |
| Shared item is used by multiple layers | Assign to the earliest Sub-task(Dev) and add blocker links to dependent Sub-task(Dev)s |
| Shared work is large, at least five files | Create a separate Shared / Common Sub-task(Dev) |

## Phase 1: Sync Sub-task(Dev) Background and Description

### Step 1: Collect current Sub-task(Dev) state

```bash
acli jira workitem view "<DEV_TASK_KEY>" --fields '*all' --json
```

Check description, Background (`customfield_16221`, ADF), summary, status, parent Story, sibling Sub-task(Dev) work items, and existing implementation subtasks.

Important fields:

| Field | ID | Purpose |
| --- | --- | --- |
| Background | `customfield_16221` | Sub-task(Dev) context |
| Requirements | `customfield_15280` | Story requirement table |
| Acceptance Criteria | `customfield_15288` | Story acceptance criteria |

### Step 2: Collect latest requirements from the linked Story

Story is the source of truth. Every Story item must be included in at least one Sub-task(Dev) unless it is strikethrough.

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

### Step 5: Compare Story vs Sub-task(Dev) coverage

Identify:

- Missing items: present in Story but missing from all Sub-task(Dev) work items
- Mismatched items: content differs between Story and a Sub-task(Dev)
- Duplicated items: the same Story requirement appears in multiple Sub-task(Dev)s without a clear shared-work reason
- Removed items: strikethrough in Story and should be removed from Sub-task(Dev) descriptions
- Oversized scope: a Sub-task(Dev) appears larger than about 3 days or mixes unrelated layers

If missing items exist, return to Phase 0 and propose creating additional Sub-task(Dev) work items or expanding an existing one. Ask for confirmation before applying either option.

### Step 6: Preview and apply Background and Description changes

Field responsibilities:

| Field / Section | Purpose | Content | Storage |
| --- | --- | --- | --- |
| Background | Why | Story purpose, business context, decisions, technical constraints | `customfield_16221` via REST API |
| Description | What | Work summary, scope, Story requirement items, files/API/contracts affected, acceptance criteria | Jira `description` via `acli` |
| Implementation Plan | How | Phase-by-phase implementation steps, sequencing, dependency/order notes | Jira `description` section |
| Development Deliverables | Output | Concrete files, code changes, tests, docs, configs, migrations, or assets expected from development | Jira `description` section |
| Developer Testing | Verification | Developer-owned testing checklist and commands, including unit/integration/e2e/manual checks | Jira `description` section |

Rules:

- Every Sub-task(Dev) Description must include these top-level sections: `## Description`, `## Implementation Plan`, `## Development Deliverables`, and `## Developer Testing`.
- Store Background only in the Background custom field (`customfield_16221`). Do not include a `## Background` section in the Jira Description body unless the project does not support the Background field.
- Preserve existing Background when possible; update or append only relevant new information.
- If Background is empty, create it from Story context.
- Keep each Sub-task(Dev)'s Description scoped to only the requirements assigned to that Sub-task(Dev). For split work, reference sibling Sub-task(Dev)s in `## Description` or `## Implementation Plan`.

Standard Sub-task(Dev) Description structure:

```markdown
## Description
1-2 sentence work summary.

### Scope — Requirement Items
Requirement table or bullet list containing only this Sub-task(Dev)'s assigned Story requirements.

### Files / Areas to Modify
File, line, API, configuration, or module references and required changes.

### Acceptance Criteria
Acceptance criteria relevant to this Sub-task(Dev).

## Implementation Plan
1. Phase/step description.
2. Phase/step description.
3. Validation and handoff step.

Include dependency/order notes and related Sub-task(Dev)s when the Story is split.

## Development Deliverables
- Code changes: `<files/modules>`
- Tests: `<test files or test types>`
- Documentation/config/migration/assets: `<if applicable>`

## Developer Testing
- [ ] Run `<command>` and confirm `<expected result>`.
- [ ] Verify `<manual scenario>`.
- [ ] Confirm no regression in `<related area>`.
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

## Phase 2: Implementation Subtask management, optional

This phase manages lower-level implementation Subtasks under each Sub-task(Dev)/DevTask. Do not confuse these with the Story-level Sub-task(Dev) work items created in Phase 0.

### Step 7: Ask the user

Ask: `Do you want to create or update implementation Subtasks under each Sub-task(Dev) as well?`

Options:

- Yes: create missing implementation Subtasks and normalize existing ones
- Format only: normalize existing implementation Subtask descriptions only
- No: stop after Description sync

### Step 8: Analyze existing implementation Subtasks

Check format and coverage.

### Step 9: Group missing implementation Subtasks

Grouping rules:

| Rule | Description |
| --- | --- |
| Same file | Group edits to the same file |
| Same domain | Group UI, DB, or infra work together |
| Asset dependency | Separate design-asset waiting work |
| Test work | Put snapshot/integration tests last |
| Appropriate size | Keep one Subtask around 0.5-2 days |

### Step 10: Preview

Show implementation Subtasks that will be created or updated.

### Step 11: Execute

After confirmation, create or update implementation Subtasks.

Implementation Subtask format:

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

Convert implementation Subtask descriptions to ADF before upload.

### Step 12: Summarize results

Summarize created and updated items.

## Phase 3: Conflict detection and work ordering

Detect file conflicts with other Sub-task(Dev)/DevTask work items in the same Epic or parent Story and use blocker or related links to make ordering explicit.

### Step 13: Detect conflicting files

```bash
acli jira workitem list --jql "project=LHVE AND issuetype in ('Sub-task(Dev)', DevTask) AND 'Epic Link'=LHVE-47" --fields summary,status,description,parent --json
```

Extract affected file lists from each Sub-task(Dev)/DevTask Description and compare them with the current work item.

Conflict report format:

```text
=== File Conflict Detection ===

Current Sub-task(Dev): LHVE-78 (Rebrand Identity — MVC Pages)

Conflicting Sub-task(Dev) 1: LHVE-79 (Rebrand Identity — Help Modal)
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
| 1 | Includes Shared/Common changes | Shared-change Sub-task(Dev) |
| 2 | Larger or more core change | Core Sub-task(Dev) |
| 3 | Creates or changes dependency files | Producer Sub-task(Dev) |
| 4 | Already In Progress | In-progress Sub-task(Dev) |
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

### Step 16: Re-split Sub-task(Dev), optional

If conflicts are severe or an existing Sub-task(Dev) is too large, propose re-splitting using the Phase 0 criteria.

When re-splitting with existing implementation Subtasks:

- Move implementation Subtasks to the matching new Sub-task(Dev) when possible.
- Ask the user before handling implementation Subtasks that cannot be moved safely.

## Core principles

- **Story is the source of truth**: include every non-strikethrough Story item. Only strikethrough items are excluded.
- **Background explains why; Description explains what/how/output/verification**: keep Background in the Background field, and include `Description`, `Implementation Plan`, `Development Deliverables`, and `Developer Testing` sections in the Jira Description body.
- **1:N split is allowed**: split one Story into multiple Sub-task(Dev)/DevTask work items by technical layer, conflict area, asset dependency, deployment unit, or reviewable work size.
- **Use links to control conflicts**: use blocker or related links when Sub-task(Dev)/DevTask work items touch the same files.
- **Do not move requirements between Stories**: handle conflicts at the development work item level.
- **ADF is required**: convert Background and Description Markdown to ADF before uploading.
- **Write Jira content in English**: write Background, Description, Implementation Plan, Development Deliverables, Developer Testing, and implementation Subtask content in English. Match the user's language in conversation when possible.
