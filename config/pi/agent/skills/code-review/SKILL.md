---
name: code-review
description: Review git branch, staged changes, or a specified base branch for defects. Use when the user invokes /review or asks for general code review, PR review, or staged diff review. For XE frontend architecture-specific review, prefer the xe-frontend-architecture skill.
---

# Code Review

Review current branch changes against a base branch or staged changes. Prioritize real defects over style preferences.

## Inputs

- Optional base branch, default: `origin/main`
- `--cached` or `--staged`: review only staged changes
- Optional review depth:
  - `simple`, `quick`, `logic-only`, or equivalent wording: perform a focused review of the changed logic and likely defects only
  - `full`, `thorough`, `overall`, or equivalent wording: perform a thorough review from the broader project perspective

## Review depth selection

Before inspecting the code, ask the user which review depth they prefer unless they already specified it.

Ask in the user's language and present two options:

1. Simple review: focus on changed logic and obvious defects only.
2. Thorough review: inspect the broader project context, related files, logic flow, tests, architecture boundaries, UX/accessibility where relevant, and integration risks.

Default to thorough review if the user does not choose explicitly or says to proceed with the default.

## Scope discovery

1. Inspect the repo state:
   - `git status --short`
2. If input is `--cached` or `--staged`:
   - `git diff --cached --stat`
   - `git diff --cached`
3. Otherwise:
   - Fetch the relevant base when appropriate:
     - default: `git fetch origin main`
     - if a base branch was provided, fetch the matching remote branch when possible
   - `git diff --stat <base>...HEAD`
   - `git diff <base>...HEAD`
   - If staged changes exist, also inspect `git diff --cached`
   - If unstaged changes exist, also inspect `git diff`
4. Read related files as needed to understand context. Do not rely only on diff snippets when surrounding code matters.
5. For simple reviews, limit extra file reading to what is necessary to validate changed logic and likely defects.
6. For thorough reviews, proactively inspect related project files and conventions needed to evaluate the change from a broader perspective, including architecture boundaries, call sites, tests, API contracts, and user-facing behavior where relevant.

## Review focus

Prioritize:

- Bugs, runtime errors, missing exception handling, null/undefined handling gaps
- Security issues, missing authorization, sensitive data exposure, input validation problems
- Business logic errors, wrong branches, edge cases
- Async issues, race conditions, stale state/cache synchronization
- Breaking API contracts, migrations, compatibility regressions
- Missing tests for risky paths
- Performance, accessibility, and UX issues that materially affect users

For frontend / React / TypeScript, check:

- React hook dependencies, stale closures, cleanup, unnecessary re-render risks
- Controlled/uncontrolled component switches, form validation, focus management
- Accessibility: semantic elements, role/name, keyboard interaction, ARIA misuse
- Type narrowing failures, `any`/unsafe assertions, nullable handling
- Loading/error/empty states
- Whether UI components contain excessive business logic

## Dependency and package recommendations

When recommending a new npm package or dependency, verify and explain why it is necessary before recommending it.

Check:

- Whether the package is deprecated, unmaintained, or has known maintenance concerns
- Whether the current toolchain or existing packages already support the same need through configuration, especially Vite, Nx, React, TypeScript, MUI, testing tools, linters, or build plugins already present in the project
- Whether the problem can be solved with existing dependencies or a small local utility instead of adding a package
- Bundle size, runtime cost, security/supply-chain risk, license fit, and long-term team maintenance cost
- Whether the package integrates safely with the project's current versions and architecture

If verification is not possible from the available information, mark the package recommendation as `needs verification` and do not present it as a certain recommendation.

Prefer built-in platform/tooling capabilities and existing project conventions over adding new dependencies.

## Persistent review notes

When the user asks to preserve a review for future reference, recommend storing it in the repository under `Docs/.dev/<TICKET>-review.md` when the notes are engineering-facing and should be versioned but are not polished product documentation. Use `Docs/reviews/<TICKET>.md` only when the user wants official/public review documentation.

Before writing a persistent review note, derive the ticket key from the branch name, prompt arguments, or user request when possible (for example, `LHVE-164`). If no ticket key is available, ask the user or use a descriptive filename such as `current-branch-review.md`.

Future reviews should check `Docs/.dev/*-review.md` for relevant prior findings when the branch, ticket key, or topic matches the current review.

## Output

Write the review in the user's language unless they request another language.

Use this structure:

1. Review depth
2. Key findings
3. What is good
4. Needs verification
5. Test and validation suggestions

For `Review depth`, state whether the review was simple or thorough and why.

For `What is good`, include 1–2 concrete strengths or commendable choices from the change, with file/function references when possible. Avoid forced praise; if there is not enough evidence, say so briefly.

For each issue include:

- Priority: `P1`–`P5`
- Severity: `Critical` / `High` / `Medium` / `Low`
- File/function/location
- Problem
- A-to-Z explanation of the logic:
  - What the current code does step by step
  - Why that behavior becomes incorrect or risky
  - Which condition, input, state, or timing triggers the failure
  - What the expected behavior should be
  - How the recommended fix addresses the root cause
  - What lesson or mental model helps avoid the same mistake later
- Reproduction or failure scenario
- Recommended fix direction

Priority guide:

- `P1`: must fix
- `P2`: strongly consider fixing
- `P3`: fix if possible
- `P4`: optional suggestion
- `P5`: minor comment

If there are no meaningful issues, say `No major issues found` and briefly mention remaining test gaps or manual checks.

### PR review comment format

When the user asks for PR review comments/messages, write each PR-ready comment in English first.

After each English PR comment, add a detailed Korean A-to-Z explanation under a separate heading.

Use this format:

````md
### PR comment

```md
P2: English PR-ready review comment here...
```

### 상세 설명

- 현재 코드가 하는 일:
- 왜 문제가 되는지:
- 어떤 조건에서 실패하는지:
- 기대 동작:
- 수정 방향:
- 같은 문제를 피하기 위한 mental model:
````

The English PR comment should be concise and directly pasteable into GitHub.
The Korean explanation should be more detailed and educational.
Do not include the Korean explanation inside the GitHub-ready PR comment block unless the user explicitly asks for bilingual PR comments.

## Rules

- Do not modify code unless the user explicitly asks for fixes.
- Do not make unsupported claims. Mark uncertain findings as `needs verification`.
- Prefer high-signal findings over long summaries.
