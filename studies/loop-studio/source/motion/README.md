# LOOP — original kinetic identity concept

LOOP is a fictional identity studio and a working browser-based playground. Original procedural forms move between Pulse, Weave and Orbit. The hero specimen travels into a sticky live editing surface. Orbit uses actual Three.js geometry, depth testing, perspective, reflected studio lighting and three PBR materials.

Run locally:

```sh
npm start
```

The server uses `LOOP_PREVIEW_PORT`, or port 3000. Open the displayed local server in a modern browser. The supplied Three.js files are imported from `assets/vendor/`; no bundler, remote fonts, services or artwork are required.

Verification:

```sh
CHROMIUM_PATH=/usr/bin/google-chrome LOOP_PREVIEW_PORT=3000 node evidence/journey.mjs
CHROMIUM_PATH=/usr/bin/google-chrome LOOP_PREVIEW_PORT=3000 node evidence/keyboard-and-motion.mjs
```

Run the server at the same port first. Tests use disposable, credential-free browser contexts and normal pointer/keyboard input. Download specimens, screenshots, native video, results and Motion Debugger recordings are in `evidence/`.

Exports: the dialog captures one preview moment. SVG is an original static vector rendition with the selected name and palette. JSON contains the name, style, palette, intensity, phase, geometry and that moment's 48 piece transforms. Reproducing motion uses the supplied `lib/kinetic-field.mjs`; JSON itself is not a standalone renderer. SVG projects spatial pieces into flat vector shapes and does not reproduce WebGL materials. No video export is offered.

See [EXECUTION.md](EXECUTION.md) for the inspected journeys, repairs, exact capture IDs and remaining limits.
