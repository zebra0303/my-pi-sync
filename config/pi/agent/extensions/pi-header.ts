import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { truncateToWidth, visibleWidth } from '@earendil-works/pi-tui';

const LOGO_COLOR_ANSI = '\x1b[38;2;206;222;151m';
const RESET_FG = '\x1b[39m';

const LOGO = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀
⠀⠀⠀⠀⠀⠀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠁
⠀⠀⠀⣰⣿⣿⣿⠟⠋⠀⠀⠀⣿⣿⣿⡇⠀⠀⠀⠀⣿⣿⣿⣿⣿⠁⠀⠀⠀⠀
⠀⠀⢰⣿⣿⡿⠁⠀⠀⠀⠀⢠⣿⣿⣿⡇⠀⠀⠀⢸⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀
⠀⠀⠈⠛⠋⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠁⠀⠀⠀⣾⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠀⠀⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⡇⠀⠀⠀⢸⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⠁⠀⠀⠀⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⡟⠀⠀⠀⢰⣿⣿⣿⣿⣿⣄⠀⠀⣴⡆⠀⠀
⠀⠀⠀⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣶⣾⣿⠃⠀⠀
⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⠏⠀⠀⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀
⠀⠀⠀⠀⠀⠈⠻⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⡿⠟⠁⠀⠀⠀
`
  .trim()
  .split('\n')
  .map((line) => line.trimEnd());

function color(text: string): string {
  return `${LOGO_COLOR_ANSI}${text}${RESET_FG}`;
}

function center(line: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - visibleWidth(line)) / 2));
  return `${' '.repeat(padding)}${line}`;
}

export default function (pi: ExtensionAPI) {
  pi.on('session_start', async (_event, ctx) => {
    if (!ctx.hasUI) return;

    ctx.ui.setHeader(() => ({
      render(width: number): string[] {
        const logo = LOGO.map((line) => truncateToWidth(center(color(line), width), width, ''));

        return ['', ...logo, ''];
      },
      invalidate() {},
    }));
  });

  pi.registerCommand('builtin-header', {
    description: "Restore pi's built-in startup header",
    handler: async (_args, ctx) => {
      ctx.ui.setHeader(undefined);
      ctx.ui.notify('Built-in header restored', 'info');
    },
  });
}
