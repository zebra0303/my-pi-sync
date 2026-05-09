# XE Frontend Architecture Review Checklist

Use this checklist when reviewing XE frontend changes.

## FSD Structure

- Are files placed under the right layer: `app`, `pages`, `entities`, or `shared`?
- Are segments used by purpose: `ui`, `api`, `model`, `lib`?
- Is shared code extracted only when a clear domain or reuse reason exists?
- Are mocks excluded from public barrel exports?

## React and TypeScript

- Are nullable values handled explicitly?
- Are type assertions and `any` avoided?
- Are React hook dependencies correct?
- Are cleanup functions present for effects that need them?
- Is component state minimal and understandable?

## MUI and Accessibility

- Are role/name semantics clear?
- Is keyboard interaction supported?
- Is focus management handled for dialogs, menus, forms, and navigation?
- Are theme tokens used consistently instead of hardcoded one-off values?

## API Fetching

- Are API responses validated with Zod?
- Are fetch functions implemented with shared ky instances?
- Are authenticated requests using the authenticated client?
- Are query hooks aligned with fetch functions?
- Are mutation side effects and invalidations explicit?
- Are expected API errors mapped to custom error classes?

## Forms

- Is form business logic inside a custom hook?
- Are Zod schemas colocated with form or domain logic?
- Is `form.setValue` avoided at arbitrary component level?
- Is broad `useFormContext` usage avoided when it obscures data flow?
- Are shared form controller components used consistently?

## Page Business Logic

- Is page-level state separated from view components?
- Should related state transitions use `useReducer`?
- Are business rules kept out of pure UI components?

## Dialogs and Toasts

- Is overlay-kit used for dialog/toast flows where appropriate?
- Is local `useState` open/close state avoided when it only manages an overlay lifecycle?

## i18n and XSS Safety

- Are locale JSON structures consistent?
- Are translation keys typed where possible?
- Is translated HTML sanitized before rendering?
- Is direct `dangerouslySetInnerHTML` avoided outside a safe wrapper?

## URL Sync

- Is nuqs used for URL query state?
- Are query parameters sanitized before use?
- Are default URL query values written deliberately when needed?

## Testing

- Are reducers, validation helpers, sanitizers, query parser wrappers, and API response handlers covered by unit tests?
- Are user-visible flows covered with accessible queries?
- Are critical error/loading/empty states covered?

## Performance

- Are heavy dependencies considered for Vite manual chunks?
- Is bundle impact measured with a visualizer when chunking changes?
- Are mocks and development-only code excluded from production bundles?
