---
name: xe-frontend-architecture
description: Use when working on XE frontend applications with Nx, React, TypeScript, MUI, Feature-Sliced Design, API fetching, forms, overlays, i18n, URL sync, XSS safety, Vite chunking, or frontend architecture reviews.
---

# XE Frontend Architecture

Use this skill for XE frontend work based on the create-xe-react architecture documents.

## Source Documents

This skill condenses the FE Architecture create-xe-react Confluence page and child pages.

Key references in this skill:

- `references/fsd.md`
- `references/data-fetching.md`
- `references/forms-overlays-i18n-url.md`
- `references/review-checklist.md`

## Core Rules

1. Use Feature-Sliced Design for frontend architecture and dependency boundaries.
2. Use Nx-aware workflows for monorepo validation.
3. Use pnpm commands in this repository.
4. Keep UI components free of business logic.
5. Keep business rules in `lib`, state reducers, form hooks, API hooks, or domain modules.
6. Use runtime validation for API responses.
7. Treat URL query parameters and translated HTML as untrusted input and sanitize them.
8. Prefer accessibility-first MUI usage: role/name semantics, keyboard interaction, focus management, and theme consistency.

## Recommended Validation Commands

```bash
pnpm nx affected -t lint test build --base=origin/main --head=HEAD
pnpm nx lint <project>
pnpm nx test <project>
pnpm nx build <project>
```

## When Reviewing Code

Read `references/review-checklist.md` first, then check the relevant reference documents based on the changed area.

## When Creating or Modifying Architecture

- For folder structure and imports, read `references/fsd.md`.
- For API fetching and error handling, read `references/data-fetching.md`.
- For forms, dialogs, i18n, URL sync, and XSS safety, read `references/forms-overlays-i18n-url.md`.
