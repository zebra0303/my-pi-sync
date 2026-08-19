# Git Convention

> Based on [Confluence – Git Convention](https://lunit.atlassian.net/wiki/spaces/CSF/pages/3793880056/Git)

## Commit Message

### Format

```text
<type>(<scope>): <subject>
```

### 1) `type` (required)

A keyword indicating the purpose of the commit.

| Type | Description |
|------|-------------|
| `feat` | Add a new feature |
| `fix` | Fix a bug |
| `docs` | Update documentation (README, etc.) |
| `style` | Non-functional formatting changes (whitespace, semicolons, etc.) |
| `refactor` | Refactor code without changing behavior |
| `perf` | Improve performance |
| `test` | Add or update tests |
| `chore` | Build/package management changes (CI config, library updates, etc.) |
| `ci` | CI/CD configuration and script changes |
| `build` | Build-related changes (dependency updates, etc.) |
| `revert` | Revert a previous commit |

### 2) `scope` (optional)

Specifies the module or area affected by the change.

### 3) `subject` (required)

A short, imperative description of the change.

### Rules

- `type` must be **lowercase** (`Feat` -> `feat`)
- `subject` must start with a **lowercase** letter (`Add login` -> `add login`)
- `subject` must **not** end with a period (`add login.` -> `add login`)
- Use **English** by default

### Examples

```text
feat(auth): add social login
fix: resolve CORS issue
docs(readme): update installation guide
refactor: optimize query performance
perf(image): improve compression efficiency
ci(actions): fix deployment script
```

---

## Pull Request

### Title Format

```text
<type>(<scope>): <subject> [Ticket Number]
```

PR titles follow the commit message convention with a Jira ticket number appended.

### Rules

- The PR **title must always be written in English**, without exception. This holds even when the
  PR body, the ticket, or the conversation is in Korean, and even when the user asks for a
  Korean PR. A request for a "Korean PR" means the **body** is Korean; the title stays English.
- `type`, `scope`, and `subject` obey the commit message rules above (lowercase `type`,
  lowercase-initial `subject`, no trailing period).
- Append the ticket number in brackets at the end: `[LHVE-361]`.
- Branch names take the form `<type>/<TICKET>-<slug>`, e.g.
  `chore/LHVE-361-patch-transitive-dependency-security-advisories`.

#### Examples

```text
feat: add social login [IM2X-123]
fix(api): resolve CORS issue [CXR40XX-123]
```

### Merge Strategy

Use **Squash & Merge** as the default merge strategy.

### PR Review Prefixes

Reviewers should prefix comments with a priority level:

| Prefix | Meaning |
|--------|---------|
| **P1** | Please reflect |
| **P2** | Please actively consider |
| **P3** | Please reflect whenever possible |
| **P4** | It's okay not to reflect |
| **P5** | Minor comment, okay to skip |

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
