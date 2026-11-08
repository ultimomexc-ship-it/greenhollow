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
// Controls: the thing in your hand decides what walking into something does (see src/player/items.ts).
// The harness takes control of a villager, drops them on open ground next to another villager or a crate,
// and presses real keys; the sim is stepped by hand.

async function controlScene(name, rng, fn) {
  return async browser => {
    const { page, errors } = await openGame(browser, GAME, { rng, town: 'controls' });
    await simulate(page, 9 * 60 + 30);
    await page.evaluate(() => {
      if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl));
      window.__emitted = []; const e0 = lfEmit; lfEmit = function (kind) { window.__emitted.push(kind); return e0.apply(this, arguments); };
      // helpers used by the scenes below
      window.__place = (n, x, y, face) => { n.tx = x; n.ty = y; n.x = x; n.y = y; n.path = []; n.moving = false; if (face) n.face = face; if (n.player) { n.player.keys = {}; n.player.act = null; n.player.lock = false; n.player.sleeping = false; } };
      window.__free = (x, y) => walkable(x, y) && !(town.siteAt && town.siteAt[y * W + x]) && !tileOwner.get(tkey(x, y))   /* (not on a building site: finishing one moves people off it) */ && !lfPropAt(x, y) && grid[y][x] !== T.DOOR && roomAt[y][x] < 0 && grid[y][x] !== T.CROP;
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

test('controls: in Push mode walking into a person pushes them along like a barrel, with no crime or gossip', await controlScene('push', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2, 3, 4, 5].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); window.__o = __stand(__other(), x + 1, y); return { x, y, ox: x + 1 }; });
  await page.keyboard.press('q'); await held(page, [], 3);   // Talk -> Push
  const e = await page.evaluate(() => ({ me: game.player.tx, them: window.__o.tx, emitted: window.__emitted.slice(), mode: game.player.mode }));
  check(e.mode === 'push', 'Q should switch the hand to Push, got ' + e.mode);
  check(e.emitted.length === 0, 'pushing someone must not create events, got: ' + e.emitted.join(', '));
  check(e.me > s.x + 1, `the player should have walked on behind them (x ${s.x} -> ${e.me})`);
  check(e.them > s.ox, `they should have been pushed east of x=${s.ox}, now ${e.them}`);
  return `player ${s.x} -> ${e.me}, villager ${s.ox} -> ${e.them}, no events`;
}));

test('controls: in Push mode against a wall you swap places instead of getting stuck', await controlScene('swap', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => __free(x, y) && __free(x + 1, y) && !walkable(x + 2, y) && grid[y][x + 2] !== T.TREE); const n = game.player; __place(n, x, y, { dx: 1, dy: 0 }); __stand(__other(), x + 1, y); return { x, y }; });
  await page.keyboard.press('q'); await held(page, [], 2);
  const e = await page.evaluate(() => ({ me: game.player.tx, emitted: window.__emitted.slice(), them: npcs.filter(q => q !== game.player && q.tx === game.player.tx - 1 && q.ty === game.player.ty).length }));
  check(e.me === s.x + 1, `the player should have changed places (x ${s.x} -> ${e.me})`);
  check(e.them === 1, 'the villager should now stand where the player was');
  check(e.emitted.length === 0, 'swapping must not create events, got: ' + e.emitted.join(', '));
  return 'changed places, no events';
}));

test('controls: in Talk mode walking into someone talks (and does not push them)', await controlScene('talk', 41, async page => {
  await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); __stand(__other(), x + 1, y); });
  await held(page, [], 1);
  const act = await page.evaluate(() => game.player.player.act && game.player.player.act.text);
  check(/^Talking to/.test(act || ''), 'expected "Talking to ...", got ' + JSON.stringify(act));
  return act;
}));

test('controls: Q cycles Talk, Push, Search; 1-9 pick from the belt; Shift and the old keys do nothing; with a tool in hand you do not talk', await controlScene('keys', 41, async page => {
  await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); __stand(__other(), x + 1, y); window.__emitted.length = 0; });
  const st = () => page.evaluate(() => { const n = game.player; return { mode: n.mode, sel: n.sel, held: itHeld(n).kind, sneak: !!n.player.sneak, act: n.player.act && n.player.act.text, msg: n.player.msg, ev: window.__emitted.slice() }; });
  const seen = [(await st()).mode]; for (let i = 0; i < 3; i++) { await page.keyboard.press('q'); seen.push((await st()).mode); }
  check(seen.join(',') === 'talk,push,search,talk', 'Q should cycle Talk -> Push -> Search -> Talk, got ' + seen.join(' -> '));
  await page.keyboard.press('2'); const axe = await st(); check(axe.sel === 1 && axe.held === 'axe', 'key 2 should put the axe in hand: ' + JSON.stringify(axe));
  for (const k of ['Shift', 'Space', 'e', 'r', 'c', 'z']) await page.keyboard.press(k);
  const after = await st(); check(!after.sneak && after.ev.length === 0 && after.held === 'axe', 'Shift, Space, E, R, C and Z should do nothing: ' + JSON.stringify(after));
  await held(page, [], 1); const bump = await st();
  check(!/^Talking/.test(bump.act || '') && /press 1/.test(bump.msg || ''), 'with the axe in hand walking into someone should not talk, and should say how to: ' + JSON.stringify(bump));
  await page.keyboard.press('q'); const back = await st(); check(back.sel === 0 && back.held === 'hand', 'Q with a tool in hand should put the hand back: ' + JSON.stringify(back));
  return `Q: ${seen.join(' -> ')}; 2 = axe; old keys do nothing; "${bump.msg}"`;
}));

test('controls: a barrel or crate is pushed in Push mode and searched in Search mode', await controlScene('props', 41, async page => {
  const setup = () => page.evaluate(() => { const [x, y] = __find((x, y) => [-1, 0, 1, 2, 3, 4].every(i => __free(x + i, y))); const pr = town.props.find(Boolean); town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = x + 1; pr.y = y; town.pblock[y * W + x + 1] = 1; town.propAt.set(y * W + x + 1, pr); pr.loot = undefined; pr.lootDay = -9; __place(game.player, x, y, { dx: 1, dy: 0 }); game.player.player.act = null; game.player.player.lock = false; window.__pr = pr; return { x, y, kind: pr.kind }; });
  const s0 = await setup(); await held(page, [], 1); const talk = await page.evaluate(() => ({ pr: window.__pr.x, msg: game.player.player.msg }));
  check(talk.pr === s0.x + 1, 'in Talk mode a crate must not move');
  await page.keyboard.press('q'); const s = await setup(); await held(page, [], 2);
  const pushed = await page.evaluate(() => ({ pr: window.__pr.x, act: game.player.player.act && game.player.player.act.text }));
  check(pushed.pr > s.x + 1, `in Push mode the ${s.kind} should have been pushed east (x ${s.x + 1} -> ${pushed.pr})`);
  await page.keyboard.press('q'); const s2 = await setup(); await held(page, [], 1);
  const searched = await page.evaluate(() => ({ pr: window.__pr.x, act: game.player.player.act && game.player.player.act.text }));
  check(/^Searching/.test(searched.act || ''), 'in Search mode walking into it should search it, got ' + JSON.stringify(searched.act));
  check(searched.pr === s2.x + 1, 'searching must not move it');
  return `Talk: stays ("${talk.msg}"); Push: ${s.kind} ${s.x + 1} -> ${pushed.pr}; Search: ${searched.act}`;
}));

test('controls: a tree needs the axe in hand: with the hand you are told, with the axe you fell it', await controlScene('tree', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => __free(x, y) && grid[y][x + 1] === T.TREE && !wildTile(x + 1, y)); __place(game.player, x, y, { dx: 1, dy: 0 }); return { x, y }; });
  await held(page, [], 1); const hand = await page.evaluate(() => ({ act: game.player.player.act && game.player.player.act.text, msg: game.player.player.msg }));
  check(!hand.act && /axe/.test(hand.msg || ''), 'with an empty hand a tree should not be felled, and you should be told to hold the axe: ' + JSON.stringify(hand));
  await page.evaluate(() => { __place(game.player, game.player.tx, game.player.ty, { dx: 1, dy: 0 }); }); await page.keyboard.press('2'); await held(page, [], 1);
  const axe = await page.evaluate(() => ({ act: game.player.player.act && game.player.player.act.text }));
  check(/Felling|Clearing/.test(axe.act || ''), 'with the axe in hand walking into a tree should fell it, got ' + JSON.stringify(axe));
  return `hand: "${hand.msg}"; axe: ${axe.act}`;
}));

test('controls: the hoe ploughs a plot, seeds sow it, and each stage looks different', await controlScene('field', 41, async page => {
  const s = await page.evaluate(() => {
    const c = town.crops.find(c => !town.crops.some(o => o.x === c.x - 1 && o.y === c.y) && __free(c.x - 1, c.y)); if (!c) throw new Error('no field edge with free ground beside it'); c.pl = 0; c.st = 0;   // (reset: villagers may have got to it already)
    __place(game.player, c.x - 1, c.y, { dx: 1, dy: 0 }); window.__c = c; for (const o of town.crops) { o.claim = null; } rebuildOcc();
    const slot = k => game.player.belt.findIndex(r => r && (r === 's:' + k || (r[0] === 'i' && itById(game.player, +r.slice(1)).kind === k))) + 1;
    return { x: c.x, y: c.y, hoe: slot('hoe'), seed: slot('seed_barley'), seeds: game.player.bag.seed_barley };
  });
  const art = () => page.evaluate(() => { const c = window.__c; return ART.BYID[!c.pl ? 'crop_raw' : c.st ? 'crop_1' : 'crop_0'].id; });
  const before = await art(); await held(page, [], 2);
  const handOnly = await page.evaluate(() => ({ pl: window.__c.pl }));
  check(!handOnly.pl, 'with an empty hand walking onto a field should not plough it');
  await page.evaluate(() => { __place(game.player, window.__c.x - 1, window.__c.y, { dx: 1, dy: 0 }); }); await page.keyboard.press(String(s.hoe)); await held(page, [], 4);
  const ploughed = await page.evaluate(() => ({ pl: window.__c.pl, st: window.__c.st })); const mid = await art();
  await page.evaluate(() => { __place(game.player, window.__c.x - 1, window.__c.y, { dx: 1, dy: 0 }); }); await page.keyboard.press(String(s.seed)); await simulate(page, 1);   // (let go of the key for a beat: holding it after an action walks you on)
  await held(page, [], 12);
  const sown = await page.evaluate(() => { const c = window.__c; return { pl: c.pl, st: c.st, seed: c.seed, left: game.player.bag.seed_barley }; }); const after = await art();
  check(ploughed.pl && !ploughed.st, 'with the hoe, walking into untilled ground should plough that plot: ' + JSON.stringify(ploughed));
  check(sown.pl && sown.st && sown.seed === 'barley', 'with barley seed in hand, walking into a ploughed plot should sow barley: ' + JSON.stringify(sown));
  check(sown.left === s.seeds - 1, `sowing should use one seed (${s.seeds} -> ${sown.left})`);
  check(new Set([before, mid, after]).size === 3, `untilled, ploughed and sown plots should be drawn differently: ${before}, ${mid}, ${after}`);
  return `hoe (${s.hoe}) ploughs, barley (${s.seed}) sows, ${s.seeds} -> ${sown.left} seeds: ${before} -> ${mid} -> ${after}`;
}));

test('controls: a sleeping person is not pushed around', await controlScene('sleeper', 41, async page => {
  // the rule itself (staging a sleeper in the open fights the AI, which sends them off to bed): pushing someone asleep is refused, they stay put, nothing happens
  const r = await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2, 3].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); const o = __stand(__other(), x + 1, y, 'sleep');
    const res = lf2PushPerson(game.player, o, 1, 0); return { res, them: o.tx, ox: x + 1, pose: o.pose, emitted: window.__emitted.slice() }; });
  check(typeof r.res === 'string' && /asleep/.test(r.res), 'pushing a sleeper should be refused, got ' + JSON.stringify(r.res));
  check(r.them === r.ox && r.pose === 'sleep', `a sleeper must stay put and asleep (x ${r.ox} -> ${r.them}, ${r.pose})`);
  check(r.emitted.length === 0, 'got events: ' + r.emitted.join(', '));
  return `"${r.res}"; stayed asleep, no events`;
}));

/* ---------------------------------------------------------------------------------------------- */
// Conversation (src/dialogue/cv-*.ts): people talk about what they are doing and what is going on in the village; you say whole sentences,
// the attitude is in the sentence; conversations go deep, and people remember you.

async function talkScene(rng, fn) {
  return async browser => {
    const { page, errors } = await openGame(browser, GAME, { rng, town: 'talk' });
    await simulate(page, 3 * 1440 + 10 * 60);
    await page.evaluate(() => {
      if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl)); document.getElementById('c').focus();
      window.__em = []; const e0 = lfEmit; lfEmit = function (k, o) { window.__em.push(k + (o && o.fake ? '(fake)' : '')); return e0.apply(this, arguments); };
      window.__box = () => { const t = document.getElementById('talk'); if (!t || t.hidden) return null; return { name: t.querySelector('.nm b').innerText, say: t.querySelector('.ta').innerText, q: (t.querySelector('.tq') || {}).innerText || '', opts: [...t.querySelectorAll('[data-k]')].map(b => b.innerText.replace(/^\d+\s*/, '').trim()), leave: !!t.querySelector('[data-leave]') }; };
      window.__friend = (o, aff = 40, know = 40) => { o.aff[game.player.id] = aff; o.know[game.player.id] = know; if (o.trust) o.trust[game.player.id] = 0; o.plan = null; o.status = 'Standing about'; o.bladder = Math.min(o.bladder || 0, 40); o.hunger = Math.min(o.hunger || 0, 40); o.ill = null; return o; };   // free to talk
      window.__talkable = () => npcs.filter(q => q !== game.player && !q.dead && q.age >= 14 && q.pose !== 'sleep');
    });
    const r = await fn(page);
    check(errors.length === 0, 'page errors:\n    ' + errors.slice(0, 5).join('\n    '));
    await page.close();
    return r;
  };
}
const BANNED = /that'?s interesting|i see what you mean|it'?s complicated|anything else (you'?d like|you want) to know|that'?s life in the village|^goodbye\.?$|^anything else\??$/i;
const GENERIC = /^(Hello\.|Yes\?|What is it\?|Mm\?|Oh, hello [A-Za-z]+\.|Hm\? I am working\.|Busy, but go on\.|Make it quick\.)$/;

test('talk: people open with something real, there is no Goodbye reply, and you can always leave', await talkScene(41, async page => {
  const rows = await page.evaluate(() => { const out = []; for (const o of __talkable()) { openTalk(o); const b = __box(); if (b) out.push({ who: o.first, status: o.status, say: b.say, opts: b.opts, leave: b.leave }); if (talkUI.o) closeTalk(); } return out; });
  check(rows.length >= 8, 'expected to talk to at least 8 villagers, got ' + rows.length);
  const generic = rows.filter(r => GENERIC.test(r.say)); check(generic.length === 0, 'bare greetings: ' + generic.map(r => `${r.who}: "${r.say}"`).join('; '));
  const many = rows.filter(r => r.opts.length > 3); check(many.length === 0, 'more than three replies: ' + many.map(r => r.who).join('; '));
  const bye = rows.filter(r => r.opts.some(o => /^(Goodbye|Anything else)/i.test(o))); check(bye.length === 0, 'a Goodbye / Anything else reply is back');
  check(rows.every(r => r.leave), 'every talk box needs a Leave control');
  const distinct = new Set(rows.map(r => r.say)).size; check(distinct >= rows.length * 0.7, `lines are too samey: ${distinct} different out of ${rows.length}`);
  return `${rows.length} villagers, ${distinct} different openings; e.g. ${rows[0].who}: "${rows[0].say}"`;
}));

test('talk: someone in the privy has nothing to say and no replies', await talkScene(41, async page => {
  const b = await page.evaluate(() => { const o = __talkable()[0]; o.status = 'Using the privy'; openTalk(o); const b = __box(); closeTalk(); return b; });
  check(b && b.opts.length === 0, 'expected no replies, got ' + JSON.stringify(b)); return `"${b.say}"`;
}));

test('talk: long random conversations stay specific, never dead-end and never repeat themselves', await talkScene(41, async page => {
  const r = await page.evaluate(() => { const rows = []; for (const o of __talkable().slice(0, 14)) { __friend(o, 35, 40); openTalk(o); const said = [], opts = []; let ended = false, turns = 0;
      for (let i = 0; i < 16; i++) { const b = __box(); if (!b) break; said.push(b.say); opts.push(b.opts.length); if (!b.opts.length) { ended = true; break; } [...document.querySelectorAll('#talk [data-k]')][Math.floor(Math.random() * b.opts.length)].click(); turns++; }
      rows.push({ who: o.first, arch: cvVoice(o).arch, said, opts, ended, turns, status: o.status, hostile: ['insult', 'accuse', 'blackmail'].includes(talkS.conv && talkS.conv.lastIntent) }); if (talkUI.o) closeTalk(); } return rows; });
  const bad = []; let dup = 0, deep = 0, total = 0;
  for (const c of r) { if (/privy/i.test(c.status)) continue; total++; if (c.ended && (c.said.length >= 3 || c.hostile) && c.said.length <= 7) deep++;   // (a threat or an insult can end it sooner)
    for (const s of c.said) if (BANNED.test(s)) bad.push(`${c.who}: "${s}"`);
    for (let i = 1; i < c.said.length; i++) if (c.said[i] === c.said[i - 1]) dup++;
    const dead = c.opts.slice(0, -1).findIndex(n => n === 0); if (dead >= 0) bad.push(`${c.who}: dead end at turn ${dead}`); }
  check(bad.length === 0, bad.slice(0, 4).join(' | ')); check(dup === 0, `${dup} times somebody said the same thing twice running`);
  check(deep === total, `every conversation should come to a natural end after 3-7 screens; ${total - deep} did not: ` + r.filter(c => !(c.ended && (c.said.length >= 3 || c.hostile) && c.said.length <= 7)).map(c => c.who + ' ' + c.said.length + ': ' + JSON.stringify(c.said)).join(', '));
  return `${total} conversations, all ended by themselves (screens: ${r.map(c => c.said.length).join(' ')}); archetypes seen: ${[...new Set(r.map(c => c.arch))].join(', ')}`;
}));

test('talk: someone too busy stops dead; a chat ends after about three screens unless you keep digging into one thing; next time is different', await talkScene(41, async page => {
  const r = await page.evaluate(() => {
    const [w, o, q] = __talkable().filter(x => x.age >= 16 && !x.shop);   // (sellers may chat at their counter)
    __friend(w, 40, 40); w.status = 'Hoeing the rows'; w.plan = [{ act: 'work' }]; w.si = 0; openTalk(w); const busy = __box(); if (talkUI.o) closeTalk();
    // wandering: pick a different kind of option each time
    __friend(o, 40, 40); openTalk(o); let c = talkS.conv, screens = 1, u = null; for (let i = 0; i < 10; i++) { const opts = cvOptions(c, u || { text: '', hooks: c.hooks || [] }); const pick = opts.find(x => x.hook && x.hook.k === 'act') || opts[opts.length - 1]; if (!pick) break; u = cvRespond(c, pick); screens++; if (!u || u.end) break; }
    const wandered = screens; if (!Object.keys(c.told).length) { const t0 = cvPool(c)[0]; if (t0) cvTell(c, t0, 0); }   // (small talk alone tells nothing: make sure something was told)
    const told = Object.keys(c.told); if (talkUI.o) closeTalk();
    // digging: keep asking about the same person
    __friend(q, 70, 80); const c2 = cvNew(q, game.player), who = __talkable().find(x => x !== q && x.age >= 16); const h = { k: 'person', key: 'pe' + who.id, label: who.first, q: who }; let dug = 1, u2 = null;
    for (let i = 0; i < 10; i++) { u2 = cvRespond(c2, { text: 'Tell me more about ' + who.first + ' ' + i, intent: 'ask', w: 1, hook: h }); dug++; if (!u2 || u2.end) break; }
    // next time: what they told you is held back
    game.time += 600; __friend(o, 40, 40); const c3 = cvNew(o, game.player), pool = cvPool(c3), again = told.filter(k => { const t = pool.find(x => x.key === k); return t && t.w > 0.2; });
    return { busy, wandered, dug, ended: !!(u2 && u2.end), told: told.length, again: again.length };
  });
  check(r.busy && r.busy.opts.length === 0 && r.busy.say.split(/[.!?]/).filter(Boolean).length <= 2, 'a busy person should brush you off in a line with no replies: ' + JSON.stringify(r.busy));
  check(r.wandered >= 3 && r.wandered <= 4, `a wandering chat should end after about three screens, took ${r.wandered}`);
  check(r.dug > r.wandered && r.dug <= 7 && r.ended, `digging into one subject should earn more screens, then end: ${r.dug}`);
  check(r.told > 0 && r.again === 0, `what they told you should not come straight back next time (${r.again} of ${r.told} did)`);
  return `busy: "${r.busy.say}"; wandering ended after ${r.wandered} screens, digging after ${r.dug}; ${r.told} topics held back for next time`;
}));

test('talk: the sentence carries the attitude (an insult stings and is noticed; sympathy is warmly received)', await talkScene(41, async page => {
  const run = async (text, intent, setup) => page.evaluate(([text, intent, setup]) => {
    const o = __talkable().find(q => q.age > 20 && q.pose !== 'sleep'); __friend(o, 30, 40); o.energy = 5; o.mood = 20; if (setup === 'cold') { o.aff[game.player.id] = 5; } __em.length = 0; openTalk(o); const c = talkS.conv, before = Math.round(o.aff[game.player.id]), tr0 = c.mem.trust;
    const opt = cvObserve(c).find(x => x.text === text); if (!opt) return { missing: true, offered: cvObserve(c).map(x => x.text) }; const r = cvRespond(c, opt);
    const out = { before, after: Math.round(o.aff[game.player.id]), trust: c.mem.trust - tr0, em: __em.slice(), reply: r && r.text, end: !!(r && r.end) }; if (talkUI.o) closeTalk(); return out; }, [text, intent, setup]);
  const rude = await run('Well, you look terrible today.', 'insult'); check(!rude.missing, 'the rude observation was not offered: ' + JSON.stringify(rude));
  check(rude.after < rude.before, `an insult should lower their opinion (${rude.before} -> ${rude.after})`); check(rude.em.includes('insult'), 'an insult should be an event others can notice, got ' + JSON.stringify(rude.em));
  const kind = await run('You look a little tired. Everything all right?', 'sympathize'); check(!kind.missing, 'the sympathetic observation was not offered');
  check(kind.after > kind.before, `sympathy should raise their opinion (${kind.before} -> ${kind.after})`); check(kind.trust > 0, 'sympathy should build trust'); check(!kind.em.includes('insult'), 'sympathy must not be an insult');
  return `insult ${rude.before} -> ${rude.after} ("${rude.reply.slice(0, 50)}…"); sympathy ${kind.before} -> ${kind.after} ("${kind.reply.slice(0, 50)}…")`;
}));

test('talk: the right questions unlock more; a stranger gets a deflection where a friend gets the story', await talkScene(41, async page => {
  const t = (aff, know) => page.evaluate(([aff, know]) => { const o = __talkable().find(q => cvBackOf(q).some(b => b.kind === 'feud' || b.kind === 'debt')); __friend(o, aff, know); o.cvm = {}; openTalk(o); const c = talkS.conv; const b = cvBackOf(o).find(x => x.kind === 'feud' || x.kind === 'debt'), h = { k: 'back', key: 'bk' + b.id, label: 'that', back: b };
    const tellL = (l) => { c.depth[h.key] = l - 1; const u = cvDeepen(c, h, l); return u && u.text; }; const res = { l1: tellL(1), l2: tellL(2), fam: cvVoice(o).arch }; if (talkUI.o) closeTalk(); return res; }, [aff, know]);
  const friend = await t(70, 80), stranger = await t(-5, 2);
  check(friend.l1 && !/(listening to gossip|not true|None of your|I would rather not|not for talking|Why do you want)/.test(friend.l1), 'a close friend should get the story, got: ' + friend.l1);
  check(stranger.l1 && stranger.l1 !== friend.l1, 'a stranger should not get the same answer as a friend: ' + JSON.stringify([friend, stranger])); return `friend: "${friend.l1.slice(0, 60)}…" · stranger: "${stranger.l1.slice(0, 60)}…"`;
}));

test('talk: they remember what you said to them', await talkScene(41, async page => {
  const r = await page.evaluate(() => { const o = __talkable().find(q => q.age > 20); __friend(o, 30, 40); o.energy = 5; openTalk(o); const c = talkS.conv; const opt = cvObserve(c).find(x => x.intent === 'insult'); cvRespond(c, opt); const said = opt.text; if (talkUI.o) closeTalk(); o.aff[game.player.id] = 5; o.know[game.player.id] = 40; openTalk(o); const b = __box(); const out = { said, opening: b.say }; closeTalk(); return out; });
  check(r.opening.includes(r.said.replace(/\.$/, '')), `the next conversation should quote "${r.said}", got "${r.opening}"`); return `"${r.opening.slice(0, 110)}…"`;
}));

test('talk: people who saw you shove someone can bring it up (it is gossip, not a crime)', await talkScene(41, async page => {
  const r = await page.evaluate(() => { const [w, tgt] = __talkable(); const P = game.player; for (const q of [w, tgt]) { q.tx = P.tx + 1; q.ty = P.ty; q.pose = 'stand'; } cvSaw(P, tgt, 'push'); __friend(w, 30, 40); const c = cvNew(w, game.player); const t = cvPool(c).find(x => x.kind === 'player' && x.facet === 'saw'); const u = t && cvTell(c, t, 0); return { found: !!t, text: u && u.text, target: tgt.first, em: __em.slice() }; });
  check(r.found, 'a witness should have the sighting as something to say'); check(r.text.includes(r.target), 'they should name who was shoved: ' + r.text); check(!r.em.some(e => /shove|insult|harm/.test(e)), 'a push must not be a crime: ' + JSON.stringify(r.em)); return `"${r.text}"`;
}));

test('talk: everyone has a life behind them (ambition, regret, fear, a secret), and some tangled old stories', await talkScene(41, async page => {
  const r = await page.evaluate(() => { const w = cvWorld(); const ppl = npcs.filter(n => n.age >= 18 && !n.player); const lives = ppl.map(n => cvLife(n)); return { people: ppl.length, ambitions: lives.filter(l => l.ambition).length, secrets: lives.filter(l => l.secret).length, back: w.back.length, kinds: [...new Set(w.back.map(b => b.kind))], arch: [...new Set(npcs.filter(n => !n.player).map(n => cvVoice(n).arch))] }; });
  check(r.ambitions === r.people, 'everyone should have an ambition'); check(r.secrets >= 1, 'somebody should have a secret'); check(r.back >= 3 && r.kinds.length >= 2, `expected a few tangled stories of different kinds, got ${r.back} (${r.kinds})`); check(r.arch.length >= 4, 'villagers should speak in at least four different ways, got ' + r.arch.join(','));
  return `${r.people} adults, ${r.secrets} secrets, ${r.back} old stories (${r.kinds.join(', ')}), ${r.arch.length} ways of talking`;
}));

test('talk: when the watch is after you, the guard brings it up and the arrest follows', await talkScene(41, async page => {
  const r = await page.evaluate(() => { const g = npcs.find(q => q.job === 'Guard' && q !== game.player); const ev = lfEmit('theft', { actor: game.player, target: g, sev: 1, tags: ['theft', 'crime'], chem: false, chron: false, text: 'somebody helped themself to a purse' }); lf2Want(game.player, ev, 1); g.status = 'Heading for the square'; openTalk(g); return __box(); });
  check(r && r.opts.length >= 1, 'the guard should bring it up, got ' + JSON.stringify(r));
  await page.keyboard.press('1'); await page.waitForTimeout(100);
  const b = await page.evaluate(() => __box()); check(b && b.opts.length >= 2, 'expected the arrest choices, got ' + JSON.stringify(b)); return `"${r.say}" -> ${b.opts.join(' | ')}`;
}));

/* ---------------------------------------------------------------------------------------------- */
// The social simulation (src/social2): the village has a past before the player arrives, news travels and changes, people talk from what they believe.
import { networkRun } from '../tools/network.mjs';

test('social: the weeks before arrival give everyone a past, the same past for the same seed, and quickly', async browser => {
  const sig = async () => { const { page, errors } = await openGame(browser, GAME, { rng: 7, town: 'social' });
    const r = await page.evaluate(() => { const live = npcs.filter(n => !n.dead && !n.infant && n.age >= 6 && !n.player); let aff = 0, kn = 0; for (const n of live) { for (const k in n.aff) aff += Math.round(n.aff[k]); kn += Object.keys(n.kn || {}).length; }
      const pairs = []; for (const a of live) for (const b of live) if (a.id < b.id) pairs.push([a.aff[b.id] || 0, b.aff[a.id] || 0]);
      return { aff, kn, ev: lf2Ev().length, blank: live.filter(n => !Object.keys(n.kn || {}).length).map(n => n.first), kinds: Object.keys(town.sbPresim.exchanges), friends: pairs.filter(([x, y]) => x > 35 && y > 35).length, sour: pairs.filter(([x, y]) => x < -15 || y < -15).length }; });
    return { r, page, errors }; };
  const A = await sig(), B = await sig();
  const t0 = Date.now(); await B.page.evaluate(() => { town.sbPresim = null; sbPresim(); }); const ms = Date.now() - t0;
  check(A.errors.length === 0 && B.errors.length === 0, 'page errors: ' + A.errors.concat(B.errors).slice(0, 3).join(' | '));
  check(JSON.stringify(A.r) === JSON.stringify(B.r), `the same seed should give the same past: ${JSON.stringify(A.r)} vs ${JSON.stringify(B.r)}`);
  check(A.r.blank.length === 0, 'nobody should arrive a blank slate: ' + A.r.blank.join(', '));
  check(A.r.friends >= 3 && A.r.sour >= 2, `expected friendships and some bad feeling, got ${A.r.friends} mutual friends, ${A.r.sour} soured pairs`);
  check(A.r.kinds.length >= 5, 'expected many kinds of exchange, got ' + A.r.kinds.join(', '));
  check(ms < 2500, `the pre-simulation took ${ms} ms (want under 2.5 s)`);
  await A.page.close(); await B.page.close();
  return `${A.r.kn} things known, ${A.r.ev} events, ${A.r.friends} mutual friends, ${A.r.sour} soured pairs; ${A.r.kinds.length} kinds of exchange; 60 days in ${ms} ms`;
});

test('social: news spreads gradually, and stories change on the way', async () => {
  const r = await networkRun({ days: 3, seed: 'social-news' }), A = r.arrival, people = A.people;
  check(r.errors.length === 0, 'page errors: ' + r.errors.slice(0, 3).join(' | '));
  const born = r.daily[0].versions.filter(v => v.t >= (r.daily[0].day - 1) * 1440), med = d => { const ks = born.map(b => (d.versions.find(v => v.id === b.id) || { know: 0 }).know).sort((x, y) => x - y); return ks[Math.floor(ks.length / 2)] || 0; };
  const d1 = med(r.daily[0]), d3 = med(r.daily[2]);
  check(born.length >= 5, 'expected things to happen on the first day, got ' + born.length);
  check(d1 < people / 2, `news should not reach everyone at once: median ${d1} of ${people} after a day`);
  check(d3 >= d1, `news should keep spreading: median ${d1} after a day, ${d3} after three`);
  const circ = A.versions.filter(v => v.know >= 3), multi = circ.filter(v => v.versions > 1).length;
  check(multi >= 2, `stories should change as they travel; only ${multi} of ${circ.length} have more than one version`);
  return `median knowers ${d1} after a day, ${d3} after three (of ${people}); ${multi} of ${circ.length} stories exist in more than one version, ${circ.filter(v => v.wrong).length} with somebody blamed wrongly`;
});

test('social: people talk from what they believe (who cannot stand whom, and why; and they argue with your version)', await talkScene(41, async page => {
  const r = await page.evaluate(() => {
    const P = game.player, ppl = __talkable().filter(q => q.age >= 16);
    // a second-hand belief: o thinks a cannot stand b, because of a quarrel o heard about
    const [o, a, b] = ppl; __friend(o, 60, 60); const ev = lfEmit('quarrel', { actor: a, target: b, sev: 1, tags: ['embarrass'], witnessIds: [], chron: false, text: `${a.first} and ${b.first} had words in the street` });
    lf2Learn(o, ev, null, 1, true); sbRelSet(o, a, b, -0.8, 0.9, 'ev:' + ev.id);
    const c = cvNew(o, P), t = cvPool(c).find(x => x.kind === 'rel' && x.q === a && x.extra.b === b); const rel = t && cvTell(c, t, 0);
    // a story told in their own version, and the player knowing a different culprit
    const [, , , x, thief, other] = ppl; __friend(x, 70, 70); const th = lfEmit('pilfer', { actor: thief, target: other, sev: 1, anon: true, tags: ['theft', 'crime'], witnessIds: [], chron: false, text: `${thief.first} took a ham from ${other.first}'s house`, anonText: `Somebody took a ham from ${other.first}'s house` });
    lf2Learn(x, th, null, 0.6, true, { a: true, who: other.id === b.id ? a.id : b.id }); lf2Learn(P, th, null, 1, true);
    const c2 = cvNew(x, P), told = cvTell(c2, { key: 'ev' + th.id, kind: 'event', ev: th, w: 1, sens: 0 }, 0), opts = cvFollowUps(c2, { k: 'event', key: 'ev' + th.id, label: 'that', ev: th }), contra = opts.find(op => op.fam === 'ev.contra');
    const ans = contra && contra.then(c2);
    return { rel: rel && rel.text, a: a.first, b: b.first, told: told && told.text, wrong: byId(x.kn[th.id].who).first, thief: thief.first, contra: contra && contra.text, ans: ans && ans.text };
  });
  check(r.rel && r.rel.includes(r.a) && r.rel.includes(r.b), 'they should say how ' + r.a + ' feels about ' + r.b + ', got: ' + r.rel);
  check(r.told && !r.told.includes(r.thief), `they should tell their own (wrong) version, not the truth: "${r.told}"`);
  check(r.contra && r.contra.includes(r.thief) && r.contra.includes(r.wrong), 'the player should be able to say they heard it was ' + r.thief + ': ' + r.contra);
  check(r.ans && r.ans.includes(r.thief), 'they should answer the other version: ' + r.ans);
  return `"${r.rel}" · "${r.told.slice(0, 70)}…" · you: "${r.contra}" → "${r.ans}"`;
}));

/* ---------------------------------------------------------------------------------------------- */
// TrueSight (src/render/truesight.ts): the player sees only what their character could see from where they stand.
import { truesightRun } from '../tools/truesight.mjs';

test('truesight: building walls, shut doors, corners and windows hide what they should, and trees hide nothing', async () => {
  const r = await truesightRun({ shots: null }), bad = [];
  check(r.errors.length === 0, 'page errors: ' + r.errors.slice(0, 3).join(' | '));
  for (const sc of r.res) for (const p of sc.seen) if (p.want !== p.got) bad.push(`${sc.name.split(':')[0]}: "${p.who}" is ${p.got ? 'seen' : 'hidden'}`);
  check(!bad.length, bad.join(' | '));
  { const w = r.moves.walk; check(w[0] && w.includes(false) && w[w.length - 1], 'a villager walking behind the shed should be seen, hidden, then seen: ' + w.map(v => v ? 'o' : '.').join('')); }
  { const ap = r.moves.approach; check(ap[ap.length - 1].area > ap[0].area && !ap[0].sees && ap[ap.length - 1].sees, 'walking up to a corner should open the view and reveal who is round it: ' + JSON.stringify(ap)); }
  check(r.corners.corners.every(Boolean), 'from inside a room all four corner tiles should be shown, not left as black notches: ' + r.corners.corners.join(','));
  check(!r.corners.outside.some(Boolean), 'the tiles beyond the room corners must stay hidden: ' + r.corners.outside.join(','));
  check(!r.diag.through, 'two walls touching corner to corner must not let a line through'); check(r.diag.beside, 'a line beside those walls should be clear');
  return `${r.res.length} scenes, ${r.res.reduce((n, s) => n + s.seen.length, 0)} villagers placed, all seen or hidden as they should be; the diagonal corner holds`;
});

test('truesight: the view is a polygon, recomputed quickly even zoomed out', async browser => {
  const { page, errors } = await openGame(browser, GAME, { rng: 5, town: 'truesight-speed', viewport: { width: 1280, height: 800 } });
  await simulate(page, 600);
  await page.evaluate(() => { cam.follow = false; cam.z = 0.6; clampCam(); cam.x = town.cx * TS - cam.cw / cam.z / 2; cam.y = town.cy * TS - cam.ch / cam.z / 2; clampCam(); });
  const pts = await page.evaluate(() => { const R = { x0: cam.x / TS - 2, y0: cam.y / TS - 2, x1: (cam.x + cam.cw / cam.z) / TS + 2, y1: (cam.y + cam.ch / cam.z) / TS + 2 }; window.__R = R; return tsPolygon((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, R).length; });
  const t0 = Date.now(); await page.evaluate(() => { const R = window.__R; for (let i = 0; i < 40; i++) { const ex = (R.x0 + R.x1) / 2 + Math.sin(i) * 6, ey = (R.y0 + R.y1) / 2 + Math.cos(i) * 4; tsPolygon(ex, ey, R); tsWalls(ex, ey, R); } });
  const ms = (Date.now() - t0) / 40; await page.close();
  check(errors.length === 0, 'page errors: ' + errors.slice(0, 3).join(' | ')); check(pts > 20, 'expected a real polygon, got ' + pts + ' points');
  check(ms < 8, `a recompute took ${ms.toFixed(2)} ms at the widest zoom (want under 8)`);
  return `${pts} polygon points at the widest zoom; ${ms.toFixed(2)} ms per recompute (only when the eye, the view or a door changes)`;
});

/* ---------------------------------------------------------------------------------------------- */
// Longevity and readability (tools/longevity.mjs runs the long version: node tools/longevity.mjs 30)
import { playDays, measure } from '../tools/longevity.mjs';
let LONG = null; const longRun = async () => LONG || (LONG = measure(await playDays({ days: 8, talksPerDay: 4, turns: 8, seed: 'ci-longevity' })));

test('readability: conversation is plain, short enough to read at a glance, and free of broken text', async () => {
  const m = await longRun(), r = m.readability;
  check(m.hardErrors.length === 0, `${m.hardErrors.length} broken lines, e.g. ${m.hardErrors.slice(0, 3).map(h => h.what + ': "' + h.text + '"').join(' | ')}`);
  check(r.fleschReadingEase >= 70, `reading ease ${r.fleschReadingEase} (want 70 or more)`);
  check(r.wordsPerTurn.median <= 40 && r.wordsPerTurn.p90 <= 70, `turns are getting long: median ${r.wordsPerTurn.median}, 90th percentile ${r.wordsPerTurn.p90} words`);
  check(r.longSentenceShare <= 0.05, `${(r.longSentenceShare * 100).toFixed(0)}% of sentences run over 25 words`);
  return `reading ease ${r.fleschReadingEase}; ${r.wordsPerSentence} words per sentence; ${r.wordsPerTurn.median} words per turn (median)`;
});

test('longevity: a week of talking keeps bringing new things to hear, and no line wears out', async () => {
  const m = await longRun(), late = m.perDay.slice(-3), novel = late.reduce((a, d) => a + d.novelTemplate, 0) / Math.max(1, late.length), info = late.reduce((a, d) => a + d.newInfo, 0) / Math.max(1, late.length);
  const worst = m.topTemplates[0];
  // guard rails at today's level (measured Nov 2026): raise them as the system improves
  check(novel >= 0.15, `by day 6-8 only ${(novel * 100).toFixed(0)}% of sentences are new templates (want 15%+)`);
  check(info >= 0.2, `by day 6-8 only ${(info * 100).toFixed(0)}% of what people tell you is new (want 20%+)`);
  check(!worst || worst.share <= 0.04, `one line is ${(worst.share * 100).toFixed(1)}% of everything said: "${worst.t}"`);
  return `days 6-8: ${(novel * 100).toFixed(0)}% new templates, ${(info * 100).toFixed(0)}% new facts; most repeated line ${(worst.share * 100).toFixed(1)}% ("${worst.t.slice(0, 40)}")`;
});

/* ---------------------------------------------------------------------------------------------- */
// Items in the economy (src/life2/items-trade.ts): real tools for everyone, wear, the smith and iron, seeds and the garden, lockpicks, the sawmill.
async function itemScene(fn, days = 3) {
  return async browser => {
    const { page, errors } = await openGame(browser, GAME, { rng: 5, town: 'items' });
    await simulate(page, days * DAY);
    await page.evaluate(() => { if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl)); });
    const r = await fn(page);
    check(errors.length === 0, 'page errors:\n    ' + errors.slice(0, 5).join('\n    '));
    await page.close(); return r;
  };
}
test('items: villagers own real work tools that wear as they work and are replaced when bought', await itemScene(async page => {
  const r = await page.evaluate(() => {
    const ws = npcs.filter(n => !n.dead && !n.player && n.age >= 16 && n.role === 'Worker' && n.toolQ != null), own = ws.filter(n => (n.items || []).some(i => i.work));
    const off = own.filter(n => { const it = n.items.find(i => i.work); return Math.abs(it.wear * 100 - n.toolQ) > 3; }).map(n => n.first);
    const n = own[0], old = n.items.find(i => i.work), oldId = old.id; n.toolQ = 8; const nu = itNpcNewTool(n);
    return { workers: ws.length, own: own.length, off, kinds: [...new Set(own.map(n => n.items.find(i => i.work).kind))], replaced: nu.id !== oldId && nu.wear === 1 && n.toolQ === 100 && !n.items.some(i => i.id === oldId) };
  });
  check(r.own === r.workers, `every working villager should own a work tool: ${r.own} of ${r.workers}`);
  check(!r.off.length, 'a tool\'s wear should follow its owner\'s: ' + r.off.join(', '));
  check(r.replaced, 'buying a new tool should replace the worn one');
  return `${r.own} of ${r.workers} workers own a tool (${r.kinds.join(', ')}); a bought tool replaces the worn one`;
}));

test('items: your tools wear and break; the smith sells each tool, buys iron ore, and sells lockpicks to friends; rocks sometimes hold iron', await itemScene(async page => {
  const r = await page.evaluate(() => {
    const P = game.player, axeRef = P.belt.find(x => x && x[0] === 'i' && itById(P, +x.slice(1)).kind === 'axe'), axe = itById(P, +axeRef.slice(1));
    P.sel = P.belt.indexOf(axeRef); axe.wear = 0.02; itWearHeld(P); const broke = !P.items.includes(axe) && !P.belt.includes(axeRef) && P.sel === 0;
    const sm = lf2Room('smithy'), smith = npcs.find(n => !n.dead && n.job === 'Smith'); const sp = sm.spots.work; smith.tx = smith.x = sp.x; smith.ty = smith.y = sp.y; smith.pose = 'stand'; rebuildOcc();
    const s = lf2Stock(sm); s.tools = 3; s.iron = 2; const menu = () => [];
    const offers = itOffers(P, sm, 'tools', menu), coin0 = P.coin; offers.find(o => /^Hoe/.test(o[0]))[1](); const boughtHoe = P.items.filter(i => i.kind === 'hoe').length === 2 && P.coin < coin0 && s.tools === 2;
    P.inv.iron = 2; const sellLine = itExtras(P, sm, menu).find(o => /^Sell iron/.test(o[0])); const c1 = P.coin; sellLine[1](); const soldOre = P.inv.iron === 1 && P.coin > c1 && s.iron === 3;
    smith.aff[P.id] = 10; const strangerPicks = itExtras(P, sm, menu).some(o => /Lockpick/.test(o[0]));
    smith.aff[P.id] = 40; const pick = itExtras(P, sm, menu).find(o => /Lockpick/.test(o[0])), lp0 = P.bag.lockpick || 0; if (pick) pick[1](); const friendPicks = (P.bag.lockpick || 0) === lp0 + 2;
    let ore = 0; P.inv.iron = 0; for (let i = 0; i < 300; i++) if (itRockOre(P)) ore++;
    return { broke, offers: offers.map(o => o[0].split(':')[0]), boughtHoe, soldOre, strangerPicks, friendPicks, ore };
  });
  check(r.broke, 'a worn-out axe should break and leave your hand');
  check(r.offers.join(',') === 'Axe,Hammer,Hoe,Fishing rod', 'the smith should offer each tool: ' + r.offers.join(', '));
  check(r.boughtHoe, 'buying a hoe should give you a hoe and take your coin');
  check(r.soldOre, 'selling iron ore to the smith should pay you and stock the smithy');
  check(!r.strangerPicks && r.friendPicks, `lockpicks only for friends (stranger: ${r.strangerPicks}, friend: ${r.friendPicks})`);
  check(r.ore > 25 && r.ore < 90, `about one rock in six should hold iron ore: ${r.ore} of 300`);
  return `axe broke; smith offers ${r.offers.join(', ')}; ore bought; lockpicks for friends only; ${r.ore} of 300 rocks held ore`;
}));

test('items: seeds grow at their own pace and give their own food; a harvest gives seed back; the garden by home is yours; the Taberna sells seed', await itemScene(async page => {
  const r = await page.evaluate(() => {
    const P = game.player, g = town.crops.filter(c => c.garden === P.id), [a, b] = g;
    a.pl = b.pl = 1; a.st = b.st = 1; a.seed = 'turnip'; b.seed = 'barley'; a.t0 = b.t0 = game.time - GROW * 0.6;
    const stages = [cropStage(a), cropStage(b)], seeds0 = P.bag.seed_turnip || 0, h = itHarvest(P, a);
    const sh = lf2Room('shop'); lf2Stock(sh).seeds = 4; const offers = itOffers(P, sh, 'seeds', () => []), bean0 = P.bag.seed_bean || 0; offers.find(o => /^Beans/.test(o[0]))[1]();
    const others = g.slice(2).map(c => [c.pl, c.st]); window.__g = g; window.__gw = JSON.stringify(others);
    return { garden: g.length, nearHome: g.every(c => Math.abs(c.x - P.homeRoom.x) + Math.abs(c.y - P.homeRoom.y) < 25), stages, food: h.what, q: h.q, back: (P.bag.seed_turnip || 0) - seeds0, beans: (P.bag.seed_bean || 0) - bean0, farmersSkip: g.every(c => !itFarmersPlot(c)) };
  });
  await simulate(page, DAY);
  const left = await page.evaluate(() => JSON.stringify(window.__g.slice(2).map(c => [c.pl, c.st])) === window.__gw);
  check(r.garden === 6 && r.nearHome, `you should have a 3 x 2 garden by home: ${r.garden} plots`);
  check(r.stages[0] === 4 && r.stages[1] < 4, `turnips should ripen before barley sown at the same time: stages ${r.stages}`);
  check(r.food === 'turnips' && r.q > 0 && r.back >= 1, `harvesting turnips should give turnips and a seed or two back: ${JSON.stringify(r)}`);
  check(r.beans === 4, 'the Taberna should sell bean seed by the handful');
  check(r.farmersSkip && left, 'the farmers should leave your garden alone');
  return `garden of ${r.garden}; turnip stage ${r.stages[0]} vs barley ${r.stages[1]}; +${r.q} ${r.food}, +${r.back} seed; 4 bean seed bought; farmers leave it alone`;
}));

test('items: a lockpick opens a house barred for the night; picks snap, and somebody inside may hear', await itemScene(async page => {
  const r = await page.evaluate(() => {
    const P = game.player, houses = rooms.filter(q => !q.dead && q.kind === 'house' && q !== P.homeRoom); const out = { open: 0, snap: 0, heard: 0, tries: 0, ev: 0 };
    const e0 = lfEmit; lfEmit = function (k) { if (k === 'breakin') out.ev++; return e0.apply(this, arguments); };
    for (let i = 0; i < 40; i++) { const h = houses[i % houses.length]; h.unbarred = null; P.bag.lockpick = 5; const before = out.ev; itPickLock(P, h); out.tries++;
      if (h.unbarred === dayN() + ':' + P.id) out.open++; else if (P.bag.lockpick === 4) out.snap++; else if (out.ev > before) out.heard++; }
    lfEmit = e0; return out;
  });
  check(r.open > 0 && r.snap > 0, `over ${r.tries} tries some locks should open and some picks should snap: ${JSON.stringify(r)}`);
  check(r.ev >= r.open, 'a picked lock should be a break-in others can hear about');
  return `${r.tries} tries: ${r.open} opened, ${r.snap} picks snapped, ${r.heard} times somebody heard`;
}));

test('items: the sawmill saws logs into planks and sells them; planks count as timber on a building site', await itemScene(async page => {
  const r = await page.evaluate(() => {
    const mill = lf2Room('mill'), P = game.player, miller = npcs.find(n => !n.dead && n.job === 'Miller'), s = mill ? lf2Stock(mill) : {};
    const planks = s.planks || 0; s.planks = Math.max(planks, 3); const coin0 = P.coin; P.inv.planks = 0; const got = lf2Buy(P, mill, 'planks', 2);
    // a building site that still wants timber
    let site = (town.sites || []).find(q => q.got && q.kind !== 'road' && siteRem(q, 'wood') > 0); let throwRes = null;
    if (site) { const before = site.got.wood; P.inv.planks = 2; P.inv.wood = 0; P.belt && (P.sel = 0); const t = targetAt0(P, site.x, site.y); if (t && t.run) t.run(P); throwRes = { key: t && t.key, more: site.got.wood > before, planks: P.inv.planks }; }
    return { mill: !!mill, miller: !!miller, planks, got, paid: P.coin < coin0, site: !!site, throwRes };
  });
  check(r.mill && r.miller, 'there should be a sawmill with a miller');
  check(r.planks > 0, 'after a few days the miller should have sawn some planks');
  check(r.got === 2 && r.paid, 'you should be able to buy planks at the sawmill');
  if (r.site) check(r.throwRes && r.throwRes.more && r.throwRes.planks === 1, 'planks thrown on a site should count as timber: ' + JSON.stringify(r.throwRes));
  return `${r.planks} planks sawn; bought 2${r.site ? '; a plank laid on a site counted as timber' : ' (no site wanting timber right now)'}`;
}, 5));

/* ---------------------------------------------------------------------------------------------- */
// The dialogue lint (tools/lintalk.mjs): plays days of talk and listens to the village, then flags what reads wrong.
import { lint } from '../tools/lintalk.mjs';
test('dialogue lint: days of talk and overheard chatter, and nothing reads wrong', async () => {
  const r = await playDays({ days: 3, talksPerDay: 6, turns: 8, seed: 'ci-lint', collect: true }), L = lint(r), n = k => (L.hits[k] || []).length;
  const zero = ['self-third', 'player-third', 'repeat', 'pivot', 'infant', 'full-name', 'clock', 'child-line', 'grammar', 'self-news'], bad = zero.filter(k => n(k) > 0);
  check(!bad.length, 'reads wrong:\n          ' + bad.map(k => `${k}: ${L.hits[k].slice(0, 2).join(' | ')}`).join('\n          '));
  const unc = n('uncontracted') / Math.max(1, L.sentences); check(unc < 0.01, `${(unc * 100).toFixed(1)} uncontracted per 100 sentences, e.g. ${(L.hits.uncontracted || []).slice(0, 2).join(' | ')}`);
  const reps = (L.hits['overheard-rep'] || []).map(x => parseInt(x)), worst = Math.max(0, ...reps); check(worst <= 4, `an overheard exchange came round ${worst} times: ${(L.hits['overheard-rep'] || [])[0]}`);
  check(L.overheard >= 30, `only ${L.overheard} overheard exchanges in three days`);
  return `${L.conversations} conversations, ${L.sentences} sentences, ${L.overheard} overheard exchanges: nothing flagged; ${(unc * 100).toFixed(1)} uncontracted per 100 sentences; no overheard pair more than ${worst}x`;
});

test('talk: every follow-up has its own answer, and you can ask about people, news, old stories and places', await talkScene(41, async page => {
  const r = await page.evaluate(() => {
    const p = game.player, o = __friend(__talkable().find(x => x.age >= 20 && !x.shop), 50, 50), c = cvNew(o, p); c.pool = cvPool(c);
    const others = npcs.filter(q => q !== o && q !== p && !q.dead && q.age >= 16).slice(0, 6), missing = [], empty = [], hints = [];
    for (const q of others) for (const opt of cvFollowUps(c, cvPersonHook(q))) { if (!opt.then) { missing.push('person: ' + opt.text); continue; } const u = opt.then(c); if (!u || !u.text) empty.push(opt.text); else if (/I (will|'ll) (say this much|only say)/.test(u.text)) hints.push(u.text); }
    const evs = lf2Ev().filter(ev => o.kn && o.kn[ev.id]).slice(-4);
    for (const ev of evs) for (const opt of cvFollowUps(c, { k: 'event', key: 'ev' + ev.id, label: 'that', ev })) { if (!opt.then) { missing.push('event: ' + opt.text); continue; } const u = opt.then(c); if (!u || !u.text) empty.push(opt.text); }
    // asking about what you know
    for (const q of others) p.know[q.id] = 40;
    const ev = lf2Ev().slice().reverse().find(e => !(o.kn && o.kn[e.id]) && e.actor !== o.id && e.target !== o.id && e.actor !== p.id && e.target !== p.id && !e.fake);
    if (ev) { (p.kn || (p.kn = {}))[ev.id] = { t: game.time, from: null, cert: 1, a: true, mine: false }; }
    const c2 = cvNew(o, p), asks = cvAskAbout(c2), answers = asks.map(a => { const u = a.then(c2); return { q: a.text, a: u && u.text }; });
    let taught = null; if (ev) { const u = cvAskEventAns(c2, ev), h = u.hooks[0], tell = h && h.k === 'tellit' ? cvFollowUps(c2, h).find(x => x.intent === 'gossip') : null; if (tell) tell.then(c2); taught = { tellit: !!(h && h.k === 'tellit'), offered: !!tell, learned: !!(o.kn && o.kn[ev.id]) }; }
    return { missing, empty, hints, asks: answers, taught, n: others.length + evs.length };
  });
  check(!r.missing.length, 'options without an answer of their own: ' + r.missing.slice(0, 4).join(' | '));
  check(!r.empty.length && !r.hints.length, 'answers that say nothing: ' + r.empty.concat(r.hints).slice(0, 4).join(' | '));
  check(r.asks.length >= 2 && r.asks.every(a => a.a && a.a.length > 8), 'asking about what you know should be offered and answered: ' + JSON.stringify(r.asks));
  check(!r.taught || (r.taught.tellit && r.taught.offered && r.taught.learned), 'asking about news they have not heard should let you tell them: ' + JSON.stringify(r.taught));
  return `${r.n} subjects, every option answered; asked: ${r.asks.map(a => '"' + a.q + '" -> "' + a.a.slice(0, 40) + '…"').slice(0, 2).join('; ')}`;
}));

test('overheard: villagers talk from their own lives, in contractions, and children sound like children', await talkScene(41, async page => {
  const r = await page.evaluate(() => {
    const ad = npcs.filter(n => !n.dead && n.age >= 18), lines = [];
    for (let i = 0; i < 300; i++) { const a = ad[i % ad.length], b = ad[(i * 7 + 3) % ad.length]; if (a === b) continue; for (const l of sbSmallTalk(a, b, { place: placeOf(a), band: todBand(game.time) })) lines.push({ who: l.who, text: cvSpeak(l.text) }); }
    const childy = lines.filter(l => l.who.age >= 16 && /Can I touch the well bucket|Can I stay out|Is it nearly supper|Can I have the big bit|I found an enormous beetle/.test(l.text)).map(l => l.who.first + ': ' + l.text);
    const self = lines.filter(l => new RegExp('\\b' + l.who.first + '\\b').test(l.text)).map(l => l.who.first + ': ' + l.text);
    const named = lines.filter(l => npcs.some(q => q.first.length > 2 && q !== l.who && new RegExp('\\b' + q.first + '\\b').test(l.text))).length;
    const speak = [['I do not know.', "I don't know."], ['Yes, I am.', 'Yes, I am.'], ['Is it not lovely?', "Isn't it lovely?"], ['I know what it is.', 'I know what it is.'], ['I have been robbed.', "I've been robbed."], ['I have a cat.', 'I have a cat.'], ['Do NOT touch that.', 'Do NOT touch that.'], ['That is, if you want it.', 'That is, if you want it.'], ['We are fine, are we not?', "We're fine, aren't we?"]].filter(([a, b]) => cvSpeak(a) !== b).map(([a, b]) => `${a} -> ${cvSpeak(a)} (want ${b})`);
    return { n: lines.length, distinct: new Set(lines.map(l => l.text)).size, childy, self, named, speak };
  });
  check(!r.speak.length, 'contractions: ' + r.speak.join(' | '));
  check(!r.childy.length, 'adults saying children\'s lines: ' + r.childy.slice(0, 3).join(' | '));
  check(!r.self.length, 'people naming themselves: ' + r.self.slice(0, 3).join(' | '));
  check(r.distinct / r.n > 0.3, `small talk repeats too much: ${r.distinct} distinct of ${r.n}`);
  check(r.named > r.n * 0.08, `small talk should be about real people: ${r.named} of ${r.n} lines name somebody`);
  return `${r.n} lines of small talk, ${r.distinct} distinct, ${r.named} naming a villager; contractions right`;
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
