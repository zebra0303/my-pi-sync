# Team Development Rules

## General

- Every code change must have a clear intent.
- Do not guess; leave evidence in code or documentation.
- When implementation details are open, prefer pragmatic choices that fit existing project conventions over introducing unnecessary new abstractions.
- For frontend work, pay close attention to type safety, component boundaries, accessibility, testability, and user-facing behavior.
- Communicate clearly and concisely, with enough context for both individual contributor execution and team decision-making.

### Personal

- The user is a frontend developer working primarily with TypeScript and React.
- The user also serves as a team lead, so recommendations should consider team-level maintainability, reviewability, and long-term ownership.

## Code Quality

- Minimize side effects.
- Each function should have a single responsibility.
- Prefer clear naming.

## Testing

- Add or update tests whenever logic changes.
- Changes without tests are considered risky.

## Frontend

- Follow Atomic Design principles.
- UI components must not include business logic.

## Review Rules

- Use these rules as the basis for PR reviews.

## Git Convention

- For all pi work involving commits, pull requests, or code review guidance, read and follow `~/.pi/agent/docs/git-convention.md`.
