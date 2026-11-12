/* Drift — "the sound you sleep under": one lit, folded sheet rendered in WebGL.
 * The same surface is the hero (blue hour), the lab instrument (night) and the sunrise (download).
 * Long swells = ocean, broad slow undulation = hum, fine ripples = rain. The pointer sends a ripple.
 * Caps DPR, renders at a reduced scale, pauses off screen, and draws one still frame under reduced motion. */
(function () {
  'use strict';
  var D = (window.Drift = window.Drift || {});
  D.state = D.state || { ambient: true };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uEnergy;',
    'uniform float uAmp;uniform float uDark;uniform float uHorizon;uniform vec3 uMix;uniform float uWarmth;',
    'uniform vec3 cDeep;uniform vec3 cMid;uniform vec3 cLit;uniform vec3 cSheen;uniform vec3 cWarm;uniform vec3 cFog;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}',
    'float depthAt(float y){return 1./(uHorizon-y*.92);}',
    'vec2 plane(vec2 uv){float z=depthAt(uv.y);return vec2((uv.x-.5)*(uRes.x/uRes.y)*z,z)*1.7;}',
    'float height(vec2 p,vec2 m){',
    '  float t=uTime;',
    '  vec2 w=vec2(vnoise(p*.35+vec2(0.,t*.03)),vnoise(p*.35+vec2(4.3,-t*.026)));',
    '  vec2 q=p+(w-.5)*1.05;',
    '  float ocean=.55+uMix.y*.9, hum=.45+uMix.z*.8;',
    '  float h=sin(q.x*1.05+q.y*.42+t*.19)*.5*ocean;',
    '  h+=sin(q.x*1.7-q.y*.55-t*.14+1.3)*.26*ocean;',
    '  h+=sin(q.x*.33+t*.07)*sin(q.y*.47-t*.05)*.5*hum;',
    '  float s1=sin(q.x*.78+q.y*.86+t*.09);float c=1.-sqrt(s1*s1+.03);',
    '  h+=c*c*c*.42;',
    '  float s2=sin(q.x*1.35-q.y*.3-t*.11+2.);float c2=1.-sqrt(s2*s2+.03);',
    '  h+=c2*c2*c2*.18;',
    '  h+=(sin(dot(q,vec2(2.6,1.9))*1.5+t*1.6)*.5+sin(dot(q,vec2(-1.8,2.9))*1.6-t*1.9)*.5)*.06*uMix.x;',
    '  h*=uAmp;',
    '  float d=distance(p,m);',
    '  h+=uEnergy*.32*sin(d*5.5-t*4.2)*exp(-d*1.15);',
    '  return h;',
    '}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/uRes;',
    '  vec2 p=plane(uv);vec2 m=plane(uMouse);',
    '  float z=depthAt(uv.y);float e=.035*z;',
    '  float h=height(p,m);',
    '  float hx=height(p+vec2(e,0.),m);float hy=height(p+vec2(0.,e),m);',
    '  vec3 n=normalize(vec3(-(hx-h)/e,-(hy-h)/e,.62));',
    '  vec3 L1=normalize(vec3(.55,.75,.62));',
    '  vec3 L2=normalize(vec3(-.8,-.45,.38));',
    '  vec3 V=normalize(vec3(0.,-.8,.6));',
    '  float dif=clamp((dot(n,L1)+.28)/1.28,0.,1.);',
    '  float lamp=pow(clamp(dot(n,L2),0.,1.),2.4);',
    '  float spec=pow(clamp(dot(n,normalize(L1+V)),0.,1.),38.);',
    '  float sheen=pow(1.-clamp(dot(n,V),0.,1.),3.);',
    '  vec3 col=mix(cDeep,cMid,pow(dif,2.1));',
    '  col+=cLit*spec*.85;',
    '  col+=cSheen*sheen*.32;',
    '  col+=cWarm*lamp*(.16+.5*uWarmth)*(1.15-uv.x);',
    '  float fog=smoothstep(1.05,2.9,z);',
    '  col=mix(col,cFog,fog*.8);',
    '  float vig=smoothstep(1.1,0.,length((uv-vec2(.02,.0))*vec2(.85,1.45)));',
    '  col*=1.-.2*vig-.34*smoothstep(.6,.0,uv.y);',
    '  col=mix(col,cFog*.42,uDark);',
    '  col+=(hash(gl_FragCoord.xy+fract(uTime))-.5)/255.;',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function hex(c) {
    var n = parseInt(c.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  var sheets = [];
  var running = false;
  var last = 0;
  var lastScroll = 0;
  window.addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });

  function Sheet(canvas, opts) {
    this.canvas = canvas;
    this.opts = opts;
    this.u = {
      amp: opts.amp == null ? 1 : opts.amp, dark: 0, horizon: opts.horizon || 1.22,
      mix: opts.mix || [0.2, 0.45, 0.6], warmth: opts.warmth || 0, energy: 0
    };
    this.mouse = [0.72, 0.58];
    this.target = [0.72, 0.58];
    this.time = opts.seed || 0;
    this.visible = false;
    this.dirty = true;
    this.ok = this.init();
    if (!this.ok) canvas.closest('[data-sheet-host], section').classList.add('no-webgl');
  }

  Sheet.prototype.init = function () {
    var gl;
    try { gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return false;
    var self = this;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); } return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var names = ['uRes', 'uTime', 'uMouse', 'uEnergy', 'uAmp', 'uDark', 'uHorizon', 'uMix', 'uWarmth', 'cDeep', 'cMid', 'cLit', 'cSheen', 'cWarm', 'cFog'];
    this.loc = {};
    names.forEach(function (n) { self.loc[n] = gl.getUniformLocation(prog, n); });
    var c = this.opts.colors;
    ['Deep', 'Mid', 'Lit', 'Sheen', 'Warm', 'Fog'].forEach(function (k) {
      var v = hex(c[k.toLowerCase()]); gl.uniform3f(self.loc['c' + k], v[0], v[1], v[2]);
    });
    this.gl = gl;
    // Software GL (headless, old machines): render smaller and less often.
    var slow = false;
    try {
      var dbg = gl.getExtension('WEBGL_debug_renderer_info');
      var r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
      slow = /swiftshader|llvmpipe|software/i.test(r);
    } catch (e) { /* ignore */ }
    this.slow = slow;
    this.scale = slow ? (this.opts.slowScale || 0.36) : (this.opts.scale || 0.6);
    this.fpsGap = slow ? 1000 / 20 : 1000 / 45;
    this.resize();
    var host = this.canvas.closest('section');
    host.addEventListener('pointermove', function (e) {
      var r = self.canvas.getBoundingClientRect();
      self.target = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      self.u.energy = Math.min(1, self.u.energy + 0.06);
    }, { passive: true });
    new IntersectionObserver(function (es) {
      self.visible = es[0].isIntersecting;
      if (self.visible) { self.dirty = true; loop(); }
    }, { rootMargin: '80px 0px' }).observe(this.canvas);
    return true;
  };

  Sheet.prototype.resize = function () {
    if (!this.gl) return;
    var d = Math.min(window.devicePixelRatio || 1, 2) * this.scale;
    var w = Math.max(2, Math.round(this.canvas.clientWidth * d));
    var h = Math.max(2, Math.round(this.canvas.clientHeight * d));
    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w; this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    this.dirty = true;
  };

  Sheet.prototype.set = function (vals) {
    for (var k in vals) if (Object.prototype.hasOwnProperty.call(vals, k)) this.u[k] = vals[k];
    this.dirty = true;
    if (!running) loop();
  };

  Sheet.prototype.draw = function () {
    var gl = this.gl, L = this.loc, u = this.u;
    if (!gl) return;
    gl.uniform2f(L.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(L.uTime, this.time);
    gl.uniform2f(L.uMouse, this.mouse[0], this.mouse[1]);
    gl.uniform1f(L.uEnergy, u.energy);
    gl.uniform1f(L.uAmp, u.amp);
    gl.uniform1f(L.uDark, u.dark);
    gl.uniform1f(L.uHorizon, u.horizon);
    gl.uniform3f(L.uMix, u.mix[0], u.mix[1], u.mix[2]);
    gl.uniform1f(L.uWarmth, u.warmth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.dirty = false;
    if (!this.shown) { this.shown = true; this.canvas.classList.add('is-live'); }
  };

  function animating() { return D.state.ambient && !reduce.matches; }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    var any = false;
    sheets.forEach(function (s) {
      if (!s.ok || !s.visible) return;
      if (s.shown && now - (s.lastDraw || 0) < s.fpsGap) { any = true; return; }
      // Software GL: hold the frame while the page is scrolling, so scrolling stays smooth.
      if (s.slow && s.shown && now - lastScroll < 200) { any = true; return; }
      var step = Math.min(0.08, (now - (s.lastDraw || now)) / 1000);
      if (animating()) {
        s.time += step;
        s.mouse[0] += (s.target[0] - s.mouse[0]) * 0.06;
        s.mouse[1] += (s.target[1] - s.mouse[1]) * 0.06;
        s.u.energy *= 0.965;
        s.dirty = true;
        any = true;
      }
      if (s.dirty) { s.draw(); s.lastDraw = now; }
    });
    last = now;
    if (any) requestAnimationFrame(frame); else running = false;
  }
  function loop() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }

  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { sheets.forEach(function (s) { s.resize(); }); loop(); }, 120);
  });

  D.sheet = {
    create: function (canvas, opts) { if (!canvas) return null; var s = new Sheet(canvas, opts); sheets.push(s); loop(); return s; },
    wake: loop
  };

  // The three sheets of the page, coloured from PREMIUM.md.
  D.sheets = {
    hero: D.sheet.create(document.getElementById('heroSheet'), {
      colors: { deep: '#0b1550', mid: '#3554d6', lit: '#e3e9ff', sheen: '#8ea4ff', warm: '#ffb08a', fog: '#1b2c7c' },
      mix: [0.15, 0.5, 0.6], seed: 12, amp: reduce.matches ? 1 : 2.3
    }),
    lab: D.sheet.create(document.getElementById('labSheet'), {
      colors: { deep: '#060a24', mid: '#22348f', lit: '#d4e2ff', sheen: '#6f86ff', warm: '#ffcd95', fog: '#0a1030' },
      mix: [0.2, 0.3, 0.5], seed: 40, horizon: 1.3, slowScale: 0.45
    }),
    dawn: D.sheet.create(document.getElementById('dawnSheet'), {
      colors: { deep: '#b85a62', mid: '#ffb27c', lit: '#fff4e0', sheen: '#ffd9b8', warm: '#ffe3a6', fog: '#f8b98e' },
      mix: [0.1, 0.4, 0.7], seed: 77, warmth: 0.6, horizon: 1.26
    })
  };
})();
