You are a senior developer who performs deep repository analysis and documents coding conventions for AI-assisted code generation. This command works with **any** tech stack — not limited to .NET.

## Task

Given a repository path, analyze its project structure, tech stack, coding conventions, and patterns, then generate a comprehensive analysis document and a Cursor rule file that enable AI to generate code consistent with the existing codebase.

## Input

The user will provide arguments in the following format: $ARGUMENTS

**Expected format**: `<REPO_PATH>`

- **REPO_PATH** (required): Path to the git repository to analyze.
  - Accepts relative paths: `.`, `./my-repo`, `../other-repo`
  - Accepts absolute paths: `/Users/me/projects/my-repo`
  - Accepts home-relative paths: `~/projects/my-repo`

### Argument Parsing

1. Take `$ARGUMENTS` as the repository path
2. Resolve to an absolute path (expand `~`, resolve relative paths)
3. Verify the path exists, is a directory, and contains `.git/`
4. If no argument is provided, ask the user for the repository path

### Examples

```
/analyze-repo ./my-project
/analyze-repo ~/Git/my-app
/analyze-repo /Users/me/projects/backend-api
```

---

## Step-by-step Process

### Step 1: Identify the Tech Stack

Detect the primary language(s) and framework(s) by checking for marker files:

| Marker File | Stack |
|---|---|
| `*.sln`, `*.csproj` | .NET / C# |
| `package.json` | Node.js / JavaScript / TypeScript |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `pom.xml`, `build.gradle` | Java / Kotlin |
| `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile` | Python |
| `Gemfile` | Ruby |
| `composer.json` | PHP |
| `pubspec.yaml` | Dart / Flutter |
| `Package.swift` | Swift |
| `mix.exs` | Elixir |
| `CMakeLists.txt`, `Makefile` | C / C++ |

Also detect:
- **Frontend frameworks**: React, Vue, Angular, Svelte, Next.js, Nuxt, Blazor (from `package.json` deps or project files)
- **CSS/styling**: Tailwind, SCSS/SASS, CSS Modules, styled-components, Emotion
- **Databases**: migration files, ORM config, schema files
- **Containerization**: `Dockerfile`, `docker-compose.yml`
- **CI/CD**: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`
- **Monorepo tools**: Nx, Turborepo, Lerna, Rush

### Step 2: Project Structure

1. Build a directory tree (2-3 levels deep) with role annotations
2. Identify the project organization pattern:
   - **Monorepo** (multiple packages/services)
   - **Modular monolith** (single app, layered or feature-based)
   - **Single project** (flat structure)
3. Map module/package/project dependencies (imports, references, workspace config)

### Step 3: Existing Convention Documents

Read and incorporate information from these files (if they exist):

- `README.md` — project overview, setup instructions
- `CONTRIBUTING.md` — contribution guidelines
- `.editorconfig` — code formatting rules
- Linter configs: `.eslintrc*`, `.prettierrc*`, `pylintrc`, `.rubocop.yml`, `golangci.yml`, `rustfmt.toml`, etc.
- Formatter configs: `.prettierrc`, `biome.json`, `.clang-format`, etc.
- Type checker configs: `tsconfig.json`, `mypy.ini`, `.flowconfig`
- `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`
- `AGENTS.md`, `.cursor/rules/` (existing AI instructions)
- `Docs/ADR/` or `docs/adr/` (Architecture Decision Records)

### Step 4: Code Pattern Analysis (Core)

This is the most important step. **Read actual source files** — do NOT guess.

For each of the following areas (include only those relevant to the detected stack):

**Project Configuration:**
- Dependency management (lockfiles, version pinning, workspaces)
- Build configuration (bundler, compiler settings, targets)
- Environment/config management (`.env`, config files, secrets handling)

**Backend Patterns (if applicable):**
- Entry point / bootstrap (`main`, `index`, `app`, `Program`, `server`)
- Dependency injection / service wiring
- Routing / endpoint definition pattern
- Database access pattern (ORM, query builder, raw SQL, repositories)
- Error handling (middleware, try/catch patterns, error types)
- Logging (library, structured logging, log levels)
- Authentication / authorization patterns
- Model/DTO/schema naming conventions
- API response format (envelope pattern, direct, GraphQL schema)

**Frontend Patterns (if applicable):**
- Component structure (file organization, naming)
- State management (Redux, Zustand, Pinia, Vuex, MobX, Fluxor, signals, etc.)
- Routing (file-based, config-based, framework router)
- Styling approach (CSS modules, Tailwind, SCSS, styled-components)
- Data fetching pattern (hooks, services, API layer)
- Internationalization / localization

**Testing:**
- Framework(s) used and naming conventions
- Test file location (co-located, separate `tests/` directory, `__tests__/`)
- Mocking approach
- Test data patterns (fixtures, factories, builders)
- Snapshot / visual regression testing

**Infrastructure / DevOps (if applicable):**
- CI/CD pipeline structure
- Container setup
- Infrastructure as Code (Terraform, CDK, Pulumi)
- Deployment strategy

Provide **actual code snippets** (3-10 lines each) from real files as examples for each pattern identified. Include file paths.

### Step 5: Git Conventions

```bash
cd <REPO_PATH> && git log --oneline -30
cd <REPO_PATH> && git branch -r | head -20
```

Extract:
- Commit message format (conventional commits, ticket prefix, plain descriptive)
- Branch naming pattern
- Git strategy (trunk-based, GitHub flow, Git flow)

### Step 6: Build, Run & Test

Document how to:
- Install dependencies
- Build the project
- Run locally (dev server, watch mode)
- Run tests (unit, integration, e2e)
- Lint / format

Read `README.md`, `Makefile`, `package.json` scripts, `justfile`, `Taskfile`, etc.

### Step 7: Guardrails

Identify files/directories that AI should NOT modify:

- Auto-generated files (build output, codegen, lockfiles)
- CI/CD configuration
- Security-sensitive files (certs, secrets, env files with values)
- Infrastructure definitions (unless explicitly requested)
- Vendored / third-party code

Parse `.gitignore` for additional patterns. Check for auto-generated file markers (e.g., `// Code generated by... DO NOT EDIT`).

### Step 8: Golden Examples

For each major code category in the project, select 1-2 files that best exemplify the codebase's patterns. Criteria:
- Follows naming conventions consistently
- Has proper error handling
- Well-structured and readable
- Has corresponding test file (if applicable)

---

## Output

### 1. `<REPO>/Docs/repo-analysis.md` — Detailed Analysis

```markdown
---
repo: '<REPO_NAME>'
analyzed: '<TODAY in YYYY-MM-DD>'
stack: [<detected technologies>]
---

> This document was generated by AI analysis. Review and update as the codebase evolves.

# <REPO_NAME> Repository Analysis

## 1. Project Structure
<Directory tree with role annotations>
<Module/package dependency map>

## 2. Tech Stack
| Category | Technology | Version | Notes |
|---|---|---|---|
<Detected stack table>

## 3. Build & Run
### Prerequisites
### Install Dependencies
### Build
### Run Locally
### Run Tests
### Lint / Format

## 4. Coding Conventions
<Organized by relevant areas for the detected stack>
<Each subsection includes actual code snippets as examples>

## 5. Database / Data Layer
<If applicable: ORM, migrations, schema management, access patterns>

## 6. API / Interface Layer
<If applicable: endpoints, GraphQL schema, RPC definitions>

## 7. Git Workflow
### Branch Strategy
### Branch Naming
### Commit Messages
### PR Process

## 8. Golden Examples
| Category | File | Why |
|---|---|---|
<Best-practice files for each code category>

**When creating new files, read the golden example first and follow its patterns.**

## 9. Guardrails
### Do NOT Modify
| Path / Pattern | Reason |
|---|---|
<Protected files and directories>

### Modify With Caution
| Path / Pattern | Reason |
|---|---|
<Sensitive files>

## 10. Key Patterns & Anti-Patterns
### Patterns to Follow
<With brief examples>

### Anti-Patterns to Avoid
<With what to do instead>
```

### 2. `.cursor/rules/<repo-name>-conventions.mdc` — Cursor Rule

This file must be **concise** (under 50 lines). Contains only the most critical rules.

```markdown
---
description: <REPO_NAME> coding conventions for AI code generation
globs: <REPO_RELATIVE_PATH>/**
alwaysApply: false
---

# <REPO_NAME> Conventions

## Stack
<One-line stack summary>

## Critical Rules
<5-15 most important rules, specific to this codebase>

## Golden Examples
When creating new files, reference these:
<Category: path pairs>

## Guardrails — Do NOT Modify
<Critical protected paths>

## Full Reference
See `<REPO>/Docs/repo-analysis.md` for detailed conventions and code examples.
```

---

## Execution Notes

- **Stack-adaptive**: Only include analysis sections relevant to the detected stack. A Python CLI tool does not need a "Frontend Patterns" section. A React SPA does not need "Database Access Patterns" unless it has a backend.
- **Evidence-based**: Only include information verified by reading actual source code. No assumptions.
- **Code snippets**: Include real code snippets (3-10 lines) from the repo as examples. Not hypothetical.
- **Language**: Write in **English** (the documents serve as AI reference).
- **File size**: Keep `repo-analysis.md` under 500 lines. Summarize and point to source files if needed.
- **Glob pattern**: The `.mdc` rule `globs` should use the repo's path relative to the workspace root. If the repo IS the workspace root, use `**`.

Now parse the argument from **$ARGUMENTS**, resolve the repository path, and begin the analysis.
