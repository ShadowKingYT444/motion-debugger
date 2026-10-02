/** Browser-only UI verification. Populated screenshots always use a real completed capture.
 * Run after the capture service has produced evidence:
 * BASE_URL=http://127.0.0.1:4173 node src/dashboard/verify-dashboard.mjs
 * QA_OUTPUT defaults to artifacts/dashboard-qa. No capture results are manufactured here.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.QA_OUTPUT || 'artifacts/dashboard-qa';
await mkdir(output, { recursive: true });
const response = await fetch(`${baseURL}/api/runs`);
assert(response.ok, 'Capture service is reachable');
const { runs } = await response.json();
const selected = runs.find(run => run.status === 'complete');
assert(selected, 'A real completed capture exists before populated UI verification');
const report = await (await fetch(`${baseURL}/api/runs/${selected.id}`)).json();
assert(report.baseline?.samples.length > 0 && report.fixed?.samples.length > 0, 'Both captures contain actual samples');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks = [];
const pageErrors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'no-preference' });
const page = await context.newPage();
page.on('pageerror', error => pageErrors.push(error.message));
const url = `${baseURL}/evidence-v1?run=${selected.id}`;
const check = (name, passed, detail = '') => { checks.push({ name, passed, detail }); assert(passed, `${name}: ${detail}`); };
async function noOverflow(name) {
  const sizes = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, viewport: innerWidth }));
  check(name, sizes.body <= sizes.viewport + 1, JSON.stringify(sizes));
  await page.waitForFunction(() => [...document.querySelectorAll('.chart-view text')].every(label => {
    const matrix = label.getScreenCTM();
    return matrix && parseFloat(getComputedStyle(label).fontSize) * Math.hypot(matrix.c, matrix.d) >= 9.8;
  }), undefined, { timeout: 5000 });
  const labelSizes = await page.locator('.chart-view text').evaluateAll(labels => labels.map(label => {
    const matrix = label.getScreenCTM();
    const scale = matrix ? Math.hypot(matrix.c, matrix.d) : 0;
    return parseFloat(getComputedStyle(label).fontSize) * scale;
  }));
  check(`${name}: chart labels render at least 9.8px`, labelSizes.length > 0 && labelSizes.every(size => size >= 9.8), `min ${Math.min(...labelSizes).toFixed(2)}px`);
  const ticks = await page.locator('.chart-time-tick').evaluateAll(labels => labels.map(label => {
    const rect = label.getBoundingClientRect(); return { left: rect.left, right: rect.right };
  }));
  check(`${name}: time-axis labels do not overlap`, ticks.every((tick, index) => index === 0 || tick.left >= ticks[index - 1].right + 1), JSON.stringify(ticks));
}
async function screenshot(name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }); }
try {
  await page.goto(url);
  await page.getByRole('heading', { name: 'Synchronized replay' }).waitFor();
  check('Actual assertion count is displayed', await page.getByText(`${report.assertions.filter(item => item.passed).length}/${report.assertions.length} passed`, { exact: true }).isVisible());
  check('Both recorded media elements exist', await page.locator('video').count() === 2);
  await page.locator('video').first().waitFor({ state: 'visible' });
  await page.waitForFunction(() => [...document.querySelectorAll('video')].every(video => video.readyState >= 2));
  const initialTime = await page.getByRole('slider', { name: 'Replay time in milliseconds' }).inputValue();
  await page.getByRole('button', { name: 'Play synchronized replay', exact: true }).click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Pause synchronized replay', exact: true }).click();
  const laterTime = await page.getByRole('slider', { name: 'Replay time in milliseconds' }).inputValue();
  check('Synchronized playback advances time', Number(laterTime) > Number(initialTime));
  await page.getByRole('button', { name: 'Reset replay to input' }).click();
  check('Replay resets to click', Number(await page.getByRole('slider').inputValue()) === 0);
  await page.getByRole('slider').focus();
  await page.keyboard.press('ArrowRight');
  check('Keyboard can scrub replay', Number(await page.getByRole('slider').inputValue()) > 0);
  await page.getByRole('button', { name: 'Opacity', exact: true }).click();
  check('Opacity chart selected', await page.getByRole('button', { name: 'Opacity', exact: true }).getAttribute('aria-pressed') === 'true');
  await page.getByRole('button', { name: 'Position x', exact: true }).click();
  await page.getByRole('button', { name: 'Jump to interruption' }).click();
  check('Interruption selects cancellation event', (await page.locator('.event-inspector h3').innerText()) === report.baseline.events.find(event => event.type === 'animation-cancel').label);
  const seekTime = Number(await page.getByRole('slider').inputValue());
  const offsets = [report.baseline.media.videoOffsetMs, report.fixed.media.videoOffsetMs];
  await page.waitForFunction(({ time, offsets }) => [...document.querySelectorAll('video')].every((video, i) => Math.abs(video.currentTime - (time + offsets[i]) / 1000) < .15), { time: seekTime, offsets });
  check('Both videos seek to recorded click-relative offsets', true, `seek ${Math.round(seekTime)} ms; offsets ${offsets.join(' / ')} ms`);
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  check('Exact-event selector works', Number(await page.getByLabel('Select exact event').inputValue()) >= 0);
  await page.getByRole('button', { name: 'View source', exact: true }).click();
  await page.locator('.source-content').waitFor();
  check('Source view contains actual fixture', (await page.locator('.source-content').innerText()).includes('export function Fixture'));
  await page.getByRole('button', { name: 'Hide source', exact: true }).click();
  const targetSizes = await page.locator('.event-point').evaluateAll(buttons => buttons.map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  check('Event targets are at least 24 by 24', targetSizes.every(size => size.width >= 24 && size.height >= 24));
  await noOverflow('Desktop has no page overflow'); await screenshot('desktop-1440');
  await page.setViewportSize({ width: 1024, height: 900 }); await noOverflow('Intermediate has no page overflow'); await screenshot('intermediate-1024');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow('Mobile has no page overflow'); await screenshot('mobile-390');
  await page.setViewportSize({ width: 320, height: 800 }); await noOverflow('Narrow reflow has no page overflow'); await screenshot('narrow-320');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check('Reduced motion media query is respected', await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));

  // Isolated UI-state simulations. These are not motion evidence and are labeled separately.
  const statePage = await context.newPage();
  await statePage.route('**/api/runs', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ runs: [] }) }));
  await statePage.goto(`${baseURL}/evidence-v1`);
  await statePage.getByRole('heading', { name: 'Record the regression and its repair' }).waitFor();
  await statePage.screenshot({ path: `${output}/test-only-empty-state.png`, fullPage: true });
  check('Empty state has recording action', await statePage.getByRole('button', { name: 'Start first capture' }).isEnabled());
  await statePage.close();
  const errorPage = await context.newPage();
  let failOnce = true;
  await errorPage.route(`**/api/runs/${selected.id}`, route => {
    if (failOnce) { failOnce = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Test-only temporary connection failure' }) }); }
    return route.continue();
  });
  await errorPage.goto(url);
  await errorPage.getByRole('alert').waitFor();
  await errorPage.screenshot({ path: `${output}/test-only-error-state.png`, fullPage: true });
  await errorPage.getByRole('button', { name: 'Retry connection', exact: true }).click();
  await errorPage.getByRole('heading', { name: 'Synchronized replay' }).waitFor();
  check('Selected-run retry recovers', await errorPage.getByRole('heading', { name: 'Synchronized replay' }).isVisible());
  await errorPage.close();

  // Exercise the real asynchronous capture while preserving inspection of an older run.
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Record & verify', exact: true }).click();
  await page.getByRole('heading', { name: 'Recording broken and fixed variants' }).waitFor();
  const newRunId = new URL(page.url()).searchParams.get('run');
  check('Recording creates a new actual run', Boolean(newRunId && newRunId !== selected.id));
  await page.locator(`[data-run-id="${selected.id}"]`).click();
  await page.getByRole('heading', { name: 'Synchronized replay' }).waitFor();
  check('Previous run remains inspectable during capture', new URL(page.url()).searchParams.get('run') === selected.id);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Record & verify' && !button.disabled), undefined, { timeout: 45000 });
  const completed = await (await fetch(`${baseURL}/api/runs/${newRunId}`)).json();
  check('Background capture reaches complete while another run is selected', completed.status === 'complete', completed.error || completed.status);
  check('Record action re-enables after background completion', await page.getByRole('button', { name: 'Record & verify', exact: true }).isEnabled());
  check('UI-triggered run has passing measured assertions', completed.assertions.every(item => item.passed));
  check('No uncaught dashboard page errors', pageErrors.length === 0, pageErrors.join('; '));
} finally {
  await writeFile(`${output}/ui-checks.json`, JSON.stringify({ actualRunId: selected.id, checks, pageErrors, screenshotsRequireHumanVisualReview: true }, null, 2));
  await context.close(); await browser.close();
}
console.log(JSON.stringify({ actualRunId: selected.id, checks: checks.length, passed: checks.every(check => check.passed), screenshotDirectory: output }, null, 2));
