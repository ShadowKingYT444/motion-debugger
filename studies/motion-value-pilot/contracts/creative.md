# Shared public interface contract

Deliver a static local app with `index.html`. Use the supplied `asset.svg`; do not fetch remote resources.

Expose stable semantic elements `#canvas`, `#selection-overlay`, `#playhead`, `#select-a`, `#select-b`, `#zoom-in`, `#undo`, `#export`, and `#status`, plus at least two `[data-object-id]` rendered objects. `#playhead` must support pointer and keyboard input. `window.__pilotState()` must return credential-free JSON with at least `selectedObject`, `playhead`, `zoom`, `undoDepth`, and `exported`. Export must download the current state as JSON. These public hooks describe required product behavior; evaluator action order and values are not supplied.
