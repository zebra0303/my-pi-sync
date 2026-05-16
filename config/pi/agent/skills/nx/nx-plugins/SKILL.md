---
name: nx-plugins
description: Find and add Nx plugins. USE WHEN user wants to discover available plugins, install a new plugin, or add support for a specific framework or technology to the workspace.
---

## Finding and Installing new plugins

In pi, always prefix Nx with the detected workspace package manager (`pnpm nx`, `yarn nx`, `npm exec nx --`, etc.). Examples use pnpm:

- List plugins: `pnpm nx list`
- Install plugins: `pnpm nx add <plugin>`. Example: `pnpm nx add @nx/react`.
- If a plugin has `node_modules/@nx/<plugin>/PLUGIN.md`, read it before implementing framework-specific changes.
