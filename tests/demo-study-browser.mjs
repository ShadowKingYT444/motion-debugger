// Real-output QA for a browser-capable machine; no fake pixels or app-specific repairs.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import path from 'node:path';
import { ROOT } from '../scripts/demo-study.mjs';
const allowPartial = process.argv.includes('--allow-partial');
const forwarded = process.argv.slice(2).filter(x => x !== '--allow-partial');
const output = path.join(ROOT, 'artifacts/study-demo'); await mkdir(output, { recursive: true });
const child = spawn(process.execPath, [path.join(ROOT, 'scripts/demo-study.mjs'), '--reuse-builds', '--port', '0', ...forwarded], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '', browser, session, report = { scope: 'Viewer loading, navigation and real saved page smoke checks; not a motion-quality or agent benchmark', checks: [], errors: [] };
child.stderr.on('data', data => { log += String(data); process.stderr.write(data); });
try {
  session = await new Promise((resolve, reject) => {
    let buffer = ''; const timer = setTimeout(() => reject(Error('Launcher did not become ready within 13 minutes')), 780000);
    child.stdout.on('data', data => {
      process.stdout.write(data); log += String(data); buffer += String(data);
      const line = buffer.split('\n').find(x => x.startsWith('STUDY_DEMO_READY '));
      if (line) { try { const parsed = JSON.parse(line.slice('STUDY_DEMO_READY '.length)); clearTimeout(timer); resolve(parsed); } catch {} }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(Error(`Launcher exited before readiness: ${code}`)); });
  });
  report.snapshots = session.snapshots;
  if (!allowPartial) assert.equal(session.snapshots.filter(x => x.status === 'ready').length, 4, 'All four genuine snapshots must build; --allow-partial explicitly permits missing stages');
  assert.equal(session.snapshots.filter(x => x.status === 'failed').length, 0, 'Failed builds are never accepted as a successful smoke test');
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', recordVideo: { dir: output, size: { width: 1280, height: 800 } } });
  const permitted = new Set([session.origin, ...session.snapshots.filter(x => x.origin).map(x => x.origin)]), networkBlocked = [];
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (permitted.has(url.origin) || ['data:', 'blob:'].includes(url.protocol)) return route.continue(); networkBlocked.push(url.origin + url.pathname); return route.abort(); });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(session.origin, { waitUntil: 'networkidle' });
  await page.getByText('One brief. Two independent builds.').waitFor();
  await page.getByText('Normal-motion comparison: inconclusive.', { exact: true }).waitFor();
  const evidence = await (await page.request.get(session.origin + '/api/study')).json();
  assert.equal(evidence.recordings.filter(x => x.available).length, 4, 'All four frozen recordings must match their provenance');
  for (const arm of ['baseline', 'treatment']) {
    const panel = page.locator(`[data-arm="${arm}"]`);
    for (const stage of ['initial', 'final']) {
      await panel.locator(`input[value="${stage}"]`).check();
      const item = session.snapshots.find(x => x.arm === arm && x.stage === stage);
      const recording = evidence.recordings.find(x => x.id === arm + '-' + stage);
      const video = panel.locator('video');
      assert.equal(await video.getAttribute('src'), recording.url);
      assert.match(await video.getAttribute('aria-label'), new RegExp(stage === 'initial' ? 'initial recording' : 'repaired recording'));
      assert.equal(await panel.locator('.recording-download').getAttribute('href'), recording.url);
      await panel.getByText('Source ' + recording.sourceCommit, { exact: false }).waitFor();
      await video.scrollIntoViewIfNeeded();
      await page.waitForFunction(selector => { const video = document.querySelector(selector); return video.readyState >= 2 && video.duration > 0; }, `[data-arm="${arm}"] video`, { timeout: 15000 });
      await video.evaluate(async node => { node.muted = true; await node.play(); });
      await page.waitForFunction(selector => document.querySelector(selector).currentTime > 0.15, `[data-arm="${arm}"] video`, { timeout: 10000 });
      await video.evaluate(node => { node.pause(); node.currentTime = node.duration / 2; });
      await page.waitForFunction(selector => { const video = document.querySelector(selector); return !video.seeking && Math.abs(video.currentTime - video.duration / 2) < 0.1; }, `[data-arm="${arm}"] video`);
      report.checks.push({ arm, stage, recording: 'verified frozen MP4 decoded, played and sought; stage title, source commit and download checked' });
      if (item.status !== 'ready') {
        assert.equal(await panel.locator('iframe').count(), 0); await panel.getByText('No saved output for this stage').waitFor();
        report.checks.push({ arm, stage, status: 'unavailable explicitly displayed' }); continue;
      }
      const frame = panel.frameLocator('iframe'); await frame.locator('h1').waitFor({ state: 'visible' });
      assert.ok((await frame.locator('h1').innerText()).trim().length > 10);
      assert.equal(await panel.locator('iframe').getAttribute('src'), item.origin + '/');
      await frame.locator('canvas').first().waitFor({ state: 'visible', timeout: 15000 });
      assert.equal(await panel.locator('.open-app').getAttribute('href'), item.origin + '/');
      await panel.locator('iframe').scrollIntoViewIfNeeded();
      await frame.locator('h1').evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await panel.locator('iframe').screenshot({ path: path.join(output, `${arm}-${stage}-live-frame.png`) });
      await page.screenshot({ path: path.join(output, `${arm}-${stage}-viewer.png`), fullPage: true });
      await panel.getByRole('button', { name: 'Reload', exact: true }).click(); await panel.frameLocator('iframe').locator('h1').waitFor();
      report.checks.push({ arm, stage, status: 'real heading, rendered canvas, correct distinct origin and reload checked' });
    }
  }
  for (const width of [1600, 960, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Viewer must not overflow at ${width}px`);
    for (const arm of ['baseline', 'treatment']) {
      const frame = page.locator(`[data-arm="${arm}"] iframe`);
      if (await frame.count()) { await frame.scrollIntoViewIfNeeded(); await frame.screenshot({ path: path.join(output, `${arm}-live-${width}.png`) }); }
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `viewer-${width}.png`), fullPage: true });
    for (const arm of ['baseline', 'treatment']) assert.equal(await page.locator(`[data-arm="${arm}"] video`).evaluate(video => video.clientWidth <= video.parentElement.clientWidth), true, 'Video fits the arm at every viewport');
    report.checks.push({ viewport: width, status: 'viewer horizontal overflow checked; actual screenshot saved for human review' });
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  for (const arm of ['baseline', 'treatment']) await page.locator(`[data-arm="${arm}"] input[value="initial"]`).check();
  await page.getByRole('button', { name: 'Reload both pages' }).focus();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'replay-all');
  await page.keyboard.press('Enter');
  for (const arm of ['baseline', 'treatment']) await page.locator(`[data-arm="${arm}"]`).frameLocator('iframe').locator('h1').waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'One brief. Two independent builds.' }).waitFor();
  assert.equal(networkBlocked.length, 0, 'No CDN/model/external app network requests expected');
  assert.deepEqual(report.errors, [], 'No uncaught app/viewer errors expected');
  report.checks.push({ status: 'keyboard reload, repeated stage switches, reduced-motion navigation and credential-free network scope checked' });
  await context.close();
  report.viewerVideo = path.relative(ROOT, await page.video().path());
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.failure = String(error); process.exitCode = 1; console.error(error); }
finally {
  await browser?.close();
  if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
  await writeFile(path.join(output, 'launcher.log'), log);
  await writeFile(path.join(output, 'viewer-checks.json'), JSON.stringify(report, null, 2));
  console.log(`Browser report: ${path.relative(ROOT, output)}/viewer-checks.json (${report.status})`);
}
