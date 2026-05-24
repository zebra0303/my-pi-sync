# Frontend Convention

## Architecture

- Use Feature-Sliced Design for frontend architecture and dependency boundaries.
- Use Atomic Design as a UI component composition guideline, especially within `shared/ui` and local `ui` folders.
- UI components must not include business logic.

## React / TypeScript / MUI

- Prioritize type safety and clear component boundaries.
- For MUI, prioritize accessible role/name semantics, keyboard interaction, focus management, and theme consistency.
- Prefer testable logic boundaries and user-facing behavior checks.

## Web platform / Baseline

- When implementing frontend features, prefer current Web Platform capabilities documented by MDN and web.dev.
- Check Baseline support before adopting newer browser APIs or CSS features: https://web.dev/baseline
- Prefer Baseline-supported features. If a feature is not Baseline, use progressive enhancement, fallback behavior, or get explicit confirmation before relying on it.
- Prefer modern CSS over unnecessary JavaScript for layout, responsiveness, visual states, animation, and interaction where practical.
- Before adding JavaScript for UI behavior, consider CSS-first options such as container queries, `:has()`, `@supports`, cascade layers, logical properties, subgrid, native popover/dialog behavior, scroll snap, and modern selectors.
- Avoid needless resize/scroll listeners, DOM measurement loops, JS-driven responsive layout, and animation code when CSS can solve the problem accessibly and maintainably.

## Performance / Core Web Vitals

- Follow Core Web Vitals guidance from web.dev: https://web.dev/explore/learn-core-web-vitals
- Treat LCP, INP, and CLS as primary user experience constraints when designing or reviewing frontend changes.
- Prefer implementation choices that keep rendering fast, interaction latency low, and layout stable.
- Optimize LCP by prioritizing critical content, avoiding unnecessary render-blocking work, using appropriate image formats/sizing/loading, and minimizing heavy client-side rendering for above-the-fold content.
- Optimize INP by minimizing long tasks, unnecessary JavaScript, expensive re-renders, and synchronous work in event handlers.
- Optimize CLS by reserving space for images, embeds, ads, async content, and dynamic UI; avoid unexpected layout shifts.
- Avoid adding dependencies, animations, scripts, or client-side work that could regress Core Web Vitals without a clear need.

## XE frontend architecture

When working on XE frontend architecture, follow the `xe-frontend-architecture` skill:

- FSD layers
- ky / zod / react-query API pattern
- RHF + Zod form hooks
- overlay-kit dialogs
- nuqs URL sync with sanitization
- i18n and XSS safety rules
