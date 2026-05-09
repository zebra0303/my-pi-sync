# Feature-Sliced Design Rules

## Layers

Use a pragmatic Feature-Sliced Design structure.

Required top-level layers:

- `app`: application-wide setup such as providers, router, and global initialization
- `pages`: page components and page-scoped logic
- `shared`: reusable modules with no business ownership

Optional top-level layer:

- `entities`: domain entities extracted from duplicated page-level code

The create-xe-react reference does not use `features` or `widgets` by default, but they can be introduced when the product scope requires them.

## Segments

Use segments by purpose:

- `ui`: UI components
- `api`: fetch functions, API hooks, API response schemas, MSW handlers
- `model`: types, interfaces, schemas, constants describing domain shape
- `lib`: utilities, custom hooks, state reducers, business logic helpers

The `app` layer is exempt from the segment rule because it usually contains provider and routing composition.

## Entity Extraction

Start with page-local `ui`, `api`, `model`, and `lib` code.

Extract to `entities/<entity>` only when code becomes duplicated across pages and a clear domain entity can be named, for example:

- `entities/user`
- `entities/trend`
- `entities/monitor`
- `entities/date`

If the entity cannot be clearly named, keep the code local rather than extracting too early.

## Mock Directory Rule

Do not export `mock` directories from public `index.ts` barrel files.

Reason: mock files should not be pulled into the main bundle or affect initial render performance.

Prefer importing mocks directly where needed:

```ts
import { handlers } from '@/entities/user/mock';
```

## Naming and Export Conventions

- Components: PascalCase
- Hooks: `use` prefix + camelCase
- Utilities: camelCase
- Page components: default export is allowed
- Shared modules and utilities: prefer named exports
- Use `index.ts` barrel exports for public module APIs, excluding mocks

## Atomic Design Compatibility

Use Atomic Design as a UI composition vocabulary inside `shared/ui` and local `ui` folders.

Do not let global `atoms`, `molecules`, or `organisms` folders override FSD layer and slice boundaries.
