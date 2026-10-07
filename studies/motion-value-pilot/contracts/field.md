# Shared public interface contract

Deliver a static local app with `index.html`. Use the supplied `asset.svg`; do not fetch remote resources.

Expose stable semantic elements `#product`, `#part-label`, `#mode-a`, `#mode-b`, `#waveform`, `#export`, and `#status`. `#waveform` must be keyboard focusable and support pointer input. `window.__pilotState()` must return credential-free JSON with at least `mode`, `progress`, `chapter`, and `exported`. Export must download the current state as JSON. These public hooks describe required product behavior; evaluator action order and values are not supplied.
