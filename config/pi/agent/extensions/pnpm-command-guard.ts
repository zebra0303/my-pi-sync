import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

const npmCommandPatterns = [
  /(^|[;&|]\s*)npm\s+(install|i|run|exec|test|start|build|lint)(\s|$)/,
  /(^|[;&|]\s*)npx\s+nx(\s|$)/,
  /(^|[;&|]\s*)npm\s+create(\s|$)/,
];

const replacementHints = [
  ['npm install', 'pnpm install'],
  ['npm i', 'pnpm install'],
  ['npm run <script>', 'pnpm <script>'],
  ['npx nx <target>', 'pnpm nx <target>'],
  ['npm exec <command>', 'pnpm exec <command>'],
];

function isNpmCommand(command: string): boolean {
  return npmCommandPatterns.some((pattern) => pattern.test(command));
}

function buildHint(): string {
  return replacementHints.map(([from, to]) => `- ${from} → ${to}`).join('\n');
}

export default function (pi: ExtensionAPI) {
  pi.on('tool_call', async (event, ctx) => {
    if (event.toolName !== 'bash') return;

    const command = event.input.command ?? '';
    if (!isNpmCommand(command)) return;

    const message = [
      'This repository uses pnpm.',
      '',
      'Recommended replacements:',
      buildHint(),
      '',
      'Allow this npm/npx command anyway?',
      '',
      command,
    ].join('\n');

    if (!ctx.hasUI) {
      return {
        block: true,
        reason: 'Blocked npm/npx command in pnpm-managed repository. Use pnpm instead.',
      };
    }

    const ok = await ctx.ui.confirm('pnpm command guard', message);
    if (ok) return;

    return {
      block: true,
      reason: 'Blocked npm/npx command in pnpm-managed repository. Use pnpm instead.',
    };
  });
}
