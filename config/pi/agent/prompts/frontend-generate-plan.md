---
description: Plan files and folders for a new XE frontend page or feature
argument-hint: "<page-or-feature-name> [--form]"
---

Use the `xe-frontend-architecture` skill.
After loading that skill, read these skill-relative files as needed:

- `references/fsd.md`
- `references/data-fetching.md`
- `references/forms-overlays-i18n-url.md`

Plan the file and folder structure for: $ARGUMENTS

Provide:

1. Recommended FSD layer and segment placement
2. Files to create
3. API schema, fetch function, query hook, and MSW handler plan when data fetching is needed
4. Form hook and shared form controller plan when `--form` is requested or form behavior is implied
5. Dialog, i18n, URL sync, and XSS-safety considerations
6. Nx validation commands to run after implementation

Do not create files unless explicitly asked.
