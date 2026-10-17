---
name: model-debate
description: Use when the user asks for multiple models (Opus, Grok, GPT) to debate, cross-review, or give feedback (모델 토론, 모델별 피드백) on a plan, document, or deliverable such as a Confluence page or slide deck.
metadata:
  short-description: Three-model debate and review for deliverables
---

# Model Debate

Run a structured debate between three panelist agents, then turn the outcome into the requested deliverable. You (the main session) are the orchestrator: you frame the brief, run rounds, judge disagreements, own the final artifact, and are the only one who publishes.

Panelists: `debate-opus` (Anthropic Claude Opus), `debate-grok` (Cursor Grok Fast tier, chosen for speed), `debate-gpt` (OpenAI Codex GPT Sol tier). Their exact models are pinned in `~/.omp/agent/agents/debate-*.md` (`model:` line, `thinking-level: medium`); change models there, not here. Dispatch all three in one `task` batch per round (`agent: "debate-opus"` etc.) so they run in parallel and stay independent within a round.

Nicknames are display names only; agent IDs and file names keep `debate-*`. Use the nickname everywhere a human reads it (prompts, critiques, synthesis, decision log, report, live stage):

| Agent | Nickname | Model |
| --- | --- | --- |
| `debate-gpt` | Geppetto | GPT |
| `debate-opus` | Clark | Claude Opus |
| `debate-grok` | Rocky | Grok Fast |

## Model check (before Round 1)

Run `node scripts/check-models.mjs` (relative to this skill). It compares each agent's pinned model with the newest catalog model of the same provider and family (e.g. `Claude Opus {v}`, `Grok {v} Fast`, `GPT-{v}-Sol`; the family keeps the pinned tier, so other tiers and 1M/500k variants are excluded) that supports the pinned thinking level, and prints JSON per agent.

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

## Live stage

Right after creating `$DEBATE_DIR`, start the pixel-art stage as a long-lived background service (omp `bash` with `name: "debate-stage"`, `ready: { log: "Debate stage:" }`):

```sh
node scripts/debate-stage.mjs "$DEBATE_DIR"
```

It opens the browser on a random localhost port and polls the folder every second; the page UI is in English, styled after Material Design 3 (dark scheme; header, buttons, chips and panel cards) around a pixel-art stage that keeps its own look, set in Pretendard with the speech-bubble text in Gamja Flower (both loaded from a CDN; offline the page falls back to system fonts). Each character is labelled `Nickname (model, thinking level)`, e.g. `Rocky (Grok 4.7 Fast, medium)`, read at startup from the pinned agent files and the `omp models` catalog, so restart the stage after changing models. Geppetto, Clark and Rocky show `…` while their file for the current round is missing, then act out each file as speech bubbles (TL;DR line plus top-level bullets); in Round 2+ a bubble is aimed at the panelist it mentions most, and the speaker turns its head and eyes toward that panelist, who looks back while the third faces forward. A `입장:` bullet becomes a Holds/Revises/Withdraws badge instead of a bubble line. If a Revises or Withdraws reason names an `F#`, the badge shows it (`Revises · F3`); Holds does not, and an id the reason does not contain is not invented. A speaker who revises or withdraws gets a lightbulb (a highlight, never a penalty). The question (`brief.md`) is posed by Cuzi, an AI robot (curiosity + question) that jets in from the right, asks it at the top centre and jets back out. Fact checks are read by Inspector Gadget: he drops in from the top on his Go Go Gadget Copter, reads each new `facts.md` row or status change (✓ VERIFIED / ✗ REFUTED / ? OPEN, with a green, red or grey bubble border; a refuted claim flashes `!` over the panelist who raised it), then flies back up. `synthesis.md` is delivered by Grogu: he flies in from the left in his hover pram, stops at the top centre to speak the decision in his own speech bubble, then flies off to the right. After the last review round has played and `answer.md` has stopped changing for 3 seconds, Cuzi, Grogu and Inspector Gadget all fly in together for the finale (each along its usual path), dock side by side and speak the answer's one-line summary in a gold, glowing bubble while pixel fireworks burst over the stage (no fireworks with reduced motion); clicking that bubble (or Enter/Space) scrolls to the Final Answer panel and flashes it. After the finale the three narrators and the bubble stay on stage with the panelists (six characters) until Clear or Replay (its `TL;DR:` line, else its first prose line, so open `answer.md` with the pick in one sentence). A fact whose row carries `이전: <old status>` is read as a transition (e.g. `F4 · open → verified`). Below the stage, a Fact check panel lists `facts.md`, a Synthesis panel renders `synthesis.md` in full, a Reviews panel shows each `review<n>-<agent>.md` as a per-panelist card with severity badges and per-round counts (it parses `- [critical|major|minor] …` bullets, so keep that format). A review bubble whose text starts with that token keeps the token and takes an amber, gold or blue border for critical, major or minor. That border is not the red of a refuted fact, and the TL;DR line is not bordered. The Final Answer panel shows `answer.md` once Grogu has delivered it (also on Replay), so the ending never comes before the debate. The panels render headings, tables, and nested bullet/numbered lists by indentation, keeping written numbers. There are deliberately no scores, confidence gauges or win counts.

Header controls: Pause, Clear, Replay and Speed. Clear and Replay are enabled only once the debate has finished (synthesis written, no panelist running, playback over). Clear empties the Transcript and every panel. Replay reruns every finished file from the brief (Round 1 → fact checks → Round 2 → Grogu's synthesis → reviews → the three-narrator finale) and refills them. Speed (1× / 2× / 4×) scales typing, hold time and the narrators' flights; it is enabled only while a replay is playing, and returns to 1× when the replay ends or Clear is pressed. The header and stage stay pinned at the top while the panels below scroll; the stage shrinks to leave about 30% of the window for them. Bubbles clip a line at 140 characters; the Transcript keeps the whole line. The Transcript, Fact check, Synthesis and Reviews panels only show what has already been spoken on stage, so Replay empties them and they fill back in step with the bubbles. The Synthesis and Final Answer panels each have a Copy button at the top right that copies the file as Markdown once it is shown. The folder path at the bottom of the page opens `$DEBATE_DIR` in Finder (or the OS file manager). To show a finished debate again, start the stage on its folder and press Replay.

The Final Answer panel renders Markdown images (`![description](https://…)`) in place once the answer is revealed; other panels do not load them. Images keep their proportions within the panel width and a capped height. Only HTTPS image URLs without embedded credentials are loaded, lazily and without a referrer. A failed image shows its description and an original-image link. External image hosts still receive the image request. Clear/Replay removes the images with the answer, and Copy keeps the original Markdown, including image URLs and credits.

Write `$DEBATE_DIR/status.json` at every dispatch, completion and retry so the stage shows real progress instead of guessing. Always rewrite the whole file with all three panels (set a fresh `startedAt` on retry):

```json
{ "round": "r2", "panels": {
  "debate-gpt": { "state": "completed", "startedAt": "2026-10-16T08:10:00+09:00", "attempt": 1 },
  "debate-opus": { "state": "running", "startedAt": "2026-10-16T08:10:00+09:00", "attempt": 1 },
  "debate-grok": { "state": "retrying", "startedAt": "2026-10-16T08:13:20+09:00", "attempt": 2 } } }
```

`round` is `r1`–`r3` or `review1`–`review2`; `state` is `running`, `completed`, `retrying` or `failed`. While `status.json` names the current round, the stage plays a panelist's file only after its state is `completed`, and its label shows elapsed time and retries; once files of a later phase exist, a stale `status.json` stops holding anything back. Fact checks, later rounds and the synthesis never play ahead of a panelist file that exists but is still held back, so mark each panel `completed` as soon as its file passes the check, before writing `facts.md`. Without `status.json` (older folders) it plays a file once it has been unchanged for 3 seconds. In every case a file plays only if it has the TL;DR-plus-bullets shape.

Mention the printed URL to the user. Stop it (write empty content to `proc://debate-stage/kill`) before starting another debate; if it fails to start, continue the debate without it.

## Workflow

1. **Brief.** Write `$DEBATE_DIR/brief.md`: goal, audience, deliverable format, constraints, user-provided material/links, and 3–6 evaluation criteria. Lock the scope the answer depends on, only where it applies: subject, population or region, time window, and which evidence counts as direct versus proxy (e.g. "polls asking about looks first; fan lists only as proxy"); the window alone changed past answers (김태희 without a window, 윤아 for "last 5 years"). Read any referenced repo files or Confluence pages first so panelists start from facts. Ask the user only for missing information that changes the outcome.
2. **Round 1: independent proposals.** Each panelist reads the brief and writes its proposal to `$DEBATE_DIR/r1-<agent>.md`. Panelists must not see each other's work in this round. The first two bullets after the TL;DR are fixed: `- 기각한 대안: <strongest alternative> — <why it loses>` and `- 뒤집힐 조건: <one observable fact that would change the conclusion>` (`Rejected alternative:` / `Flip condition:` in English briefs). They take two of the stage's four bubble lines on purpose: they are where converging panelists still differ. Each file ends with `## 근거` (`## Evidence`): at most 3 decisive claims, one row each, `- 주장 | 출처: URL 또는 파일:행 | 원문: "≤25 words the source actually says" | 범위: date·place·subject | 상태: 직접|간접|미확인`. A figure marked `미확인` must not appear in the TL;DR or first bullets.
3. **Fact check.** After Round 1, write `$DEBATE_DIR/facts.md` yourself: only the claims that decide the outcome or on which panelists disagree, at most 5, each opened in its source by you. One row per claim: `- F1 [verified|refuted|open] 주장 — 출처: URL — "quote ≤25 words" — 범위: … — 제기: <nickname>`. `verified` means the quote directly supports the claim in that scope; an opened link alone is not verification. A source you cannot open is `open`, not `refuted`. Update a row's status later only with a new quote, and add `— 이전: <old status>` so the stage can show the change. Panelists cite facts by ID (`F2`) from Round 2 on.
4. **Round 2: cross-critique.** Each panelist reads the other two Round 1 files and `facts.md`, critiques them, and returns a revised position to `$DEBATE_DIR/r2-<agent>.md`. The first bullet is `- 입장: 유지|수정|철회 — <reason>` (`- Stance: keep|revise|withdraw — <reason>` in English). On `수정` or `철회` (`revise` or `withdraw`), name the fact that changed the stance in that reason (`F3`); `유지` (`keep`) does not need one. The stage adds that id to the badge and does not speak the reason as a bubble line. Refuted facts must not be cited again; open facts only as unverified.
   - **Diverged** (different picks or actions): standard cross-critique.
   - **Converged** (you judge the three TL;DRs to choose the same thing; do not use a similarity heuristic): tell panelists not to restate the shared conclusion. They attack only the others' `기각한 대안` and `뒤집힐 조건` plus the `refuted`/`open` rows of `facts.md`, each through one lens you assign for this debate: source recheck, strongest-alternative steelman, or pre-mortem ("assume the conclusion is wrong — why?"). Default assignment: Geppetto source recheck, Clark steelman, Rocky pre-mortem; change it when the brief makes another fit better. If nothing breaks, `입장: 유지` is the right answer.
5. **Optional Round 3.** Run it only when a disagreement remains that would materially change the deliverable; scope it to those disputes (`$DEBATE_DIR/r3-<agent>.md`). Hard cap: 3 rounds.
6. **Delta fact check.** Before the synthesis, open the sources of claims that first appeared in the last round and decide the outcome or split the panel — at most 3, Round 1 rows are not reopened. Append new rows to `facts.md` under a `## 델타 팩트` (`## Delta facts`) heading, continuing the F# numbering, or update an existing row in place with `이전:`; the stage plays both after the last round and before the synthesis (bubble order: Round 1 → fact check → Round 2/3 → delta facts → synthesis → reviews → final answer). Skip the step when the last round raised no such claim. If three debates in a row show this step never changing the conclusion or its evidence, drop it.
7. **Synthesis.** Write `$DEBATE_DIR/synthesis.md` decision-first: `TL;DR: <the decision>` followed by exactly three bullets `- 할 일: …`, `- 하지 않을 일: …`, `- 뒤집힐 조건: …` (the stage speaks these four lines; keep each within 140 characters). Then each disputed point with the position adopted, why, and `채택: <nickname(s)> (F#)`; rejected ideas with reasons; open questions for the user. State as fact only `verified` items. Decide on evidence and the brief's criteria, not by majority vote, and never total adoptions into a score. Also:
   - **Turning points:** at most two, each `처음 판단 → 근거(F#) → 최종`, including cases where the conclusion stayed but its evidence changed; omit the section when nothing changed.
   - **Independence:** when several sources back one claim, say in one line whether they are independent or re-reports of the same survey or list family.
   - **Solo adoption guard:** adopting as fact a position the other two panelists oppose requires a `verified` F#; without one it becomes an open question. This applies to every panelist equally and is never tallied.
8. **Draft** the deliverable from the synthesis (see Deliverables).
9. **Review loop.** Each panelist reviews the draft against the criteria and writes findings to `$DEBATE_DIR/review<n>-<agent>.md` after the `TL;DR:` verdict, one bullet per finding: `- [critical|major|minor] <location> — <issue> → <fix>`. First check that each cited source actually says what the draft claims; a decisive figure that is neither `verified` in `facts.md` nor quoted from its source in the draft is at least `major`. Before the review you may add `facts.md` rows for figures the draft introduced. Apply accepted fixes; record rejected ones with a reason. Repeat only while critical/major findings remain, at most 2 loops.
10. **Report** to the user, opening with a decision card: the synthesis `TL;DR` and its three bullets quoted verbatim, then the absolute path of `answer.md`. Then: the artifact (path or link), the absolute `$DEBATE_DIR` path, a short decision log (who proposed what, what was adopted/rejected), stance changes (who revised or withdrew, and on which fact), unresolved disagreements, and any panelist failures.

Use an `outputSchema` per round so results merge cleanly. Suggested shapes:

- proposal / critique: `{ position, stance, key_points[], evidence[], objections_to_others[], concessions[] }` (no self-reported confidence: it is not comparable across models)
- review: `{ findings: [{ severity, location, issue, fix }], overall }`

## Rules

- Panelists have full tools. Give each one an explicit write path (its own `$DEBATE_DIR/...` file or a per-agent draft path); only you edit the real deliverable.
- External actions (Confluence create/update, Jira, git push, sharing) require explicit user approval immediately before the action, after showing the final draft.
- **Success is the file, not the task status.** After a panelist's task ends, check its assigned file: it exists, was modified after you dispatched this attempt (compare mtime), its first non-frontmatter line is a TL;DR line (`TL;DR:`, `**TL;DR:**` or `요약:`, the same rule the stage uses), and it has at least one top-level `- ` bullet. If so it succeeded even when the task reports a failure such as "Subagent ended without a final message" (the Cursor provider does this for Rocky on every run); use the file content, mark the panel `completed` in `status.json`, and report it as "final message missing (file OK)", not as a failure. Only when the check fails: retry once (`attempt: 2`, `retrying`), then continue with the rest and state it in the report. Never retry over a file that already passes the check, and never substitute another model silently.
- Tell each panelist its nickname and the others' nicknames, and require every `$DEBATE_DIR` file to start with a one-sentence `TL;DR:` line followed by its key points as top-level `-` bullets; the live stage reads exactly that. Finish each spoken line — that TL;DR and every top-level bullet that is not a stance line — within 140 characters so the bubble does not clip it. A longer line still counts as a successful file; the transcript keeps the whole line. Do not shorten the stance reason, `## 근거` / `## Evidence`, or other prose the bubble does not speak.
- **Language follows the question.** Use the language of the user's question for every file you write (brief, `facts.md`, synthesis, deliverable), for the fixed labels inside them, and for the chat report; panelists follow the brief. The labels below are written in Korean in this document; for an English question use the English column (the stage reads both):

  | Korean | English |
  |---|---|
  | `기각한 대안:` / `뒤집힐 조건:` | `Rejected alternative:` / `Flip condition:` |
  | `## 근거`: `주장 \| 출처 \| 원문 \| 범위 \| 상태: 직접\|간접\|미확인` | `## Evidence`: `claim \| source \| quote \| scope \| status: direct\|indirect\|unverified` |
  | `입장: 유지\|수정\|철회` | `Stance: keep\|revise\|withdraw` |
  | facts: `출처:` `범위:` `제기:` `이전:` | facts: `source:` `scope:` `raised by:` `was:` |
  | `할 일:` / `하지 않을 일:` / `뒤집힐 조건:` | `Do:` / `Don't:` / `Flip condition:` |
  | `채택:` | `Adopted:` |
  | `처음 판단 → 근거(F#) → 최종` | `Initial view → evidence (F#) → final` |

  `TL;DR:`, the `[verified|refuted|open]` statuses and the `[critical|major|minor]` severities stay in English in both.

## Deliverables

- **Confluence page:** write Markdown first, then use the `atlassian-workflows` skill for ADF conversion and publishing.
- **Slides / PPT:** Marp Markdown (`marp: true` frontmatter, `---` between slides, speaker notes in `<!-- -->` comments). Save in the repo or a user-specified path; mention that `npx @marp-team/marp-cli deck.md --pptx` converts it to PPTX.
- **Other documents or code:** write to the user-specified path; panelists review the file or diff.
- **Images when useful:** include real, source-checked HTTPS images in `answer.md` when the user requests photos or a visual materially helps the answer. Give each image a descriptive alt text and keep its source/credit nearby. Do not add images to every answer or imply attribution grants reuse rights; the stage neither searches for images nor downloads them into the debate folder.
