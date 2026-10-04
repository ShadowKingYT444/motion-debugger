# Portable plugin packages

One authored skill catalog lives in `plugin/motion-debugger/skills/`. The package builder copies that catalog, its references and executable recipes into host-specific release folders; generated copies are not maintained in Git. The bundled MCP entrypoint is built by the normal repository build. No host configuration is changed by packaging.

```sh
npm run build
node scripts/package-plugins.mjs
node --test tests/plugin-packages.test.mjs
```

Node.js 22+ and the system `zip` utility are required. Tests additionally use `unzip`. Use `--out /absolute/output/directory` to select another destination. Existing unmanaged output, edited packages, extra files, symlinks and source directories are rejected. An unchanged previously generated directory is replaced through staging with recovery if the final rename fails. Build again before packaging changed runtime code.

The output is `dist/plugins/`:

| Folder | Manifest | MCP config | Loading status |
| --- | --- | --- | --- |
| `codex/motion-debugger` | `.codex-plugin/plugin.json` | `.mcp.json`, `${PLUGIN_ROOT}` / `${PLUGIN_DATA}` | Preserves the repository's Codex adapter; actual host loading requires verification |
| `claude-code/motion-debugger` | `.claude-plugin/plugin.json` | `.mcp.json`, `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` | Official format; actual host loading requires verification |
| `cursor/motion-debugger` | `.cursor-plugin/plugin.json` | `mcp.json`, `${CURSOR_PLUGIN_ROOT}` | Official format; actual host loading requires verification |
| `skills/motion-debugger` | None | None | Standalone Agent Skills fallback; Gemini/OpenCode host discovery unverified |

Each folder also has a versioned ZIP at the output root. The ZIP contains one `motion-debugger/` root, preserving hidden manifests and recipe resources. Runtime packages have `package.json`, `package-lock.json`, `scripts/mcp.mjs`, workflow references, shared skills and third-party notices. They exclude installed dependencies, downloaded browsers, credentials, study artifacts and browser recordings. The fallback archive contains skills/resources without a server and must not be advertised as a native plugin.

Before enabling an extracted runtime folder, explicitly install its locked dependency and browser from that folder:

```sh
npm ci --ignore-scripts
node node_modules/playwright/cli.js install chromium
```

No published npm version is assumed. Linux browser OS libraries must be available separately. Keep the folder installed while its MCP config refers to it. Configure optional source roots only for directories the user intentionally authorizes.

Claude Code can load an extracted folder using `claude --plugin-dir /absolute/path/to/motion-debugger`; its authoritative manifest check is `claude plugin validate /absolute/path/to/motion-debugger`. Invoke `/motion-debugger:motion-debugger` with the ordinary design prompt. This adapter follows the [official Claude Code manifest reference](https://code.claude.com/docs/en/plugins-reference), including persistent plugin data for evidence.

For Cursor, the [official plugin documentation](https://cursor.com/docs/plugins) describes copying the complete folder into `~/.cursor/plugins/local/motion-debugger`, reloading, and checking Customize. Local plugin imports must be allowed. Invoke `/motion-debugger` with the design prompt. Cursor's [reference](https://cursor.com/docs/reference/plugins) documents `mcp.json` and `${CURSOR_PLUGIN_ROOT}`; it explicitly does not expand `${PLUGIN_ROOT}` or `${PLUGIN_DATA}`. This adapter stores evidence in `.motion-debugger/evidence` relative to the MCP process working directory, keeping generated evidence out of the plugin install directory.

The release builder preserves private/UNLICENSED metadata and retained notices. It does not publish, change licensing, register marketplaces, download dependencies or install a plugin. Root marketplace files pointing at untracked generated folders are deliberately absent: a repository clone must not advertise a missing runnable package.

`RELEASE.json` inside each folder records the source Git commit and dirty flag (or `null` when unavailable), version, host and SHA256/byte count of every payload file. The outside `release-index.json` hashes every delivered folder file, including each `RELEASE.json`, plus every archive. The index cannot hash itself. Hashes identify delivered bytes; they do not attest that an agent used them. ZIP order, file modes and timestamps are normalized so identical inputs produce identical archives on the same ZIP implementation. Tests check exact archive entries/content and repeat-build hashes.

Keep validation levels separate when reporting results: these package tests validate generated paths, versions, bytes, exclusions and safety. An extracted fresh dependency installation plus a real SDK connection validates the packaged binary/protocol. A host manifest validator validates the host parser. A fresh-session skill invocation and real tool use validates the actual coding-agent workflow. Packaging metadata starts with `hostValidation: unverified`; only separate recorded evidence can establish the latter levels.
