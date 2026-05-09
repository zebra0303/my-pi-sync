import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

type ProtectedPathRule = {
  name: string;
  matches: (path: string) => boolean;
};

const protectedPathRules: ProtectedPathRule[] = [
  {
    name: 'environment files',
    matches: (path) => /(^|\/)\.env(\..*)?$/.test(path),
  },
  {
    name: 'git metadata',
    matches: (path) => /(^|\/)\.git(\/|$)/.test(path),
  },
  {
    name: 'dependency directories',
    matches: (path) => /(^|\/)node_modules(\/|$)/.test(path),
  },
  {
    name: 'pi auth credentials',
    matches: (path) => /(^|\/)auth\.json$/.test(path),
  },
  {
    name: 'pi session logs',
    matches: (path) => /(^|\/)sessions(\/|$)/.test(path) || /\.jsonl$/.test(path),
  },
  {
    name: 'generated pi artifacts',
    matches: (path) => /(^|\/)(bin|git|npm)(\/|$)/.test(path),
  },
];

function normalizePath(path: string): string {
  return path.replace(/^@/, '').replaceAll('\\', '/');
}

function getPath(input: unknown): string | undefined {
  if (!input || typeof input !== 'object' || !('path' in input)) return undefined;

  const value = input.path;
  return typeof value === 'string' ? normalizePath(value) : undefined;
}

function findProtectedPathRule(path: string): ProtectedPathRule | undefined {
  return protectedPathRules.find((rule) => rule.matches(path));
}

export default function (pi: ExtensionAPI) {
  pi.on('tool_call', async (event, ctx) => {
    if (event.toolName !== 'write' && event.toolName !== 'edit') return;

    const path = getPath(event.input);
    if (!path) return;

    const rule = findProtectedPathRule(path);
    if (!rule) return;

    const message = `Blocked ${event.toolName} to protected path: ${path} (${rule.name})`;

    if (ctx.hasUI) {
      ctx.ui.notify(message, 'warning');
    }

    return {
      block: true,
      reason: message,
    };
  });
}
