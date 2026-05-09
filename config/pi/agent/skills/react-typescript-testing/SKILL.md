---
name: react-typescript-testing
description: Write or improve tests for React and TypeScript code. Use when the user invokes /test or asks to add, update, or review frontend tests with Jest, Vitest, React Testing Library, Playwright, or Cypress.
---

# React TypeScript Testing

Write or improve tests for changed code, a specified file, component, hook, utility, or scope.

## Principles

- Follow the project's existing test tools and conventions first.
- Do not add new test libraries without asking the user first.
- Prefer user-observable behavior over implementation details.
- Keep TypeScript type safety intact.
- Control flaky sources clearly: timers, async work, network calls, animations.
- For UI tests, prefer accessible role/name queries.
- Keep business logic testable outside UI components when possible.

## Workflow

1. Discover the test environment and conventions:
   - `package.json`
   - test config files
   - existing nearby test files
   - target components/hooks/utilities
2. Identify scenarios before editing:
   - happy path
   - errors, empty values, null/undefined, boundaries
   - user interactions
   - async loading/failure states
   - accessibility-impacting states
3. Add or update tests following existing conventions.
4. Run relevant tests when feasible:
   - Prefer targeted tests for changed files.
   - If full test suites are expensive, run the smallest meaningful command.
   - If tests cannot be run, explain why and provide the exact command for the user.

## React Testing Library preferences

- Prefer `getByRole`, `findByRole`, and `queryByRole`.
- Use `getByText` or `getByTestId` only when role/name queries are impractical.
- Prefer `userEvent`, `findBy*`, and `waitFor` over direct `act` usage.
- Use snapshots only when they have a clear purpose.

## Output

After making changes, summarize in Korean unless the user requests another language:

1. 추가/수정한 테스트
2. 검증한 시나리오
3. 실행한 테스트 명령과 결과
4. 남은 리스크 또는 후속 제안

## Rules

- Keep tests maintainable and reviewable.
- Avoid testing private implementation details unless there is no better public behavior to assert.
- Do not introduce broad refactors unless required for testability and approved by the user.
