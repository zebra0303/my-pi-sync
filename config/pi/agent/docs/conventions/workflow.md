# Workflow Convention

## Review-first workflow

- Every code change must have a clear intent.
- Use the sequence `[PLAN]` → human approval → `[IMPLEMENTATION]` → `[REVIEW]`.
- Write plans before implementation.
- Plans should include architecture impact, backward compatibility, test strategy, and rollout/rollback considerations when applicable.
- Do not modify files without plan approval.
- If a plan was skipped, stop and produce one before continuing.
- If implementation started too early, acknowledge it, correct course, and return to the required workflow.

## Question-before-action rule

- When the user asks for a recommendation, naming suggestion, trade-off, or asks "what do you think?" / "뭐가 좋을까?", do not modify files or execute irreversible actions.
- First answer the question directly, provide 2-4 options when relevant, state the recommended option and rationale, then ask for explicit confirmation before applying changes.
- Treat confirmation as explicit only when the user says things like "apply it", "use option 2", "proceed with that", "그걸로 적용해", "2번으로 해", or "진행해".
- Do not treat a question as approval.

## Communication

- Do not guess; leave evidence in code or documentation.
- If required information is missing, state what is lacking before proceeding.
- State the conclusion in a single line first, then explain the reasoning.
- Communicate clearly and concisely, with enough context for individual contributor execution and team-level maintainability.
- When implementation details are open, prefer pragmatic choices that fit existing project conventions over unnecessary abstractions.

## Diagrams (Mermaid)

When emitting Mermaid diagrams for terminal (ASCII) rendering:

- Wrap every node and edge label in double quotes (`A["앱 로드"]`, `-->|"401"|`). Mandatory when a label contains `→`, `/`, or `()`.
- Keep labels short; move long explanations to body prose or a legend below the diagram.
- Manage graph width so it does not exceed the terminal columns — keep the flow vertical (`TD`) or split into multiple diagrams.
- Korean labels are fine to use inline; the terminal renderer handles CJK (double-width) glyphs correctly.

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
