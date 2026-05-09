---
description: Review frontend changes against XE architecture rules
argument-hint: "[base-branch|--cached]"
---

Use the `xe-frontend-architecture` skill.
After loading that skill, read the skill-relative file `references/review-checklist.md` first, then inspect the relevant skill-relative reference files as needed.

Review the current frontend changes against XE architecture rules.

Arguments: $ARGUMENTS

Focus on:

- Feature-Sliced Design layer and segment boundaries
- API fetching with ky, Zod validation, TanStack Query, and MSW isolation
- React Hook Form + Zod form logic colocated in custom hooks
- overlay-kit usage for dialogs and toasts
- i18n typing and sanitized HTML rendering
- nuqs URL state synchronization with sanitized parsers
- MUI accessibility, focus management, keyboard interaction, and theme consistency
- Nx-aware lint, test, and build validation

Do not modify code unless explicitly asked. Provide findings with P1-P5 priority, severity, file/location, failure scenario, and recommended fix direction.
