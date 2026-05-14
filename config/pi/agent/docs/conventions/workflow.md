# Workflow Convention

## Review-first workflow

- Every code change must have a clear intent.
- Use the sequence `[PLAN]` → human approval → `[IMPLEMENTATION]` → `[REVIEW]`.
- Write plans before implementation.
- Plans should include architecture impact, backward compatibility, test strategy, and rollout/rollback considerations when applicable.
- Do not modify files without plan approval.
- If a plan was skipped, stop and produce one before continuing.
- If implementation started too early, acknowledge it, correct course, and return to the required workflow.

## Communication

- Do not guess; leave evidence in code or documentation.
- If required information is missing, state what is lacking before proceeding.
- State the conclusion in a single line first, then explain the reasoning.
- Communicate clearly and concisely, with enough context for individual contributor execution and team-level maintainability.
- When implementation details are open, prefer pragmatic choices that fit existing project conventions over unnecessary abstractions.

## Complex task handling

- For complex or high-risk tasks, break the work into small, reviewable steps.
- Explain the approach before acting, as if guiding a junior developer.
- Clarify ambiguous requirements before implementation instead of guessing.
- When multiple valid approaches exist, present the options, trade-offs, and recommended path.
- Prefer incremental changes with verification after each meaningful step.

## Review summary

After implementation:

- Summarize what changed.
- Highlight deviations from the original plan.
- Call out known limitations.
