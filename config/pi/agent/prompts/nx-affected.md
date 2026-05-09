---
description: Run Nx affected checks and explain failures
argument-hint: "[base-branch]"
---

# Nx affected checks

Run and analyze Nx affected checks for the current branch.

## Input

Base branch argument: `$1`

- If no base branch is provided, use `origin/main`.
- Use `HEAD` as the head revision.
- This repository uses pnpm. Prefer `pnpm nx ...` commands, not `npx nx` or `npm run`.

## Workflow

1. Inspect repository state:
   - `git status --short`
   - confirm whether there are staged or unstaged changes that should be included
2. Resolve the base branch:
   - default: `origin/main`
   - if `$1` is provided, use `$1`
3. Fetch the base branch when it is a remote-tracking branch or clearly maps to origin:
   - default: `git fetch origin main`
4. Run affected checks:
   - `pnpm nx affected -t lint test build --base=<base> --head=HEAD`
5. If it fails:
   - identify the failed target and project
   - summarize the most relevant error lines
   - suggest the smallest likely fix path
   - suggest focused follow-up commands such as:
     - `pnpm nx lint <project>`
     - `pnpm nx test <project>`
     - `pnpm nx build <project>`
6. If it passes:
   - summarize the command and result briefly

## Output

Respond in the user's language unless they ask otherwise.

Include:

1. Commands executed
2. Result summary
3. Failure cause candidates and recommended fix direction
4. Next validation commands
