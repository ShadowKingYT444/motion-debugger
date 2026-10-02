# Motion Debugger Codex plugin

This repo-local plugin packages the motion-evidence skill and stdio MCP entrypoint. No installation or host configuration is performed automatically.

Build from the repository root with `npm ci && npm run build`. This produces `scripts/mcp.mjs`. The clone's node_modules supplies Playwright; if distributing just this plugin folder, run `npm install` in this folder and install the browser with `npx playwright install chromium` before enabling it.

The plugin manifest uses Codex's supported compatibility layout. Its bundled MCP configuration uses host plugin-root/data variables. The package structure is validated, and the MCP endpoint is tested with the official SDK client. A user's actual Codex plugin installation is not claimed as tested.

For an explicit, path-independent local Codex MCP connection, run `node build/cli/index.js config` from the repository root. It prints an absolute stdio configuration. Follow the repository setup guide to add that server yourself; the command does not write any config.
