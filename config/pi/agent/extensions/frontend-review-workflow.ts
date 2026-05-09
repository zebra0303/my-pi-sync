import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
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

async function run(pi: ExtensionAPI, command: string): Promise<string> {
  const result = await pi.exec('bash', ['-lc', command], { timeout: 120_000 });
  const output = [
    `$ ${command}`,
    result.stdout.trim(),
    result.stderr.trim(),
    `exit code: ${result.code}`,
  ]
    .filter(Boolean)
    .join('\n');

  return truncate(output, MAX_COMMAND_CHARS);
}

async function readChangedFiles(cwd: string, files: string[]): Promise<string> {
  const chunks: string[] = [];
  const selected = files.filter(isReviewableFile).slice(0, MAX_FILES);

  for (const file of selected) {
    const absolutePath = resolve(cwd, file);
    try {
      const content = await readFile(absolutePath, 'utf8');
      chunks.push(`## ${file}\n\n\`\`\`\n${truncate(content, MAX_FILE_CHARS)}\n\`\`\``);
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

  return chunks.join('\n\n');
}

function buildPrompt(params: {
  base: string;
  runTests: boolean;
  extraInstructions: string;
  status: string;
  diffStat: string;
  diff: string;
  fullFiles: string;
  lint: string;
  tests?: string;
}): string {
  return `# Frontend Review Workflow

Review the current frontend changes using the collected repository context.

## Review priorities

- TypeScript correctness, nullable handling, and unsafe assertions
- React hook dependencies, stale closures, cleanup, state synchronization
- Component boundaries and excessive business logic in UI components
- Accessibility: semantic HTML, role/name, keyboard interaction, focus management, ARIA usage
- Loading/error/empty states and user-facing behavior
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

Respond in Korean unless the user asks otherwise.

1. 주요 발견 사항
2. 확인 필요 사항
3. 테스트/검증 제안

For each issue include P1-P5 priority, severity, file/location, failure scenario, and recommended fix direction.
If there are no major findings, say "발견된 주요 이슈 없음".`;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand('frontend-review', {
    description:
      'Collect full files, git diff, lint, optional tests, then ask the LLM for frontend review',
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
      const changedFilesOutput = await run(pi, `git diff --name-only ${quotedBase}...HEAD`);
      const changedFiles = changedFilesOutput
        .split('\n')
        .filter((line) => line && !line.startsWith('$ ') && !line.startsWith('exit code:'))
        .map((line) => line.trim())
        .filter(Boolean);
      const fullFiles = await readChangedFiles(ctx.cwd, changedFiles);
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
          fullFiles,
          lint,
          tests,
        }),
      );
    },
  });
}
