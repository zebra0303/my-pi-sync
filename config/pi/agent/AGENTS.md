# User Context

- The user is a frontend developer working primarily with TypeScript and React.
- The user also serves as a team lead, so recommendations should consider team-level maintainability, reviewability, and long-term ownership.
- When implementation details are open, prefer pragmatic choices that fit existing project conventions over introducing unnecessary new abstractions.
- For frontend work, pay close attention to type safety, component boundaries, accessibility, testability, and user-facing behavior.
- Communicate clearly and concisely, with enough context for both individual contributor execution and team decision-making.

# Git Convention

Use this convention by default for all pi work involving commits, pull requests, or code review guidance.

## Commit Message

### Format

```text
<type>(<scope>): <subject>
```

### type

Required. Use one of:

- `feat`: Add a new feature
- `fix`: Fix a bug
- `docs`: Update documentation (README, etc.)
- `style`: Non-functional formatting changes (whitespace, semicolons, etc.)
- `refactor`: Refactor code without changing behavior
- `perf`: Improve performance
- `test`: Add or update tests
- `chore`: Build/package management changes (CI config, library updates, etc.)
- `ci`: CI/CD configuration and script changes
- `build`: Build-related changes (dependency updates, etc.)
- `revert`: Revert a previous commit

### scope

Optional. Specifies the module or area affected by the change.

### subject

Required. Use a short, imperative description of the change.

Rules:

- `type` must be lowercase.
- `subject` must start with a lowercase letter.
- `subject` must not end with a period.
- Use English by default.

Examples:

```text
feat(auth): add social login
fix: resolve CORS issue
docs(readme): update installation guide
refactor: optimize query performance
perf(image): improve compression efficiency
ci(actions): fix deployment script
```

## Pull Request

### Title Format

```text
<type>(<scope>): <subject> [Ticket Number]
```

PR titles follow the commit message convention with a Jira ticket number appended.

Examples:

```text
feat: add social login [IM2X-123]
fix(api): resolve CORS issue [CXR40XX-123]
```

### Merge Strategy

Use Squash & Merge as the default merge strategy.

### PR Review Prefixes

Reviewers should prefix comments with a priority level:

- `P1`: Please reflect
- `P2`: Please actively consider
- `P3`: Please reflect whenever possible
- `P4`: It's okay not to reflect
- `P5`: Minor comment, okay to skip

### PR Template

```markdown
## Issue Link

- Jira Ticket: [XE-xx]

## Changes

- Describe the implemented or modified feature.

## Check List

- [ ] Items the reviewer should pay special attention to.

## Test Steps

1. Steps for the reviewer to test this PR.

## Screenshots

- Attach screenshots of the implemented/modified feature if applicable.

## For Reviewer

- Use P1–P5 prefixes when leaving review comments.
```
