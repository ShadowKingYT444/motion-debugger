# Execution record

Built in the supplied project on 2026-10-04, inside the thirty-minute session. All authored files and assets are local. The supplied Three.js files and license are retained. Static source is served directly by `server.mjs` using `LOOP_PREVIEW_PORT`.

## Implemented

- Large charcoal specimen stage, original acid/lavender/ivory identity, launch typography, study cards and an explicitly labeled original concept.
- Three distinct systems: breathing nested squircles (Pulse), interlacing ribbons (Weave), and materially lit interlocking 3D tori with a central sphere, orbiting beads and shadows (Orbit).
- Shared name/style/palette/intensity/time state, interrupted crossfades, smoothed material and intensity updates, native range scrubbing, pause/resume and replay.
- Scroll framing that turns the desktop hero into a compact specimen above the controls; sticky live mobile preview.
- Native modal with captured-pose preview, valid SVG download and matching motion-configuration JSON download.
- Reduced-motion default pause, full manual creation task, useful projected-vector fallback without WebGL, plus context-loss recovery to that fallback.

## Evidence

The initial complete Playwright verification passed 14 grouped checks, including actual SVG/XML parsing and JSON state validation, held-pointer scrubbing in both directions, 11 rapid style changes, focus restoration after Escape, empty/maximum-length names, mobile creation and download, pixel-stable reduced-motion composition, and moving fallback with WebGL genuinely disabled. No application page errors were observed.

Saved desktop, mobile, control, export, reduced-motion and fallback images were opened with the image-viewing tool and visually inspected. Three timed Orbit poses were reviewed to check changing occlusion and spatial composition. Visual review caught beaded segmentation in the initial Weave rendering; the implementation was refined into continuous ribbons. Mobile framing and native range touch targets were also refined. A desktop interaction video is saved under `evidence/video/`.

Final finishing pass: the complete 14-check suite passed again after ribbon refinement and larger native range hit areas. A separate motion review passed four additional checks: timed moving frames and pixel-stable pause for Pulse and Weave, settled palette selection, and eight consecutive native Tab presses retained inside the export panel with Escape dismissal. The extra keyboard pass initially exposed focus leaving the panel at the end of the sequence; an explicit first/last-button wrap corrected it and the check passed on rerun. Pulse and Weave timed frames were opened and visually reviewed after this refinement. The measured headless frame cadence during the final Weave review had a 16.7 ms median across 60 frames; this is a session measurement, not a cross-device performance guarantee.

Final results: `evidence/verification.json` and `evidence/motion-review.json`. The website remains runnable via `npm start`.

## Remaining limits

- SVG is a static captured pose. Orbit's vector surface has faceted shading and approximate occlusion at intersecting meshes; it does not reproduce physically based lighting, soft shadows or raster antialiasing exactly.
- JSON is an explicitly labeled motion configuration, not rendered video, an interchange standard or a separate playback app. The source implementation defines the versioned algorithms.
- Browser verification uses installed Chromium, including mobile emulation. Safari, Firefox, physical mobile hardware and assistive technology were not tested in this session.
- No persistence or import workflow is advertised. Reloading starts a new local composition.
