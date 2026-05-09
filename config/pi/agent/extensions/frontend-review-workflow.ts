import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

const DEFAULT_BASE = 'origin/main';
const MAX_DIFF_CHARS = 60_000;
const MAX_COMMAND_CHARS = 30_000;
const MAX_FILE_CHARS = 20_000;
const MAX_FILES = 12;

const reviewableExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.scss',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

type CommandResult = {
  command: string;
  stdout: string;
  stderr: string;
  code: number | null;
};

type StaticCheck = {
  file: string;
  rule: string;
  severity: 'info' | 'warning';
  detail: string;
};

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n[truncated ${value.length - maxChars} chars]`;
}

function parseArgs(args: string): { base: string; runTests: boolean; extraInstructions: string } {
  const tokens = args.split(/\s+/).filter(Boolean);
  let base = DEFAULT_BASE;
  let runTests = false;
  const rest: string[] = [];

  for (const token of tokens) {
    if (token === '--test' || token === '--tests') {
      runTests = true;
    } else if (token.startsWith('--base=')) {
      base = token.slice('--base='.length) || DEFAULT_BASE;
    } else if (token.startsWith('-')) {
      rest.push(token);
    } else if (base === DEFAULT_BASE && rest.length === 0) {
      base = token;
    } else {
      rest.push(token);
    }
  }

  return { base, runTests, extraInstructions: rest.join(' ') };
}

function isReviewableFile(path: string): boolean {
  if (!path || path.includes('node_modules/')) return false;
  return reviewableExtensions.has(extname(path));
}

async function runRaw(pi: ExtensionAPI, command: string): Promise<CommandResult> {
  const result = await pi.exec('bash', ['-lc', command], { timeout: 120_000 });
  return {
    command,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    code: result.code,
  };
}

function formatCommandResult(result: CommandResult, maxChars = MAX_COMMAND_CHARS): string {
  const output = [`$ ${result.command}`, result.stdout, result.stderr, `exit code: ${result.code}`]
    .filter(Boolean)
    .join('\n');

  return truncate(output, maxChars);
}

async function run(pi: ExtensionAPI, command: string): Promise<string> {
  return formatCommandResult(await runRaw(pi, command));
}

function analyzeStaticRules(file: string, content: string): StaticCheck[] {
  const checks: StaticCheck[] = [];
  const normalized = file.replaceAll('\\', '/');
  const fileName = basename(normalized);

  if (normalized.includes('/mock/') && fileName === 'index.ts') {
    checks.push({
      file,
      rule: 'FSD mock export isolation',
      severity: 'warning',
      detail: 'Mock modules should not be exported from public barrel files.',
    });
  }

  if (fileName === 'index.ts' && /from ['"].*\/mock['"]/.test(content)) {
    checks.push({
      file,
      rule: 'FSD mock export isolation',
      severity: 'warning',
      detail:
        'Public barrel exports should not include mock modules because they can affect bundles.',
    });
  }

  if (
    /dangerouslySetInnerHTML/.test(content) &&
    !/sanitize|DOMPurify|I18nTypography/.test(content)
  ) {
    checks.push({
      file,
      rule: 'i18n and XSS safety',
      severity: 'warning',
      detail: 'dangerouslySetInnerHTML appears without an obvious sanitizer or safe wrapper.',
    });
  }

  if (/useFormContext\s*\(/.test(content)) {
    checks.push({
      file,
      rule: 'Form logic locality',
      severity: 'info',
      detail: 'useFormContext can obscure form data flow; verify it is intentionally needed.',
    });
  }

  if (/\.setValue\s*\(/.test(content) && !/use[A-Z][A-Za-z0-9]*Form/.test(fileName)) {
    checks.push({
      file,
      rule: 'Form logic locality',
      severity: 'info',
      detail: 'form.setValue should usually live inside a form custom hook, not arbitrary UI code.',
    });
  }

  if (
    /useState\s*<.*boolean.*>\s*\(false\)|useState\s*\(false\)/.test(content) &&
    /<Dialog|Snackbar|Toast|Modal/.test(content)
  ) {
    checks.push({
      file,
      rule: 'Overlay handling',
      severity: 'info',
      detail: 'Dialog or toast lifecycle appears to use local boolean state; consider overlay-kit.',
    });
  }

  if (/from ['"]nuqs['"]/.test(content) && !/Sanitized|withSanitize|sanitize/.test(content)) {
    checks.push({
      file,
      rule: 'URL query sanitization',
      severity: 'warning',
      detail: 'nuqs query parsing appears without an obvious sanitization wrapper.',
    });
  }

  if (/\.json\s*\(\s*\)/.test(content) && !/parseWithZod|safeParse|\.parse\s*\(/.test(content)) {
    checks.push({
      file,
      rule: 'API response validation',
      severity: 'warning',
      detail: 'JSON API response appears to be consumed without obvious Zod runtime validation.',
    });
  }

  if (/export \* from ['"].*mock/.test(content)) {
    checks.push({
      file,
      rule: 'FSD mock export isolation',
      severity: 'warning',
      detail: 'Avoid exporting mock modules from public module APIs.',
    });
  }

  return checks;
}

function formatStaticChecks(checks: StaticCheck[]): string {
  if (checks.length === 0) return 'No static architecture warnings detected.';

  return checks
    .map((check) => `- [${check.severity}] ${check.file} — ${check.rule}: ${check.detail}`)
    .join('\n');
}

async function readChangedFiles(
  cwd: string,
  files: string[],
): Promise<{ content: string; checks: StaticCheck[] }> {
  const chunks: string[] = [];
  const checks: StaticCheck[] = [];
  const selected = files.filter(isReviewableFile).slice(0, MAX_FILES);

  for (const file of selected) {
    const absolutePath = resolve(cwd, file);
    try {
      const content = await readFile(absolutePath, 'utf8');
      chunks.push(`## ${file}\n\n\`\`\`\n${truncate(content, MAX_FILE_CHARS)}\n\`\`\``);
      checks.push(...analyzeStaticRules(file, content));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      chunks.push(`## ${file}\n\n[failed to read: ${message}]`);
    }
  }

  if (files.length > selected.length) {
    chunks.push(
      `[${files.length - selected.length} changed file(s) were omitted from full-file context]`,
    );
  }

  return { content: chunks.join('\n\n'), checks };
}

function buildPrompt(params: {
  base: string;
  runTests: boolean;
  extraInstructions: string;
  status: string;
  diffStat: string;
  diff: string;
  fullFiles: string;
  staticChecks: string;
  lint: string;
  tests?: string;
}): string {
  return `# Frontend Review Workflow

Review the current frontend changes using the collected repository context.

## Review priorities

- XE frontend architecture rules from the \`xe-frontend-architecture\` skill
- Feature-Sliced Design layer and segment boundaries
- TypeScript correctness, nullable handling, and unsafe assertions
- React hook dependencies, stale closures, cleanup, state synchronization
- Component boundaries and excessive business logic in UI components
- API fetching with ky, Zod validation, TanStack Query, and MSW isolation
- React Hook Form + Zod form logic colocated in custom hooks
- overlay-kit usage for dialogs and toasts
- i18n typing and sanitized HTML rendering
- nuqs URL state synchronization with sanitized parsers
- MUI accessibility, focus management, keyboard interaction, and theme consistency
- Test coverage gaps for changed behavior

## Base

${params.base}

## Extra instructions

${params.extraInstructions || '(none)'}

## Git status

\`\`\`
${params.status}
\`\`\`

## Git diff stat

\`\`\`
${params.diffStat}
\`\`\`

## Git diff

\`\`\`diff
${params.diff}
\`\`\`

## Full changed file context

${params.fullFiles || '(no reviewable changed files found)'}

## Static architecture checks

${params.staticChecks}

## Lint result

\`\`\`
${params.lint}
\`\`\`

${
  params.runTests
    ? `## Test result\n\n\`\`\`\n${params.tests ?? '(test command was not run)'}\n\`\`\`\n`
    : '## Test result\n\nNot requested. Use `/frontend-review --test` to include affected tests.\n'
}

## Output format

Respond in the user's language unless they ask otherwise.

1. Key findings
2. Needs verification
3. Test and validation suggestions

For each issue include P1-P5 priority, severity, file/location, failure scenario, and recommended fix direction.
If there are no major findings, say "No major issues found".`;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand('frontend-review', {
    description:
      'Collect full files, git diff, lint, optional tests, architecture checks, then ask the LLM for frontend review',
    handler: async (args, ctx) => {
      if (!ctx.isIdle()) {
        ctx.ui.notify('Agent is busy. Run /frontend-review again when idle.', 'warning');
        return;
      }

      const { base, runTests, extraInstructions } = parseArgs(args);
      ctx.ui.notify(`Collecting frontend review context against ${base}...`, 'info');

      const quotedBase = shellQuote(base);
      const status = await run(pi, 'git status --short');
      const diffStat = await run(pi, `git diff --stat ${quotedBase}...HEAD`);
      const diff = await run(pi, `git diff ${quotedBase}...HEAD`);
      const changedFilesResult = await runRaw(pi, `git diff --name-only ${quotedBase}...HEAD`);
      const changedFiles = changedFilesResult.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const fullFileContext = await readChangedFiles(ctx.cwd, changedFiles);
      const lint = await run(pi, `pnpm nx affected -t lint --base=${quotedBase} --head=HEAD`);
      const tests = runTests
        ? await run(pi, `pnpm nx affected -t test --base=${quotedBase} --head=HEAD`)
        : undefined;

      pi.sendUserMessage(
        buildPrompt({
          base,
          runTests,
          extraInstructions,
          status,
          diffStat: truncate(diffStat, MAX_COMMAND_CHARS),
          diff: truncate(diff, MAX_DIFF_CHARS),
          fullFiles: fullFileContext.content,
          staticChecks: formatStaticChecks(fullFileContext.checks),
          lint,
          tests,
        }),
      );
    },
  });
}
