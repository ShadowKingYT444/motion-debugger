# Motion Debugger plugin

Six portable design/build/evidence skill entries + bundled stdio MCP server. No automatic install, browser download, credentials, or host configuration changes.

From a built repository, this folder can be distributed on its own:

```sh
cd plugin/motion-debugger
npm ci --ignore-scripts
node node_modules/playwright/cli.js install chromium
```

The second command installs only the locked runtime dependency. The third explicitly downloads the version-matched browser. On Linux, required OS libraries may need your normal system administrator; this plugin does not run sudo.

`.mcp.json` uses the host's `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` substitutions. Build with `npm run build` from the repository root, then install this folder using your Codex plugin workflow. No actual host plugin installation is claimed as tested; the manifest and real SDK stdio handshake are validated.

For Codex, Claude Code, Cursor, or VS Code using project skills and MCP, use the main package CLI from a durable local installation:

```sh
motion-debugger init --client codex --local --skills --project /absolute/path/to/app
```

Replace `codex` with `claude-code`, `cursor` or `vscode`. This previews the project MCP configuration and all six skill folders; review it before rerunning with `--apply` and approving the change. Noninteractive setup requires the exact `--confirm <confirmationToken>` from that preview. Keep the local installation in place because its absolute runtime path is recorded. See the [source quickstart](../../README.md#quickstart) to build the unpublished package.

Source references remain optional, read-only annotations. Configure `MOTION_SOURCE_ROOTS` only for folders you intentionally want the server to read. Browser captures are restricted to loopback targets; interactions can change local app state, so agents must obtain appropriate authorization.

## Skills and workflow

Tag `motion-debugger` with your ordinary brief to use the namespaced transition authoring/review entry. The legacy `motion` entry remains available for a new animated page, `motion-design` for visual direction, `motion-3d-ui` for spatial scenes, or `motion-evidence` for an existing temporal bug. The manifest declares the `skills/` directory for host discovery. Project installation preserves a differing foreign `/motion` folder and gives `motion-debugger` its own recipes and references; other named collisions still stop before writing. MCP-only installation does not automatically install skills in a client. See [skill discovery and workflow setup](../../docs/SKILLS.md).

Run `node scripts/check-skills.mjs` from this plugin folder to verify the portable skill catalog and retained attribution. The design adaptation credits the pinned [Taste source](skills/motion-design/references/taste-provenance.md); its upstream MIT notice does not change Motion Debugger's project license.
