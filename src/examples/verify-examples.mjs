/** Inspect the original example UI. Temporal-contract verification lives in the core E2E suite. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin = process.env.BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.QA_OUTPUT || 'artifacts/qa/examples';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks = [], errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const check = (label, passed, detail = '') => { checks.push({ label, passed, detail }); assert(passed, `${label}: ${detail}`); };
async function screenshot(name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }); }
async function reflow(width, height, name) {
  await page.setViewportSize({ width, height });
  await page.goto(`${origin}/examples?scenario=drawer&mode=fixed`);
  await page.getByRole('heading', { name: 'Good motion lives between the frames.' }).waitFor();
  const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
  check(`${name}: no horizontal page overflow`, size.width <= size.viewport + 1, JSON.stringify(size));
  await screenshot(name);
}
try {
  for (const [width, height, name] of [[1440,1100,'desktop-1440'],[1024,1000,'intermediate-1024'],[390,1000,'mobile-390'],[320,1000,'narrow-320']]) await reflow(width, height, name);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${origin}/examples?scenario=drawer&mode=fixed`);
  await page.getByRole('button', { name: 'Take a closer look' }).click();
  await page.waitForTimeout(180);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(110);
  await page.getByRole('button', { name: 'Take a closer look' }).click();
  await page.waitForTimeout(1000);
  check('Drawer finishes open after actual interrupted inputs', await page.locator('#product-drawer').getAttribute('data-state') === 'open');
  await screenshot('drawer-open');
  await page.getByRole('tab', { name: 'Reveal live data' }).click();
  let responseCount = 0;
  page.on('response', response => { if (response.url().includes('/api/fixture-data') && response.status() === 200) responseCount++; });
  await page.getByRole('button', { name: 'Reveal the materials' }).click();
  await page.waitForFunction(() => document.getElementById('reveal-card')?.dataset.state === 'ready');
  check('Reveal uses a real local API response', responseCount === 1, `${responseCount} HTTP 200 responses`);
  check('Repaired reveal reserves 410px', await page.locator('#reveal-card').evaluate(node => Math.abs(node.getBoundingClientRect().height - 410) < .5));
  await page.waitForTimeout(1000); await screenshot('reveal-ready');
  await page.getByRole('tab', { name: 'Follow the cursor' }).click();
  await page.locator('#gaze-left').hover(); await page.waitForTimeout(90);
  await page.locator('#gaze-right').hover(); await page.waitForTimeout(90);
  await page.locator('#gaze-left').hover(); await page.waitForTimeout(700);
  check('Original pupil is interactive', await page.locator('#buddy-pupil').evaluate(node => getComputedStyle(node).transform !== 'none'));
  await screenshot('cursor-attentive');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#gaze-right').hover(); await page.waitForTimeout(80);
  check('Repaired gaze honors reduced motion', await page.locator('#buddy-pupil').evaluate(node => node.getAnimations().every(animation => animation.playState !== 'running')));
  await page.getByRole('tab', { name: 'Follow the cursor' }).focus(); await page.keyboard.press('ArrowLeft');
  check('Tabs support keyboard navigation', await page.getByRole('tab', { name: 'Reveal live data' }).getAttribute('aria-selected') === 'true');
  check('No uncaught example page errors', errors.length === 0, errors.join('; '));
} finally {
  await writeFile(`${output}/ui-checks.json`, JSON.stringify({ checks, errors, screenshotsRequireHumanVisualReview: true, scope: 'Example UI only; actual temporal contracts are evaluated by the core capture suite.' }, null, 2));
  await context.close(); await browser.close();
}
console.log(JSON.stringify({ checks: checks.length, passed: checks.every(item => item.passed), screenshots: output }, null, 2));
