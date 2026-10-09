/* prep.js: runs synchronously before the motion kit boots.
 * Splits rich headings (keeping <em> styling) into masked word pieces so the kit's
 * own text-only splitter skips them (data-split-done). */
(function () {
  var titles = document.querySelectorAll('[data-title]');
  titles.forEach(function (el) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var index = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var mask = document.createElement('span');
            mask.className = 'mk-mask';
            mask.setAttribute('aria-hidden', 'true');
            var piece = document.createElement('span');
            piece.className = 'mk-piece';
            piece.style.setProperty('--i', index++);
            piece.textContent = part;
            mask.appendChild(piece);
            frag.appendChild(mask);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    }
    walk(el);
    el.setAttribute('aria-label', label);
    el.setAttribute('data-split', 'words');
    el.setAttribute('data-split-done', '1');
  });
})();
