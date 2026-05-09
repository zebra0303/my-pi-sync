# Forms, Overlays, i18n, URL Sync, and XSS Safety

## Forms

Use `react-hook-form`, `@hookform/resolvers`, and `zod`.

Keep form business logic in a custom hook:

- schema
- default values
- field coupling such as role-to-permissions updates
- submit behavior
- mutation wiring

Avoid using `form.setValue` from page or component level when the logic belongs to the form domain.

Avoid broad `useFormContext` usage when it makes form data flow difficult to trace.

Prefer shared form controller components such as:

- `FormTextField`
- `FormSelect`
- `FormSwitchGroup`

## Page Business Logic

Separate page concerns:

- API layer
- state layer
- business logic not directly tied to state
- view component layer

Use `useReducer` when:

- page state logic becomes large, roughly 30+ lines
- a page uses three or more related state values
- one action updates multiple state values together

## Dialog and Toast Overlays

Prefer `overlay-kit` for dialogs, snackbars, and toast-like overlays.

Avoid scattering local `useState` open/close state when an overlay can be expressed declaratively:

```tsx
overlay.open(({ isOpen, close }) => <Dialog open={isOpen} onClose={close} />);
```

## i18n

Use `i18next` and `react-i18next`.

Maintain locale JSON files in a consistent shape across all supported languages.

If translations grow large, split them with i18next namespaces, preferably by page or domain.

Language priority:

1. Explicit user setting, for example local storage
2. URL language segment when supported
3. Browser language
4. English default

Use typed locale keys where possible.

## HTML in Translations

Translated strings containing HTML are security-sensitive.

Do not use `dangerouslySetInnerHTML` directly in arbitrary components.

Use a safe wrapper such as `I18nTypography` that sanitizes translated HTML first.

## URL Sync

Use `nuqs` for query parameter and React state synchronization.

- Use `useQueryState` for one parameter.
- Use `useQueryStates` for multiple parameters.
- If a default URL must be written on initial render, set it explicitly because `withDefault` sets state but does not necessarily write the query string.

## URL Query Sanitization

Treat URL query parameters as untrusted input.

Wrap nuqs parsers with a sanitize layer, for example:

```ts
const [search, setSearch] = useQueryState('search', parseAsSanitizedString);
```

Use DOMPurify or an equivalent sanitizer for string inputs that can reach the DOM.

## Review Checklist

- Form rules are colocated in a custom hook.
- Components do not directly coordinate complex form value changes.
- Dialogs and toasts use overlay-kit where appropriate.
- i18n keys are typed and locale files remain consistent.
- HTML translations are sanitized before rendering.
- URL query parameters use sanitized parsers.
- Page state complexity is managed with reducer patterns when needed.
