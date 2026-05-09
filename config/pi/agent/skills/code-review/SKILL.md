---
name: code-review
description: Review git branch, staged changes, or a specified base branch for defects. Use when the user invokes /review or asks for code review, PR review, staged diff review, or frontend/React/TypeScript risk analysis.
---

# Code Review

Review current branch changes against a base branch or staged changes. Prioritize real defects over style preferences.

## Inputs

- Optional base branch, default: `origin/main`
- `--cached` or `--staged`: review only staged changes

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

## Output

Write the review in Korean unless the user requests another language.

Use this structure:

1. 주요 발견 사항
2. 확인 필요 사항
3. 테스트/검증 제안

For each issue include:

- Priority: `P1`–`P5`
- Severity: `Critical` / `High` / `Medium` / `Low`
- File/function/location
- Problem
- Reproduction or failure scenario
- Recommended fix direction

Priority guide:

- `P1`: must fix
- `P2`: strongly consider fixing
- `P3`: fix if possible
- `P4`: optional suggestion
- `P5`: minor comment

If there are no meaningful issues, say `발견된 주요 이슈 없음` and briefly mention remaining test gaps or manual checks.

## Rules

- Do not modify code unless the user explicitly asks for fixes.
- Do not make unsupported claims. Mark uncertain findings as `확인 필요`.
- Prefer high-signal findings over long summaries.
