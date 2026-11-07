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
/* ---------------------------------------------------------------------------------------------- */
// Controls: hold a key to change what walking into something does (see src/life2/controls.ts).
// The harness takes control of a villager, drops them on open ground next to another villager or a crate,
// and presses real keys; the sim is stepped by hand.

async function controlScene(name, rng, fn) {
  return async browser => {
    const { page, errors } = await openGame(browser, GAME, { rng, town: 'controls' });
    await simulate(page, 9 * 60 + 30);
    await page.evaluate(() => {
      if (!game.player) startPlaying(byId(game.steer) || npcs.find(canControl));
      window.__emitted = []; const e0 = lfEmit; lfEmit = function (kind) { window.__emitted.push(kind); return e0.apply(this, arguments); };
      // helpers used by the scenes below
      window.__place = (n, x, y, face) => { n.tx = x; n.ty = y; n.x = x; n.y = y; n.path = []; n.moving = false; if (face) n.face = face; if (n.player) { n.player.keys = {}; n.player.act = null; n.player.lock = false; n.player.sleeping = false; } };
      window.__free = (x, y) => walkable(x, y) && !tileOwner.get(tkey(x, y)) && !lfPropAt(x, y) && grid[y][x] !== T.DOOR && roomAt[y][x] < 0 && grid[y][x] !== T.CROP;
      window.__find = pred => { for (let t = 0; t < 20000; t++) { const x = 6 + Math.floor(Math.random() * (W - 12)), y = 6 + Math.floor(Math.random() * (H - 12)); if (pred(x, y)) return [x, y]; } throw new Error('no suitable ground'); };
      window.__other = () => npcs.find(q => q !== game.player && !q.dead && !q.infant && q.age >= 18 && !q.player);
      window.__stand = (o, x, y, pose = 'stand') => { window.__place(o, x, y); o.pose = pose; o.plan = null; o.si = 0; rebuildOcc(); return o; };
    });
    const r = await fn(page);
    check(errors.length === 0, 'page errors:\n    ' + errors.slice(0, 5).join('\n    '));
    await page.close();
    return r;
  };
}
const held = async (page, keys, minutes, dirKey = 'd') => { for (const k of keys) await page.keyboard.down(k); await page.keyboard.down(dirKey); await simulate(page, minutes); await page.keyboard.up(dirKey); for (const k of keys.slice().reverse()) await page.keyboard.up(k); };

test('controls: Space pushes a person along like a barrel, with no crime or gossip', await controlScene('push', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2, 3, 4, 5].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); window.__o = __stand(__other(), x + 1, y); return { x, y, ox: x + 1 }; });
  await held(page, ['Space'], 3);
  const e = await page.evaluate(() => ({ me: game.player.tx, them: window.__o.tx, emitted: window.__emitted.slice() }));
  check(e.emitted.length === 0, 'pushing someone must not create events, got: ' + e.emitted.join(', '));
  check(e.me > s.x + 1, `the player should have walked on behind them (x ${s.x} -> ${e.me})`);
  check(e.them > s.ox, `they should have been pushed east of x=${s.ox}, now ${e.them}`);
  return `player ${s.x} -> ${e.me}, villager ${s.ox} -> ${e.them}, no events`;
}));

test('controls: Space against a wall swaps places instead of getting stuck', await controlScene('swap', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => __free(x, y) && __free(x + 1, y) && !walkable(x + 2, y) && grid[y][x + 2] !== T.TREE); const n = game.player; __place(n, x, y, { dx: 1, dy: 0 }); __stand(__other(), x + 1, y); return { x, y }; });
  await held(page, ['Space'], 2);
  const e = await page.evaluate(() => ({ me: game.player.tx, emitted: window.__emitted.slice(), them: npcs.filter(q => q !== game.player && q.tx === game.player.tx - 1 && q.ty === game.player.ty).length }));
  check(e.me === s.x + 1, `the player should have changed places (x ${s.x} -> ${e.me})`);
  check(e.them === 1, 'the villager should now stand where the player was');
  check(e.emitted.length === 0, 'swapping must not create events, got: ' + e.emitted.join(', '));
  return 'changed places, no events';
}));

test('controls: without a key, walking into someone still talks', await controlScene('talk', 41, async page => {
  await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); __stand(__other(), x + 1, y); });
  await held(page, [], 1);
  const act = await page.evaluate(() => game.player.player.act && game.player.player.act.text);
  check(/^Talking to/.test(act || ''), 'expected "Talking to ...", got ' + JSON.stringify(act));
  return act;
}));

test('controls: Shift sneaks (pickpocket), R is the hostile shove with consequences', await controlScene('hostile', 41, async page => {
  const setup = () => page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); __stand(__other(), x + 1, y); window.__emitted.length = 0; });
  await setup(); await held(page, ['Shift'], 1);
  const a1 = await page.evaluate(() => game.player.player.act && game.player.player.act.text);
  check(/^Reaching into/.test(a1 || ''), 'Shift should start a pickpocket, got ' + JSON.stringify(a1));
  await page.evaluate(() => { game.player.player.act = null; });
  await setup(); await held(page, ['r'], 3);
  const ev = await page.evaluate(() => window.__emitted.slice());
  check(ev.includes('shove'), 'R should be the hostile shove and emit a shove event, got: ' + JSON.stringify(ev));
  return 'Shift: ' + a1 + '; R emitted ' + ev.join(', ');
}));

test('controls: a sleeping person is not pushed around', await controlScene('sleeper', 41, async page => {
  const r = await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2, 3].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); window.__o = __stand(__other(), x + 1, y, 'sleep'); return { ox: x + 1 }; });
  await held(page, ['Space'], 2);
  const e = await page.evaluate(() => ({ them: window.__o.tx, me: game.player.tx, emitted: window.__emitted.slice() }));
  check(e.them === r.ox, 'a sleeper must stay put (x ' + r.ox + ' -> ' + e.them + ')');
  check(e.emitted.length === 0, 'got events: ' + e.emitted.join(', '));
  return 'stayed asleep, no events';
}));

test('controls: Space pushes a crate and stepping back pulls it', await controlScene('crate', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2, 3, 4, 5].every(i => __free(x + i, y))); const pr = town.props.find(Boolean); town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = x + 1; pr.y = y; town.pblock[y * W + x + 1] = 1; town.propAt.set(y * W + x + 1, pr); __place(game.player, x, y, { dx: 1, dy: 0 }); window.__pr = pr; return { x, y }; });
  await held(page, ['Space'], 2);
  const pushed = await page.evaluate(() => ({ pr: window.__pr.x, me: game.player.tx }));
  check(pushed.pr > s.x + 1, `the crate should have moved east (x ${s.x + 1} -> ${pushed.pr})`);
  await held(page, ['Space'], 3, 'a');
  const pulled = await page.evaluate(() => ({ pr: window.__pr.x, me: game.player.tx }));
  check(pulled.pr < pushed.pr, `stepping back with Space should pull the crate after you (x ${pushed.pr} -> ${pulled.pr})`);
  return `crate ${s.x + 1} -> ${pushed.pr} (pushed) -> ${pulled.pr} (pulled)`;
}));


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
