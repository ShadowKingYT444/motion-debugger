# Full-viewport headed recordings

On the tested Wayland laptop, Chrome's CDP screencast scales the entire native compositor surface into the requested video size. An emulated 1280px viewport can therefore appear smaller inside its recording, although its screenshot is correct. A GPU renderer alone does not prove correct video coverage.

Use this opt-in mode only after calibrating the actual display:

```sh
MOTION_BROWSER_MODE=headed MOTION_RECORDING_SURFACE=1920x1080 motion-debugger capture recipe.json
```

The example is the tested laptop's native display size. Supply your own even display dimensions. The declared surface must cover the viewport and native display, at most 2560x1600 and 4,096,000 pixels. This mode requires `ffmpeg` on PATH. It maximizes only the fresh capture window, records the native surface, retains `video-native.webm`, and crops its top-left viewport into `video.webm`. It changes neither image scale nor playback time. The report records the transformation.

Before using a complex scene as evidence, record a four-corner calibration at the intended viewport. Decode the actual recording and confirm all four corners match the screenshot at native scale. Then check a real scene and the unchanged temporal evidence gate. If the compositor has a different origin, clips the viewport, or changes scale, do not use this crop as proof. Use another verified browser/display setup.

Headless mode and the default recording path remain unchanged. Native GPU, correct pixels, interaction success and sufficient temporal sampling are separate checks.
