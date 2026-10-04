# LOOP

An original concept for an imaginary kinetic identity studio. A local, interactive website built with vanilla HTML, CSS, JavaScript and the supplied Three.js 0.186.1. No external artwork, fonts, services or analytics.

## Run

```sh
npm start
```

The static server uses `LOOP_PREVIEW_PORT` (3000 when unset). Open the printed local preview port in a browser. There is no build step. Serve the files over HTTP, since browser module imports require it.

## Create

Enter up to 12 characters, select Pulse, Weave or Orbit, choose a color world, and set intensity. The native timeline can be dragged in either direction. Holding the pointer suspends the clock; releasing it restores the previous playback state. Keyboard arrows, Home and End scrub a paused pose. Pause/resume and replay are available beside the timeline and on the specimen.

The export panel captures a pose when opened. Its preview and both downloads use that same snapshot, including the chosen name, style, palette, intensity and time. SVG downloads are static vector stills. JSON downloads describe the six-second motion system and chosen settings; they are not video files or a standalone animation player.

Orbit uses actual 3D meshes, lighting, materials, shadowing and depth testing. Its SVG still and WebGL fallback use depth-sorted projected vector surfaces. Pulse uses breathing nested squircles; Weave uses six interlacing sinusoidal ribbons. All shapes are authored here.

Reduced motion starts with a meaningful paused composition. Style changes, palettes, intensity, manual scrubbing and exports remain available. Explicitly selecting Play opts into playback. Without WebGL (or following context loss), Orbit uses the moving projected-vector canvas instead. Mobile includes a sticky live specimen beside the creation controls.

## Verification

```sh
node evidence/verify.mjs
```

Uses the supplied Playwright and `CHROMIUM_PATH` (installed Chrome), with disposable, credential-free contexts. Native pointer and keyboard actions exercise editing, bidirectional held-pointer scrubbing, rapid switching, pause/resume, replay, real downloads, dialog focus, mobile, reduced motion and a browser launched with WebGL disabled.

See `EXECUTION.md` for the execution record and `evidence/` for screenshots, SVG/JSON downloads, a desktop interaction video and machine-readable results.
