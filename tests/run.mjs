// Greenhollow test suite: runs the built game (dist/index.html) in headless Chromium.
//
//   npm test                  build, type-check, then run every test
//   node tests/run.mjs        run the tests against the current dist/index.html
//   node tests/run.mjs food   run only tests whose name contains "food"
//
// Every run uses fixed seeds, so results are repeatable: a test that starts failing means the
// game's behaviour changed, not bad luck.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, openGame, simulate, summary } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(root, 'dist', 'index.html');
const DAY = 1440;
const filter = process.argv[2] || '';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
class Fail extends Error {}
const check = (ok, msg) => { if (!ok) throw new Fail(msg); };

/** Wrap game functions to count deaths by cause, grain-dole handouts and grain ships. */
async function instrument(page) {
  await page.evaluate(() => {
    const t = window.__tally = { deaths: [], dole: 0, ships: 0 };
    const die0 = die; die = function (n, cause) { t.deaths.push({ name: nameOf(n), age: n.age, cause, day: Math.floor(game.time / 1440) + 1 }); return die0.apply(this, arguments); };
    const emit0 = lfEmit; lfEmit = function (kind) { if (kind === 'dole') t.dole++; return emit0.apply(this, arguments); };
    const ship0 = lf2GrainShip; lf2GrainShip = function () { const before = town.treasury; const r = ship0.apply(this, arguments); if (town.treasury < before) t.ships++; return r; };
  });
}
const tally = page => page.evaluate(() => window.__tally);

/* ---------------------------------------------------------------------------------------------- */

test('loads, builds a town and runs a day without errors', async browser => {
  const { page, errors } = await openGame(browser, GAME, { rng: 11, town: 'smoke' });
  const s0 = await summary(page);
  check(s0.population >= 8, `expected a populated town, got ${s0.population} villagers`);
  await simulate(page, DAY);
  const s1 = await summary(page);
  check(s1.day === 2, `expected day 2 after one day, got day ${s1.day}`);
  check(errors.length === 0, 'page errors:\n    ' + errors.slice(0, 5).join('\n    '));
  await page.close();
  return `${s0.population} villagers`;
});

test('renders the map and panels without errors', async browser => {
  const { page, errors } = await openGame(browser, GAME, { rng: 12, town: 'render' });
  await simulate(page, 8 * 60);
  const lit = await page.evaluate(() => {
    for (let i = 0; i < 30; i++) { window.__advance(16); render(performance.now(), 0.016, (game.time % 1440) / 60); }
    updateUI(true);
    const c = document.getElementById('c'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
    return lit / (d.length / (4 * 97));
  });
  check(lit > 0.2, `the map looks blank: only ${(lit * 100).toFixed(0)}% of sampled pixels are lit`);
  for (const tab of ['chron', 'cal', 'chat', 'town', 'people']) await page.click(`[data-tab="${tab}"]`);
  check(errors.length === 0, 'page errors:\n    ' + errors.slice(0, 5).join('\n    '));
  await page.close();
  return `${(lit * 100).toFixed(0)}% of the map lit`;
});

// The starvation bug from v147: new tradespeople ate food only the original families grew.
for (const [rng, name] of [[21, 'survival-a'], [22, 'survival-b'], [23, 'survival-c']]) {
  test(`food: nobody starves in 12 days (${name})`, async browser => {
    const { page, errors } = await openGame(browser, GAME, { rng, town: name });
    await instrument(page);
    const s0 = await summary(page);
    for (let d = 0; d < 12; d++) await simulate(page, DAY);
    const s1 = await summary(page), t = await tally(page);
    const hunger = t.deaths.filter(d => d.cause === 'hunger');
    check(errors.length === 0, 'page errors:\n    ' + errors.slice(0, 5).join('\n    '));
    check(hunger.length === 0, `${hunger.length} starved: ` + hunger.map(d => `${d.name} (day ${d.day})`).join(', '));
    await page.close();
    const other = t.deaths.length ? `, ${t.deaths.length} died (${t.deaths.map(d => d.cause).join(', ')})` : '';
    return `pop ${s0.population} -> ${s1.population}${other}; dole handed out ${t.dole}x, grain ships ${t.ships}`;
  });
}

test('speed: one game-day of simulation stays fast', async browser => {
  const { page } = await openGame(browser, GAME, { rng: 31, town: 'speed' });
  await simulate(page, 60);
  const t0 = performance.now(); await simulate(page, 2 * DAY); const perDay = (performance.now() - t0) / 2000;
  check(perDay < 3, `a game-day took ${perDay.toFixed(2)} s to simulate (limit 3 s; v148 took about 0.75 s)`);
  await page.close();
  return `${perDay.toFixed(2)} s per game-day`;
});

/* ---------------------------------------------------------------------------------------------- */

const browser = await launch();
let failed = 0;
const chosen = tests.filter(t => t.name.includes(filter));
console.log(`Greenhollow tests: ${chosen.length} of ${tests.length}\n`);
for (const t of chosen) {
  const t0 = Date.now();
  try {
    const note = await t.fn(browser);
    console.log(`  ok    ${t.name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)${note ? '\n          ' + note : ''}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${t.name}\n          ${e instanceof Fail ? e.message : e.stack}`);
  }
}
await browser.close();
console.log(`\n${chosen.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
