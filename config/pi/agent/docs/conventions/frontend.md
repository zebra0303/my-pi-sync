# Frontend Convention

## Architecture

- Use Feature-Sliced Design for frontend architecture and dependency boundaries.
- Use Atomic Design as a UI component composition guideline, especially within `shared/ui` and local `ui` folders.
- UI components must not include business logic.

## React / TypeScript / MUI

- Prioritize type safety and clear component boundaries.
- For MUI, prioritize accessible role/name semantics, keyboard interaction, focus management, and theme consistency.
- Prefer testable logic boundaries and user-facing behavior checks.

## XE frontend architecture

When working on XE frontend architecture, follow the `xe-frontend-architecture` skill:

- FSD layers
- ky / zod / react-query API pattern
- RHF + Zod form hooks
- overlay-kit dialogs
- nuqs URL sync with sanitization
- i18n and XSS safety rules
