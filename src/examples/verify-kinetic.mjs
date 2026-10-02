/** Real browser + continuous video verification of the original articulated courier rig. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin = process.env.BASE_URL || 'http://127.0.0.1:4173';
const output = `${process.env.QA_OUTPUT || 'artifacts/qa/examples'}/kinetic`;
await mkdir(`${output}/videos`, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks = [], errors = [], traces = [], frames = [];
const check = (label, passed, detail = '') => { checks.push({ label, passed, detail }); assert(passed, `${label}: ${detail}`); };
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference', recordVideo: { dir: `${output}/videos`, size: { width: 1440, height: 1100 } } });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
async function shot(name, fullPage = false) {
  const time = () => page.evaluate(() => ({ clock: performance.now(), time: Number(document.querySelector('.kinetic-scene')?.dataset.timeMs || 0), phase: document.querySelector('.motion-phase')?.textContent, sceneRect: (() => { const r = document.querySelector('.kinetic-scene')?.getBoundingClientRect(); return r ? { x:r.x, y:r.y, width:r.width, height:r.height } : null; })() }));
  const before = await time();
  await page.screenshot({ path: `${output}/${name}.png`, fullPage });
  frames.push({ file: `${name}.png`, before, after: await time() });
}
async function open(width = 1440) {
  await page.setViewportSize({ width, height: 1100 });
  await page.goto(`${origin}/examples?scenario=kinetic&mode=fixed&autoplay=0`);
  await page.locator('#courier-target').waitFor();
  await page.waitForTimeout(100);
}
async function recordTrace() {
  await page.evaluate(() => {
    window.__courierTrace = { samples: [], done: false };
    let pending = 0, raf = 0, generation = 0;
    const sample = frameClock => {
      const token = ++generation;
      clearTimeout(pending);
      pending = setTimeout(() => {
      if (token !== generation) return;
      const stage = document.querySelector('.kinetic-scene');
      const time = Number(stage.dataset.timeMs);
      const pose = lane => {
        const rig = document.querySelector(`.courier-lane.${lane} [data-motion-id="courier"]`);
        const box = rig.getBoundingClientRect(), inner = rig.firstElementChild;
        return { x: box.x, y: box.y, transform: rig.getAttribute('transform'), tilt: inner.getAttribute('transform'), antenna: inner.children[3].getAttribute('transform'), state: rig.dataset.state };
      };
      window.__courierTrace.samples.push({ clock: frameClock, observedAt: performance.now(), time, baseline: pose('baseline'), fixed: pose('fixed') });
      if (time >= 4200) { window.__courierTrace.done = true; cancelAnimationFrame(raf); }
      }, 0);
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
  });
  await page.locator('#courier-replay').click();
  for (const [time, name] of [[130,'anticipation'],[620,'flight'],[1120,'redirect'],[2600,'landing'],[4150,'settled']]) {
    await page.waitForFunction(t => Number(document.querySelector('.kinetic-scene').dataset.timeMs) >= t, time);
    await shot(`frame-${name}-${await page.evaluate(() => innerWidth)}`);
  }
  await page.waitForFunction(() => window.__courierTrace.done, undefined, { timeout: 12000 });
  const trace = await page.evaluate(() => window.__courierTrace.samples);
  const running = trace.filter(s => s.time >= 230 && s.time < 3900);
  const metrics = variant => {
    const deltas = running.slice(1).map((s, index) => Math.hypot(s[variant].x - running[index][variant].x, s[variant].y - running[index][variant].y) * (1000 / 60) / Math.max(1, s.clock - running[index].clock));
    return { rangeX: Math.max(...running.map(s => s[variant].x)) - Math.min(...running.map(s => s[variant].x)), maxStepAt60Hz: Math.max(...deltas), tiltPoses: new Set(running.map(s => s[variant].tilt)).size, antennaPoses: new Set(running.map(s => s[variant].antenna)).size };
  };
  const baseline = metrics('baseline'), fixed = metrics('fixed'), width = await page.evaluate(() => innerWidth);
  // Keep failed-run evidence too; assertions must never discard the trace that explains a failure.
  traces.push({ width, clock: 'Associated RAF frame timestamp; geometry observed in a post-RAF task after animation callbacks', metrics: { baseline, fixed }, samples: trace });
  check(`${width}: substantial travel visible in actual frames`, fixed.rangeX > (width < 760 ? 140 : 210), JSON.stringify(fixed));
  check(`${width}: seeded redirect causes measurable transient discontinuity`, baseline.maxStepAt60Hz > (width < 760 ? 50 : 90), JSON.stringify(baseline));
  check(`${width}: repaired rig preserves a bounded continuous trajectory`, fixed.maxStepAt60Hz < 40, JSON.stringify(fixed));
  check(`${width}: secondary articulated motion is genuinely animated`, fixed.tiltPoses > 30 && fixed.antennaPoses > 30, JSON.stringify(fixed));
  const final = trace.at(-1);
  check(`${width}: both end in the same pose and delivered state`, final.baseline.transform === final.fixed.transform && final.baseline.state === 'delivered' && final.fixed.state === 'delivered', JSON.stringify(final));
}
try {
  await open();
  await recordTrace();
  check('Responsive heading preserves word spacing', (await page.locator('.kinetic-heading h2').innerText()).replace(/\s+/g, ' ').includes('plan. A world'));
  await page.locator('#courier-replay').click();
  await page.waitForFunction(() => Number(document.querySelector('.kinetic-scene').dataset.timeMs) >= 500);
  await page.locator('#courier-pause').focus(); await page.keyboard.press('Space');
  const pausedPose = await page.locator('#courier-target').getAttribute('transform');
  await page.waitForTimeout(250);
  check('Keyboard pause freezes the real rig', pausedPose === await page.locator('#courier-target').getAttribute('transform'));
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  check('Keyboard play resumes from preserved motion state', pausedPose !== await page.locator('#courier-target').getAttribute('transform'));
  await page.locator('#courier-redirect').click();
  await page.waitForFunction(() => document.getElementById('courier-target').dataset.state === 'redirected');
  check('Manual redirect has a real mid-flight effect', await page.locator('#courier-target').getAttribute('data-state') === 'redirected');
  for (const width of [1440,1024,390,320]) {
    await open(width);
    const geometry = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth, lanes: [...document.querySelectorAll('.courier-plane')].map(n => { const b = n.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width }; }) }));
    check(`${width}: responsive scene never overflows the viewport`, geometry.page <= width + 1 && geometry.lanes.every(lane => lane.left >= 0 && lane.right <= width + 1), JSON.stringify(geometry));
    check(`${width}: comparison rigs use equal artwork scale`, Math.abs(geometry.lanes[0].width - geometry.lanes[1].width) < 1, JSON.stringify(geometry.lanes));
    await shot(`layout-${width}`, true);
  }
  await open(390); await recordTrace();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${origin}/examples?scenario=kinetic&mode=fixed`);
  await page.locator('#courier-target').waitFor(); await page.waitForTimeout(150);
  const reducedStart = await page.locator('#courier-target').getAttribute('transform');
  await page.waitForTimeout(300);
  check('Reduced-motion preference prevents autoplay in both lanes', reducedStart === await page.locator('#courier-target').getAttribute('transform') && await page.locator('#courier-pause').getAttribute('aria-pressed') === 'true');
  await page.locator('#courier-replay').click(); await page.waitForTimeout(50);
  check('Reduced-motion action offers the equivalent final delivery', await page.locator('#courier-target').getAttribute('data-state') === 'delivered');
  await shot('reduced-motion-390', true);
  await page.getByRole('tab', { name: 'Redirect a courier' }).focus(); await page.keyboard.press('ArrowLeft');
  check('Four-example tabs wrap correctly with keyboard navigation', await page.getByRole('tab', { name: 'Follow the cursor' }).getAttribute('aria-selected') === 'true');
  check('No uncaught motion scene errors', errors.length === 0, errors.join('; '));
} finally {
  await writeFile(`${output}/frame-traces.json`, JSON.stringify(traces, null, 2));
  await writeFile(`${output}/frame-captures.json`, JSON.stringify(frames, null, 2));
  await writeFile(`${output}/motion-checks.json`, JSON.stringify({ checks, errors, evidence: 'Real elapsed-time RAF poses and continuous Playwright video; handcrafted repair, not an AI benchmark', screenshotsRequireHumanVisualReview: true }, null, 2));
  const video = page.video(); await context.close(); if (video) await video.saveAs(`${output}/courier-continuous.webm`); await browser.close();
}
console.log(JSON.stringify({ kineticChecks: checks.length, passed: checks.every(item => item.passed), evidence: output }, null, 2));
