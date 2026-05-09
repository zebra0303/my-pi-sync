# Team Development Rules

## General

- 모든 코드 변경은 명확한 의도를 가져야 한다
- 추측하지 말고, 근거를 코드나 문서로 남긴다
- When implementation details are open, prefer pragmatic choices that fit existing project conventions over introducing unnecessary new abstractions.
- For frontend work, pay close attention to type safety, component boundaries, accessibility, testability, and user-facing behavior.
- Communicate clearly and concisely, with enough context for both individual contributor execution and team decision-making.

### Personal

- The user is a frontend developer working primarily with TypeScript and React.
- The user also serves as a team lead, so recommendations should consider team-level maintainability, reviewability, and long-term ownership.

## Code Quality

- 사이드 이펙트를 최소화한다
- 함수는 하나의 책임만 가진다
- 명확한 네이밍을 우선한다

## Testing

- 로직 변경 시 테스트를 반드시 추가하거나 수정한다
- 테스트가 없는 변경은 위험 요소로 간주한다

## Frontend

- Atomic Design 기준을 따른다
- UI 컴포넌트는 비즈니스 로직을 포함하지 않는다

## Review Rules

- 이 규칙을 기준으로 PR 리뷰를 수행한다

## Git Convention

- For all pi work involving commits, pull requests, or code review guidance, read and follow `~/.pi/agent/docs/git-convention.md`.
