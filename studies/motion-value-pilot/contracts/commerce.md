# Shared public interface contract

Deliver a static local app with `index.html`. Use the supplied `asset.svg`; do not fetch remote resources.

Expose stable semantic elements `#collection`, at least three `[data-product-id]` controls, `#filter-a`, `#filter-b`, `#cart`, `#cart-count`, `#add-to-cart`, `#variant-a`, `#variant-b`, `#export`, and `#status`. `window.__pilotState()` must return credential-free JSON with at least `selectedProduct`, `filter`, `variant`, `cartCount`, and `exported`. Export must download the current state as JSON. These public hooks describe required product behavior; evaluator action order and values are not supplied.
