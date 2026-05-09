import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

export default function (pi: ExtensionAPI) {
  pi.on('tool_call', async (event, ctx) => {
    if (event.toolName !== 'bash') return;

    const cmd = event.input.command ?? '';

    const dangerousPatterns = ['rm -rf', 'sudo', 'chmod -R 777', 'mkfs'];

    if (dangerousPatterns.some((p) => cmd.includes(p))) {
      const ok = await ctx.ui.confirm(
        '⚠️ Dangerous command detected',
        `Command:\n${cmd}\n\nAllow execution?`,
      );

      if (!ok) {
        return {
          block: true,
          reason: 'Blocked by Dangerous Command Guard',
        };
      }
    }
  });
}
