---
name: atlassian-workflows
description: "Use when working with Lunit Atlassian workflows in pi: reading/searching Confluence, generating Jira spike reports, creating Jira implementation plans, implementing Jira tickets with progress tracking, creating/syncing Jira Story Sub-task(Dev)/DevTask work items, or converting Markdown to Atlassian Document Format JSON."
metadata:
  short-description: Confluence and Jira workflow helpers
---

# Atlassian Workflows

Use this skill for Atlassian tasks that were previously handled by Claude commands in `~/.claude/commands` or Codex skills in `~/.codex/skills`.

## Available Workflows

- **Read Confluence page**: when the user asks to read, summarize, or inspect a Confluence URL/page ID. Read `references/read-confluence.md`.
- **Create translated Confluence child page**: when the user asks to translate/copy a Confluence page into another Confluence page, especially as a child page. Read `references/read-confluence.md` and preserve source images by default (see "Confluence image preservation" below).
- **Search Confluence**: when the user asks to search Confluence. Read `references/search-confluence.md`.
- **Spike report**: when the user asks to create a spike investigation report for a Jira Epic, Story, DevTask, or ticket key. Read `references/spike-report.md`. Persist generated reports under `Docs/.dev/<TICKET>-spike.md` and `Docs/.dev/<TICKET>-spike.ko.md` when the repository has a `Docs` directory; otherwise use `.dev/`.
- **Implementation plan**: when the user asks to generate an implementation plan from a Jira ticket or invokes `/implement-plan`. Read `references/implement-plan.md`. Persist plans under `Docs/.dev/<TICKET>-plan.md` when the repository has a `Docs` directory; otherwise use `.dev/`.
- **Implement ticket**: when the user asks to implement a Jira ticket or invokes `/implement-ticket`. Read `references/implement-ticket.md`. Before any implementation action, always read `Docs/.dev/<TICKET>-progress.md` if it exists and resume from that state. Persist progress under `Docs/.dev/<TICKET>-progress.md` when the repository has a `Docs` directory; otherwise use `.dev/`.
- **Jira Dev Task sync**: when the user asks to sync a DevTask/Sub-task(Dev) from a Story, create one or more Sub-task(Dev) children from a Story, split development work by size/layer/owner/dependency, update Background/Description, manage implementation subtasks, or detect development work item file conflicts. Prompt command: `/jira-dev-task`. Read `references/jira-dev-task.md`.
- **Markdown to ADF**: use `scripts/md-to-adf.py` whenever Markdown must be uploaded to Jira fields or other Atlassian APIs that require Atlassian Document Format.
- **Publish Markdown to Confluence**: whenever a Confluence page must be created or updated from Markdown, use `scripts/confluence-publish.py`. Read "Confluence page formatting" below — never call `confluence create-child` / `confluence update` with a Markdown file directly.

## General Rules

- Keep conversation with the user in the user's language, but write Jira ticket content in English unless the workflow explicitly asks for both English and Korean output.
- **Pull request titles are always English, with no exception.** This applies even when the PR body, the Jira ticket, or the conversation is in Korean. When the user asks for a Korean PR, that means the PR **body** is Korean; the title still follows `<type>(<scope>): <subject> [TICKET]` in English. See `~/.pi/agent/docs/conventions/git.md` for the full PR convention.
- Prefer `acli` for Jira reads/standard edits and `confluence` for Confluence reads/searches/creates.
- If `acli`, `confluence`, or Atlassian API calls fail because credentials are missing, tell the user which environment variables or login steps are needed instead of inventing data.
- Treat Story requirements as the source of truth. Include every non-strikethrough Story item; only exclude strikethrough items.
- Use actual repository searches and file reads for technical findings. Do not guess file paths, line numbers, dependencies, or risks.
- Before mutating Jira or Confluence, show a concise preview and ask for confirmation unless the user explicitly asked to perform the update.

## Confluence page formatting

`confluence create-child` / `confluence update` default `--format` to `storage`. Passing a
Markdown file without `--format markdown` uploads the raw Markdown as literal text, so the page
renders as a wall of `##`, `|`, and backticks. Always publish through the bundled script instead:

```bash
# create a child page (parent may be a page or a folder id)
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/confluence-publish.py page.md \
  --parent <PARENT_ID> --title "제목"

# update an existing page
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/confluence-publish.py page.md --page <PAGE_ID>

# inspect the generated storage XML first
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/confluence-publish.py page.md --dry-run -o /tmp/page.xml
```

It converts Markdown → storage and then post-processes it into native Confluence nodes, so the
separate `confluence_checkboxes.py` step is no longer needed:

| Markdown | Renders as |
| --- | --- |
| `[[TOC]]` | table-of-contents macro |
| `[[IMAGE:diagram.png\|캡션\|900]]` | attaches the file (relative to the `.md`) and embeds it centered, with an italic caption |
| `> [!WARNING]` / `[!NOTE]` / `[!INFO]` / `[!TIP]` blockquote | Confluence warning / note / info / tip panel |
| `- [ ]` / `- [x]` list | native task list with real checkboxes |
| fenced code blocks, tables, headings | code macro, native tables, headings |

Authoring rules for readable pages:

- Never paste ASCII-art diagrams. CJK glyphs are double-width and the alignment collapses. Render a
  real diagram instead: write an SVG, screenshot it with the `browser` tool
  (`await page.$('svg')` → `el.screenshot({ type: 'png' })`), and embed it with `[[IMAGE:...]]`.
- **Author diagrams at 760 logical px wide** — the Confluence content column. The script emits
  `ac:width="760"`, so a wider SVG gets scaled down and its text becomes unreadable; at 760 the
  font sizes you write are the pixels the reader sees (12–13px labels, 10–11px notes). Screenshot
  with viewport `scale: 3` so the PNG stays crisp. A too-wide image forces horizontal page scroll.
- SVG arrowheads: draw the marker pointing along **+x** (`M0,0 L6.5,2.5 L0,5 Z` with `refX="6.5"`)
  and let `orient="auto"` rotate it. A marker drawn pointing along +y renders sideways on vertical
  connectors.
- Put `[[TOC]]` right after the intro blockquote on any page longer than a few screens.
- Use panels (`> [!WARNING]`) for caveats instead of bold-prefixed paragraphs.
- Use tables for anything with 3+ parallel items (settings, options, error cases).
- Verify after publishing — the rendered HTML proves the macros resolved:
  ```bash
  confluence api "/wiki/rest/api/content/<PAGE_ID>?expand=body.view" | jq -r '.body.view.value'
  ```
  Check that `[[` and `## ` do not appear literally and that `<img src=".../download/attachments/...">`
  is present for every image.

## Confluence image preservation

When creating or updating a Confluence page from an existing Confluence source page, preserve the source page images by default unless the user explicitly asks for text-only output.

Preferred approach:

1. Read the source page in Markdown for translation/content extraction:
   ```bash
   confluence read "<SOURCE_PAGE_ID_OR_URL>" --format markdown
   ```
2. Read the source page in Storage format to identify embedded images and their attachment references:
   ```bash
   confluence read "<SOURCE_PAGE_ID_OR_URL>" --format storage
   confluence attachments "<SOURCE_PAGE_ID_OR_URL>" -f json
   ```
3. When generating the target page body, keep image placement close to the source location. If the image should remain linked to the original attachment, use Storage-format image references with `ri:attachment` and `ri:page` pointing at the source page, for example:
   ```xml
   <ac:image ac:align="center" ac:layout="center" ac:alt="image.png">
     <ri:attachment ri:filename="image.png">
       <ri:page ri:space-key="SOURCE_SPACE_KEY" ri:content-title="SOURCE_PAGE_TITLE" />
     </ri:attachment>
   </ac:image>
   ```
4. If the user specifically wants independent copies, or the target audience may not have access to the source space, copy the attachments instead: download the source attachments, upload them to the target page with `confluence attachment-upload --replace`, then reference local target-page attachments.
5. Avoid replacing images with text placeholders unless image preservation fails. If image preservation fails because of permissions or CLI limitations, tell the user which images could not be copied/referenced and why.

Notes:

- `confluence attachments --download` may fail on some authenticated download URLs. In that case, prefer cross-page `ri:attachment` references, or use `confluence api`/the Confluence REST API if a real copied attachment is required.
- For Markdown-to-Confluence creation where images are included as normal Markdown links, verify after creation with `confluence read <TARGET_PAGE_ID> --format storage` that images survived as Confluence image nodes. If not, update the page in Storage format.

## ADF Conversion

The bundled converter is at:

```bash
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py
```

Examples:

```bash
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py Docs/.dev/LHVE-49-spike.md > /tmp/desc.json
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py --text "## Scope\nContent" > /tmp/desc.json
```

When following the original Claude references, replace `.claude/scripts/md-to-adf.py` with the bundled pi skill path above.
