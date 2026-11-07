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

/* ---------------------------------------------------------------------------------------------- */
// Conversation (src/dialogue/conversation.ts): people talk about what they are doing, you get at most two replies,
// and tone (hold E kind, Shift sly, R harsh) is how you say it.

async function talkScene(rng, fn) {
  return async browser => {
    const { page, errors } = await openGame(browser, GAME, { rng, town: 'talk' });
    await simulate(page, 3 * 1440 + 10 * 60);
    await page.evaluate(() => {
      if (!game.player) startPlaying(byId(game.steer) || npcs.find(canControl)); document.getElementById('c').focus();
      window.__em = []; const e0 = lfEmit; lfEmit = function (k, o) { window.__em.push(k + (o && o.fake ? '(fake)' : '')); return e0.apply(this, arguments); };
      window.__box = () => { const t = document.getElementById('talk'); if (!t || t.hidden) return null; return { name: t.querySelector('.nm b').innerText, say: t.querySelector('.ta').innerText, q: (t.querySelector('.tq') || {}).innerText || '', opts: [...t.querySelectorAll('[data-k]')].map(b => b.innerText.replace(/^\d+\s*/, '').trim()) }; };
      window.__friend = (o, aff = 40) => { o.aff[game.player.id] = aff; o.know[game.player.id] = Math.max(o.know[game.player.id] || 0, 40); return o; };
    });
    const r = await fn(page);
    check(errors.length === 0, 'page errors:\n    ' + errors.slice(0, 5).join('\n    '));
    await page.close();
    return r;
  };
}
const GENERIC = /^(Hello\.|Yes\?|What is it\?|Mm\?|Oh, hello [A-Za-z]+\.|Hm\? I am working\.|Busy, but go on\.|Make it quick\.)$/;

test('talk: people open with what they are doing, with at most two replies', await talkScene(41, async page => {
  const rows = await page.evaluate(() => { const out = []; for (const o of npcs.filter(q => q !== game.player && !q.dead && q.age >= 8 && q.pose !== 'sleep')) { openTalk(o); const b = __box(); if (b) out.push({ who: o.first, status: o.status, say: b.say, opts: b.opts }); if (talkUI.o) closeTalk(); } return out; });
  check(rows.length >= 8, 'expected to talk to at least 8 villagers, got ' + rows.length);
  const generic = rows.filter(r => GENERIC.test(r.say)); check(generic.length === 0, 'bare greetings: ' + generic.map(r => `${r.who}: "${r.say}"`).join('; '));
  const many = rows.filter(r => r.opts.length > 3); check(many.length === 0, 'more than two replies: ' + many.map(r => r.who + ' ' + r.opts.join('|')).join('; '));
  const more = rows.filter(r => r.opts.some(o => /Something else/.test(o))); check(more.length === 0, 'the old "Something else…" is back');
  const distinct = new Set(rows.map(r => r.say)).size; check(distinct >= rows.length * 0.6, `lines are too samey: ${distinct} different out of ${rows.length}`);
  return `${rows.length} villagers, ${distinct} different openings; e.g. ${rows[0].who} (${rows[0].status}): "${rows[0].say}"`;
}));

test('talk: someone in the privy has nothing to say but goodbye', await talkScene(41, async page => {
  const b = await page.evaluate(() => { const o = npcs.find(q => q !== game.player && !q.dead && q.age >= 18 && q.pose !== 'sleep'); o.status = 'Using the privy'; openTalk(o); const b = __box(); closeTalk(); return b; });
  check(b && b.opts.length === 1 && /Goodbye/.test(b.opts[0]), 'expected only Goodbye, got ' + JSON.stringify(b));
  return `"${b.say}" then Goodbye`;
}));

test('talk: holding E, Shift or R changes what you would say', await talkScene(41, async page => {
  await page.evaluate(() => { const o = __friend(npcs.find(q => q.job === 'Farmer' && q !== game.player && q.age > 20)); o.status = 'Ploughing the field'; openTalk(o); });
  const seen = {}; seen.honest = (await page.evaluate(() => __box())).opts[0];
  for (const [tone, key] of [['kind', 'e'], ['sly', 'Shift'], ['harsh', 'r']]) { await page.keyboard.down(key); seen[tone] = (await page.evaluate(() => __box())).opts[0]; await page.keyboard.up(key); }
  const back = (await page.evaluate(() => __box())).opts[0];
  check(new Set(Object.values(seen)).size === 4, 'the four tones should each read differently: ' + JSON.stringify(seen));
  check(back === seen.honest, 'releasing the key should restore the honest line');
  await page.evaluate(() => closeTalk());
  return Object.entries(seen).map(([k, v]) => `${k}: "${v}"`).join(' · ');
}));

test('talk: kind raises their opinion of you; harsh insults them and ends the talk', await talkScene(41, async page => {
  const pickTone = async (key, aff) => {
    await page.evaluate(aff => { const o = __friend(npcs.find(q => q.job === 'Farmer' && q !== game.player && q.age > 20), aff); window.__o = o; o.status = 'Ploughing the field'; __em.length = 0; openTalk(o); }, aff);
    const before = await page.evaluate(() => Math.round(__o.aff[game.player.id]));
    await page.keyboard.down(key); await page.keyboard.press('1'); await page.keyboard.up(key);
    const r = await page.evaluate(() => ({ aff: Math.round(__o.aff[game.player.id]), em: __em.slice(), box: __box() })); await page.evaluate(() => { if (talkUI.o) closeTalk(); }); return { before, ...r };
  };
  const kind = await pickTone('e', 40); check(kind.aff > kind.before, `kind should raise their opinion (${kind.before} -> ${kind.aff})`);
  const harsh = await pickTone('r', 40); check(harsh.aff < harsh.before, `harsh should lower it (${harsh.before} -> ${harsh.aff})`);
  check(harsh.em.includes('insult'), 'harsh should be an insult event, got ' + JSON.stringify(harsh.em)); check(harsh.box && harsh.box.opts.length === 1, 'after an insult only Goodbye is left');
  return `kind ${kind.before} -> ${kind.aff}; harsh ${harsh.before} -> ${harsh.aff}, events ${harsh.em.join(',')}`;
}));

test('talk: a sly word about somebody plants a rumour, but only if they believe you', await talkScene(41, async page => {
  const run = async aff => {
    await page.evaluate(aff => { window.convOpen = c => { const L = CV_LIFE.find(x => x.id === 'folk'); c.q = convPerson(c); return { say: pk(L.say, c), replies: L.r(c) }; };
      const o = __friend(npcs.find(q => q.job === 'Farmer' && q !== game.player && q.age > 20), aff); for (const q of npcs) if (q !== o) o.know[q.id] = Math.max(o.know[q.id] || 0, 30); __em.length = 0; openTalk(o); }, aff);
    await page.keyboard.down('Shift'); await page.keyboard.press('1'); await page.keyboard.up('Shift');
    const em = await page.evaluate(() => __em.slice()); await page.evaluate(() => { if (talkUI.o) closeTalk(); }); return em;
  };
  let planted = 0; for (let i = 0; i < 12; i++) if ((await run(95)).includes('rumour(fake)')) planted++;
  check(planted >= 6, `a friend who trusts you should usually believe it (planted ${planted} of 12)`);
  let planted2 = 0; for (let i = 0; i < 12; i++) if ((await run(-30)).includes('rumour(fake)')) planted2++;
  check(planted2 < planted, `someone who does not trust you should believe it less (${planted2} vs ${planted})`);
  return `trusting friend: ${planted}/12 rumours; distrustful: ${planted2}/12`;
}));

test('talk: when the watch is after you, the guard brings it up and the arrest follows', await talkScene(41, async page => {
  const r = await page.evaluate(() => { const g = npcs.find(q => q.job === 'Guard' && q !== game.player); const ev = lfEmit('theft', { actor: game.player, target: g, sev: 1, tags: ['theft', 'crime'], chron: false, text: 'somebody helped themself to a purse' }); lf2Want(game.player, ev, 1); g.status = 'Heading for the square'; openTalk(g); return __box(); });
  check(r && /About that business/.test(r.opts[0]), 'the guard should bring it up, got ' + JSON.stringify(r));
  await page.keyboard.press('1'); await page.waitForTimeout(100);
  const b = await page.evaluate(() => __box()); check(b && b.opts.length >= 2, 'expected the arrest choices, got ' + JSON.stringify(b));
  return `"${r.say}" -> ${b.opts.join(' | ')}`;
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
