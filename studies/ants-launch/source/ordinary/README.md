# Anthropic Ants

An independent, unofficial launch-page concept. Vanilla HTML/CSS/JavaScript with the supplied local Three.js module. All illustrations, geometry, paper textures, and icons are original and local. No API, credentials, remote fonts, or external assets.

## Run

```sh
npm start
```

Open http://127.0.0.1:5173. The server binds only to loopback. Dependencies are supplied in the parent node_modules; the browser-facing Three.js files are copied into assets.

Launch the fixed repair-café example. Four stages run for approximately 24 foreground seconds. Pause/resume, cancel, restart, replay, inspect any stage, and read the final plan. Drag the scene or focus it and use Left/Right. The details drawer supports Tab, Shift+Tab, Escape, and focus restoration.

Reduced motion removes camera travel and walking, using composed stage poses while retaining the complete task. If WebGL fails, a local illustrated workflow remains functional. `?webgl=0` forces this path for testing.

## Verification and evidence

See [EXECUTION.md](EXECUTION.md) for the execution record and limitations. Browser scripts, screenshots, videos, test logs, and failed attempts are in `evidence/`.
