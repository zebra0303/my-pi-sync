---
name: model-debate
description: Use when the user asks for multiple models (Opus, Grok, GPT) to debate, cross-review, or give feedback (모델 토론, 모델별 피드백) on a plan, document, or deliverable such as a Confluence page or slide deck.
metadata:
  short-description: Three-model debate and review for deliverables
---

# Model Debate

Run a structured debate between three panelist agents, then turn the outcome into the requested deliverable. You (the main session) are the orchestrator: you frame the brief, run rounds, judge disagreements, own the final artifact, and are the only one who publishes.

Panelists: `debate-opus` (Anthropic Claude Opus), `debate-grok` (Cursor Grok), `debate-gpt` (OpenAI Codex GPT Sol tier). Their exact models are pinned in `~/.omp/agent/agents/debate-*.md` (`model:` line, `thinking-level: medium`); change models there, not here. Dispatch all three in one `task` batch per round (`agent: "debate-opus"` etc.) so they run in parallel and stay independent within a round.

## Model check (before Round 1)

Run `node scripts/check-models.mjs` (relative to this skill). It compares each agent's pinned model with the newest catalog model of the same provider and family (e.g. `Claude Opus {v}`, `Grok {v}`, `GPT-{v}-Sol`; Fast/1M variants and other tiers excluded) that supports the pinned thinking level, and prints JSON per agent.

- All `up-to-date`: proceed silently.
- Any `update-available`: show `current → latest` and ask the user whether to switch. On approval run `node scripts/check-models.mjs --apply`, which rewrites only the `model:` line; then tell the user to run `scripts/backup.sh` in `my-pi-sync` to sync the repo copy. If declined, proceed with the pinned models.
- `missing` / `unparsed` or a command failure: report it, proceed with the pinned models, never pick a replacement yourself.
- A family rename (e.g. a new tier name) is not detected; mention that if the user asks about newer models.

## Choose the mode

- **Debate → produce** (e.g. "Design System 구축에 필요한 내용을 토론해서 Confluence 문서로"): debate the content first, then draft the artifact from the synthesis, then run one review loop.
- **Produce → review** (e.g. "PPT를 만들고 모델별 피드백으로 최적화"): draft the artifact yourself (or from user material), then run review loops.

## Debate folder

Store every debate artifact in the current working directory, not in `local://`:

```text
<cwd>/.dev/debate-{YYYY-MM-DD-HH:MM}/
```

- Create it once before the brief, using the local time the debate starts: `DEBATE_DIR="$PWD/.dev/debate-$(date +%Y-%m-%d-%H:%M)"; mkdir -p "$DEBATE_DIR"`. Create `.dev` if it does not exist. If that folder already exists (two debates in the same minute), append `-2`, `-3`, … instead of mixing files.
- Pass the absolute `$DEBATE_DIR` path to every panelist; never rely on a relative path or `local://`.
- Inside a Git repository, check `git check-ignore -q .dev/`. If `.dev/` is not ignored, add `.dev/` to `.git/info/exclude` (local only; never edit a tracked `.gitignore` unless the user asks) and mention it in the report.
- Never write secrets (keys, tokens, cookies) into these files; record only derived facts such as decoded metadata.

## Workflow

1. **Brief.** Write `$DEBATE_DIR/brief.md`: goal, audience, deliverable format, constraints, user-provided material/links, and 3–6 evaluation criteria. Read any referenced repo files or Confluence pages first so panelists start from facts. Ask the user only for missing information that changes the outcome.
2. **Round 1: independent proposals.** Each panelist reads the brief and writes its proposal to `$DEBATE_DIR/r1-<agent>.md`. Panelists must not see each other's work in this round.
3. **Round 2: cross-critique.** Each panelist reads the other two Round 1 files, critiques them, and returns a revised position to `$DEBATE_DIR/r2-<agent>.md`.
4. **Optional Round 3.** Run it only when a disagreement remains that would materially change the deliverable; scope it to those disputes (`$DEBATE_DIR/r3-<agent>.md`). Hard cap: 3 rounds.
5. **Synthesis.** Write `$DEBATE_DIR/synthesis.md`: consensus, each disputed point with the position adopted and why, rejected ideas with reasons, open questions for the user. Decide on evidence and the brief's criteria, not by majority vote.
6. **Draft** the deliverable from the synthesis (see Deliverables).
7. **Review loop.** Each panelist reviews the draft against the criteria and writes findings to `$DEBATE_DIR/review<n>-<agent>.md`, tagged `critical` / `major` / `minor`, each with location and concrete fix. Apply accepted fixes; record rejected ones with a reason. Repeat only while critical/major findings remain, at most 2 loops.
8. **Report** to the user: the artifact (path or link), the absolute `$DEBATE_DIR` path, a short decision log (who proposed what, what was adopted/rejected), unresolved disagreements, and any panelist failures.

Use an `outputSchema` per round so results merge cleanly. Suggested shapes:

- proposal / critique: `{ position, key_points[], evidence[], objections_to_others[], concessions[], confidence }`
- review: `{ findings: [{ severity, location, issue, fix }], overall }`

## Rules

- Panelists have full tools. Give each one an explicit write path (its own `$DEBATE_DIR/...` file or a per-agent draft path); only you edit the real deliverable.
- External actions (Confluence create/update, Jira, git push, sharing) require explicit user approval immediately before the action, after showing the final draft.
- If a panelist fails (auth, quota, timeout), retry once, then continue with the rest and state it in the report. Never substitute another model silently.
- Keep the user's language for briefs and deliverables.

## Deliverables

- **Confluence page:** write Markdown first, then use the `atlassian-workflows` skill for ADF conversion and publishing.
- **Slides / PPT:** Marp Markdown (`marp: true` frontmatter, `---` between slides, speaker notes in `<!-- -->` comments). Save in the repo or a user-specified path; mention that `npx @marp-team/marp-cli deck.md --pptx` converts it to PPTX.
- **Other documents or code:** write to the user-specified path; panelists review the file or diff.
