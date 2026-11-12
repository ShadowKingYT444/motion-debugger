/* Halo — an opt-in generative room tone. Nothing plays until the visitor asks.
   The analyser feeds Halo.level, which makes the light ring breathe with the sound. */
(function (global) {
  'use strict';
  const Halo = (global.Halo = global.Halo || {});
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const A = (Halo.audio = {
    ctx: null, master: null, analyser: null, buf: null, on: false,
    timers: [], nodes: [], target: 0
  });

  function impulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function build() {
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    const ctx = (A.ctx = new AC());
    const master = (A.master = ctx.createGain());
    master.gain.value = 0;
    const an = (A.analyser = ctx.createAnalyser());
    an.fftSize = 512; an.smoothingTimeConstant = 0.6;
    A.buf = new Uint8Array(an.fftSize);
    master.connect(an); an.connect(ctx.destination);

    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 4.2, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.9;
    verb.connect(wet); wet.connect(master);
    const dry = ctx.createGain(); dry.gain.value = 0.7; dry.connect(master);
    A.verb = verb; A.dry = dry;

    // pad: a slow Dmaj9 cloud
    const notes = [73.42, 110.0, 185.0, 277.18, 329.63, 440.0];
    const gains = [0.5, 0.42, 0.3, 0.22, 0.2, 0.12];
    notes.forEach((f, i) => {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 + i * 120; lp.Q.value = 0.4;
      const vg = ctx.createGain(); vg.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04 + i * 0.017;
      const lg = ctx.createGain(); lg.gain.value = gains[i] * 0.09;
      lfo.connect(lg); lg.connect(vg.gain);
      vg.gain.setValueAtTime(gains[i] * 0.11, ctx.currentTime);
      [[-6, 'sine'], [5, 'triangle']].forEach((o) => {
        const osc = ctx.createOscillator(); osc.type = o[1]; osc.frequency.value = f; osc.detune.value = o[0];
        osc.connect(lp); osc.start(); A.nodes.push(osc);
      });
      lp.connect(vg); vg.connect(dry); vg.connect(verb);
      lfo.start(); A.nodes.push(lfo);
    });

    return true;
  }

  function bell() {
    if (!A.on) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const scale = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66];
    const f = scale[Math.floor(Math.random() * scale.length)];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    g.connect(A.verb); g.connect(A.dry);
    [[1, 1], [2.01, 0.28], [3.97, 0.08]].forEach((p) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * p[0];
      const og = ctx.createGain(); og.gain.value = p[1];
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 3.6);
    });
    A.timers.push(setTimeout(bell, 1800 + Math.random() * 3200));
  }

  function pulse() {
    if (!A.on) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(92, t);
    o.frequency.exponentialRampToValueAtTime(56, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g); g.connect(A.dry);
    o.start(t); o.stop(t + 1);
    A.timers.push(setTimeout(pulse, 2400));
  }

  A.start = function () {
    if (!A.ctx && !build()) return false;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    const t = A.ctx.currentTime;
    A.master.gain.cancelScheduledValues(t);
    A.master.gain.setValueAtTime(A.master.gain.value, t);
    A.master.gain.linearRampToValueAtTime(0.85, t + 2.4);
    A.on = true;
    A.timers.push(setTimeout(bell, 900));
    A.timers.push(setTimeout(pulse, 400));
    return true;
  };

  A.stop = function () {
    if (!A.ctx) return;
    A.on = false;
    A.timers.forEach(clearTimeout); A.timers = [];
    const t = A.ctx.currentTime;
    A.master.gain.cancelScheduledValues(t);
    A.master.gain.setValueAtTime(A.master.gain.value, t);
    A.master.gain.linearRampToValueAtTime(0, t + 0.9);
    setTimeout(() => { if (!A.on && A.ctx && A.ctx.state === 'running') A.ctx.suspend(); }, 1100);
  };

  A.toggle = function () {
    if (A.on) { A.stop(); return false; }
    return A.start();
  };

  // called every frame from the main loop
  A.update = function (dt) {
    let target = 0;
    if (A.on && A.analyser) {
      A.analyser.getByteTimeDomainData(A.buf);
      let s = 0;
      for (let i = 0; i < A.buf.length; i++) { const v = (A.buf[i] - 128) / 128; s += v * v; }
      target = clamp(Math.sqrt(s / A.buf.length) * 5.2);
    }
    const k = 1 - Math.exp(-dt * (target > Halo.level ? 14 : 4));
    Halo.level += (target - Halo.level) * k;
    if (Halo.level < 0.002) Halo.level = 0;
  };
})(window);
