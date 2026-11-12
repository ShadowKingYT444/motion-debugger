# imagery: rich visuals without stock

Imagery is what separates a premium page from a styled document. Every major section needs a visual that could only belong to this product. Empty rounded boxes with an icon, emoji, and generic blobs do not count.

## Sources, best first

1. **The project's own assets.** Product photos, screenshots, logos, illustrations already in the repo or provided by the user. Use them big: full bleed, cropped with intent, masked into shapes, duotoned to the palette, layered with type.
2. **The live product.** For software, build the real UI in HTML and CSS at full fidelity with plausible data, and let it demonstrate itself: rows arriving, a chart updating, a cursor completing a task. This beats any illustration of software.
3. **A built object.** The product, or a metaphor specific to the brief (not the obvious noun), constructed in CSS, SVG, canvas or three.js, with materials and lighting: layered gradients for curvature, a specular highlight, a contact shadow, real proportions. Explode or rotate it in the signature scene.
4. **A generative scene.** Canvas or WebGL driven by the concept: a ledger as a flowing field of entries, sound as a standing wave filling a room, sleep as slowly drifting contour lines. It must read as *about* something, react subtly to the pointer or scroll, and stay calm.
5. **Typography as image.** A single word or number at extreme scale, cut by the frame, filled with an image or gradient. Use it for one section, not the page.

Stock photography only when the user allows it, never as filler. Never hotlink random image URLs you have not seen.

## Rules

- **The hero visual** has depth: at least three layers, a light source, and a scale that dominates the frame (40% or more of the first viewport).
- **At least three more rich visuals** down the page, of different kinds: a live UI, a diagram that draws, a built object.
- **Diagrams and data** are designed, not default: custom axes, the brand palette, labels set in the type system, and a motion that explains the data.
- **Performance:** cap canvas and WebGL resolution at `devicePixelRatio` 2, pause rendering when off screen (IntersectionObserver) or when the tab is hidden, and draw one still frame under reduced motion. Initialise heavy scenes when they near the viewport.
- **Fallbacks:** if WebGL is unavailable, show a designed static image or gradient, never an empty box.

## A fullscreen shader, dependency-free

A starting point for a generative background. Write your own fragment shader for the concept. This one is a slow, lit noise field.

```html
<canvas class="field" aria-hidden="true"></canvas>
<script type="module">
const canvas = document.querySelector('.field');
const gl = canvas.getContext('webgl', { antialias: false, alpha: true });
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (gl) {
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  void main(){vec2 uv=gl_FragCoord.xy/r;vec2 q=uv*vec2(r.x/r.y,1.)*3.;
    float v=n(q+t*.04)*.6+n(q*2.-t*.03)*.3+n(q*4.)*.1;
    float light=1.-smoothstep(0.,.9,distance(uv,m));
    vec3 ground=vec3(.06,.07,.09),glow=vec3(.85,.55,.30); /* from PREMIUM.md */
    gl_FragColor=vec4(mix(ground,glow,v*.35+light*.25),1.);}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = { r: gl.getUniformLocation(prog, 'r'), t: gl.getUniformLocation(prog, 't'), m: gl.getUniformLocation(prog, 'm') };
  let mouse = [0.7, 0.6], visible = true, raf = 0;
  const size = () => { const d = Math.min(devicePixelRatio, 2); canvas.width = canvas.clientWidth * d; canvas.height = canvas.clientHeight * d; gl.viewport(0, 0, canvas.width, canvas.height); };
  const draw = (now) => { gl.uniform2f(u.r, canvas.width, canvas.height); gl.uniform1f(u.t, now / 1000); gl.uniform2f(u.m, mouse[0], mouse[1]); gl.drawArrays(gl.TRIANGLES, 0, 3); if (!still && visible) raf = requestAnimationFrame(draw); };
  addEventListener('pointermove', (e) => { mouse = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(draw); }).observe(canvas);
  addEventListener('resize', size); size(); raf = requestAnimationFrame(draw);
}
</script>
```

For lit 3D objects, use three.js from a CDN as an ES module (`https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js`) with one key light, one rim light, and physically based materials.

## Verify

Run the critic and look at every detail frame: each section has a visual that belongs to this product, the hero visual dominates the first viewport, and no frame is mostly empty. The `dead-space` and `hollow-containers` findings are clear.
