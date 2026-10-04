# Contributing

## Development

Use Node.js 22 or later. From a source checkout:

```sh
npm ci
npm run build
npm run check
```

For browser tests, install the package-pinned Chromium build with Playwright's official installer, then run the browser suites listed in `package.json`. Linux may also require Playwright's documented system dependencies.

## Pull requests

Keep changes focused and include reproduction steps, verification commands and the tested commit. Include actual screenshots or recordings for UI changes, and failing/passing evidence for motion changes. Clearly label intentionally seeded examples.

Do not check in dependency directories, credentials, private recordings, browser profiles or generated evidence from unrelated applications. Use synthetic/public fixture content for tests.

Changes to installation must preserve other tools' configuration, handle paths with spaces, and be tested in an isolated home/project directory. Distribution changes must pass a clean packed-install test.

## Releases

Publishing requires owner approval, a chosen license and registry access. Do not advertise an unavailable version. Public availability and compatibility statements must be verified after publication. Keep the full review and release checklist in the pull request.
