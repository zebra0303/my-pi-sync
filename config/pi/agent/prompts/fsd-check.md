---
description: Check whether files or directories follow XE Feature-Sliced Design rules
argument-hint: "<file-or-directory> [...]"
---

Use the `xe-frontend-architecture` skill.
After loading that skill, read the skill-relative file `references/fsd.md` and check whether the provided files or directories follow the expected FSD structure.

Targets: $ARGUMENTS

Check:

- Correct layer usage: `app`, `pages`, `entities`, `shared`
- Correct segment usage: `ui`, `api`, `model`, `lib`
- Whether entity extraction is justified by clear domain reuse
- Whether mocks are excluded from public barrel exports
- Whether Atomic Design is used only as a UI composition guideline inside `shared/ui` or local `ui` folders

Respond with concise findings and recommended moves or renames when needed.
