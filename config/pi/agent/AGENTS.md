# Team Development Rules

## General

- Every code change must have a clear intent.
- This repository requires a review-first workflow: `[PLAN]` → human approval → `[IMPLEMENTATION]` → `[REVIEW]`.
- Plans must be written before implementation and include architecture impact, backward compatibility, test strategy, and rollout/rollback considerations when applicable.
- Do not modify files without plan approval.
- If a plan was skipped, stop and produce one before continuing.
- If implementation started too early, acknowledge it, correct course, and return to the required workflow.
- Do not guess; leave evidence in code or documentation.
- When implementation details are open, prefer pragmatic choices that fit existing project conventions over introducing unnecessary new abstractions.
- For frontend work, pay close attention to type safety, component boundaries, accessibility, testability, and user-facing behavior.
- Communicate clearly and concisely, with enough context for both individual contributor execution and team decision-making.
- If the required information is missing, do not guess.
- Always identify and state what information is lacking before proceeding.
- State the conclusion in a single line first, then explain the reasoning.

### Personal

- The user is a frontend developer working primarily with TypeScript and React.
- The user uses Nx as the monorepo tool and MUI as the primary UI library.
- The user also serves as a team lead, so recommendations should consider team-level maintainability, reviewability, and long-term ownership.

## Code Quality

- Minimize side effects.
- Each function should have a single responsibility.
- Prefer clear naming.

## Testing

- Add or update tests whenever logic changes.
- Changes without tests are considered risky.
- Planning must include a test strategy, even when the strategy is to skip automated tests for a documented reason.

## Frontend

- Use [Feature-Sliced Design][fsd] for frontend architecture and dependency
  boundaries.
- Use Atomic Design as a UI component composition guideline, especially within `shared/ui` and local `ui` folders.
- Prefer Nx-aware workflows for affected lint, test, and build checks in monorepos.
- For MUI, prioritize accessible role/name semantics, keyboard interaction, focus management, and theme consistency.
- For XE frontend architecture, follow the `xe-frontend-architecture` skill: FSD layers, ky/zod/react-query API pattern, RHF+Zod form hooks, overlay-kit dialogs, nuqs URL sync with sanitization, and i18n/XSS safety rules.
- UI components must not include business logic.

[fsd]: https://fsd.how/docs/get-started/overview/

## Review Rules

- Use these rules as the basis for PR reviews.
- After implementation, summarize what changed.
- Highlight any deviations from the original plan.
- Call out known limitations.

## Git Convention

- For all pi work involving commits, pull requests, or code review guidance, read and follow `~/.pi/agent/docs/git-convention.md`.
