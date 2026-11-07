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
  // the rule itself (staging a sleeper in the open fights the AI, which sends them off to bed): pushing someone asleep is refused, they stay put, nothing happens
  const r = await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2, 3].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); const o = __stand(__other(), x + 1, y, 'sleep');
    const res = lf2PushPerson(game.player, o, 1, 0); return { res, them: o.tx, ox: x + 1, pose: o.pose, emitted: window.__emitted.slice() }; });
  check(typeof r.res === 'string' && /asleep/.test(r.res), 'pushing a sleeper should be refused, got ' + JSON.stringify(r.res));
  check(r.them === r.ox && r.pose === 'sleep', `a sleeper must stay put and asleep (x ${r.ox} -> ${r.them}, ${r.pose})`);
  check(r.emitted.length === 0, 'got events: ' + r.emitted.join(', '));
  return `"${r.res}"; stayed asleep, no events`;
}));

test('controls: Space pushes a crate and stepping back pulls it', await controlScene('crate', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => [-3, -2, -1, 0, 1, 2, 3, 4, 5].every(i => __free(x + i, y))); const pr = town.props.find(Boolean); town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = x + 1; pr.y = y; town.pblock[y * W + x + 1] = 1; town.propAt.set(y * W + x + 1, pr); __place(game.player, x, y, { dx: 1, dy: 0 }); window.__pr = pr; return { x, y }; });
  await held(page, ['Space'], 2);
  const pushed = await page.evaluate(() => ({ pr: window.__pr.x, me: game.player.tx }));
  check(pushed.pr > s.x + 1, `the crate should have moved east (x ${s.x + 1} -> ${pushed.pr})`);
  await page.evaluate(() => { __place(game.player, window.__pr.x - 1, window.__pr.y, { dx: 1, dy: 0 }); rebuildOcc(); });   // stand right behind it (a passer-by may have come between)
  await held(page, ['Space'], 3, 'a');
  const pulled = await page.evaluate(() => ({ pr: window.__pr.x, me: game.player.tx, st: game.player.status + ' ' + JSON.stringify(game.player.player && { act: game.player.player.act, lock: game.player.player.lock }) + ' talk ' + !!talkUI.o }));
  check(pulled.pr < pushed.pr, `stepping back with Space should pull the crate after you (x ${pushed.pr} -> ${pulled.pr}; player ${pushed.me} -> ${pulled.me}; ${pulled.st})`);
  return `crate ${s.x + 1} -> ${pushed.pr} (pushed) -> ${pulled.pr} (pulled)`;
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
    const wandered = screens, told = Object.keys(c.told); if (talkUI.o) closeTalk();
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
  const kind = await run('You look a little tired. Everything alright?', 'sympathize'); check(!kind.missing, 'the sympathetic observation was not offered');
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
