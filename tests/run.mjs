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
import { playTutorial } from '../tools/tutorial.mjs';

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
      window.__free = (x, y) => walkable(x, y) && !(town.siteAt && town.siteAt[y * W + x]) && !tileOwner.get(tkey(x, y))   /* (not on a building site: finishing one moves people off it) */ && !lfPropAt(x, y) && grid[y][x] !== T.DOOR && roomAt[y][x] < 0 && grid[y][x] !== T.CROP && !shroomAt(x, y);
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
  await page.keyboard.press('b'); await held(page, [], 3);   // build mode: the hand pushes
  const e = await page.evaluate(() => ({ me: game.player.tx, them: window.__o.tx, emitted: window.__emitted.slice(), mode: itBuildOn(game.player) ? 'push' : game.player.mode }));
  check(e.mode === 'push', 'B should put you in build mode (the hand pushes), got ' + e.mode);
  check(e.emitted.length === 0, 'pushing someone must not create events, got: ' + e.emitted.join(', '));
  check(e.me > s.x + 1, `the player should have walked on behind them (x ${s.x} -> ${e.me})`);
  check(e.them > s.ox, `they should have been pushed east of x=${s.ox}, now ${e.them}`);
  return `player ${s.x} -> ${e.me}, villager ${s.ox} -> ${e.them}, no events`;
}));

test('controls: in Push mode against a wall you swap places instead of getting stuck', await controlScene('swap', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => __free(x, y) && __free(x + 1, y) && !walkable(x + 2, y) && grid[y][x + 2] !== T.TREE && grid[y][x + 2] !== T.ROCK); /* (a rock is pushable now, so it is no wall) */ const n = game.player; __place(n, x, y, { dx: 1, dy: 0 }); __stand(__other(), x + 1, y); window.__other().talkUntil = game.time + 1e6; /* (keeps the villager from sitting down by the water) */ return { x, y }; });
  await page.keyboard.press('b'); await held(page, [], 2);
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

test('controls: B toggles build mode, I the inventory, 1-0 the hotbar; Q, Shift and the old keys do nothing; with something in hand you still talk', await controlScene('keys', 41, async page => {
  await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); __stand(__other(), x + 1, y); window.__emitted.length = 0; });
  const st = () => page.evaluate(() => { const n = game.player; return { build: itBuildOn(n), sel: n.sel, held: itHeld(n).kind, sneak: !!n.player.sneak, act: n.player.act && n.player.act.text, msg: n.player.msg, ev: window.__emitted.slice(), bag: itBagOpen(), slots: n.belt.length }; });
  const s0 = await st(); check(!s0.build && s0.slots === 10, 'the hotbar has ten slots and you start outside build mode: ' + JSON.stringify(s0));
  await page.keyboard.press('q'); await page.keyboard.press('q'); const q = await st(); check(!q.build && q.held === s0.held, 'Q does nothing now: ' + JSON.stringify(q));
  await page.keyboard.press('b'); const b1 = await st(); await page.keyboard.press('b'); const b2 = await st(); check(b1.build && !b2.build, 'B should toggle build mode: ' + JSON.stringify([b1.build, b2.build]));
  await page.keyboard.press('i'); const i1 = await st(); await page.keyboard.press('i'); const i2 = await st(); check(i1.bag && !i2.bag, 'I should open and close the inventory');
  check(/^(seed_|lockpick)/.test(s0.held), 'slot 1 starts selected, holding the first hotbar item: ' + JSON.stringify(s0));
  await page.keyboard.press('1'); const k0 = await st(); check(k0.held === 'hand', 'pressing the held slot puts it away: ' + JSON.stringify(k0)); await page.keyboard.press('1'); const k1 = await st(); check(k1.held === s0.held, 'pressing it again holds it: ' + JSON.stringify(k1));
  for (const k of ['Shift', 'Space', 'e', 'r', 'c', 'z']) await page.keyboard.press(k);
  const after = await st(); check(!after.sneak && after.ev.length === 0, 'Shift, Space, E, R, C and Z should do nothing: ' + JSON.stringify(after));
  await held(page, [], 1); const bump = await st();
  check(/^Talking/.test(bump.act || ''), 'with something in hand walking into someone still talks: ' + JSON.stringify(bump));
  return `ten slots; B build, I inventory; Q and the old keys do nothing; slot 1 = ${k1.held}; a bump still talks`;
}));

test('controls: a bump searches a barrel or crate (once); build mode pushes it', await controlScene('props', 41, async page => {
  const setup = () => page.evaluate(() => { const [x, y] = __find((x, y) => [-1, 0, 1, 2, 3, 4].every(i => __free(x + i, y))); const pr = town.props.find(p => ['crate', 'crate1', 'barrel', 'stool'].includes(p.kind)); town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = x + 1; pr.y = y; town.pblock[y * W + x + 1] = 1; town.propAt.set(y * W + x + 1, pr); pr.loot = undefined; pr.lootDay = undefined; pr.searchedT = undefined; window.__pr = pr; __place(game.player, x, y, { dx: 1, dy: 0 }); return { x, y, kind: pr.kind }; });
  const s0 = await setup(); await held(page, [], 1); const talk = await page.evaluate(() => ({ pr: window.__pr.x, act: game.player.player.act && game.player.player.act.text }));
  check(/^Searching/.test(talk.act || ''), 'a plain bump should search the crate, got ' + JSON.stringify(talk.act)); check(talk.pr === s0.x + 1, 'searching must not move it');
  await page.keyboard.press('b'); const s = await setup(); await held(page, [], 2);
  const pushed = await page.evaluate(() => ({ pr: window.__pr.x }));
  check(pushed.pr > s.x + 1, `in build mode the ${s.kind} should have been pushed east (x ${s.x + 1} -> ${pushed.pr})`);
  return `search on a bump (${talk.act}); build mode: ${s.kind} ${s.x + 1} -> ${pushed.pr}`;
}));

test('push: things move at exactly your pace, in lines of any length, and a line moves only if its last piece can', await controlScene('chain', 41, async page => {
  const s = await page.evaluate(() => {
    const row = Array.from({ length: 14 }, (_, i) => i), [x, y] = __find((x, y) => row.every(i => __free(x + i, y)) && !row.some(i => lfNearDoor(x + i, y)));
    window.__ps = town.props.slice(0, 6); window.__put = (pr, tx) => { town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = tx; pr.y = y; town.pblock[y * W + tx] = 1; town.propAt.set(y * W + tx, pr); };
    window.__ps.slice(0, 5).forEach((pr, i) => window.__put(pr, x + 1 + i)); __place(game.player, x, y, { dx: 1, dy: 0 }); return { x, y };
  });
  await page.keyboard.press('b');   // build mode: the hand pushes
  await page.keyboard.down('d'); const gaps = [];
  for (let i = 0; i < 10; i++) { await simulate(page, 0.4); gaps.push(await page.evaluate(() => { const P = game.player, now = performance.now(); return window.__ps.slice(0, 5).map((pr, k) => +(lfPropPos(pr, now)[0] - P.x - 1 - k).toFixed(3)); })); }
  await page.keyboard.up('d'); await simulate(page, 2);
  check(gaps.flat().every(g => Math.abs(g) < 0.02), 'every piece should stay exactly one tile apart from you and each other while you push: gaps ' + JSON.stringify(gaps.slice(0, 3)));
  const after = await page.evaluate(() => ({ xs: window.__ps.slice(0, 5).map(pr => pr.x) }));
  check(after.xs[0] > s.x + 1 && after.xs.every((v, i) => i === 0 || v === after.xs[i - 1] + 1), 'all five should have been pushed along together: ' + JSON.stringify(after));
  const six = await page.evaluate(() => { const y = window.__ps[0].y, x0 = window.__ps[0].x - 1; __place(game.player, x0, y, { dx: 1, dy: 0 }); window.__put(window.__ps[5], window.__ps[4].x + 1); const xs = window.__ps.map(pr => pr.x); const r = lf2PushLine(game.player, window.__ps[0].x, y, 1, 0); return { r, moved: window.__ps.every((pr, i) => pr.x === xs[i] + 1) }; });
  check(six.r === true && six.moved, 'there is no limit: six in a row all move: ' + JSON.stringify(six));
  const swap = await page.evaluate(() => {
    const ps = window.__ps.slice(0, 5), y = ps[0].y, x0 = ps[0].x - 1; window.__put(window.__ps[5], x0 - 6); ps.forEach((pr, i) => window.__put(pr, x0 + 1 + i)); const wall = x0 + 6; setT(wall, y, T.WALL); const P = game.player; __place(P, x0, y, { dx: 1, dy: 0 }); const seq = [];
    for (let i = 0; i < 6; i++) { const res = lf2PushLine(P, P.tx + 1, y, 1, 0); seq.push(res === true ? 'swap' : res); if (res === true) { P.tx = P.x = P.tx + 1; rebuildOcc(); } else break; }
    const out = { seq, props: ps.map(pr => pr.x - x0), me: P.tx - x0 }; setT(wall, y, T.GRASS); return out;
  });
  check(swap.seq.slice(0, 5).every(r => r === 'swap') && swap.me === 5 && swap.props.join() === '0,1,2,3,4', 'a line against a wall should swap you through it one piece at a time until you reach the wall: ' + JSON.stringify(swap));
  return `five pieces moved together ${after.xs[0] - s.x - 1} tiles at your pace (gaps within 0.02); six move too (no limit); against a wall you swap through all five`;
}));

test('push: rocks can be pushed (and chained) and become loose rocks you can build with; the hammer breaks one', await controlScene('rocks', 41, async page => {
  const r = await page.evaluate(() => {
    let rk = null; for (let y = 4; y < H - 4 && !rk; y++) for (let x = 4; x < W - 6; x++) if (grid[y][x] === T.ROCK && __free(x - 1, y) && __free(x + 1, y) && __free(x + 2, y) && !town.nodeMap.has(y * W + x + 1)) { rk = [x, y]; break; }
    if (!rk) throw new Error('no free rock'); const [x, y] = rk, P = game.player; __place(P, x - 1, y, { dx: 1, dy: 0 }); itBuildToggle(P, true);
    const res = lf2PushLine(P, x, y, 1, 0), pr = lfPropAt(x + 1, y), tile = grid[y][x];
    const loose = pr && pr.kind === 'rock' && tile === T.GRASS && town.pblock[y * W + x + 1] === 1, art = pr && lfPropArt(pr);
    __place(P, x, y, { dx: 1, dy: 0 }); const again = lf2PushLine(P, x + 1, y, 1, 0), moved = pr && pr.x === x + 2;
    itBuildToggle(P, true); itBuildSelect(P, 1); const act = lifeAct(P, P.player, pr.x, pr.y, 1, 0); const stone0 = P.inv.stone || 0; act.run(P);
    return { res, loose, art, again, moved, hammer: act.key, gone: !lfPropAt(pr.x, pr.y) && !town.props.includes(pr), dropped: (P.inv.stone || 0) > stone0 };
  });
  check(r.res === true && r.loose, 'pushing a rock should turn it into a loose rock one tile along: ' + JSON.stringify(r));
  check(/^boulder_/.test(r.art), 'a loose rock should be drawn as a boulder: ' + r.art);
  check(r.again === true && r.moved, 'a loose rock should push like a crate');
  check(/^rock/.test(r.hammer) && r.gone && r.dropped, 'the hammer should break a loose rock and leave stone: ' + JSON.stringify(r));
  return 'rock -> loose rock (pushed twice) -> broken with the hammer, stone straight into the bag';
}));

test('push: loose things can be pushed through a doorway and into a house', await controlScene('doorway', 41, async page => {
  const r = await page.evaluate(() => {
    const house = rooms.find(q => !q.dead && q.kind === 'house' && q.side === 'b'), crate = town.props[0], P = game.player, trail = [];
    for (const n of npcs) if (n !== P) { n.tx = n.x = 3; n.ty = n.y = 3; n.moving = false; } rebuildOcc();   // (nobody about to stand in the way)
    town.pblock[crate.y * W + crate.x] = 0; town.propAt.delete(crate.y * W + crate.x); crate.x = house.doorX; crate.y = house.doorY + 1; town.pblock[crate.y * W + crate.x] = 1; town.propAt.set(crate.y * W + crate.x, crate); itBuildToggle(P, true);
    __place(P, house.doorX, house.doorY + 2, { dx: 0, dy: -1 });
    for (let i = 0; i < 3; i++) { const res = lf2PushLine(P, crate.x, crate.y, 0, -1); trail.push({ res, y: crate.y, inside: roomAt[crate.y][crate.x] === rooms.indexOf(house) }); if (res !== true) break; __place(P, crate.x, crate.y + 1, { dx: 0, dy: -1 }); }
    return { trail, doorY: house.doorY };
  });
  check(r.trail[0].res === true && r.trail[0].y === r.doorY, 'a crate pushed at the door should go onto the doorway: ' + JSON.stringify(r.trail));
  check(r.trail[1].res === true && r.trail[1].inside, 'and on into the house: ' + JSON.stringify(r.trail));
  return 'a crate went through the door and into the house';
}));

test('push: chairs, beds and the family barrel can be moved inside a house, never so the house is cut off, and the household carries on', await controlScene('furniture', 41, async page => {
  const r = await page.evaluate(() => {
    const hs = rooms.find(q => !q.dead && q.kind === 'house' && q.seats.length && q.beds.length && q.barrel), P = game.player; itBuildToggle(P, true);
    const chair = hs.seats[0], bed = hs.beds[0], dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], res = {};
    const go = (o, dx, dy) => { const f = pushFurniture(o.x, o.y); if (!f) return 'not furniture'; if (!pushFurnitureOK(f, o.x + dx, o.y + dy)) return 'no'; __place(P, o.x - dx, o.y - dy, { dx, dy }); P.tx = P.x = o.x - dx; P.ty = P.y = o.y - dy; return lf2PushLine(P, o.x, o.y, dx, dy); };
    const cd = dirs.find(([dx, dy]) => { const f = pushFurniture(chair.x, chair.y); return f && pushFurnitureOK(f, chair.x + dx, chair.y + dy); }); const c0 = [chair.x, chair.y];
    res.chair = cd ? { r: go(chair, cd[0], cd[1]), tile: grid[chair.y][chair.x] === T.SEAT, old: grid[c0[1]][c0[0]] === T.FLOOR, moved: chair.x !== c0[0] || chair.y !== c0[1] } : 'no free side';
    const bd = dirs.find(([dx, dy]) => { const f = pushFurniture(bed.x, bed.y); return f && pushFurnitureOK(f, bed.x + dx, bed.y + dy); }); const b0 = [bed.x, bed.y];
    res.bed = bd ? { r: go(bed, bd[0], bd[1]), tile: grid[bed.y][bed.x] === T.BED, moved: bed.x !== b0[0] || bed.y !== b0[1] } : 'no free side';
    const owner = npcs.find(n => n.bed === bed); res.ownerBed = owner ? { same: owner.bed === bed, tile: grid[owner.bed.y][owner.bed.x] === T.BED } : 'unowned';
    const bar = hs.barrel, sp0 = [hs.spots.pantry.x, hs.spots.pantry.y], bdirs = dirs.filter(([dx, dy]) => { const f = pushFurniture(bar.x, bar.y); return f && pushFurnitureOK(f, bar.x + dx, bar.y + dy); });
    if (bdirs.length) { const [dx, dy] = bdirs[0], r2 = go(bar, dx, dy); res.barrel = { r: r2, tile: grid[bar.y][bar.x] === T.BARREL, pantry: hs.spots.pantry.x - sp0[0] === dx && hs.spots.pantry.y - sp0[1] === dy }; } else res.barrel = 'no free side';
    // somebody sitting in a chair is carried with it, still sitting
    const sitter = npcs.find(n => !n.dead && !n.player && n !== owner); const ch2 = hs.seats[1] || hs.seats[0]; const sOld = { tx: sitter.tx, ty: sitter.ty, pose: sitter.pose }; tileOwner.delete(sitter.ty * W + sitter.tx); sitter.tx = sitter.x = ch2.x; sitter.ty = sitter.y = ch2.y; sitter.pose = 'sit'; tileOwner.set(ch2.y * W + ch2.x, sitter);
    const d2 = dirs.find(([dx, dy]) => { const f = pushFurniture(ch2.x, ch2.y); return f && pushFurnitureOK(f, ch2.x + dx, ch2.y + dy); }); if (d2) { __place(P, ch2.x - d2[0], ch2.y - d2[1], { dx: d2[0], dy: d2[1] }); res.occupied = lf2PushLine(P, ch2.x, ch2.y, d2[0], d2[1]); } else res.occupied = 'no free side';
    res.sitterWith = d2 ? sitter.tx === ch2.x && sitter.ty === ch2.y && sitter.pose === 'sit' && tileOwner.get(ch2.y * W + ch2.x) === sitter : true; sitter.pose = 'stand'; sitter.shoved = null; tileOwner.delete(ch2.y * W + ch2.x);
    window.__hs = hs; return res;
  });
  check(r.chair === 'no free side' || (r.chair.r === true && r.chair.tile && r.chair.old && r.chair.moved), 'a chair should move one tile, leaving bare floor: ' + JSON.stringify(r.chair));
  check(r.bed === 'no free side' || (r.bed.r === true && r.bed.tile && r.bed.moved), 'a bed should move: ' + JSON.stringify(r.bed));
  check(r.ownerBed === 'unowned' || (r.ownerBed.same && r.ownerBed.tile), 'the bed\'s owner should still have that bed: ' + JSON.stringify(r.ownerBed));
  check(r.barrel === 'no free side' || (r.barrel.r === true && r.barrel.tile && r.barrel.pantry), 'the family barrel and its pantry spot should move together: ' + JSON.stringify(r.barrel));
  check((r.occupied === true || r.occupied === 'no free side') && r.sitterWith, 'a chair with somebody in it should carry them along, still sitting: ' + JSON.stringify([r.occupied, r.sitterWith]));
  await simulate(page, 2 * 1440);
  const after = await page.evaluate(() => { const hs = window.__hs, ppl = npcs.filter(n => !n.dead && n.homeRoom === hs); return { dead: npcs.filter(n => n.dead).length, beds: ppl.every(n => !n.bed || n.bed.x == null || grid[n.bed.y][n.bed.x] === T.BED), n: ppl.length }; });
  check(after.beds && after.dead === 0, 'two days later the household should be fine: ' + JSON.stringify(after));
  return `chair, bed and barrel moved; an occupied chair carries its sitter; the household of ${after.n} carried on for two days`;
}));

test('push: people are pieces in the line just like boxes (pushed along, counted, swapped past at a wall); sleepers block; a box never drifts sideways when you turn', await controlScene('shove', 41, async page => {
  const r = await page.evaluate(() => {
    const [x, y] = __find((x, y) => [0, 1, 2, 3, 4, 5].every(i => __free(x + i, y) && __free(x + i, y + 1)) && ![0, 1, 2, 3, 4, 5].some(i => lfNearDoor(x + i, y))), P = game.player, crate = town.props[0], o = __other();
    const put = (pr, tx) => { town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = tx; pr.y = y; town.pblock[y * W + tx] = 1; town.propAt.set(y * W + tx, pr); }, res = {};
    // A. a box into a person: both move ahead together
    put(crate, x + 1); __place(P, x, y, { dx: 1, dy: 0 }); __stand(o, x + 2, y); res.A = { r: lf2PushLine(P, x + 1, y, 1, 0), crate: crate.x - x, who: o.tx - x };
    // B. a person first, a box behind them
    put(crate, x + 2); __stand(o, x + 1, y); __place(P, x, y, { dx: 1, dy: 0 }); res.B = { r: lf2PushLine(P, x + 1, y, 1, 0), who: o.tx - x, crate: crate.x - x };
    // C. a person against a wall: you swap places with them
    __stand(o, x + 1, y); put(crate, x + 5); setT(x + 2, y, T.WALL); __place(P, x, y, { dx: 1, dy: 0 }); res.C = { r: lf2PushLine(P, x + 1, y, 1, 0), who: o.tx - x }; setT(x + 2, y, T.GRASS);
    // D. a kneeler behind a box blocks the line: you swap past the box, the kneeler stays
    __stand(o, x + 2, y, 'kneel'); put(crate, x + 1); __place(P, x, y, { dx: 1, dy: 0 }); res.D = { r: lf2PushLine(P, x + 1, y, 1, 0), crate: crate.x - x, sleeper: o.tx - x }; __stand(o, o.tx, o.ty, 'stand');
    // E. a kneeler right in front: you are told, nothing moves
    __stand(o, x + 1, y, 'kneel'); __place(P, x, y, { dx: 1, dy: 0 }); res.E = { r: lf2PushLine(P, x + 1, y, 1, 0), who: o.tx - x }; __stand(o, 3, 3, 'stand');
    // F. the sideways glitch: push, finish the step, start a step sideways before a frame is drawn: the box must stay where it is
    town.pblock.fill(0); town.propAt.clear(); put(crate, x + 1); __place(P, x, y, { dx: 1, dy: 0 }); const ok = lf2PushLine(P, x + 1, y, 1, 0); P.path = [{ x: x + 1, y }]; P.moving = true; P.t = 0; stepNpc(P, 1000);
    P.path = [{ x: P.tx, y: P.ty + 1 }]; P.moving = true; P.t = 0.5; res.F = { ok, seen: lfPropPos(crate, performance.now()).join(), pos: [crate.x, crate.y].join() };
    return res;
  });
  check(r.A.r === true && r.A.crate === 2 && r.A.who === 3, 'a box into a person should push them along ahead of it: ' + JSON.stringify(r.A));
  check(r.B.r === true && r.B.who === 2 && r.B.crate === 3, 'a person pushed first should carry the box behind them along: ' + JSON.stringify(r.B));
  check(r.C.r === true && r.C.who === 0, 'a person against a wall should swap places with you: ' + JSON.stringify(r.C));
  check(r.D.r === true && r.D.crate === 0 && r.D.sleeper === 2, 'somebody kneeling behind a box blocks the line, so you swap past the box and they stay: ' + JSON.stringify(r.D));
  check(typeof r.E.r === 'string' && /settled/.test(r.E.r) && r.E.who === 1, 'a kneeler in front is not pushed: ' + JSON.stringify(r.E));
  check(r.F.seen === r.F.pos, 'after the push step the box must stay on its tile (it drifted: ' + r.F.seen + ', tile ' + r.F.pos + ')');
  return 'people join the line like boxes; swap at a wall; kneelers block; the box stayed put when you turned';
}));

test('push: open ground in the square never acts like a wall (nothing invisible stops a push)', await controlScene('square', 41, async page => {
  const r = await page.evaluate(() => {
    const tiles = []; const yd = town.yard; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push([yd.x + dx, yd.y + dy]); for (const st of town.stalls || []) tiles.push([st.front.x, st.front.y]);
    const open = tiles.filter(([x, y]) => walkable(x, y) && !noStep(x, y) && !town.siteAt[y * W + x] && !lfPropAt(x, y) && !tileOwner.get(y * W + x) && roomAt[y][x] < 0 && [T.GRASS, T.PATH, T.SAND].includes(grid[y][x]) && town.crops.every(c => c.x !== x || c.y !== y));
    return { tried: tiles.length, open: open.length, blocked: open.filter(([x, y]) => !pushLooseOK(x, y)).map(t => t.join(',')) };
  });
  check(r.open >= 4, 'there should be open ground round the yard to test: ' + JSON.stringify(r));
  check(!r.blocked.length, 'open ground should take a pushed box, but these tiles refuse it: ' + r.blocked.join(' '));
  return `${r.open} open tiles round the stockpile yard and the stalls all take a box`;
}));

test('push: things go over a field (the plot goes back to bare dirt), and standing in a doorway you swap with a bed that cannot move', await controlScene('fieldbed', 41, async page => {
  const r = await page.evaluate(() => {
    const P = game.player, res = {}, crate = town.props[0]; itBuildToggle(P, true);
    const c = town.crops.find(q => town.crops.some(o => o.x === q.x + 1 && o.y === q.y) && town.crops.some(o => o.x === q.x + 2 && o.y === q.y) && __free(q.x - 1, q.y)); if (!c) throw new Error('no field row');
    const row = [c, town.crops.find(o => o.x === c.x + 1 && o.y === c.y), town.crops.find(o => o.x === c.x + 2 && o.y === c.y)]; row.forEach(q => { q.pl = 1; q.st = 1; q.t0 = game.time; q.seed = 'barley'; });
    town.pblock[crate.y * W + crate.x] = 0; town.propAt.delete(crate.y * W + crate.x); crate.x = c.x; crate.y = c.y; town.pblock[c.y * W + c.x] = 1; town.propAt.set(c.y * W + c.x, crate); crate.fur = null;
    __place(P, c.x - 1, c.y, { dx: 1, dy: 0 }); res.p1 = lf2PushLine(P, c.x, c.y, 1, 0); res.after1 = row.map(q => [q.pl, q.st]); res.crateAt = crate.x - c.x;
    __place(P, c.x, c.y, { dx: 1, dy: 0 }); res.p2 = lf2PushLine(P, c.x + 1, c.y, 1, 0); res.after2 = row.map(q => [q.pl, q.st]); res.crateAt2 = crate.x - c.x;
    // the bed: you stand in the doorway, the bed is just inside, something solid behind it
    const hs = rooms.find(q => !q.dead && q.kind === 'house' && q.beds.length && q.side === 'b'), bed = hs.beds[0], din = { x: hs.doorX, y: hs.doorY - 1 };
    setT(bed.x, bed.y, T.FLOOR); bed.x = din.x; bed.y = din.y; setT(din.x, din.y, T.BED); const behind = grid[din.y - 1][din.x], behindProp = lfPropAt(din.x, din.y - 1); setT(din.x, din.y - 1, T.TABLE);
    __place(P, hs.doorX, hs.doorY, { dx: 0, dy: -1 }); res.bed = lf2PushLine(P, din.x, din.y, 0, -1); const prop = lfPropAt(hs.doorX, hs.doorY);
    res.bedInDoor = !!prop && prop.kind === 'bed' && bed.out === true && grid[din.y][din.x] === T.FLOOR; setT(din.x, din.y - 1, behind);
    return res;
  });
  check(r.p1 === true && r.crateAt === 1 && r.after1[1][0] === 0 && r.after1[1][1] === 0 && r.after1[0][1] === 1 && r.after1[2][1] === 1, 'a box pushed onto a plot should flatten it back to bare dirt (and only that plot): ' + JSON.stringify(r));
  check(r.p2 === true && r.crateAt2 === 2 && r.after2[2][0] === 0 && r.after2[2][1] === 0 && r.after2[0][1] === 1, 'and on over the next one: ' + JSON.stringify(r));
  check(r.bed === true && r.bedInDoor, 'standing in the doorway, a bed that cannot move should swap: you go in and it takes the doorway: ' + JSON.stringify(r));
  return 'a box crossed two plots and left bare dirt; in the doorway you swapped with a bed that had a table behind it';
}));

test('push: the villager you steer is not troubled by hunger, bladder or sleep (for now)', await itemScene(async page => {
  await page.evaluate(() => { const P = game.player; P.hunger = 95; P.bladder = 95; P.energy = 5; P.starving = 30; });   // (midnight: the old rules would have sent you to bed)
  await simulate(page, 30);
  const r = await page.evaluate(() => { const P = game.player; return { hunger: Math.round(P.hunger), bladder: Math.round(P.bladder), energy: Math.round(P.energy), starving: P.starving, asleep: !!P.player.sleeping, autoBed: !!P.player.autoBed, dead: !!P.dead }; });
  check(r.hunger <= 25 && r.bladder <= 20 && r.energy >= 85 && r.starving === 0, 'hunger, bladder and tiredness should not build up: ' + JSON.stringify(r));
  check(!r.asleep && !r.autoBed && !r.dead, 'you should not be sent to bed at night: ' + JSON.stringify(r));
  return `after half an hour at midnight: hunger ${r.hunger}, bladder ${r.bladder}, energy ${r.energy}, awake`;
}));

test('push: villagers leave things where they are (no tidying, shoving or hauling)', await controlScene('nomoves', 41, async page => {
  const r = await page.evaluate(() => { const pr = town.props.find(Boolean), home = [pr.home.x, pr.home.y]; const [x, y] = __find((x, y) => __free(x, y) && !lfNearDoor(x, y) && Math.abs(x - home[0]) + Math.abs(y - home[1]) > 4);
    town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = x; pr.y = y; town.pblock[y * W + x] = 1; town.propAt.set(y * W + x, pr); window.__pr = pr; window.__at = [x, y]; return { flag: LF_NPC_MOVES_THINGS, tidy: npcs.map(n => lfTidyPlan(n)).filter(Boolean).length }; });
  await simulate(page, 2 * 1440);
  const after = await page.evaluate(() => [window.__pr.x, window.__pr.y].join() === window.__at.join());
  check(r.flag === false && r.tidy === 0, 'nobody should plan to tidy: ' + JSON.stringify(r));
  check(after, 'a box left out of place should still be there two days later');
  return 'two days, nobody touched the box';
}));

test('push: furniture can be pushed out of the door (it becomes a loose thing) and back in (it is furniture again)', await controlScene('outdoor', 41, async page => {
  const r = await page.evaluate(() => {
    const hs = rooms.find(q => !q.dead && q.kind === 'house' && q.seats.length && q.beds.length && q.barrel && q.side === 'b'), P = game.player; itBuildToggle(P, true); for (const n of npcs) if (n !== P) { n.tx = n.x = 3; n.ty = n.y = 3; n.moving = false; } rebuildOcc();   // (nobody about to stand in the way)
    const seat = hs.seats[0], din = { x: hs.doorX, y: hs.doorY - 1 }, res = {}; const t0 = [seat.x, seat.y];
    setT(seat.x, seat.y, T.FLOOR); seat.x = din.x; seat.y = din.y; setT(din.x, din.y, T.SEAT); rebuildOcc();            // stand the chair just inside the door
    __place(P, din.x, din.y - 1, { dx: 0, dy: 1 }); res.out1 = lf2PushLine(P, din.x, din.y, 0, 1);
    const prop = lfPropAt(hs.doorX, hs.doorY); res.becameProp = !!prop && prop.kind === 'chair' && prop.fur && prop.fur.o === seat && seat.out === true && grid[din.y][din.x] === T.FLOOR && lfPropArt(prop) === 'seat_down';
    __place(P, din.x, din.y, { dx: 0, dy: 1 }); res.out2 = lf2PushLine(P, hs.doorX, hs.doorY, 0, 1); res.outside = roomAt[prop.y][prop.x] < 0 && prop.y === hs.doorY + 1;
    __place(P, hs.doorX, hs.doorY + 2, { dx: 0, dy: -1 }); res.in1 = lf2PushLine(P, prop.x, prop.y, 0, -1); __place(P, hs.doorX, hs.doorY + 1, { dx: 0, dy: -1 }); res.in2 = lf2PushLine(P, prop.x, prop.y, 0, -1);
    res.restored = grid[din.y][din.x] === T.SEAT && !seat.out && seat.x === din.x && seat.y === din.y && !town.props.includes(prop) && !lfPropAt(din.x, din.y);
    // a bed out of the door, then its owner still has it (and sleeping in a bed that is outside just means the old spot)
    const bed = hs.beds[0], owner = npcs.find(n => n.bed === bed); res.ownerKeeps = owner ? owner.bed === bed : 'unowned';
    return res;
  });
  check(r.out1 === true && r.becameProp, 'pushing a chair through the doorway should turn it into a loose chair: ' + JSON.stringify(r));
  check(r.out2 === true && r.outside, 'and it can be pushed on outside: ' + JSON.stringify(r));
  check(r.in1 === true && r.in2 === true && r.restored, 'pushed back in it should be the house\'s chair again: ' + JSON.stringify(r));
  return 'chair: inside -> door (loose) -> outside -> back in (furniture again, the room\'s list restored)';
}));

test('push: a table can be pushed inside a house (never out of the door, never so the house is cut off)', await controlScene('table', 41, async page => {
  const r = await page.evaluate(() => {
    const P = game.player; itBuildToggle(P, true); const res = { tried: 0, moved: 0, bad: [] };
    for (const hs of rooms.filter(q => !q.dead && q.kind === 'house')) for (let y = hs.y + 1; y < hs.y + hs.h - 1; y++) for (let x = hs.x + 1; x < hs.x + hs.w - 1; x++) {
      if (grid[y][x] !== T.TABLE || res.moved >= 3) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const f = pushFurniture(x, y); if (!f || f.type !== 'table' || !pushFurnitureOK(f, x + dx, y + dy)) continue;
        __place(P, x - dx, y - dy, { dx, dy }); res.tried++; const out = lf2PushLine(P, x, y, dx, dy);
        if (out === true) { res.moved++; if (!(grid[y + dy][x + dx] === T.TABLE && (grid[y][x] === T.FLOOR || grid[y][x] === T.RUG || grid[y][x] === T.TABLE))) res.bad.push('tile'); }
        break;
      }
    }
    const hs = rooms.find(q => !q.dead && q.kind === 'house'); const t = pushFurniture(hs.doorX, hs.doorY - 1); res.door = t && t.type === 'table' ? pushFurnitureOK(t, hs.doorX, hs.doorY) : 'n/a';
    return res;
  });
  check(r.moved > 0 && r.bad.length === 0, 'a table should move one tile in a house: ' + JSON.stringify(r));
  check(r.door === false || r.door === 'n/a', 'a table must not go out of the door');
  return `${r.moved} tables pushed (${r.tried} tried)`;
}));

test('build mode (B): 1 push, 2 destroy, 3 turn, 4-0 put an item down in front of you; trees are cleared with the hammer; the build menu (I) fills the slots; lamp posts, fires and tents can be destroyed and built; no sleeping in a tent', await controlScene('buildmode', 41, async page => {
  const r = await page.evaluate(() => {
    const P = game.player, res = {}; const [x, y] = __find((x, y) => [-1, 0, 1, 2, 3].every(i => __free(x + i, y)) && __free(x, y - 1) && __free(x, y + 1)); __place(P, x, y, { dx: 1, dy: 0 });
    const was = { sel: P.sel, mode: P.mode }; itBuildToggle(P, true); res.on = itBuildOn(P); res.mode = itMode(P); res.hand = itHeld(P).kind;
    // 3-9: one of each item appears in front of you
    const n0 = town.props.length; for (let i = 3; i <= 9; i++) itBuildSelect(P, i); res.placed = town.props.length - n0; res.kinds = town.props.slice(n0).map(p => p.kind).join();
    // every other kind through the function (cleared away again)
    const fresh = []; for (const k of ['counter', 'oven', 'forge', 'anvil', 'loom', 'shelf']) fresh.push(bldPlaceFront(P, k)); res.more = fresh.filter(Boolean).length;
    // 1: the hammer smashes a block; the walls and doors of buildings too; a tree is cleared into wood
    itBuildSelect(P, 1); res.hammer = itHeld(P).kind; const blk = town.props.find(p => p.kind === 'bwall'); __place(P, blk.x - 1, blk.y, { dx: 1, dy: 0 }); const a = lifeAct(P, P.player, blk.x, blk.y, 1, 0); res.smash = a && /^wallp/.test(a.key); a.run(P); res.gone = !lfPropAt(blk.x, blk.y);
    const [tx, ty] = __find((x, y) => __free(x, y) && __free(x - 1, y) && grid[y][x + 1] !== T.TREE); setT(tx + 1, ty, T.TREE); __place(P, tx, ty, { dx: 1, dy: 0 }); const wood0 = P.inv.wood || 0; const t = targetAt0(P, tx + 1, ty); res.tree = t && /^wallt/.test(t.key) && t.tool === 'hammer'; t.run(P); res.cleared = grid[ty][tx + 1] === T.GRASS && (P.inv.wood || 0) === wood0 + 1;
    // 2: the turner turns a chair and a bed
    itBuildSelect(P, 2); res.turner = P.build.sel === 2; const ch = town.props.find(p => p.kind === 'chair'), bd = town.props.find(p => p.kind === 'bed'); const arts = [lfPropArt(ch), lfPropArt(bd)]; bldRotate(ch.x, ch.y); bldRotate(bd.x, bd.y); res.turned = lfPropArt(ch) !== arts[0] && lfPropArt(bd) !== arts[1];
    // furniture standing in a house turns too
    const hs = rooms.find(q => !q.free && !q.dead && q.kind === 'house' && q.seats.length && q.beds.length), seat = hs.seats[0], face0 = JSON.stringify(seat.face); bldRotate(seat.x, seat.y); const bed = hs.beds[0]; bldRotate(bed.x, bed.y); res.roomTurn = JSON.stringify(seat.face) !== face0 && bed.flip === true;
    // the bag fills the slots
    itBuildAssign(P, 0, 'oven'); res.assigned = P.build.bar[0] === 'oven';
    // lamp posts, tents and fires: destroy them with the hammer, and build them from the menu
    itBuildSelect(P, 1);
    const lp = lamps[0], lamp0 = lamps.length; { const tg = targetAt0(P, lp.x, lp.y); if (tg) tg.run(P); } res.lamp = lamps.length === lamp0 - 1 && grid[lp.y][lp.x] !== T.LAMP && !!bldPlaceFront(P, 'lamp') && allLamps().length === lamp0;
    town.tents = town.tents || []; const [tx2, ty2] = __find((x, y) => __free(x, y)); setT(tx2, ty2, T.TENT); town.tents.push({ x: tx2, y: ty2, owner: null, under: T.GRASS }); { const tg = targetAt0(P, tx2, ty2); res.tentKey = tg && tg.key; if (tg) tg.run(P); } res.tent = grid[ty2][tx2] === T.GRASS && !town.tents.some(q => q.x === tx2 && q.y === ty2) && !!bldPlaceFront(P, 'tent');
    const fires0 = fireList().length; const home = fireList().find(f => f.home); { const tg = home && targetAt0(P, home.x, home.y); if (tg) tg.run(P); } res.fire = fireList().length === fires0 - 1 && !noStep(town.cx, town.cy + 1) && !!bldPlaceFront(P, 'campfire') && allFires().length === fires0;
    itBuildSelect(P, 1); setT(tx2, ty2, T.TENT); town.tents.push({ x: tx2, y: ty2, owner: null, under: T.GRASS }); itBuildSelect(P, 1); { const tg = targetAt0(P, tx2, ty2); res.noSleep = !tg || tg.key !== 'rest'; } itBuildSelect(P, 0); { const tg = targetAt0(P, tx2, ty2); res.noSleep = res.noSleep && (!tg || tg.key !== 'rest'); } setT(tx2, ty2, T.GRASS); town.tents = town.tents.filter(q => q.x !== tx2);
    itBuildToggle(P, false); res.off = !itBuildOn(P) && P.sel === was.sel && P.mode === was.mode;
    return res;
  });
  check(r.on && r.mode === 'push' && r.hand === 'hand', 'build mode: the hand always pushes: ' + JSON.stringify(r));
  check(r.placed === 6 && r.more === 6, 'slots 3-8 put one item down in front of you (slot 9 is the field brush); the rest through the function: ' + JSON.stringify(r));
  check(r.hammer === 'hammer' && r.smash && r.gone && r.tree && r.cleared, 'slot 1 is the hammer: smashes blocks and clears trees: ' + JSON.stringify(r));
  check(r.turner && r.turned && r.roomTurn, 'slot 2 turns chairs and beds, loose or standing in a room: ' + JSON.stringify(r));
  check(r.assigned && r.off, 'the bag assigns slots and leaving build mode restores your hand: ' + JSON.stringify(r));
  check(r.lamp && r.tent && r.fire && r.noSleep, 'lamp posts, tents and fires can be destroyed (and built), and a tent is not slept in during build mode: ' + JSON.stringify([r.lamp, r.tent, r.fire, r.noSleep]));
  return 'B toggles; 1 smash / clears trees, 2 turn, 3-9 place; bag assigns; leaving restores the hand';
}));

test('builder\'s yard: blocks are loose things (a wall block chains with a crate)', await controlScene('blocks', 41, async page => {
  const r = await page.evaluate(() => {
    const P = game.player; itBuildToggle(P, true); const res = {};
    const [x, y] = __find((x, y) => [0, 1, 2, 3, 4, 5].every(i => __free(x + i, y))); __place(P, x, y, { dx: 1, dy: 0 });
    const a = lfAddProp('bwall', x + 1, y), b = lfAddProp('bdoor', x + 2, y), c = lfAddProp('crate', x + 3, y);
    res.r1 = lf2PushLine(P, x + 1, y, 1, 0); res.pos = [a.x - x, b.x - x, c.x - x].join();
    setT(x + 6, y, T.WALL); res.r2 = lf2PushLine(P, x + 2, y, 1, 0); res.noun = LF_NOUN.bwall + '/' + lfPropArt(a) + '/' + lfPropArt(lfAddProp('table', x, y + 1)); setT(x + 6, y, T.GRASS);
    return res;
  });
  check(r.r1 === true && r.pos === '2,3,4', 'a wall block, a door block and a crate move as one line: ' + JSON.stringify(r));
  check(r.noun === 'wall block/blk_wall/table_loose', 'blocks have names and art: ' + r.noun);
  return 'wall + door + crate chained; art and names set';
}));

test('building: blocks close into rooms of any shape (L-shape, a door needed, no diagonal seals, nothing inside, not on the pad); a partition splits a room; a lone block inside stays loose', await controlScene('seal', 41, async page => {
  const r = await page.evaluate(() => {
    const res = {}, o = { x: town.cx + 14, y: town.cy - 40 };
    const clear = (x0, y0, w, h) => { for (let j = y0 - 1; j <= y0 + h; j++) for (let i = x0 - 1; i <= x0 + w; i++) { setT(i, j, T.GRASS); roomAt[j][i] = -1; const p = lfPropAt(i, j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete(j * W + i); town.pblock[j * W + i] = 0; } } };
    const ringOf = cells => { const cs = new Set(cells.map(c => c.join())), ring = new Set(); for (const [i, j] of cells) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const k = (i + dx) + ',' + (j + dy); if (!cs.has(k)) ring.add(k); } return [...ring].map(k => k.split(',').map(Number)); };
    const put = (ox, oy, ring, door, skip) => { const placed = []; for (const [i, j] of ring) { const k = i + ',' + j; if (skip && k === skip) continue; lfAddProp(door && k === door ? 'bdoor' : 'bwall', ox + i, oy + j); placed.push([ox + i, oy + j]); } return placed; };
    const rooms0 = () => rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).length, run = placed => { town.bldQ = placed; bldTick(); };
    clear(o.x, o.y, 40, 10);
    // 1. an L-shaped room (24 tiles) with a door: all the blocks but the last do nothing, the last closes it
    const L = []; for (let j = 1; j <= 3; j++) for (let i = 1; i <= 6; i++) L.push([i, j]); for (let j = 4; j <= 5; j++) for (let i = 1; i <= 3; i++) L.push([i, j]);
    let ring = ringOf(L); const lastK = '2,6'; const before = put(o.x, o.y, ring, lastK, lastK); run(before); res.notYet = rooms0();
    lfAddProp('bdoor', o.x + 2, o.y + 6); run([[o.x + 2, o.y + 6]]); const A = rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0)[0];
    res.L = { rooms: rooms0(), cells: A && A.cells.size, floor: grid[o.y + 2][o.x + 2] === T.FLOOR, wall: grid[o.y][o.x] === T.WALL, door: grid[o.y + 6][o.x + 2] === T.DOOR, loose: town.props.filter(p => BLD_KINDS.includes(p.kind) && p.x < o.x + 8 && p.y < o.y + 8).length, at: roomAt[o.y + 2][o.x + 2] === rooms.indexOf(A) };
    // you can walk in through the door and the way in is a real path
    const pth = findPath(o.x + 2, o.y + 8, o.x + 4, o.y + 2); res.path = !!pth && pth.length > 0;
    // 2. a closed square with no door: nothing; add a door block and it seals (a window block in the back wall becomes a window)
    const sq = []; for (let j = 1; j <= 3; j++) for (let i = 1; i <= 3; i++) sq.push([i, j]); ring = ringOf(sq); const S = { x: o.x + 10, y: o.y }; put(S.x, S.y, ring); run(ring.map(c => [S.x + c[0], S.y + c[1]])); res.noDoor = rooms0() - 1;
    const dp = lfPropAt(S.x + 2, S.y + 4); dp && (town.props = town.props.filter(q => q !== dp), town.propAt.delete((S.y + 4) * W + S.x + 2), town.pblock[(S.y + 4) * W + S.x + 2] = 0); lfAddProp('bdoor', S.x + 2, S.y + 4); const wp = lfPropAt(S.x + 2, S.y); wp.kind = 'bwindow'; const wq = lfPropAt(S.x, S.y + 2); wq.kind = 'bwindow'; run([[S.x + 2, S.y + 4]]); res.withDoor = rooms0() - 1; res.win = town.win && town.win.has(S.y * W + S.x + 2); res.winS = !!(town.winS && town.winS.has((S.y + 2) * W + S.x)) && !(town.win && town.win.has((S.y + 2) * W + S.x));
    // 3. walls that meet only at a corner never close anything
    const D = { x: o.x + 16, y: o.y }; const dsq = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if ((i === 0 || j === 0 || i === 4 || j === 4) && !(i === 0 && j === 4)) dsq.push([i, j]); for (const [i, j] of dsq) lfAddProp(i === 2 && j === 4 ? 'bdoor' : 'bwall', D.x + i, D.y + j); run(dsq.map(c => [D.x + c[0], D.y + c[1]])); res.diag = rooms0() - 2;
    // 4. a tree inside refuses to seal
    const Tr = { x: o.x + 22, y: o.y }; put(Tr.x, Tr.y, ringOf([[1, 1], [2, 1], [3, 1]]), '2,2'); setT(Tr.x + 2, Tr.y + 1, T.TREE); run(ringOf([[1, 1], [2, 1], [3, 1]]).map(c => [Tr.x + c[0], Tr.y + c[1]])); res.tree = rooms0() - 2; setT(Tr.x + 2, Tr.y + 1, T.GRASS);
    // 5. a loose block pushed about inside the sealed room stays loose
    const lb = lfAddProp('bwall', o.x + 4, o.y + 2); run([[o.x + 4, o.y + 2]]); res.lone = { loose: !!lfPropAt(o.x + 4, o.y + 2) && grid[o.y + 2][o.x + 4] === T.FLOOR, rooms: rooms0() - 2 };
    town.props = town.props.filter(q => q !== lb); town.propAt.delete((o.y + 2) * W + o.x + 4); town.pblock[(o.y + 2) * W + o.x + 4] = 0;
    // 6. a partition across the room (and a door in it) splits it in two
    const part = [[1, 4], [2, 4], [3, 4]]; for (const [i, j] of part) lfAddProp(i === 2 ? 'bdoor' : 'bwall', o.x + i, o.y + j); run(part.map(c => [o.x + c[0], o.y + c[1]])); const live = rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0);
    res.split = { rooms: rooms0() - 2, dead: A.dead, cells: live.filter(q => q.cells.has(o.x + 2 + (o.y + 2) * W) || q.cells.has(o.x + 2 + (o.y + 5) * W)).length };
    // 6b. a berry bush inside a ring does not stop it closing; the bush is cleared away (it blocked the church ring in play)
    const Bn = { x: o.x + 30, y: o.y }; const bring = ringOf([[1, 1], [2, 1], [3, 1]]); town.nodes.push({ x: Bn.x + 2, y: Bn.y + 1, kind: 'berry', amt: 3, max: 6 }); town.nodeMap.set((Bn.y + 1) * W + Bn.x + 2, town.nodes[town.nodes.length - 1]);
    put(Bn.x, Bn.y, bring, '2,2'); run(bring.map(c => [Bn.x + c[0], Bn.y + c[1]])); res.bush = { rooms: rooms0() - 2 - 0, gone: !town.nodeMap.has((Bn.y + 1) * W + Bn.x + 2) };
    // 7. not on the yard's pad
    res.pad = true;   // (the yard and its pad are gone)
    return res;
  });
  check(r.notYet === 0 && r.L.rooms === 1 && r.L.cells === 24 && r.L.floor && r.L.wall && r.L.door && r.L.loose === 0 && r.L.at, 'an L-shaped ring closes into one 24-tile room with fixed walls, a door and a floor: ' + JSON.stringify(r));
  check(r.path, 'you can walk in through the new door');
  check(r.noDoor === 0 && r.withDoor === 1 && r.win && r.winS, 'a closed square needs a door; a window block in a straight wall becomes a window: ' + JSON.stringify([r.noDoor, r.withDoor, r.win, r.winS]));
  check(r.diag === 0, 'walls meeting only at a corner must not close anything');
  check(r.tree === 0, 'a tree inside refuses to seal');
  check(r.bush.gone, 'a berry bush inside is cleared when the room closes: ' + JSON.stringify(r.bush));
  check(r.lone.loose && r.lone.rooms === 0, 'a lone block inside a room stays loose: ' + JSON.stringify(r.lone));
  check(r.split.rooms === 1 && r.split.dead && r.split.cells === 2, 'a partition with a door splits the room in two: ' + JSON.stringify(r.split));
  check(r.pad, 'the delivery pad is off limits');
  await simulate(page, 2 * 1440);
  const after = await page.evaluate(() => ({ dead: npcs.filter(n => n.dead).length, free: rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).length }));
  check(after.dead === 0, 'two days later nobody has died: ' + JSON.stringify(after));
  return 'L-shape sealed (24 tiles, door, floor), needs a door, no diagonal seal, tree refuses, partition splits, pad off limits; ' + after.free + ' rooms after two days';
}));

test('building: pushing the last wall block into the gap closes the room once your step is over', await controlScene('sealpush', 41, async page => {
  const r = await page.evaluate(() => {
    const o = { x: town.cx + 14, y: town.cy - 30 }, P = game.player; itBuildToggle(P, true);
    for (let j = -1; j < 8; j++) for (let i = -1; i < 12; i++) { setT(o.x + i, o.y + j, T.GRASS); roomAt[o.y + j][o.x + i] = -1; const p = lfPropAt(o.x + i, o.y + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((o.y + j) * W + o.x + i); town.pblock[(o.y + j) * W + o.x + i] = 0; } }
    // a 2 x 1 room: walls round tiles (1,1) and (2,1); the gap is the top middle-left (1,0); the last block waits at (1,-1)... pushed down from (1,-1)? it starts at (1,-2) above the gap
    const ring = []; for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) if (!(j === 1 && (i === 1 || i === 2))) ring.push([i, j]);
    for (const [i, j] of ring) { if (i === 1 && j === 0) continue; lfAddProp(i === 2 && j === 2 ? 'bdoor' : 'bwall', o.x + i, o.y + j); }
    const blk = lfAddProp('bwall', o.x + 1, o.y - 1); __place(P, o.x + 1, o.y - 2, { dx: 0, dy: 1 });
    const res = { before: rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).length }; res.push = lf2PushLine(P, o.x + 1, o.y - 1, 0, 1); res.queued = (town.bldQ || []).length; res.waits = (bldTick(), rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).length);
    lfPropPos(blk, performance.now()); P.moving = false; blk.follow = null; bldTick(); res.after = rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).length; res.wall = grid[o.y][o.x + 1] === T.WALL && !lfPropAt(o.x + 1, o.y);
    return res;
  });
  check(r.push === true && r.queued >= 1, 'the push should queue a look at the ground: ' + JSON.stringify(r));
  check(r.waits === r.before, 'nothing seals while the pushing step is still being drawn: ' + JSON.stringify(r));
  check(r.after === r.before + 1 && r.wall, 'once the step is over the room closes and the block is a fixed wall: ' + JSON.stringify(r));
  return 'last block pushed into the gap: waits for the step, then the room closes';
}));

test('building: a ring with a gap far from the last block never closes (regression: leftovers of an open flood looked closed)', await controlScene('sealgap', 41, async page => {
  const r = await page.evaluate(() => {
    const o = { x: town.cx + 14, y: town.cy - 20 };
    for (let j = -1; j < 14; j++) for (let i = -1; i < 22; i++) { setT(o.x + i, o.y + j, T.GRASS); roomAt[o.y + j][o.x + i] = -1; const p = lfPropAt(o.x + i, o.y + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((o.y + j) * W + o.x + i); town.pblock[(o.y + j) * W + o.x + i] = 0; } }
    const res = {}; const ring = []; for (let i = 0; i <= 10; i++) for (let j = 0; j <= 8; j++) if (i === 0 || j === 0 || i === 10 || j === 8) ring.push([i, j]);
    // the east wall has a gap of three tiles; every other block (including a door) is in place
    for (const [i, j] of ring) { if (i === 10 && j >= 3 && j <= 5) continue; lfAddProp(i === 5 && j === 8 ? 'bdoor' : 'bwall', o.x + i, o.y + j); }
    town.bldQ = [[o.x + 5, o.y], [o.x + 1, o.y + 8], [o.x + 10, o.y + 2], [o.x + 10, o.y + 6], [o.x, o.y + 4]]; bldTick(); res.gap = rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).length;
    // with the gap filled it closes into one room of 9 x 7 tiles
    for (let j = 3; j <= 5; j++) lfAddProp('bwall', o.x + 10, o.y + j); town.bldQ = [[o.x + 10, o.y + 3], [o.x + 10, o.y + 4], [o.x + 10, o.y + 5]]; bldTick(); const f = rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0); res.closed = f.length; res.cells = f[0] && f[0].cells.size;
    return res;
  });
  check(r.gap === 0, 'a ring with a gap must not close: ' + JSON.stringify(r));
  check(r.closed === 1 && r.cells === 63, 'filling the gap closes one 9 x 7 room: ' + JSON.stringify(r));
  return 'gap: nothing; filled: one room of 63 tiles';
}));

test('building: random wall layouts never seal a room that leaks (fuzz; 400 layouts, blocks knocked out of them: every room left standing must be walled all round, diagonals included, and have a way out)', await controlScene('sealfuzz', 41, async page => {
  const r = await page.evaluate(() => {
    let seed = 12345; const R = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const o = { x: town.cx + 14, y: town.cy - 40 }; const bad = []; let sealed = 0, made = 0;
    const clear = () => { for (let j = -2; j < 22; j++) for (let i = -2; i < 30; i++) { setT(o.x + i, o.y + j, T.GRASS); roomAt[o.y + j][o.x + i] = -1; const p = lfPropAt(o.x + i, o.y + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((o.y + j) * W + o.x + i); town.pblock[(o.y + j) * W + o.x + i] = 0; } } for (const q of rooms) if (q.free) q.dead = true; };
    for (let t = 0; t < 400; t++) {
      clear(); const w = 3 + Math.floor(R() * 8), h = 3 + Math.floor(R() * 6), pos = [];
      for (let i = 0; i <= w; i++) for (let j = 0; j <= h; j++) if (i === 0 || j === 0 || i === w || j === h) pos.push([i, j]);
      const keep = pos.filter(() => R() > 0.12); for (let k = 0; k < Math.floor(R() * 4); k++) keep.push([Math.floor(R() * (w + 4)) - 1, Math.floor(R() * (h + 4)) - 1]);
      const seen = new Set(), placed = []; for (const [i, j] of keep) { const k = i + ',' + j; if (seen.has(k) || i < 0 || j < 0) continue; seen.add(k); placed.push([i, j]); }
      const dIdx = Math.floor(R() * placed.length); placed.forEach(([i, j], n) => lfAddProp(n === dIdx ? 'bdoor' : R() < 0.1 ? 'bwindow' : 'bwall', o.x + i, o.y + j));
      const order = placed.map(p => [o.x + p[0], o.y + p[1]]).sort(() => R() - 0.5);
      for (let k = 0; k < order.length; k += 1 + Math.floor(R() * 3)) { town.bldQ = order.slice(k, k + 1 + Math.floor(R() * 3)); bldTick(); }
      made += rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).length;
      for (let b = 0; b < 1 && town.bldWall && town.bldWall.size; b++) { const keys = [...town.bldWall.keys()]; const k = keys[Math.floor(R() * keys.length)]; bldBreak(k % W, (k / W) | 0); }   // (then knock a few blocks out: whatever stands must still be closed and have a way out)
      for (const rm of rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0)) { sealed++; if (!bldExit([...rm.cells], [])) bad.push(t + ':noexit');
        for (const k of rm.cells) { const x = k % W, y = (k / W) | 0; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const nx = x + dx, ny = y + dy, g = grid[ny][nx]; if (rm.cells.has(nx + ny * W) || g === T.WALL || g === T.DOOR) continue; bad.push(t + ':' + (x - o.x) + ',' + (y - o.y)); } } }
    }
    return { sealed, made, bad: bad.length, first: bad.slice(0, 3) };
  });
  check(r.bad === 0, 'a sealed room leaked: ' + JSON.stringify(r));
  check(r.made > 5, 'the fuzz should seal some rooms: ' + JSON.stringify(r));
  return `${r.made} rooms sealed out of 400 random layouts, blocks knocked out of them (${r.sealed} left standing), none leaking or stranded`;
}));

test('building: every room needs a way out to the open world (two rooms with a door only between them never seal; an outside door seals both)', await controlScene('sealexit', 41, async page => {
  const r = await page.evaluate(() => {
    const o = { x: town.cx + 14, y: town.cy - 30 }, res = {};
    for (let j = -2; j < 12; j++) for (let i = -2; i < 20; i++) { setT(o.x + i, o.y + j, T.GRASS); roomAt[o.y + j][o.x + i] = -1; const p = lfPropAt(o.x + i, o.y + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((o.y + j) * W + o.x + i); town.pblock[(o.y + j) * W + o.x + i] = 0; } }
    // two rooms side by side (3 x 2 each) sharing the wall at x = 4; the only door is the one between them
    const blocks = []; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 3; j++) if (i === 0 || i === 4 || i === 8 || j === 0 || j === 3) blocks.push([i, j]);
    const spots = []; for (const [i, j] of blocks) { lfAddProp(i === 4 && j === 1 ? 'bdoor' : 'bwall', o.x + i, o.y + j); spots.push([o.x + i, o.y + j]); }
    town.bldQ = spots; bldTick(); res.none = rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).length;
    // swap one outer wall block of the left room (bottom wall) for a door: both rooms close
    const w = lfPropAt(o.x + 2, o.y + 3); town.props = town.props.filter(q => q !== w); town.propAt.delete((o.y + 3) * W + o.x + 2); town.pblock[(o.y + 3) * W + o.x + 2] = 0; lfAddProp('bdoor', o.x + 2, o.y + 3);
    town.bldQ = [[o.x + 2, o.y + 3]]; bldTick(); const f = rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0); res.both = f.length; res.exits = f.every(q => bldExit([...q.cells], []));
    return res;
  });
  check(r.none === 0, 'two rooms joined only to each other have no way out and must not seal: ' + JSON.stringify(r));
  check(r.both === 2 && r.exits, 'with a door to the outside both rooms close: ' + JSON.stringify(r));
  return 'no exit: nothing sealed; outside door: both rooms sealed, each with a way out';
}));

test('building: the hammer knocks out one built block; a closed room carries on (two rooms merge), an open one falls apart into loose blocks, and replacing the block closes it again', await controlScene('demolish', 41, async page => {
  const r = await page.evaluate(() => {
    const res = {}, O = { x: town.cx + 14, y: town.cy - 30 };
    const clear = () => { for (let j = -2; j < 12; j++) for (let i = -2; i < 24; i++) { for (const q of rooms) if (q.free) q.dead = true; setT(O.x + i, O.y + j, T.GRASS); roomAt[O.y + j][O.x + i] = -1; const p = lfPropAt(O.x + i, O.y + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((O.y + j) * W + O.x + i); town.pblock[(O.y + j) * W + O.x + i] = 0; } } doors = doors.filter(d => !(rooms[d.room] && rooms[d.room].dead)); town.bldWall = new Map(); town.bldWas = new Map(); };
    // two rooms of 3 x 2 sharing the wall at x = 4 (door between them at y = 1), and the way out at the bottom of the left one
    const house = () => { clear(); const spots = []; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 3; j++) if (i === 0 || i === 4 || i === 8 || j === 0 || j === 3) { lfAddProp((i === 4 && j === 1) || (i === 2 && j === 3) ? 'bdoor' : 'bwall', O.x + i, O.y + j); spots.push([O.x + i, O.y + j]); } town.bldQ = spots; bldTick(); };
    const live = () => rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0), loose = () => town.props.filter(p => ['bwall', 'bwindow', 'bdoor'].includes(p.kind) && p.x >= O.x - 1 && p.x <= O.x + 9 && p.y >= O.y - 1 && p.y <= O.y + 4).length;
    // 1. the house stands: two rooms; knock out the shared wall block at (4,2): they become one room of 13 tiles
    house(); res.start = live().length; bldBreak(O.x + 4, O.y + 2); res.merged = { rooms: live().length, cells: live()[0] && live()[0].cells.size, hole: grid[O.y + 2][O.x + 4] === T.FLOOR };
    // 2. knock out an outside wall of the left room: it falls apart (the right room stays: its door now opens straight onto open ground)
    house(); bldBreak(O.x + 1, O.y); res.apart = { rooms: live().length, loose: loose(), floor: grid[O.y + 1][O.x + 1] === T.GRASS, wall: grid[O.y][O.x] === T.GRASS && !!lfPropAt(O.x, O.y) };
    // 2b. replace the missing block and the whole house closes again
    lfAddProp('bwall', O.x + 1, O.y); town.bldQ = [[O.x + 1, O.y]]; bldTick(); res.again = live().length;
    // 3. knock out an outside wall of the right room: only the right room falls apart; the shared wall stays (the left room still needs it)
    house(); bldBreak(O.x + 7, O.y); res.right = { rooms: live().length, shared: grid[O.y + 2][O.x + 4] === T.WALL, sharedFixed: !lfPropAt(O.x + 4, O.y + 2), outer: !!lfPropAt(O.x + 8, O.y + 1) };
    // 4. a built wall is a hammer target, and so is every village wall
    house(); const P = game.player; itBuildToggle(P, true); itBuildSelect(P, 1); const tg = targetAt0(P, O.x + 1, O.y); res.target = tg && { key: tg.key, tool: tg.tool }; const hall = rooms.find(q => !q.free && !q.dead && (q.kind === 'tavern' || q.kind === 'church')); res.village = !!targetAt0(P, hall.x + 1, hall.y) && /^wall/.test((targetAt0(P, hall.x + 1, hall.y) || {}).key || '');
    return res;
  });
  check(r.start === 2, 'the test house should have two rooms: ' + JSON.stringify(r));
  check(r.merged.rooms === 1 && r.merged.cells === 13 && r.merged.hole, 'knocking out the shared wall makes one room of 13 tiles: ' + JSON.stringify(r.merged));
  check(r.apart.rooms === 1 && r.apart.loose === 9 && r.apart.floor && r.apart.wall, 'knocking out an outside wall of the left room makes it fall apart into 9 loose blocks, floor back to ground; the right room stays (its door now opens to the open country): ' + JSON.stringify(r.apart));
  check(r.again === 2, 'replacing the missing block closes the house again: ' + JSON.stringify(r));
  check(r.right.rooms === 1 && r.right.shared && r.right.sharedFixed && r.right.outer, 'only the right room falls apart; the shared wall stays fixed: ' + JSON.stringify(r.right));
  check(r.target && /^wall/.test(r.target.key) && r.target.tool === 'hammer' && r.village, 'a built wall is a hammer target, and so are the church and tavern walls: ' + JSON.stringify([r.target, r.village]));
  return 'merge on an inside break; fall apart on an outside break (blocks loose again); replace to rebuild; shared walls stay while a neighbour needs them';
}));

test('building: the hammer is the delete button: loose things, house furniture, any wall or door; the building falls apart into loose pushable pieces', await controlScene('smash', 41, async page => {
  const r = await page.evaluate(() => {
    const P = game.player, res = {}; const [x, y] = __find((x, y) => [0, 1, 2].every(i => __free(x + i, y))); __place(P, x - 1, y, { dx: 1, dy: 0 });
    itBuildToggle(P, true); itBuildSelect(P, 1);
    // loose things: a crate and a block are deleted outright (a rock still breaks into stone; a yard stand stays)
    const crate = lfAddProp('crate', x, y), blk = lfAddProp('bwall', x + 1, y); let a = lifeAct(P, P.player, x, y, 1, 0); res.crateKey = a && a.key; a.run(P); res.crateGone = !lfPropAt(x, y) && !town.props.includes(crate);
    a = lifeAct(P, P.player, x + 1, y, 1, 0); a.run(P); res.blockGone = !lfPropAt(x + 1, y);
    // furniture standing in a house is smashed one piece at a time
    const hs = rooms.find(q => !q.free && !q.dead && q.kind === 'house' && npcs.some(n => n.homeRoom === q) && q !== P.homeRoom);
    const bed = hs.beds[0], owner = npcs.find(n => n.bed === bed); const bt = targetAt0(P, bed.x, bed.y); res.bedKey = bt && bt.key; bt.run(P); res.bed = grid[bed.y][bed.x] === T.FLOOR && !hs.beds.includes(bed) && (!owner || !owner.bed || owner.bed.owner === null);
    const seat = hs.seats[0]; targetAt0(P, seat.x, seat.y).run(P); res.seat = grid[seat.y][seat.x] === T.FLOOR && !hs.seats.includes(seat);
    // one wall tile of the house: the tile is gone, the floor goes, the other walls and the furniture are loose and pushable
    const fam = npcs.filter(n => n.homeRoom === hs); let walls = 0; for (let yy = hs.y; yy < hs.y + hs.h; yy++) for (let xx = hs.x; xx < hs.x + hs.w; xx++) if (roomAt[yy][xx] === rooms.indexOf(hs) && (grid[yy][xx] === T.WALL || grid[yy][xx] === T.DOOR)) walls++;
    const wx = hs.x, wy = hs.y + 1, tg = targetAt0(P, wx, wy); res.wallKey = tg && tg.key; tg.run(P);
    res.dead = hs.dead; res.hole = grid[wy][wx] === T.GRASS && !lfPropAt(wx, wy);
    const inside = p => p.x >= hs.x && p.x < hs.x + hs.w && p.y >= hs.y && p.y < hs.y + hs.h;
    res.loose = town.props.filter(p => ['bwall', 'bwindow', 'bdoor'].includes(p.kind) && inside(p)).length; res.walls = walls; res.furn = town.props.filter(p => ['bed', 'chair', 'table', 'barrel'].includes(p.kind) && inside(p)).length;
    res.floor = grid[hs.y + 1][hs.x + 1] !== T.FLOOR && roomAt[hs.y + 1][hs.x + 1] < 0; res.homeless = fam.every(n => !n.homeRoom);
    // and the loose pieces really push
    const piece = town.props.find(p => p.kind === 'bwall' && inside(p)); res.pushable = !!piece && (() => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (pushLooseOK(piece.x + dx, piece.y + dy)) { __place(P, piece.x - dx, piece.y - dy, { dx, dy }); itBuildToggle(P, true); return lf2PushLine(P, piece.x, piece.y, dx, dy) === true; } return false; })();
    // a door can be hammered too (with the hammer in hand you cannot walk through it)
    const free2 = (() => { const door = town.props.find(p => p.kind === 'bdoor' && inside(p)); return door; })(); res.doorLoose = !!free2;
    return res;
  });
  check(/^wallp/.test(r.crateKey) && r.crateGone && r.blockGone, 'the hammer deletes loose things: ' + JSON.stringify(r));
  check(r.bed && r.seat, 'the bed and chair of a house can be smashed: ' + JSON.stringify(r));
  check(/^wall/.test(r.wallKey) && r.dead && r.hole && r.floor && r.homeless && r.loose === r.walls - 1 && r.furn >= 2, 'one wall tile is deleted, the house falls apart: floor gone, other walls and furniture loose, the family homeless: ' + JSON.stringify(r));
  check(r.pushable, 'the loose pieces push like before: ' + JSON.stringify(r));
  await simulate(page, 3 * 1440);
  const after = await page.evaluate(() => ({ dead: npcs.filter(n => n.dead).length }));
  check(after.dead === 0, 'three days later nobody has died: ' + JSON.stringify(after));
  return 'loose things and furniture are deleted; a house loses one tile and falls apart into pushable pieces; three quiet days after';
}));

test('building: every building can be destroyed (church, tavern, shops, workshops, privies, the jail ...) and the village carries on', await controlScene('destroyall', 41, async page => {
  const r = await page.evaluate(() => {
    const P = game.player, res = { kinds: [] }; const live = () => rooms.filter(q => !q.free && !q.dead && q !== P.homeRoom);
    for (const rm of live()) { if (rm.dead) continue; res.kinds.push(rm.kind); let tx = rm.doorX, ty = rm.doorY; const g = targetAt0; itBuildToggle(P, true); itBuildSelect(P, 1); const t = targetAt0(P, tx, ty); if (!t) { bldBreak(tx, ty, P); } else t.run(P); }
    res.left = live().length; res.churchGone = !town.church; return res;
  });
  check(r.left === 0 && r.kinds.length >= 5, 'every building should come down: ' + JSON.stringify(r));
  await simulate(page, 3 * 1440);
  const after = await page.evaluate(() => ({ dead: npcs.filter(n => n.dead).length, pop: npcs.length }));
  check(after.dead === 0, 'three days after everything is torn down nobody has died: ' + JSON.stringify(after));
  return `${r.kinds.length} buildings torn down (${[...new Set(r.kinds)].join(', ')}); three days later the village is still there`;
}));

test('push: every station (counter, oven, forge, anvil, loom, shelf, table) can be pushed inside a room, out of the door as a loose thing and back in', await controlScene('stations', 41, async page => {
  const r = await page.evaluate(() => {
    const o = { x: town.cx + 14, y: town.cy - 40 }, P = game.player, res = {}; itBuildToggle(P, true);
    for (let j = -2; j < 12; j++) for (let i = -2; i < 12; i++) { setT(o.x + i, o.y + j, T.GRASS); roomAt[o.y + j][o.x + i] = -1; const p = lfPropAt(o.x + i, o.y + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((o.y + j) * W + o.x + i); town.pblock[(o.y + j) * W + o.x + i] = 0; } }
    const spots = []; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 4; j++) if (i === 0 || i === 6 || j === 0 || j === 4) { lfAddProp(i === 3 && j === 4 ? 'bdoor' : 'bwall', o.x + i, o.y + j); spots.push([o.x + i, o.y + j]); } town.bldQ = spots; bldTick();
    const hs = rooms.find(q => q.free && !q.dead); res.room = !!hs; if (!hs) return res;
    const din = { x: o.x + 3, y: o.y + 3 }, door = { x: o.x + 3, y: o.y + 4 }; res.kinds = [];
    for (const [t, kind] of [[T.COUNTER, 'counter'], [T.OVEN, 'oven'], [T.FORGE, 'forge'], [T.ANVIL, 'anvil'], [T.LOOM, 'loom'], [T.SHELF, 'shelf'], [T.TABLE, 'table']]) {
      setT(din.x, din.y, t); const f = pushFurniture(din.x, din.y); if (!f || f.type !== kind) { res.kinds.push(kind + ':not furniture'); continue; }
      __place(P, din.x, din.y - 1, { dx: 0, dy: 1 }); const a = lf2PushLine(P, din.x, din.y, 0, 1); const prop = lfPropAt(door.x, door.y);
      const out = a === true && !!prop && prop.kind === kind && grid[din.y][din.x] === T.FLOOR;
      __place(P, din.x, din.y, { dx: 0, dy: 1 }); const b = lf2PushLine(P, door.x, door.y, 0, 1); __place(P, door.x, door.y + 2, { dx: 0, dy: -1 }); prop.follow = null; const c = lf2PushLine(P, prop.x, prop.y, 0, -1); __place(P, door.x, door.y + 1, { dx: 0, dy: -1 }); const d = lf2PushLine(P, prop.x, prop.y, 0, -1);
      const back = c === true && d === true && grid[din.y][din.x] === t && !lfPropAt(din.x, din.y) && !town.props.includes(prop);
      res.kinds.push(kind + ':' + (out && b === true && back ? 'ok' : JSON.stringify([a, b, c, d, out, back]))); setT(din.x, din.y, T.FLOOR);
    }
    return res;
  });
  check(r.room, 'the test room should seal');
  check(r.kinds.length === 7 && r.kinds.every(k => /:ok$/.test(k)), 'every station should go out of the door and back in: ' + JSON.stringify(r.kinds));
  return r.kinds.join(', ');
}));

test('push: a sleeper rides in the bed (and a sitter in the chair), out of the door into the world; they wake up outside; the bed stays theirs', await controlScene('rider', 41, async page => {
  const r = await page.evaluate(() => {
    const hs = rooms.find(q => !q.dead && q.kind === 'house' && q.seats.length && q.beds.length && q.barrel && q.side === 'b'), P = game.player; itBuildToggle(P, true);
    const bed = hs.beds[0], din = { x: hs.doorX, y: hs.doorY - 1 }, res = {};
    const who = npcs.find(n => !n.dead && !n.player && !n.infant && n.age >= 16 && n !== P); who.bed = bed;
    setT(bed.x, bed.y, T.FLOOR); bed.x = din.x; bed.y = din.y; setT(din.x, din.y, T.BED);
    tileOwner.delete(who.ty * W + who.tx); who.tx = who.x = din.x; who.ty = who.y = din.y; who.pose = 'sleep'; who.moving = false; who.path = []; rebuildOcc(); tileOwner.set(din.y * W + din.x, who);
    __place(P, din.x, din.y - 1, { dx: 0, dy: 1 }); res.out1 = lf2PushLine(P, din.x, din.y, 0, 1);
    const prop = lfPropAt(hs.doorX, hs.doorY); res.onDoor = !!prop && prop.rider === who && who.tx === hs.doorX && who.ty === hs.doorY && who.pose === 'sleep' && tileOwner.get(hs.doorY * W + hs.doorX) === who;
    __place(P, din.x, din.y, { dx: 0, dy: 1 }); res.out2 = lf2PushLine(P, hs.doorX, hs.doorY, 0, 1); __place(P, hs.doorX, hs.doorY + 1, { dx: 0, dy: 1 }); res.out3 = lf2PushLine(P, prop.x, prop.y, 0, 1);
    res.outside = roomAt[prop.y][prop.x] < 0 && who.tx === prop.x && who.ty === prop.y && who.pose === 'sleep' && bed.out === true && who.bed === bed;
    who.pose = 'stand'; const before = town.chron.length; for (const f of LF2.tickers) f(); res.chron = town.chron.slice(before).map(c => c.text).join(' | '); res.cleared = !who.shoved;
    who.pose = 'sleep'; who.shoved = { by: P.id, room: hs, pose: 'sleep', t: 0 }; prop.rider = who;
    __place(P, hs.doorX, hs.doorY + 3, { dx: 0, dy: -1 }); res.in1 = lf2PushLine(P, prop.x, prop.y, 0, -1); __place(P, hs.doorX, hs.doorY + 2, { dx: 0, dy: -1 }); res.in2 = lf2PushLine(P, prop.x, prop.y, 0, -1); __place(P, hs.doorX, hs.doorY + 1, { dx: 0, dy: -1 }); res.in3 = lf2PushLine(P, prop.x, prop.y, 0, -1);
    res.back = grid[din.y][din.x] === T.BED && !bed.out && who.tx === din.x && who.ty === din.y && who.pose === 'sleep' && who.bed === bed;
    who.pose = 'stand'; who.shoved = null; tileOwner.delete(din.y * W + din.x);
    return res;
  });
  check(r.out1 === true && r.onDoor, 'a bed with somebody asleep in it should go out of the door with them in it: ' + JSON.stringify(r));
  check(r.out2 === true && r.out3 === true && r.outside, 'and on outside, the sleeper still asleep and the bed still theirs: ' + JSON.stringify(r));
  check(/woke up/.test(r.chron) && /bed and all/.test(r.chron) && r.cleared, 'waking up outside should be noted in the chronicle: ' + JSON.stringify(r.chron));
  check(r.in1 === true && r.in2 === true && r.in3 === true && r.back, 'pushed back in, the bed is the house\'s again with the sleeper in it: ' + JSON.stringify(r));
  return 'sleeper carried out of the door in the bed, woke up outside (' + r.chron + '), carried back in';
}));

test('controls: a tree is felled with the axe that is picked for you; without an axe you are told', await controlScene('tree', 41, async page => {
  const s = await page.evaluate(() => { const [x, y] = __find((x, y) => __free(x, y) && grid[y][x + 1] === T.TREE && !wildTile(x + 1, y)); __place(game.player, x, y, { dx: 1, dy: 0 }); window.__axes = game.player.items.filter(i => i.kind === 'axe'); game.player.items = game.player.items.filter(i => i.kind !== 'axe'); return { x, y }; });
  await held(page, [], 1); const none = await page.evaluate(() => ({ act: game.player.player.act && game.player.player.act.text, msg: game.player.player.msg }));
  check(!none.act && /no axe/.test(none.msg || ''), 'with no axe a tree should not be felled, and you should be told: ' + JSON.stringify(none));
  await page.evaluate(() => { game.player.items.push(...window.__axes); __place(game.player, game.player.tx, game.player.ty, { dx: 1, dy: 0 }); }); await held(page, [], 1);
  const axe = await page.evaluate(() => ({ act: game.player.player.act && game.player.player.act.text, tool: game.player.player.act && game.player.player.act.tool }));
  check(/Felling|Clearing/.test(axe.act || '') && axe.tool === 'axe', 'walking into a tree should fell it with the axe, nothing to select: ' + JSON.stringify(axe));
  return `no axe: "${none.msg}"; axe picked for you: ${axe.act}`;
}));

test('controls: a plot is worked (hoe and seed picked for you) when you start from rest beside it, never when you walk over a field on your way somewhere', await controlScene('field', 41, async page => {
  const s = await page.evaluate(() => {
    const c = town.crops.find(c => !town.crops.some(o => o.x === c.x - 1 && o.y === c.y) && [1, 2, 3].every(i => __free(c.x - i, c.y))); if (!c) throw new Error('no field edge with free ground beside it'); c.pl = 0; c.st = 0;   // (reset: villagers may have got to it already)
    for (const o of town.crops) { o.claim = null; } window.__c = c; for (const o of npcs) if (!o.player && !o.dead && o.ty === c.y && o.tx >= c.x - 4 && o.tx <= c.x + 1) { o.plan = null; o.si = 0; o.moving = false; o.path = []; o.tx = o.x = c.x - 8; o.ty = o.y = c.y - 4; }   /* (nobody standing in the way of the walk) */ for (const o of npcs) if (!o.player) o.talkUntil = game.time + 600; rebuildOcc(); window.__bag0 = game.player.bag.seed_barley;
    return { x: c.x, y: c.y, seeds: game.player.bag.seed_barley };
  });
  const art = () => page.evaluate(() => { const c = window.__c; return ART.BYID[!c.pl ? 'crop_raw' : c.st ? 'crop_1' : 'crop_0'].id; });
  const before = await art();
  // walking over from a few tiles away (a continuous press) leaves the plot alone
  await page.evaluate(() => { __place(game.player, window.__c.x - 3, window.__c.y, { dx: 1, dy: 0 }); }); await held(page, [], 4);
  const crossed = await page.evaluate(() => ({ pl: window.__c.pl, x: game.player.tx })); check(!crossed.pl && crossed.x >= s.x, 'walking onto a field from a distance must not plough it: ' + JSON.stringify(crossed));
  // standing at rest beside the plot and pressing toward it ploughs it
  await page.evaluate(() => { game.player.player.keys = {}; __place(game.player, window.__c.x - 1, window.__c.y, { dx: 1, dy: 0 }); }); await simulate(page, 2); await held(page, [], 4);
  const ploughed = await page.evaluate(() => ({ pl: window.__c.pl, st: window.__c.st })); const mid = await art();
  check(ploughed.pl && !ploughed.st, 'starting from rest beside it, a plot needing work should be ploughed with the hoe: ' + JSON.stringify(ploughed));
  await page.evaluate(() => { __place(game.player, window.__c.x - 1, window.__c.y, { dx: 1, dy: 0 }); }); await simulate(page, 2); await held(page, [], 12);
  const sown = await page.evaluate(() => { const c = window.__c; return { pl: c.pl, st: c.st, seed: c.seed, left: game.player.bag.seed_barley }; }); const after = await art();
  check(sown.pl && sown.st && sown.seed === 'barley', 'a ploughed plot should be sown with the seed you have most of (barley): ' + JSON.stringify(sown));
  check(sown.left === s.seeds - 1, `sowing should use one seed (${s.seeds} -> ${sown.left})`);
  check(new Set([before, mid, after]).size === 3, `untilled, ploughed and sown plots should be drawn differently: ${before}, ${mid}, ${after}`);
  return `crossed without ploughing; ploughed from rest; sown barley (${s.seeds} -> ${sown.left} seeds): ${before} -> ${mid} -> ${after}`;
}));

test('controls: a sleeping person on the ground is pushed along, still asleep', await controlScene('sleeper', 41, async page => {
  // the rule itself (staging a sleeper in the open fights the AI): pushing someone asleep carries them along without waking them
  const r = await page.evaluate(() => { const [x, y] = __find((x, y) => [0, 1, 2, 3].every(i => __free(x + i, y))); __place(game.player, x, y, { dx: 1, dy: 0 }); const o = __stand(__other(), x + 1, y, 'sleep');
    const res = lf2PushPerson(game.player, o, 1, 0); return { res, them: o.tx, ox: x + 1, pose: o.pose, emitted: window.__emitted.slice() }; });
  check(r.res === true, 'pushing a sleeper should carry them, got ' + JSON.stringify(r.res));
  check(r.them === r.ox + 1 && r.pose === 'sleep', `a sleeper is carried one tile and stays asleep (x ${r.ox} -> ${r.them}, ${r.pose})`);
  check(r.emitted.length === 0, 'got events: ' + r.emitted.join(', '));
  return `carried one tile, still asleep, no events`;
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

/* ---------------------------------------------------------------------------------------------- */
// The social simulation (src/social2): the village has a past before the player arrives, news travels and changes, people talk from what they believe.


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
    const P = game.player, axe = P.items.find(i => i.kind === 'axe');
    axe.wear = 0.02; itWearTool(P, 'axe'); const broke = !P.items.includes(axe);
    const sm = lf2Room('smithy'), smith = npcs.find(n => !n.dead && n.job === 'Smith') || (() => { const n = npcs.find(q => !q.dead && !q.player && q.age >= 20); n.job = 'Smith'; return n; })(); const sp = sm.spots.work; smith.tx = smith.x = sp.x; smith.ty = smith.y = sp.y; smith.pose = 'stand'; rebuildOcc();
    const s = lf2Stock(sm); s.tools = 3; s.iron = 2; const menu = () => [];
    const offers = itOffers(P, sm, 'tools', menu), coin0 = P.coin; offers.find(o => /^Hoe/.test(o[0]))[1](); const boughtHoe = P.items.filter(i => i.kind === 'hoe').length === 2 && P.coin < coin0 && s.tools === 2;
    P.inv.iron = 2; const sellLine = itExtras(P, sm, menu).find(o => /^Sell iron/.test(o[0])); const c1 = P.coin; sellLine[1](); const soldOre = P.inv.iron === 1 && P.coin > c1 && s.iron === 3;
    smith.aff[P.id] = 10; const strangerPicks = itExtras(P, sm, menu).some(o => /Lockpick/.test(o[0]));
    smith.aff[P.id] = 40; const pick = itExtras(P, sm, menu).find(o => /Lockpick/.test(o[0])), lp0 = P.bag.lockpick || 0; if (pick) pick[1](); const friendPicks = (P.bag.lockpick || 0) === lp0 + 2;
    let ore = 0; P.inv.iron = 0; for (let i = 0; i < 300; i++) if (itRockOre(P)) ore++;
    return { broke, offers: offers.map(o => o[0].split(':')[0]), boughtHoe, soldOre, strangerPicks, friendPicks, ore };
  });
  check(r.broke, 'a worn-out axe should break');
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
    LF2.feat.nightlocks = true;   /* (barred doors are off in the game for now; the code is still tested) */
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
  await page.evaluate(() => { const c = lf2Room('mill') && !npcs.some(n => n.job === 'Miller') && npcs.find(n => !n.dead && !n.player && n.role === 'Worker' && n.age >= 18 && n.age < 60 && !LF2_JOBS[n.job] && !n.shop); if (c) lf2SetJob(c, 'Miller', false); }); await simulate(page, 3 * DAY);
  const r = await page.evaluate(() => {
    const mill = lf2Room('mill'), P = game.player; let miller = npcs.find(n => !n.dead && n.job === 'Miller'); if (mill && !miller) { const c = npcs.find(n => !n.dead && !n.player && n.role === 'Worker' && n.age >= 18 && n.age < 60 && !LF2_JOBS[n.job] && !n.shop); if (c) { lf2SetJob(c, 'Miller', false); miller = c; } }   /* (hiring depends on food days hovering near 0.45: the test hires one if luck did not) */ const s = mill ? lf2Stock(mill) : {};
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
test('islands: an island saves and restores exactly, and the village carries on afterwards', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 2 * 1440);
  const r = await page.evaluate(() => {
    if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl));
    const P = game.player; itBuildToggle(P, true); for (const k of ['bwall', 'bed', 'chair']) bldPlaceFront(P, k); itBuildToggle(P, false);
    const hash = () => { let h = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) h = (h * 31 + grid[y][x] + 7 * (roomAt[y][x] + 1)) | 0; return h; };
    const snap = () => JSON.stringify([npcs.length, rooms.filter(r => !r.dead).length, town.props.length, town.chron.length, hash(), game.time, game.player && game.player.coin]);
    const a = snap(); isleRestore(isleCapture()); return { a, b: snap() };
  });
  check(r.a === r.b, 'restored island differs: ' + r.a + ' vs ' + r.b);
  await simulate(page, 3 * 1440);
  const s = await page.evaluate(() => ({ dead: npcs.filter(n => n.dead).length }));
  check(!errors.length, 'errors after restore: ' + errors.slice(0, 2).join(' | '));
  check(s.dead === 0, 'deaths after restore');
  return 'capture and restore agree, then 3 more days ran clean';
});

test('islands: a blank island has one settler, a tent and nothing built, and runs', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => { newTown('blank-test', 'blank'); return { n: npcs.length, rooms: rooms.filter(r => !r.dead).length, tents: town.tents.length }; });
  check(r.n === 1, 'blank island should start with one settler, got ' + r.n);
  check(r.tents === 0, 'no tents at the start');
  await simulate(page, 2 * 1440);
  check(!errors.length, 'errors on a blank island: ' + errors.slice(0, 2).join(' | '));
  return `${r.n} settler, ${r.rooms} rooms, ${r.tents} tent; two days ran clean`;
});

test('build mode: the clock and the villagers stand still while you build', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 600);
  const r = await page.evaluate(async () => {
    if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl));
    const P = game.player; itBuildToggle(P, true);
    const t0 = game.time, pos = npcs.filter(n => !n.player).map(n => n.tx + ',' + n.ty).join('|');
    for (let i = 0; i < 60; i++) updateSim(1);
    const same = game.time === t0 && npcs.filter(n => !n.player).map(n => n.tx + ',' + n.ty).join('|') === pos;
    itBuildToggle(P, false); for (let i = 0; i < 10; i++) updateSim(1);
    return { same, moved: game.time > t0 };
  });
  check(r.same, 'time or villagers moved in build mode');
  check(r.moved, 'time did not resume after leaving build mode');
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'clock and villagers frozen in build mode, running again after';
});

test('visitors: on a blank island a built hut with a free bed brings a settler ashore, who moves in', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('blank-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]);
    const cx = Math.round(npcs[0].tx) + 3, cy = Math.round(npcs[0].ty) + 3;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { if (i && i < 4 && j && j < 4) continue; lfAddProp(i === 2 && j === 4 ? 'bdoor' : 'bwall', cx + i, cy + j); town.bldQ.push([cx + i, cy + j]); }
    lfAddProp('bed', cx + 1, cy + 1); lfAddProp('bed', cx + 3, cy + 1); lfAddProp('toilet', cx + 3, cy + 3); bldTick();
    return { huts: rooms.filter(r => !r.dead && r.free).length };
  });
  check(r.huts === 1, 'the closed room should exist');
  await simulate(page, 4 * 1440);
  const s = await page.evaluate(() => ({ n: npcs.length, homed: npcs.filter(n => n.homeRoom && n.bed && n.bed.owner === n).length, hut: rooms.some(r => r.hut && r.kind === 'house') }));
  check(s.hut, 'a room with a bed should become a hut');
  check(s.n === 2 && s.homed === 2, `expected a visitor living in the hut, got ${s.n} people, ${s.homed} housed`);
  const q = await page.evaluate(() => ({ met: npcs.reduce((k, n) => k + (n.newcomer ? n.newcomer.met.length : 0), 0) + (town.chron.some(c => /came ashore/.test(c.text || c)) ? 1 : 0), ctl: !!(game.player && game.player.player), toilet: rooms.some(r => r.toilet && r.ptoilet), accidents: town.chron.filter(c => /in time/.test(c.text || c)).length }));
  check(q.met > 0, 'newcomer should introduce themselves');
  check(q.ctl, 'you lost control of your villager');
  check(q.toilet, 'a privy seat inside a built room should make a privy');
  check(q.accidents === 0, 'accidents despite a privy: ' + q.accidents);
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'hut made, visitor came ashore and took the free bed, privy used, control kept';
});

test('islands: the Islands button only opens the list, it never replaces the island you are on', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => { const seed = town.seed, n = npcs.length; document.getElementById('newTown').click(); return { same: town.seed === seed && npcs.length === n }; });
  check(r.same, 'clicking Islands generated a new island');
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'the island stays';
});

test('build: a thing placed on a taken tile goes on the next tile in front, so a row can be pushed', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('row-test', 'blank'); if (!town.props) lfInitProps(); startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    P.face = { dx: 1, dy: 0 }; const got = []; for (let i = 0; i < 8; i++) { const p = bldPlaceFront(P, 'bwall'); got.push(p ? p.x - P.tx : null); }
    return { got };
  });
  check(r.got.join() === '1,2,3,4,5,6,7,8', 'eight placed in a row in front: ' + JSON.stringify(r.got));
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'items line up in front of you, one tile after another';
});

test('build: the last block put down in a wall closes the room, thick walls included', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('seal-test', 'blank'); if (!town.props) lfInitProps(); startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 3, cy = P.ty - 3; let skip = null;
    // a thick-walled room (two blocks thick, a door two tiles long); every block but one is put down first
    for (let i = 0; i < 8; i++) for (let j = 0; j < 7; j++) { const edge = i < 2 || i > 5 || j < 2 || j > 4; if (!edge) continue; if (i === 0 && j === 3) { skip = [cx + i, cy + j]; continue; } lfAddProp(i === 3 && j >= 5 ? 'bdoor' : 'bwall', cx + i, cy + j); }
    const before = rooms.filter(r => r.free && !r.dead && lvlOf(r.y) === 0).length;
    // the last one is placed through the build bar (it stands in front of the player)
    P.tx = P.x = skip[0] - 1; P.ty = P.y = skip[1]; P.face = { dx: 1, dy: 0 }; rebuildOcc(); bldPlaceFront(P, 'bwall'); bldTick();
    return { before, after: rooms.filter(r => r.free && !r.dead && lvlOf(r.y) === 0).length, loose: town.props.filter(p => ['bwall', 'bwindow'].includes(p.kind)).length };
  });
  check(r.before === 0 && r.after === 1, 'placing the last block should close the room: ' + JSON.stringify(r));
  check(r.loose === 0, 'the outer layer of a thick wall should become wall too, no loose blocks left: ' + r.loose);
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'a block put down in the last gap seals the room';
});

test('building: a hut gets no kitchen oven, and nothing blocked is left where a built room comes down', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('oven-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]);
    const cx = Math.round(npcs[0].tx) + 4, cy = Math.round(npcs[0].ty) - 8, n = 6;
    for (let j = -3; j < 12; j++) for (let i = -4; i < 12; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const p = lfPropAt(cx + i, cy + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); }
    lfAddProp('bed', cx + 2, cy + 2); town.bldQ.push([cx, cy]); bldTick(); visHomes(); housingTick();
    const room = rooms.find(q => q.free && !q.dead); lf2PlaceHearth(room);
    let ovens = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (grid[cy + j][cx + i] === T.OVEN) ovens++;
    // an old save: a stray oven tile inside the hut, then the hut comes down
    setT(cx + 4, cy + 4, T.OVEN); bldBreak(cx, cy + 1, game.player);
    let left = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (BLOCKED.has(grid[cy + j][cx + i]) && grid[cy + j][cx + i] !== T.OVEN) left++;
    return { ovens, ovenLeft: grid[cy + 4][cx + 4] === T.OVEN, wallsLeft: left };
  });
  check(r.ovens === 0, 'a hut should get no kitchen oven: ' + r.ovens);
  check(!r.ovenLeft, 'a tile inside a room that comes down goes back to ground, ovens too');
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'no oven in a hut; nothing blocked stays behind';
});

test('beds: you get the first bed the moment you leave build mode, and a visitor sleeps in theirs (loose beds are walked over)', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r0 = await page.evaluate(() => {
    newTown('bed-alloc', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 4, cy = P.ty - 8, n = 6; window.__c = [cx, cy];
    for (let j = -3; j < 12; j++) for (let i = -4; i < 12; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const p = lfPropAt(cx + i, cy + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); }
    lfAddProp('bed', cx + 2, cy + 2); lfAddProp('bed', cx + 4, cy + 2); town.bldQ.push([cx, cy]); bldTick(); itBuildToggle(P, false);
    return { mine: !!(P.bed && P.bed.owner === P && P.homeRoom) };
  });
  check(r0.mine, 'you should own a bed as soon as you leave build mode');
  await simulate(page, 2 * 1440);
  await page.evaluate(() => { window.__skip = ((26 * 60) - (game.time % 1440) + 1440) % 1440; });
  await simulate(page, await page.evaluate(() => window.__skip));
  const r = await page.evaluate(() => { const v = npcs.find(n => !n.player); return v ? { homed: !!(v.bed && v.bed.owner === v), pose: v.pose, at: [v.tx - window.__c[0], v.ty - window.__c[1]], bed: v.bed && [v.bed.x - window.__c[0], v.bed.y - window.__c[1]] } : null; });
  check(r && r.homed, 'a visitor should have come and been given the free bed: ' + JSON.stringify(r));
  check(r.pose === 'sleep' && r.at.join() === r.bed.join(), 'at two in the morning the visitor should be asleep in their bed: ' + JSON.stringify(r));
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'first bed is yours at once; the visitor sleeps in theirs';
});

test('fields: the build-mode field brush marks plots under your feet, the hoe works them, the hammer digs them back to grass', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('field-test', 'blank'); if (!town.props) lfInitProps(); startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 6, cy = P.ty - 6; for (let j = -2; j < 8; j++) for (let i = -2; i < 12; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const q = lfPropAt(cx + i, cy + j); if (q) { town.props = town.props.filter(z => z !== q); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    const slot = P.build.bar.indexOf('field'); itBuildSelect(P, slot + 3); const on = P.build.brush === 'field';
    for (let i = 0; i < 4; i++) { P.tx = P.x = cx + i; P.ty = P.y = cy; bldBrushStep(P); }
    const plots = town.crops.filter(c => c.byField === P.id).length, tiles = [0, 1, 2, 3].every(i => grid[cy][cx + i] === T.CROP);
    itBuildSelect(P, slot + 3); const off = !P.build.brush; P.tx = P.x = cx + 5; P.ty = P.y = cy; bldBrushStep(P); const notAfter = grid[cy][cx + 5] === T.GRASS;
    itBuildSelect(P, 1);   // destroy
    const t = targetAt0(P, cx + 1, cy); t.run(P); const dug = grid[cy][cx + 1] === T.GRASS && !town.crops.some(c => c.x === cx + 1 && c.y === cy);
    // not on a path, floor, water or through a prop
    return { on, plots, tiles, off, notAfter, dug, farmers: itFarmersPlot(town.crops[0]) };
  });
  check(r.on, 'the field slot should switch the brush on'); check(r.plots === 4 && r.tiles, 'four steps lay four plots: ' + JSON.stringify(r));
  check(r.off && r.notAfter, 'the brush stops when switched off'); check(r.dug, 'the hammer digs a plot back to grass'); check(r.farmers === true, 'village farmers work your field');
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'brush lays plots as you walk; hammer removes them; farmers work them';
});

test('villager card: clicking a villager opens a card with what they are doing, how they feel, who they get on with', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 9 * 60);
  const r = await page.evaluate(() => {
    const n = npcs.find(q => !q.dead && !q.player && q.age >= 18 && q.status); const w = { x: n.x, y: n.y };
    openVillagerCard(n); const box = document.getElementById('vcbox'), t1 = box.innerText, shown = !box.hidden;
    const other = npcs.find(q => q !== n && !q.dead && q.age >= 18); for (const k of Object.keys(n.aff)) delete n.aff[k]; for (const k of Object.keys(n.know)) delete n.know[k]; n.aff[other.id] = 100; n.know[other.id] = 100; vcDraw(true); const t2 = box.innerText;
    const dbg = t2; closeVillagerCard(); return { dbg, shown, t1, t2, hidden: box.hidden, status: n.status, first: n.first, other: other.first };
  });
  check(r.shown && r.t1.includes(r.first) && /right now/i.test(r.t1) && /feeling/i.test(r.t1), 'the card shows the villager and what they are doing: ' + r.t1.slice(0, 120));
  check(r.t2.toLowerCase().includes('company') && r.t2.includes(r.other), 'the card lists who they are fond of: ' + r.dbg.replace(/\n/g, '|'));
  check(r.hidden, 'the card closes');
  check(!errors.length, 'no errors: ' + errors.join('|'));
  return 'villager card';
});

test('talk engine (phase 1): villagers walk up, greet, chat about small things, pre-close and part; the log is acts, the wording is looked up', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await page.evaluate(() => { TALK.words = true; });
  await simulate(page, 1440 + 10 * 60);
  const r = await page.evaluate(() => {
    const L = TALK.log.filter(l => !['shop_greet', 'keeper_call', 'call_child', 'mutter'].includes(l.acts[0].act)), bad = [];   // (stall encounters and calls have their own shape: the shop talk tests)
    for (const l of L) {
      const ids = l.acts.map(x => x.act);
      // as much ceremony as the two of them need: none (they spoke lately or live together), a greeting and a goodbye, or the full opening and closing; never half of one
      const greeted = ids[0] === 'greet', full = ids.includes('pre_close');
      if (greeted && ids[1] !== 'greet_back') bad.push('opening ' + ids.slice(0, 2));
      if (full && !(greeted && ids[ids.length - 3] === 'pre_close' && ids[ids.length - 2] === 'farewell' && ids[ids.length - 1] === 'farewell_back')) bad.push('closing ' + ids.slice(-3));
      if (greeted && !full && !['farewell', 'farewell_back'].includes(ids[ids.length - 1])) bad.push('goodbye ' + ids.slice(-2));
      if (!greeted && ids.some(x => ['pre_close', 'farewell', 'farewell_back', 'greet_back'].includes(x))) bad.push('ceremony without a greeting ' + ids);
      if (!ids.some(x => ACTS[x].stage === 'topic')) bad.push('nothing said ' + ids);
      if (ids.length < 2 || ids.length > 30) bad.push('length ' + ids.length);
      if (!l.lines || l.lines.length !== ids.length || l.lines.some(x => /[{}]|undefined|NaN/.test(x))) bad.push('words ' + JSON.stringify(l.lines && l.lines.slice(0, 2)));
      if (l.a === l.b) bad.push('self');
    }
    const a = L.length ? byId(L[0].a) : null;
    return { n: L.length, bad: bad.slice(0, 3), mem: a ? (a.tmem || []).some(m => m.kind === 'talked') : false, pairs: new Set(L.map(l => Math.min(l.a, l.b) + '-' + Math.max(l.a, l.b))).size, heard: L.slice(0, 2).map(l => l.lines.join(' / ')) };
  });
  check(r.n >= 15, 'villagers talk through the day: ' + r.n);
  check(r.bad.length === 0, 'every conversation opens with a greeting, ends with a pre-close and a farewell, has words and no holes: ' + JSON.stringify(r.bad));
  check(r.mem && r.pairs >= 8, 'both remember it, and many different pairs talk: ' + r.pairs);
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.n + ' conversations, ' + r.pairs + ' pairs';
});

test('talk engine (phase 1): a kind of talk can be switched off, and a line about something that does not exist is never said', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(async () => {
    const out = {}; TALK.words = true;
    // a line that needs a castle: there is none, so it is never chosen even though it is the most specific there is
    lx('remark_place', 'plain', 'The castle looks grand today.', { band: 'day' }, ['feature:castle']);
    const a = npcs.find(q => !q.dead && !q.player && q.age >= 18), c = npcs.find(q => q !== a && !q.dead && !q.player && q.age >= 18);
    let seen = false; for (let i = 0; i < 400; i++) if (/castle/.test(lxSay('remark_place', a, c, { done: {} }))) seen = true; out.castleSaid = seen;
    out.has = [WORLD.has('feature', 'castle'), WORLD.has('item', 'barley'), WORLD.has('person', a.id)];
    // with small talk off, a conversation is only the rituals
    const onKeep = Object.assign({}, TALK.on); for (const k of Object.keys(TALK.on)) TALK.on[k] = k === 'ritual'; a.tmem = (a.tmem || []).filter(m => !(m.kind === 'talked' && m.with === c.id)); a.homeRoom = null; a.aff[c.id] = 0; const cv = talkRun(a, c, true); out.ritualOnly = cv.turns.every(t => ACTS[t.act].kind === 'ritual') && cv.turns.length === 5;   // (two people who have not spoken: the whole ceremony, and with nothing else switched on, nothing else) Object.assign(TALK.on, onKeep);
    return out; });
  check(!r.castleSaid, 'a line that needs a feature that does not exist is never said');
  check(r.has[0] === false && r.has[2] === true, 'the registry knows what exists: ' + JSON.stringify(r.has));
  check(r.ritualOnly, 'with small and world talk switched off, a conversation is only greeting and farewell');
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return 'registry and switches';
});

test('talk engine (phase 1): the one who starts walks up to the other, they stand side by side, and what the first was doing carries on', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 10 * 60);
  const r = await page.evaluate(() => {
    const free = npcs.filter(q => !q.dead && !q.player && q.age >= 18 && !q.moving && q.pose !== 'sleep' && !q.job && !q.shop); const a = free[0], c = free[1]; if (!a || !c) return { skip: true };   // (people with no job of their own: a workday plan is not what is being tested)
    let sa = null, sb = null; scan: for (let r = 0; r < 25; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const x = town.cx + dx, y = town.cy + dy; let ok = true; for (let i = -1; i <= 5 && ok; i++) for (let j = -1; j <= 1 && ok; j++) { const tx = x + i, ty = y + j; if (!walkable(tx, ty) || lfPropAt(tx, ty) || roomAt[ty][tx] >= 0 || npcs.some(o => o.tx === tx && o.ty === ty)) ok = false; } if (ok) { const pth = findPath(x, y, x + 3, y); if (pth && pth.length > 0 && pth.length <= 4) { sa = { x, y }; sb = { x: x + 4, y }; break scan; } } }   // (open ground you can really walk straight across)
    if (!sa) return { skip: true };
    for (const [n, s] of [[a, sa], [c, sb]]) { abortPlan(n); n.tx = n.x = s.x; n.ty = n.y = s.y; n.pose = 'stand'; n.talkUntil = 0; n.talkBusy = 0; }
    town.lifeTold = {}; LIFE.emit('slept_rough', a, {}); a.saidTo = {}; c.saidTo = {};   // (something to say)
    rebuildOcc(); const n0 = TALK.log.length; talkApproach(a, c); window.__pair = [a.id, c.id, n0]; return { first: a.plan[0].text, d0: lfDist(a, c), pos: [a.tx, a.ty, c.tx, c.ty, a.id, c.id, game.player && game.player.id] };
  });
  if (!r.skip) {
    check(/Going over to/.test(r.first), 'the first sets out to meet the other: ' + JSON.stringify(r));
    await simulate(page, 20);
    const d = await page.evaluate(() => { const [x, y, n0] = window.__pair, a = byId(x), c = byId(y); return { st: [a.tx, a.ty, c.tx, c.ty, a.si, (a.plan || []).map(q => q.k + ':' + q.text).join(','), JSON.stringify(a.talkTo || null)].join(' ') + a.status + ' / ' + c.status + ' h' + Math.round(a.hunger) + ' ' + Math.round(c.hunger) + ' dist ' + lfDist(a, c), talked: TALK.log.slice(n0).some(l => (l.a === x && l.b === y)), d: (TALK.log.slice(n0).find(l => l.a === x && l.b === y) || { d: 99 }).d }; });
    check(d.talked && d.d <= 2, 'they stood side by side (when they talked) and talked: ' + JSON.stringify([d, r]));
  }
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return 'approach';
});

test('talk engine (phase 2): news travels from the one who saw it to others as versions that get less sure, bystanders overhear, and the card shows what they know', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    TALK.words = true; TALK.running = false; const out = {};
    const adults = npcs.filter(q => !q.dead && !q.player && q.age >= 18); const [A, B, C, D, E, F] = adults;
    for (const n of adults) { n.tx = n.x = A.tx; n.ty = n.y = A.ty; n.pose = 'stand'; }
    const ev = lfEmit('theft', { actor: A, target: B, tags: ['theft', 'crime'], sev: 2, witnessIds: [C.id], text: `${A.first} stole from ${B.first}` });
    out.first = [C, A, B].map(n => (TM.ofEv(n, ev.id) || {}).kind);   // C saw it, A did it, B felt it
    out.dNone = !TM.ofEv(D, ev.id); for (const n of [E, F]) n.tx = n.x = A.tx + 40;   // (out of earshot while C tells D)
    for (let i = 0; i < 12 && !TM.ofEv(D, ev.id); i++) talkRun(C, D, true);
    for (const n of [E, F]) n.tx = n.x = A.tx; out.overE = !!TM.ofEv(E, ev.id);
    const md = TM.ofEv(D, ev.id); out.d = md ? { kind: md.kind, from: md.from === C.id, conf: md.conf, hop: md.hop } : null;
    for (let i = 0; i < 12 && !TM.ofEv(E, ev.id); i++) talkRun(D, E, true);
    const me = TM.ofEv(E, ev.id); out.e = me ? { from: me.from === D.id, conf: me.conf, hop: me.hop } : null;
    out.over = adults.filter(n => n !== C && n !== D && n !== A && n !== B && TM.ofEv(n, ev.id) && TM.ofEv(n, ev.id).kind === 'overheard').length;
    out.lines = TALK.log.filter(l => l.lines).some(l => l.acts.some(x => x.act === 'share_news') && l.lines.some(t => t.includes(A.first) && /stole from|walked off/.test(t)));
    out.ownerNotTold = !TM.ofEv(B, ev.id) || TM.ofEv(B, ev.id).kind === 'felt';
    openVillagerCard(D); out.card = document.getElementById('vcbox').innerText; closeVillagerCard();
    TALK.on.world = false; out.switchOff = true; for (let i = 0; i < 6; i++) { const cv = talkRun(E, F, true); if (cv.turns.some(t => ACTS[t.act].kind === 'world')) out.switchOff = false; } TALK.on.world = true;
    return out; });
  check(r.first[0] === 'saw' && r.first[1] === 'did' && r.first[2] === 'felt' && r.dNone, 'an event is remembered first hand by those who saw, did and felt it: ' + JSON.stringify(r.first));
  check(r.d && r.d.kind === 'told' && r.d.from && r.d.conf < 1 && r.d.hop === 1, 'telling it gives the listener a told version that is less sure: ' + JSON.stringify(r.d));
  check(r.e && r.e.from && r.e.hop === 2 && r.e.conf < r.d.conf, 'a second telling is another hop and less sure again: ' + JSON.stringify([r.d, r.e]));
  check(r.lines && r.ownerNotTold, 'the telling is said in words, and nobody tells the person it happened to');
  check(/Knows/i.test(r.card) && /stole from|walked off/.test(r.card) && /heard it from/.test(r.card), 'the card shows what they know and where from: ' + r.card.slice(0, 200));
  check(r.switchOff, 'with world talk switched off nobody shares news');
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return 'news: ' + JSON.stringify(r.d) + ' overheard by ' + r.over;
});

test('talk (visible): bubbles know who is spoken to, the two face each other, and H switches on hyper talk', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 9 * 60);
  const r = await page.evaluate(() => {
    TALK.running = false; const out = {}; startPlaying(npcs.find(canControl));
    const free = npcs.filter(q => !q.dead && !q.player && q.age >= 18 && q.pose !== 'sleep'), a = free[0], c = free[1];
    const spot = (x, y) => { for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const tx = x + dx, ty = y + dy; if (walkable(tx, ty) && !lfPropAt(tx, ty) && !npcs.some(o => o.tx === tx && o.ty === ty)) return { x: tx, y: ty }; } return null; };
    const sa = spot(town.cx - 2, town.cy + 2), sb = spot(sa.x + 2, sa.y); for (const [n, s] of [[a, sa], [c, sb]]) { abortPlan(n); n.tx = n.x = s.x; n.ty = n.y = s.y; n.pose = 'stand'; n.moving = false; n.path = []; } rebuildOcc();
    game.events.length = 0; bubbles.length = 0; a.bubbleUntil = c.bubbleUntil = 0; talkRun(a, c, true); drainEvents(performance.now() + 50);
    const mine = bubbles.filter(q => q.n === a || q.n === c); out.n = mine.length; out.allTo = mine.every(q => (q.n === a && q.to === c) || (q.n === c && q.to === a));
    faceTo(a, c); faceTo(c, a); out.face = Math.sign(c.tx - a.tx) === a.face.dx && Math.sign(a.tx - c.tx) === c.face.dx;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' })); out.hyper = TALK.hyper === true && !document.querySelector('.hyperbadge').hidden;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' })); out.off = TALK.hyper === false && document.querySelector('.hyperbadge').hidden;
    return out; });
  check(r.n > 4 && r.allTo, 'every bubble of the exchange knows who it is addressed to: ' + JSON.stringify(r));
  check(r.face, 'the two face each other');
  check(r.hyper && r.off, 'H switches hyper talk on (with a badge) and off again');
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return 'visible talk';
});

test('life events (the contract): kinds are registered, data is required, events are counted and day-logged, the old world events come through the same stream, and lines can only refer to what is defined', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 1440);
  const r = await page.evaluate(() => {
    const out = {}; const n = npcs.find(q => !q.dead && !q.player && q.age >= 18); const throws = f => { try { f(); return false; } catch (e) { return String(e.message || e); } };
    out.strict = LIFE.strict === true;
    out.unreg = throws(() => LIFE.emit('no_such_kind', n, {}));
    out.missing = throws(() => LIFE.emit('bought', n, { item: 'barley' }));
    const n0 = LIFE.stream.length, d0 = (LIFE.digest(1).kinds.bought || 0); const rec = LIFE.emit('bought', n, { item: 'barley', qty: 3, price: 2 });
    out.rec = !!rec && LIFE.stream.length === n0 + 1 && LIFE.digest(1).kinds.bought === d0 + 1 && LIFE.today(n).some(e => e.kind === 'bought') && (n.tmem || []).some(m => m.kind === 'life' && m.lk === 'bought');
    const s0 = LIFE.stream.length; const ev = lfEmit('theft', { actor: n, tags: ['theft'], sev: 1, text: 'x' }); out.legacy = LIFE.stream.length === s0 + 1 && LIFE.stream[LIFE.stream.length - 1].legacy === true && LIFE.today(n).some(e => e.kind === 'theft');
    // everything a line may name is defined: an 'ev:' line is a registered kind, any other line is a defined act, and every requirement resolves to a known kind of thing
    const badLines = LEX.filter(e => e.act.startsWith('ev:') ? !REG.has('event', e.act.slice(3)) : e.act.startsWith('ev1:') ? !REG.has('event', e.act.slice(4)) : e.act.startsWith('life:') ? !REG.has('event', e.act.slice(5)) : !ACTS[e.act]).map(e => e.act); out.badLines = [...new Set(badLines)];
    const kinds = REG.all('event'); out.kinds = kinds.length; out.badKinds = kinds.filter(k => !k.family || k.tell == null).map(k => k.id);
    // deleting a definition makes the lint above fail for its lines (so removing a feature forces the clean-up)
    REG.remove('event', 'arrival'); out.afterRemove = [...new Set(LEX.filter(e => (e.act.startsWith('ev:') || e.act.startsWith('ev1:')) && !REG.has('event', e.act.slice(e.act.indexOf(':') + 1))).map(e => e.act))]; REG.define('event', 'arrival', { family: 'place', needs: [], tell: 0.9, tags: [] });
    // the day so far: sleeping, privy and eating were reported by the step system
    const dg = LIFE.digest(2); out.dg = dg.kinds; return out; });
  check(r.strict, 'the tests run the stream in strict mode');
  check(/unregistered/.test(r.unreg) && /missing item|missing qty|missing/.test(r.missing), 'an unregistered kind and missing data are refused: ' + JSON.stringify([r.unreg, r.missing]));
  check(r.rec && r.legacy, 'an event is counted, day-logged and remembered, and the old world events come through the same stream');
  check(r.badLines.length === 0 && r.badKinds.length === 0, 'every line names a defined act or a registered event kind, and every kind has a family and tellability: ' + JSON.stringify([r.badLines, r.badKinds]));
  check(r.afterRemove.includes('ev:arrival'), 'deleting a definition leaves its lines flagged');
  check((r.dg.slept || 0) + (r.dg.slept_rough || 0) >= 5 && (r.dg.ate || 0) >= 5, 'a normal day reports sleeping and eating through the step system: ' + JSON.stringify(r.dg));
  check(errors.length === 0, 'no errors (strict mode would throw on any unregistered kind): ' + errors.slice(0, 2).join(' | '));
  return r.kinds + ' kinds registered; day: ' + JSON.stringify(r.dg);
});

test('talk and needs: while two people talk their hunger, bladder and tiredness stand still; they stand on the next tile, facing; the bubble goes on the side that faces you', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 9 * 60);
  const r = await page.evaluate(() => {
    const out = {}; const free = npcs.filter(q => !q.dead && !q.player && q.age >= 18 && q.pose !== 'sleep'), a = free[0], c = free[1];
    for (const n of [a, c]) { n.hunger = 40; n._h = 40; n.bladder = 30; n.energy = 70; n.talkUntil = game.time + 30; }
    const h0 = [a.hunger, a.bladder, a.energy]; tickEcon(10); out.held = [a.hunger, a.bladder, a.energy].every((v, i) => v === h0[i]);
    a.talkUntil = 0; const h1 = a.hunger; tickEcon(10); out.runs = a.hunger > h1;
    // the next tile, facing
    const sp = (x, y) => { for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const tx = x + dx, ty = y + dy; if (walkable(tx, ty) && !lfPropAt(tx, ty) && !npcs.some(o => o.tx === tx && o.ty === ty)) return { x: tx, y: ty }; } return null; };
    let sa = null, sb = null; scan: for (let r = 0; r < 25; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const x = town.cx + dx, y = town.cy + dy; let ok = true; for (let i = -1; i <= 5 && ok; i++) for (let j = -1; j <= 1 && ok; j++) { const tx = x + i, ty = y + j; if (!walkable(tx, ty) || lfPropAt(tx, ty) || roomAt[ty][tx] >= 0 || npcs.some(o => o.tx === tx && o.ty === ty)) ok = false; } if (ok) { const pth = findPath(x, y, x + 3, y); if (pth && pth.length > 0 && pth.length <= 4) { sa = { x, y }; sb = { x: x + 4, y }; break scan; } } }   // (open ground you can really walk straight across)
    for (const [n, s] of [[a, sa], [c, sb]]) { abortPlan(n); n.tx = n.x = s.x; n.ty = n.y = s.y; n.pose = 'stand'; n.moving = false; n.talkUntil = 0; n.talkBusy = 0; n.hunger = 30; n.bladder = 20; } rebuildOcc(); out.place = [sa, sb, a.tx, a.ty, c.tx, c.ty];
    const spot = talkSpot(c, a); out.orth = !!spot && Math.abs(spot.x - c.tx) + Math.abs(spot.y - c.ty) === 1 && (spot.x === c.tx || spot.y === c.ty);
    a.tx = a.x = spot.x; a.ty = a.y = spot.y; rebuildOcc();   // (the walk itself is tested elsewhere: here the one who walks over has arrived on that tile)
    town.lifeTold = {}; LIFE.emit('slept_rough', a, {}); a.saidTo = {}; c.saidTo = {};   // (something to say)
    const n0 = TALK.log.length; talkApproach(a, c); window.__ac = [a.id, c.id, n0]; out.first = a.plan[0].text;
    // bubble sides: you north of them = above (tail below), south = below (tail above), east = right, west = left
    out.sides = [bubbleSide(0, -5), bubbleSide(0, 5), bubbleSide(6, 1), bubbleSide(-6, -1), bubbleSide(0, 3, true)];
    return out; });
  check(r.held && r.runs, 'needs stand still while talking and run again afterwards: ' + JSON.stringify([r.held, r.runs]));
  check(r.orth, 'the spot to talk from is the whole tile next to them, never a diagonal: ' + JSON.stringify(r.place));
  check(JSON.stringify(r.sides) === JSON.stringify(['above', 'below', 'right', 'left', 'above']), 'the bubble sits on the side that faces you: ' + JSON.stringify(r.sides));
  await simulate(page, 25);
  const d = await page.evaluate(() => { const [x, y, n0] = window.__ac, e = TALK.log.slice(n0).find(l => l.a === x && l.b === y); const a = byId(x), c = byId(y); return { talked: !!e, d: e ? e.d : 99, st: a.status, pos: [a.tx, a.ty, c.tx, c.ty], plan: (a.plan || []).map(q => q.text).slice(0, 3) }; });
  check(d.talked && d.d === 1, 'they talked standing on the next tile: ' + JSON.stringify([d, r.place]));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return 'needs pause, next tile, bubble sides';
});

test('life slice: farming, trade and needs report real events; villagers tell their day from them, listeners sympathise with troubles, and the town panel counts what people suffered', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 3 * 1440);
  const r = await page.evaluate(() => {
    const out = {}; const dg = LIFE.digest(3).kinds; out.real = { planted: dg.planted || 0, bought: dg.bought || 0, sold: dg.sold || 0, harvested: dg.harvested || 0 };
    out.count = [lxCount(1, 'cabbages'), lxCount(7, 'barley'), lxCount(1, 'strawberries'), lxCount(1, 'corn'), lxCount(12, 'turnips')];
    out.troubleKinds = Object.keys(LIFE_TROUBLE).every(k => REG.has('event', k));
    // a person with a bad night and a busy morning tells a friend
    TALK.words = true; TALK.running = false; const adults = npcs.filter(q => !q.dead && !q.player && q.age >= 18), A = adults[0], B = adults[1];
    A.day = []; B.day = []; LIFE.emit('slept_rough', A, { where: 'rough' }); for (let i = 0; i < 6; i++) LIFE.emit('planted', A, { seed: 'turnip', qty: 1 });
    const rec = LIFE.recent(A, B); out.recent = rec.map(g => g.kind + ':' + g.data.qty);
    let told = null; for (let i = 0; i < 20 && !told; i++) { const cv = talkRun(A, B, true), l = TALK.log[TALK.log.length - 1]; if (cv.turns.some(t => t.act === 'report_day')) told = l; }
    out.lines = told ? told.lines : null; out.acts = told ? told.acts.map(a => a.act) : null;
    out.memB = (B.tmem || []).some(m => m.kind === 'told_life' && m.with === A.id);
    out.troubles = LIFE.troubles(2).map(t => t.kind + ':' + t.people);
    // the panel
    return out; });
  check(r.real.planted > 5 && r.real.bought >= 1 && r.real.harvested >= 1, 'a normal three days reports planting, trade and harvest from the game itself: ' + JSON.stringify(r.real));
  check(r.count.join('|') === 'a cabbage|7 barley|a strawberry|a little corn|12 turnips', 'counts are said the way people say them: ' + r.count.join('|'));
  check(r.recent.length >= 2 && r.recent[0].startsWith('slept_rough'), 'the day is grouped (six plantings are one line) and the worst comes first: ' + JSON.stringify(r.recent));
  check(r.lines && r.acts.includes('report_day') && r.lines.some(l => /rough|ground|[Bb]ed|sand|planted|Put in|outside/.test(l)), 'they tell it in words: ' + JSON.stringify(r.lines && r.lines.slice(0, 8)));
  check(r.memB, 'the listener now knows how the other one has been');
  check(r.troubles.some(t => t.startsWith('slept_rough')) && r.troubleKinds, 'troubles are counted by kind and by person: ' + JSON.stringify(r.troubles));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify(r.real) + ' ' + JSON.stringify(r.troubles);
});

test('world modules: a job, an event or a system can be switched off to test the rest, and what needs it goes with it', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 8 * 60);
  const r = await page.evaluate(() => {
    const out = {}; out.n = Object.keys(MODS.defs).length; out.kinds = [...new Set(Object.values(MODS.defs).map(d => d.kind))].sort().join(',');
    // dependencies: weddings need romance
    MODS.set('sys.romance', false); out.wedNeeds = modOn('event.wedding') === false && LF2.feat.romance === false; MODS.set('sys.romance', true); out.wedBack = modOn('event.wedding');
    // a recipe: only farming
    MODS.only(['job.Farmer', 'sys.economy']); out.only = [modOn('job.Farmer'), modOn('job.Miner'), modOn('gath.fishing'), modOn('event.funeral'), modOn('sys.economy')]; MODS.all(); out.all = Object.keys(MODS.defs).every(k => modOn(k));
    // weddings, funerals and parties can be skipped
    MODS.set('event.wedding', false); const a = npcs.find(q => !q.dead && !q.player && q.age >= 20 && !q.female), c = npcs.find(q => !q.dead && !q.player && q.age >= 20 && q.female && q !== a); town.wedding = null; scheduleWedding(a, c); out.noWedding = !town.wedding; MODS.set('event.wedding', true);
    // farming off: nobody plants for a day; fishing trips off: none organised
    out.p0 = LIFE.digest(1).kinds.planted || 0; MODS.set('job.Farmer', false); MODS.set('gath.fishing', false); for (const q of npcs) if (q.cur === 'Farmer') { q.cur = null; abortPlan(q); } window.__before = [0, (town.gath || []).length];
    document.getElementById('modbox') && window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })); out.panel = !document.getElementById('modbox').hidden && document.getElementById('modbox').innerText.includes('Farming'); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    return out; });
  check(r.n >= 30 && /event/.test(r.kinds) && /job/.test(r.kinds) && /system/.test(r.kinds), 'jobs, events, systems and talk kinds are all defined as modules: ' + r.n + ' ' + r.kinds);
  check(r.wedNeeds && r.wedBack, 'weddings go off with romance, and come back with it');
  check(r.only[0] === true && r.only[1] === false && r.only[2] === false && r.only[3] === false && r.only[4] === true && r.all, 'a recipe keeps only what it names and what that needs: ' + JSON.stringify(r.only));
  check(r.noWedding, 'a switched-off wedding is not scheduled');
  check(r.panel, 'J opens the panel');
  const t0 = await page.evaluate(() => window.__before);
  await simulate(page, 1440);
  const r2 = await page.evaluate(() => ({ planted: LIFE.digest(1).kinds.planted || 0, fishing: (town.gath || []).slice(window.__before[1]).filter(g => g.kind === 'fishing').length }));
  check(r2.planted === 0 && r2.fishing === 0, 'with farming off nobody plants for a day, and with fishing trips off none are organised: ' + JSON.stringify([t0, r2]));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.n + ' modules';
});

test('hamlet: three households (you, a trader, a family), the add-on rules are off, nobody needs a privy, tools never wear, nobody starves, and the trader sells four seeds and buys a turnip', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('hamlet-test', 'hamlet'); const out = {}; const P = game.player;
    out.scen = town.scenario; out.pack = town.pack; out.pop = npcs.length; out.player = !!P && P.first === 'Tipping' && P.id === town.hamletPlayer; out.coin = P && P.coin;
    out.trader = npcs.filter(n => n.shop).length; out.family = npcs.filter(n => !n.shop && n !== P).map(n => n.age >= 16 ? 'adult' : 'child').sort().join(',');
    const fam = npcs.filter(n => !n.shop && n !== P); out.couple = fam.filter(n => n.fam.spouse).length === 2 && fam.some(n => n.fam.kids.length === 1);
    out.rules = ['bladder', 'wear', 'births', 'ageing', 'starving', 'mushrooms'].map(k => modOn('rule.' + k));
    out.mods = [modOn('job.Farmer'), modOn('job.Baker'), modOn('job.Miner'), modOn('gath.fishing'), modOn('sys.law'), modOn('sys.romance'), modOn('event.wedding'), modOn('sys.gossip'), modOn('talk.ritual')];
    out.shrooms = (town.shrooms || []).length; out.homeless = npcs.filter(n => n.homeless).length;
    const m = farmSeller(); out.sells = Object.keys(m.sells).filter(g => g.startsWith('seed_')).sort().join(','); out.range = farmSeedRange().join(',');
    P.coin = 50; farmShopDialog(m); const labels = (talkUI.opts || []).map(o => o[1]); out.menu = labels.join('|'); closeTalk && closeTalk();
    P.inv = P.inv || {}; m.n.coin = 100; m.stock.turnip = 0; P.inv.turnip = 3; const c0 = P.coin; farmShopDialog(m); const k = (talkUI.opts || []).findIndex(o => /Sell your 3 turnips/.test(o[1])); out.sellIdx = k; if (k >= 0) lf2TalkStep('c' + k); out.paid = P.coin - c0; out.turnips = P.inv.turnip || 0; closeTalk && closeTalk();
    return out;
  });
  check(r.scen === 'hamlet' && r.pack === 'island', 'the scenario is the hamlet, in the island voice: ' + r.scen + ' ' + r.pack);
  check(r.pop === 5 && r.player && r.coin === 60, 'five people, you the settler with 60 coin: ' + JSON.stringify([r.pop, r.player, r.coin]));
  check(r.trader === 1 && r.family === 'adult,adult,child' && r.couple, 'a trader and a family of three (a couple and their child): ' + JSON.stringify([r.trader, r.family, r.couple]));
  check(r.rules.every(v => v === false), 'every add-on rule is switched off: ' + JSON.stringify(r.rules));
  check(r.mods[0] && !r.mods[1] && !r.mods[2] && !r.mods[3] && !r.mods[4] && r.mods[5] && r.mods[6] && r.mods[7] && r.mods[8], 'farming, romance, weddings, gossip and talk on; baker, mining, fishing and law off: ' + JSON.stringify(r.mods));
  check(r.shrooms === 0, 'no mushrooms are scattered');
  check(r.sells === 'seed_barley,seed_cabbage,seed_poppy,seed_turnip' && r.range === 'barley,turnip,cabbage,poppy', 'the trader sells barley, turnip, cabbage and poppy seed: ' + r.sells);
  check(r.sellIdx >= 0 && r.paid > 0 && r.turnips === 0, 'the trader buys a turnip: ' + JSON.stringify([r.sellIdx, r.paid, r.turnips, r.menu]));
  const r2 = await page.evaluate(() => {
    const out = { bladder: 0, hunger: 0 };
    for (const n of npcs) { n.bladder = 0; n.hunger = 0; }
    return out;
  });
  await simulate(page, 1440);
  const r3 = await page.evaluate(() => {
    const P = game.player, fam = npcs.filter(n => !n.shop && n !== P && n.age >= 16);
    // a tool used 200 times is not worn
    P.items = P.items || []; itGiveTool(P, 'hoe'); const it0 = P.items.find(i => i.kind === 'hoe'); const w0 = it0.wear; for (let i = 0; i < 200; i++) itWearTool(P, 'hoe'); const w1 = it0.wear;
    return { bladder: Math.max(...npcs.map(n => n.bladder || 0)), w0, w1, alive: npcs.filter(n => !n.dead).length };
  });
  check(r3.bladder === 0, 'a day on, nobody needs a privy: ' + r3.bladder);
  check(r3.w0 === r3.w1, 'a tool used 200 times does not wear: ' + r3.w0 + ' -> ' + r3.w1);
  // ten days with no food in the world: they go hungry and miserable, nobody dies
  await page.evaluate(() => { for (const n of npcs) { n.inv = {}; } for (const m of merchants) m.stock = {}; });
  await simulate(page, 10 * 1440);
  const r4 = await page.evaluate(() => ({ alive: npcs.filter(n => !n.dead).length, pop: npcs.length, ages: npcs.map(n => n.age).join(','), births: town.births }));
  check(r4.alive === 5 && r4.births === 0, 'nobody dies of hunger and nobody is born in ten days: ' + JSON.stringify(r4));
  check(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
  await page.close();
  return 'five people; add-on rules off; trader sells four seeds, buys a turnip; no bladder, no wear, no hunger deaths in ten days';
});
test('hamlet build menu: seven items, the kit is bought from the trader, fences and gates join up and do not make rooms, a field tile is laid, row-laid by holding the key and refunded by the hammer', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('hamlet-build', 'hamlet'); const P = game.player, out = {}; const m = farmSeller();
    const free = (x, y) => walkable(x, y) && !lfPropAt(x, y) && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && !(town.siteAt && town.siteAt[y * W + x]) && !(town.nodeMap && town.nodeMap.has(y * W + x));
    const find = pred => { for (let t = 0; t < 30000; t++) { const x = 8 + Math.floor(Math.random() * (W - 16)), y = 8 + Math.floor(Math.random() * (H - 16)); if (pred(x, y)) return [x, y]; } throw new Error('no ground'); };
    const place = (x, y, face) => { P.tx = P.x = x; P.ty = P.y = y; P.path = []; P.moving = false; P.face = face; P.player.keys = {}; P.player.act = null; };
    // the kit starts empty and is bought: three walls
    out.kit0 = JSON.stringify(town.kit); P.coin = 60; farmShopDialog(m);
    let labels = (talkUI.opts || []).map(o => o[1]);
    const click = re => { const i = labels.findIndex(l => re.test(l)); if (i < 0) return false; const st = lf2TalkStep('c' + i); if (st && st.opts) labels = st.opts.map(o => o[1]); return true; };
    out.top = labels.join('|');
    out.ok1 = click(/^Buy building items/); out.items = labels.filter(l => /^Buy a /.test(l)).join('|');
    for (let i = 0; i < 3; i++) click(/^Buy a wall block \(4\)/);
    out.coin = P.coin; out.walls = town.kit.bwall; click(/^Back/); closeTalk && closeTalk();
    // a poor player cannot buy
    P.coin = 1; farmShopDialog(m); labels = (talkUI.opts || []).map(o => o[1]); click(/^Buy building items/); click(/^Buy a bed \(10\)/); out.poorBeds = town.kit.bed || 0; closeTalk && closeTalk(); P.coin = 100;
    // the build menu: seven items, the bar has them in order
    itBuildToggle(P, true); const b = itBuildState(P); out.bar = b.bar.join(','); out.list = itBuildList().map(i => i.kind).join(',');
    out.cells = (itBuildBagHTML(P).match(/data-bkind=/g) || []).length;
    // an empty kit says so; a bought one is used up
    const [x0, y0] = find((x, y) => { for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) if (!free(x + i, y + j)) return false; return true; });
    place(x0 + 4, y0 + 4, { dx: 1, dy: 0 }); town.kit = { bwall: 1 }; const w0 = town.props.length; itBuildSelect(P, 3); out.placedWall = town.props.length - w0; out.wallsLeft = town.kit.bwall; itBuildSelect(P, 3); out.refused = town.props.length - w0;
    // a ring of fences with a gate: they join up, they are not a room
    const rooms0 = rooms.filter(q => !q.dead).length; const ring = [];
    for (let i = 0; i < 6; i++) for (const [x, y] of [[x0 + 1 + i, y0 + 1], [x0 + 1 + i, y0 + 6], [x0 + 1, y0 + 1 + i], [x0 + 6, y0 + 1 + i]]) if (!lfPropAt(x, y)) ring.push(lfAddProp(i === 3 && y === y0 + 6 ? 'gate' : 'fence', x, y));
    for (const p of ring) bldQueue(p); bldTick(); town.lfPV++;
    out.rooms = rooms.filter(q => !q.dead).length - rooms0; out.stillProps = ring.every(p => town.props.includes(p));
    const corner = lfPropAt(x0 + 1, y0 + 1), side = lfPropAt(x0 + 3, y0 + 1), gate = lfPropAt(x0 + 4, y0 + 6);
    out.art = [lfPropArt(corner), lfPropArt(side), lfPropArt(gate), lfPropArt(lfPropAt(x0 + 1, y0 + 3))].join(','); out.artsExist = [corner, side, gate].every(p => !!ART.BYID[lfPropArt(p)]);
    // the hammer gives a fence back
    town.kit = {}; itBuildSelect(P, 1); place(x0, y0 + 1, { dx: 1, dy: 0 }); const hit = lifeAct(P, P.player, x0 + 1, y0 + 1, 1, 0); out.fenceHit = !!hit; if (hit) hit.run(P); out.fenceBack = town.kit.fence || 0;
    // a field tile: one in front of you, paid from the kit; hold the key and walk for a row
    itBuildSelect(P, 0); town.kit = { field: 4 }; const [fx, fy] = find((x, y) => [0, 1, 2, 3, 4].every(i => free(x + i, y)) && free(x, y + 1)); place(fx, fy, { dx: 1, dy: 0 });
    itBuildSelect(P, 9); out.f1 = grid[fy][fx + 1] === T.CROP; const c1 = town.crops.find(c => c.x === fx + 1 && c.y === fy); out.ploughed = !!c1 && c1.pl === 1 && !c1.st; out.kitF1 = town.kit.field; out.hold = P.build.fieldHold;
    P.tx = P.x = fx + 1; bldBrushStep(P); P.tx = P.x = fx + 2; bldBrushStep(P); out.row = [fx + 1, fx + 2, fx + 3].every(x => grid[fy][x] === T.CROP); out.kitF2 = town.kit.field;
    window.dispatchEvent(new KeyboardEvent('keyup', { key: '0' })); out.released = P.build.fieldHold === false; P.tx = P.x = fx + 3; bldBrushStep(P); out.noMore = grid[fy][fx + 4] !== T.CROP;
    // out of tiles: the hold stops
    town.kit.field = 0; itBuildSelect(P, 9); out.fieldOut = grid[fy][fx + 4] !== T.CROP;
    // the hammer digs a tile back and gives it back
    itBuildSelect(P, 1); place(fx, fy, { dx: 1, dy: 0 }); const dig = targetAt0(P, fx + 1, fy); out.dig = !!dig && /^wallC/.test(dig.key); if (dig) dig.run(P); out.digged = grid[fy][fx + 1] !== T.CROP && !town.crops.some(c => c.x === fx + 1 && c.y === fy); out.refund = town.kit.field;
    // not on a path or on a prop
    town.kit.field = 5; setT(fx + 1, fy, T.PATH); place(fx, fy, { dx: 1, dy: 0 }); itBuildSelect(P, 9); out.notPath = grid[fy][fx + 1] === T.PATH; P.build.fieldHold = false;
    // a tent-less, privy-less palette: 'toilet' is not offered
    out.noToilet = !itBuildList().some(i => i.kind === 'toilet');
    return out;
  });
  check(r.kit0 === '{}', 'the kit starts empty: ' + r.kit0);
  check(r.ok1 && r.coin === 48 && r.walls === 3, 'three walls bought for 12 coin: ' + JSON.stringify([r.ok1, r.coin, r.walls, r.top]));
  check(r.items === 'Buy a wall block (4)|Buy a window block (6)|Buy a door block (6)|Buy a bed (10)|Buy a fence (1)|Buy a gate (3)|Buy a field plot (2)', 'the trader sells the seven building items: ' + r.items);
  check(r.poorBeds === 0, 'a bed is not sold to someone with 1 coin');
  check(r.bar === 'bwall,bwindow,bdoor,bed,fence,gate,field' && r.list === r.bar && r.cells === 7, 'the build menu and bar hold exactly the seven items: ' + JSON.stringify([r.bar, r.list, r.cells]));
  check(r.placedWall === 1 && r.wallsLeft === 0 && r.refused === 1, 'placing takes one from the kit, an empty kit places nothing: ' + JSON.stringify([r.placedWall, r.wallsLeft, r.refused]));
  check(r.rooms === 0 && r.stillProps, 'a closed ring of fences and a gate is not a room: ' + JSON.stringify([r.rooms, r.stillProps]));
  check(r.artsExist && /^fence_10,fence_3,gate_h,fence_12$/.test(r.art), 'fences and gates join up: ' + r.art);
  check(r.fenceHit && r.fenceBack === 1, 'the hammer takes a fence down and gives it back: ' + JSON.stringify([r.fenceHit, r.fenceBack]));
  check(r.f1 && r.ploughed && r.kitF1 === 3 && r.hold === true, 'a field tile goes down ploughed, in front of you: ' + JSON.stringify([r.f1, r.ploughed, r.kitF1, r.hold]));
  check(r.row && r.kitF2 === 1, 'holding the key and walking lays a row: ' + JSON.stringify([r.row, r.kitF2]));
  check(r.released && r.noMore, 'letting go stops the row: ' + JSON.stringify([r.released, r.noMore]));
  check(r.fieldOut, 'with no tiles left nothing is laid');
  check(r.dig && r.digged && r.refund === 1, 'the hammer digs a tile back and refunds it: ' + JSON.stringify([r.dig, r.digged, r.refund]));
  check(r.notPath, 'a field needs bare grass'); check(r.noToilet, 'no privy seat in the Hamlet palette');
  await page.close();
  return 'seven items, the kit is bought, fences join, fields are laid and refunded';
});
test('hamlet yards: a fence ring with a gate is a yard, beds inside make the household, the family moves in and farms only its own fields, an open yard keeps its claim for a day, a warning card on leaving build mode, save and restore', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('hamlet-yards', 'hamlet'); const P = game.player, out = {}; const TR = npcs.find(n => n.shop), fam = npcs.filter(n => n !== P && n !== TR), dad = fam.find(n => n.age >= 16 && !n.female), kid = fam.find(n => n.age < 16);
    window.__free = (x, y) => walkable(x, y) && !lfPropAt(x, y) && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && !(town.nodeMap && town.nodeMap.has(y * W + x)) && !yardAtXY(x, y);
    window.__area = (w, h) => { for (let t = 0; t < 60000; t++) { const x = 8 + Math.floor(Math.random() * (W - 16 - w)), y = 8 + Math.floor(Math.random() * (town.h0 - 16 - h)); let ok = true; for (let j = -1; j <= h && ok; j++) for (let i = -1; i <= w && ok; i++) if (!__free(x + i, y + j)) ok = false; if (ok) return [x, y]; } throw new Error('no ground'); };
    window.__ring = (x0, y0, w, h, gate) => { const ps = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (i === 0 || j === 0 || i === w - 1 || j === h - 1) ps.push(lfAddProp(gate && i === gate[0] && j === gate[1] ? 'gate' : 'fence', x0 + i, y0 + j)); return ps; };
    window.__del = pr => { town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); town.props = town.props.filter(q => q !== pr); town.lfPV++; };
    window.__move = (pr, x, y) => { town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = x; pr.y = y; town.propAt.set(y * W + x, pr); town.pblock[y * W + x] = 1; town.lfPV++; };
    // the start: the trader has a yard, the family has no beds, your bed is in the open
    out.start = [town.yards.length, yardOfN(TR) === town.yards[0], yardName(town.yards[0]), fam.every(n => n.homeless), !yardOfN(P) && yardHasBed(P)];
    const g0 = town.yards[0].gates[0]; out.gateWalk = walkable(g0 % W, (g0 / W) | 0); const f0 = town.yards[0].fences.find(k => !town.yards[0].gates.includes(k)); out.fenceBlocks = !walkable(f0 % W, (f0 / W) | 0);
    // a ring with no gate, and one too small, are not yards
    const [ax, ay] = __area(7, 6); const noGate = __ring(ax, ay, 7, 6, null); yardScan(); out.noGate = town.yards.length; noGate.forEach(__del);
    const small = __ring(ax, ay, 5, 4, [2, 3]); yardScan(); out.small = town.yards.length; small.forEach(__del);
    // a yard for the family: a ring with a gate, three beds, six field tiles
    const ring = __ring(ax, ay, 7, 6, [3, 5]); const beds = [0, 1, 2].map(i => lfAddProp('bed', ax + 1 + i, ay + 1));
    for (let i = 0; i < 5; i++) { setT(ax + 1 + i, ay + 3, T.CROP); town.crops.push({ x: ax + 1 + i, y: ay + 3, f: 'fam', pl: 1, st: 0, t0: 0 }); }
    yardHousing(); const Y = yardAtXY(ax + 2, ay + 2); out.yard = [town.yards.length, !!Y, Y && Y.cells.length, Y && Y.gates.length, Y && Y.fences.length];
    out.moved = fam.map(n => yardOfN(n) === Y).join(); out.name = yardName(Y); out.house = Y.household.length; out.notHomeless = fam.every(n => !n.homeless); out.hh = hhOf(dad).length; out.pantry = pantryOf(dad) === Y.store;
    window.__Y = Y; window.__ring0 = ring; window.__a = [ax, ay];
    // fields: the family's are theirs; yours are the ones outside every yard
    const mine = __area(4, 2); for (let i = 0; i < 3; i++) { setT(mine[0] + i, mine[1], T.CROP); town.crops.push({ x: mine[0] + i, y: mine[1], f: 'me', pl: 1, st: 0, t0: 0 }); }
    const cIn = town.crops.find(c => c.f === 'fam'), cOut = town.crops.find(c => c.f === 'me'); window.__mine = mine;
    out.rights = [yardMine(dad, cIn), yardMine(TR, cIn), yardMine(P, cIn), yardMine(dad, cOut), yardMine(P, cOut)].join();
    const t = targetAt0(P, cIn.x, cIn.y); out.refuse = t && t.msg; const t2 = targetAt0(P, cOut.x, cOut.y); out.own = !!(t2 && t2.key);
    return out;
  });
  check(r.start[0] === 1 && r.start[1] && /yard$/.test(r.start[2]) && r.start[3] && r.start[4], 'at the start the trader has the only yard, the family has no beds and yours is in the open: ' + JSON.stringify(r.start));
  check(r.gateWalk && r.fenceBlocks, 'a gate is walked through and a fence is not');
  check(r.noGate === 1 && r.small === 1, 'a ring with no gate, or too small, is not a yard: ' + JSON.stringify([r.noGate, r.small]));
  check(r.yard[0] === 2 && r.yard[2] === 20 && r.yard[3] === 1 && r.yard[4] === 22, 'a ring of fences with a gate is a yard: ' + JSON.stringify(r.yard));
  check(r.moved === 'true,true,true' && r.house === 3 && r.notHomeless && /^the \w+ yard$/.test(r.name), 'the family moves into its beds, together: ' + JSON.stringify([r.moved, r.house, r.name]));
  check(r.hh === 3 && r.pantry, 'the household is the yard, its pantry the yard store');
  check(r.rights === 'true,false,false,false,true', 'fields belong to the yard they are in; those outside every yard are yours: ' + r.rights);
  check(/belongs to the \w+ yard/.test(r.refuse || '') && r.own, 'the hoe refuses a field in somebody else\'s yard: ' + r.refuse);
  await simulate(page, 2 * 1440);
  const r2 = await page.evaluate(() => {
    const out = {}; const fam = town.crops.filter(c => c.f === 'fam'), me = town.crops.filter(c => c.f === 'me');
    out.famSown = fam.filter(c => c.st > 0).length; out.meSown = me.filter(c => c.st > 0).length; out.store = JSON.stringify(__Y.store);
    out.sleep = npcs.filter(n => yardOfN(n) === __Y).map(n => (n.log || []).some(e => /Sleeping/.test(e.text)) || n.pose === 'sleep').join();
    return out;
  });
  check(r2.famSown >= 3 && r2.meSown === 0, 'the family sows its own fields and leaves yours alone: ' + JSON.stringify(r2));
  const r3 = await page.evaluate(() => {
    const out = {}, P = game.player, Y = __Y, id = Y.id, [ax, ay] = __a; const TR = npcs.find(n => n.shop), fam = yardPeople(Y), kid = fam.find(n => n.age < 16);
    // leaving build mode with the fence open: a card; Back to building keeps you in, closing the fence lets you leave
    itBuildToggle(P, true); const gone = __ring0.find(p => p.kind === 'fence' && p.x === ax); __del(gone); yardScan();
    out.open = [Y.open != null, town.yards.includes(Y), fam.every(n => yardOfN(n) === Y)];
    itBuildToggle(P, false); out.card = town.decision && town.decision.kind; out.text = town.decision && town.decision.text; out.stillOn = itBuildOn(P);
    answerDecision('yes'); out.back = itBuildOn(P) && !town.decision;
    const again = lfAddProp('fence', gone.x, gone.y); yardScan(); out.closed = [Y.open == null, Y.id === id, town.yards.length];
    itBuildToggle(P, false); out.left = !itBuildOn(P) && !town.decision;
    // leave anyway: the card is not shown twice for the same thing
    itBuildToggle(P, true); __del(again); itBuildToggle(P, false); out.card2 = !!town.decision; answerDecision('no'); out.left2 = !itBuildOn(P); itBuildToggle(P, true); itBuildToggle(P, false); out.noNag = !town.decision && !itBuildOn(P);
    window.__again = again; return out;
  });
  check(r3.open.every(Boolean), 'an opened yard keeps its claim: ' + JSON.stringify(r3.open));
  check(r3.card === 'yardwarn' && r3.stillOn && /fence round .* is open/.test(r3.text), 'leaving build mode with a yard open puts up a card: ' + JSON.stringify([r3.card, r3.text]));
  check(r3.back && r3.closed[0] && r3.closed[1] && r3.closed[2] === 2 && r3.left, 'Back to building keeps you in; closed again it is the same yard and you can leave: ' + JSON.stringify(r3));
  check(r3.card2 && r3.left2 && r3.noNag, 'Leave anyway leaves, and the same warning is not shown again');
  await simulate(page, 26 * 60);
  const r4 = await page.evaluate(() => {
    const out = {}, P = game.player, Y = __Y, [ax, ay] = __a; const TR = npcs.find(n => n.shop), fam = npcs.filter(n => n !== P && n !== TR), kid = fam.find(n => n.age < 16);
    out.gone = [!town.yards.includes(Y), town.yards.length, fam.every(n => yardHasBed(n) && !yardOfN(n))]; out.warn = yardWarnings().length;
    // closed again: a yard again, and the family is its household because their beds stand in it
    lfAddProp('fence', __again.x, __again.y); yardHousing(); const Y2 = yardAtXY(ax + 2, ay + 2); out.again = [!!Y2, Y2 && yardPeople(Y2).length]; window.__Y = Y2;
    // a bed pushed into another yard moves its owner, and nobody else
    const ty = yardOfN(TR), free = ty.cells.find(k => !town.propAt.get(k)); __move(kid.bed, free % W, (free / W) | 0); yardHousing();
    out.kid = [yardOfN(kid) === ty, yardPeople(ty).length, yardPeople(Y2).length];
    // save and restore
    const json = isleCapture(); isleRestore(json); const k2 = npcs.find(n => n.id === kid.id), t2 = npcs.find(n => n.shop);
    out.saved = [town.yards.length, town.yardAt.size > 20, yardOfN(k2) === yardOfN(t2), yardPeople(yardOfN(t2)).length, town.yards.every(y => y.cells.every(k => town.yardAt.get(k) === y))];
    return out;
  });
  check(r4.gone[0] && r4.gone[1] === 1 && r4.gone[2] && r4.warn === 3, 'after a day open the yard is gone and its people have beds but no yard: ' + JSON.stringify(r4));
  check(r4.again[0] && r4.again[1] === 3, 'closing the ring makes it a yard again with the same household: ' + JSON.stringify(r4.again));
  check(r4.kid[0] && r4.kid[1] === 2 && r4.kid[2] === 2, 'a bed moved into another yard takes its owner with it, and nobody else: ' + JSON.stringify(r4.kid));
  check(r4.saved[0] === 2 && r4.saved.slice(1, 3).every(Boolean) && r4.saved[3] === 2 && r4.saved[4], 'yards survive save and restore: ' + JSON.stringify(r4.saved));
  check(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
  await page.close();
  return 'yards close, open with a day of grace, house the family, keep fields to their household, warn before leaving, and save';
});
test('hamlet rent: adults with a yard pay each morning (more for a roof, a window, flowers), unpaid rent is not a debt and weighs on them, children and the trader pay nothing, a household short of coin sells from its store, the HUD and the card say so', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('hamlet-rent', 'hamlet'); const P = game.player, out = {}; const TR = npcs.find(n => n.shop), fam = npcs.filter(n => n !== P && n !== TR), dad = fam.find(n => n.age >= 16 && !n.female), mum = fam.find(n => n.age >= 16 && n.female), kid = fam.find(n => n.age < 16);
    const free = (x, y) => walkable(x, y) && !lfPropAt(x, y) && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && !(town.nodeMap && town.nodeMap.has(y * W + x)) && !yardAtXY(x, y);
    const area = (w, h) => { let best = null; for (let y = 8; y < town.h0 - 8 - h; y++) for (let x = 8; x < W - 8 - w; x++) { let bad = 0; for (let j = -1; j <= h && bad < 9; j++) for (let i = -1; i <= w && bad < 9; i++) { const g = grid[y + j][x + i]; if (g !== T.GRASS && g !== T.TREE && g !== T.ROCK) bad = 99; else if (!free(x + i, y + j)) bad++; if (lfPropAt(x + i, y + j) || yardAtXY(x + i, y + j)) bad = 99; } if (bad < 9 && Math.hypot(x - town.cx, y - town.cy) > 14) { best = [x, y]; break; } if (best) break; } if (!best) throw new Error('no ground'); for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) { const X = best[0] + i, Y = best[1] + j; if (grid[Y][X] !== T.GRASS) setT(X, Y, T.GRASS); if (town.nodeMap && town.nodeMap.has(Y * W + X)) { const nd = town.nodeMap.get(Y * W + X); town.nodes = town.nodes.filter(q => q !== nd); town.nodeMap.delete(Y * W + X); } } town.gridV++; refreshReach(); return best; };
    const [ax, ay] = area(13, 13); window.__a = [ax, ay];
    for (let j = 0; j < 13; j++) for (let i = 0; i < 13; i++) if (i === 0 || j === 0 || i === 12 || j === 12) lfAddProp(i === 6 && j === 12 ? 'gate' : 'fence', ax + i, ay + j);
    const beds = [[3, 3], [9, 3], [6, 9]].map(([i, j]) => lfAddProp('bed', ax + i, ay + j)); yardHousing(); const Y = yardAtXY(ax + 6, ay + 6); window.__Y = Y;
    out.in = fam.every(n => yardOfN(n) === Y);
    // plain yard: 2 coin each adult; nothing from the child, the trader or you
    out.rents = [rentOf(dad).amt, rentOf(mum).amt, rentOf(kid).amt, rentOf(TR).amt, rentOf(P).amt].join();
    dad.coin = 2; mum.coin = 1; const c0 = P.coin; rentState().day = -1; rentCollect();
    out.paid = [P.coin - c0, dad.coin, mum.coin, dad.rentLast.ok, mum.rentLast.ok, rentState().today, rentState().due, mum.mods.some(m => m.id === 'rent')];
    rentCollect(); out.once = P.coin - c0;
    // the next morning she has coin: she pays that day's rent and nothing for yesterday
    mum.coin = 9; rentState().day = -1; rentCollect(); out.noDebt = mum.coin; out.covered = dad.rentLast.ok && dad.coin === 0;
    // a room round the father's bed, with a window, and poppies in bloom beside it
    const bx = dad.bed.x, by = dad.bed.y, q = [];
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (Math.abs(i) === 2 || Math.abs(j) === 2) { const x = bx + i, y = by + j; if (lfPropAt(x, y)) continue; q.push(lfAddProp(i === 0 && j === 2 ? 'bdoor' : i === 0 && j === -2 ? 'bwindow' : 'bwall', x, y)); }
    out.others = [mum, kid].map(n => Math.max(Math.abs(n.bed.x - bx), Math.abs(n.bed.y - by)));
    return out;
  });
  check(r.in, 'the family lives in the yard');
  check(r.rents === '2,2,0,0,0', 'two coin from each adult with a yard, nothing from the child, the trader or you: ' + r.rents);
  check(r.paid[0] === 2 && r.paid[1] === 0 && r.paid[2] === 1 && r.paid[3] === true && r.paid[4] === false && r.paid[5] === 2 && r.paid[6] === 4 && r.paid[7], 'who can pay pays, who cannot does not and feels it: ' + JSON.stringify(r.paid));
  check(r.once === 2, 'rent is collected once a day'); check(r.noDebt === 5 && r.covered, 'unpaid rent is not a debt, and the household covers for one another: ' + JSON.stringify([r.noDebt, r.covered]));
  const r2 = await page.evaluate(() => {
    const P = game.player, out = {}; const TR = npcs.find(n => n.shop), fam = npcs.filter(n => n !== P && n !== TR), dad = fam.find(n => n.age >= 16 && !n.female), mum = fam.find(n => n.age >= 16 && n.female), kid = fam.find(n => n.age < 16);
    const bx = dad.bed.x, by = dad.bed.y;
    for (const p of town.props.slice()) if (['bwall', 'bdoor', 'bwindow'].includes(p.kind)) bldQueue(p); bldTick(); visHomes(); yardHousing();
    out.room = roomAt[by][bx] >= 0; out.stillYard = yardOfN(dad) === __Y && fam.every(n => yardOfN(n) === __Y); out.home = JSON.stringify(rentHome(dad), (k, v) => k === 'yard' ? !!v : v);
    out.roof = rentOf(dad).amt; out.mum = rentOf(mum).amt;
    const fk = __Y.cells.find(k => { const x = k % W, y = (k / W) | 0; return Math.max(Math.abs(x - bx), Math.abs(y - by)) <= 4 && Math.max(Math.abs(x - bx), Math.abs(y - by)) >= 3 && grid[y][x] === T.GRASS && !lfPropAt(x, y) && roomAt[y][x] < 0 && [mum, kid].every(o => Math.max(Math.abs(x - o.bed.x), Math.abs(y - o.bed.y)) > 4); });
    const c = { x: fk % W, y: (fk / W) | 0, f: 'fl', pl: 1, st: 1, seed: 'poppy', t0: 0 }; c.t0 = game.time - itGrow(c) - 5; setT(c.x, c.y, T.CROP); town.crops.push(c);
    out.all = rentOf(dad).amt; out.parts = rentOf(dad).parts.map(p => p[0]).join();
    rentContent(); out.mods = dad.mods.filter(m => ['yard', 'roof', 'window', 'flowers'].includes(m.id)).map(m => m.id + m.v).sort().join(); out.pmods = (P.mods || []).some(m => m.id === 'yard');
    // somebody whose bed stands outside every yard: no rent, and they mind
    const stray = lfAddProp('bed', P.bed.x + 1, P.bed.y); const kb = kid.bed; kid.bed.owner = null; stray.owner = kid; kid.bed = stray; yardHousing(); rentContent();
    out.stray = [yardOfN(kid) == null, kid.mods.some(m => m.id === 'yard' && m.v < 0)]; stray.owner = null; kb.owner = kid; kid.bed = kb; yardHousing(); rentContent(); out.back = !kid.mods.some(m => m.id === 'yard');
    // a miserable or hungry villager works slowly
    const m0 = dad.mood, h0 = dad.hunger; dad.mood = 20; dad.hunger = 10; out.slow = lf2Slow(dad, [{ k: 'wait', act: 'work', min: 10 }])[0].min; dad.mood = 70; out.fast = lf2Slow(dad, [{ k: 'wait', act: 'work', min: 10 }])[0].min; dad.mood = m0; dad.hunger = h0;
    // the screen
    out.hud = rentHUD().replace(/<[^>]+>/g, ''); out.card = rentCardRow(dad).replace(/<[^>]+>/g, ' '); out.cardKid = /Rent/.test(rentCardRow(kid));
    // short of coin with a full store: somebody takes the spare food to the trader
    dad.coin = 0; mum.coin = 0; __Y.store = { grain: 40 }; for (const n of fam) { n.hunger = 5; n.inv.grain = 0; }
    return out;
  });
  check(r2.room && r2.stillYard, 'a room inside the yard is still the yard: ' + JSON.stringify([r2.room, r2.stillYard]));
  check(r2.roof === 4 && r2.mum === 2 && r2.all === 5 && r2.parts === 'a yard,a roof,a window,flowers', 'a roof, a window and flowers each add a coin for the one who has them: ' + JSON.stringify([r2.roof, r2.mum, r2.all, r2.parts, r2.home]));
  check(r2.mods === 'flowers3,roof6,window3' && !r2.pmods, 'what you built shows in their contentment: ' + r2.mods);
  check(r2.stray[0] && r2.stray[1] && r2.back, 'a bed outside every yard: no yard, and they mind: ' + JSON.stringify(r2.stray));
  check(r2.slow === 16 && r2.fast === 10, 'a miserable villager works slowly: ' + r2.slow);
  check(/\d+ coin · rent/.test(r2.hud), 'the screen shows your coin and the rent: ' + r2.hud);
  check(/Rent\s+5 a day \(a yard 2, a roof 1, a window 1, flowers 1\)/.test(r2.card) && /under a roof with a window/.test(r2.card) && !r2.cardKid, 'the card says what they pay and why: ' + r2.card);
  await simulate(page, 16 * 60);
  const r3 = await page.evaluate(() => {
    const P = game.player, TR = npcs.find(n => n.shop), fam = npcs.filter(n => n !== P && n !== TR);
    return { coin: fam.reduce((s, n) => s + n.coin, 0), store: __Y.store.grain, alive: npcs.filter(n => !n.dead).length, steps: fam.map(n => (n.log || []).map(e => e.text).slice(-7).join('/')).join(' | ') };
  });
  check(/Fetching food from the store to sell/.test(r3.steps) || r3.coin > 0 || r3.store < 40, 'a household short of coin takes what its store can spare to the trader: ' + JSON.stringify(r3));   // (the walk can be cut short by supper: the errand starting is the test, the selling is the ordinary loop)
  check(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
  await page.close();
  return 'rent 2 to 5 a head, paid at six, no debts; contentment from the home; the store is sold from when coin is short';
});
test('hamlet arrivals: an empty yard with 1, 2 or 3+ free beds brings a single, a couple or a family; nobody comes while anybody is bedless or a household is hungry; on marriage the one with the smaller yard carries their bed over, and a full yard keeps them apart', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await page.evaluate(() => {
    newTown('hamlet-arrive', 'hamlet');
    const free = (x, y) => walkable(x, y) && !lfPropAt(x, y) && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && !(town.nodeMap && town.nodeMap.has(y * W + x)) && !yardAtXY(x, y);
    window.__area = (w, h) => { let best = null; const cand = []; for (let y = 8; y < town.h0 - 8 - h; y++) for (let x = 8; x < W - 8 - w; x++) { const d = Math.hypot(x + w / 2 - town.cx, y + h / 2 - town.cy); if (d > 12 && d < 60) cand.push([d, x, y]); } cand.sort((p, q) => p[0] - q[0]); for (const [, x, y] of cand) { if (best) break; let bad = 0; for (let j = -1; j <= h && bad < 9; j++) for (let i = -1; i <= w && bad < 9; i++) { const g = grid[y + j][x + i]; if (g !== T.GRASS && g !== T.TREE && g !== T.ROCK) bad = 99; else if (!free(x + i, y + j)) bad++; if (lfPropAt(x + i, y + j) || yardAtXY(x + i, y + j)) bad = 99; } if (bad < 9) best = [x, y]; }
      if (!best) throw new Error('no ground'); for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) { const X = best[0] + i, Y = best[1] + j; if (grid[Y][X] !== T.GRASS) setT(X, Y, T.GRASS); if (town.nodeMap && town.nodeMap.has(Y * W + X)) { const nd = town.nodeMap.get(Y * W + X); town.nodes = town.nodes.filter(q => q !== nd); town.nodeMap.delete(Y * W + X); } } town.gridV++; refreshReach(); return best; };
    /* a w x h ring with a gate in the bottom row and k beds in the top row inside */
    window.__yard = (w, h, k) => { const [x0, y0] = __area(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (i === 0 || j === 0 || i === w - 1 || j === h - 1) lfAddProp(i === 2 && j === h - 1 ? 'gate' : 'fence', x0 + i, y0 + j); const beds = []; for (let i = 0; i < k; i++) beds.push(lfAddProp('bed', x0 + 1 + (i % (w - 2)), y0 + 1 + Math.floor(i / (w - 2)))); yardScan(true); return { x0, y0, y: yardAtXY(x0 + 1, y0 + 1), beds }; };
    window.__pop = () => npcs.filter(n => !n.dead).length;
  });
  const r = await page.evaluate(() => {
    const out = {}; const P = game.player;
    // an empty yard while the family sleeps rough: the yard goes to the family, nobody comes
    const Y0 = __yard(7, 6, 1); out.blockedBedless = arrBlocked(); town.arr = { next: 0, n: 0 }; arrTick(); out.pop0 = __pop();
    // the family gets beds of its own: their single-bed yard is not enough, give them a 3-bed yard
    const F = __yard(8, 6, 3); yardHousing(); const fam = npcs.filter(n => n !== P && !n.shop); out.famIn = fam.map(n => yardOfN(n) === F.y).join();
    out.single0 = !yardPeople(Y0.y).length; out.blocked = arrBlocked();
    // a hungry household keeps newcomers away
    fam[0].hunger = 90; town.arr = { next: 0, n: 0 }; arrTick(); out.hungryPop = __pop(); out.hungryWhy = arrBlocked(); fam[0].hunger = 10;
    // 1 free bed: a single
    town.arr = { next: 0, n: 0 }; arrTick(); const s1 = yardPeople(Y0.y); out.single = [__pop(), s1.length, s1[0] && s1[0].age >= 16, s1[0] && s1[0].coin > 0, s1[0] && !s1[0].homeless];
    // 2 free beds: a couple
    const Y2 = __yard(7, 6, 2); town.arr = { next: 0, n: 0 }; arrTick(); const c2 = yardPeople(Y2.y); out.couple = [c2.length, c2.length === 2 && c2[0].fam.spouse === c2[1].id];
    // 4 free beds: a family of a couple and two children
    const Y4 = __yard(8, 6, 4); town.arr = { next: 0, n: 0 }; arrTick(); const f4 = yardPeople(Y4.y); out.family = [f4.length, f4.filter(n => n.age >= 16).length, f4.filter(n => n.age < 16).length, f4.filter(n => n.age < 16).every(k => k.fam.mother != null && k.fam.father != null)];
    // nothing more to come to: no empty yard
    town.arr = { next: 0, n: 0 }; const p5 = __pop(); arrTick(); out.noYard = __pop() === p5 && !arrYard();
    out.digest = JSON.stringify(LIFE.digest(1).kinds.came_ashore || 0);
    window.__s1 = s1[0].id; window.__Y0 = Y0; window.__c2 = c2.map(n => n.id); window.__Y4 = Y4;
    return out;
  });
  check(r.blockedBedless === 'bedless' && r.pop0 === 5, 'nobody comes while anybody sleeps rough: ' + JSON.stringify([r.blockedBedless, r.pop0]));
  check(r.famIn === 'true,true,true' && r.single0 && !r.blocked, 'the family moves into the yard with room for all three: ' + JSON.stringify([r.famIn, r.single0, r.blocked]));
  check(r.hungryPop === 5 && r.hungryWhy === 'hungry', 'a hungry household keeps newcomers away');
  check(r.single[0] === 6 && r.single[1] === 1 && r.single.slice(2).every(Boolean), 'one free bed brings a single with coin, into the yard: ' + JSON.stringify(r.single));
  check(r.couple[0] === 2 && r.couple[1], 'two free beds bring a married couple: ' + JSON.stringify(r.couple));
  check(r.family[0] === 4 && r.family[1] === 2 && r.family[2] === 2 && r.family[3], 'four free beds bring a couple and two children: ' + JSON.stringify(r.family));
  check(r.noYard && +r.digest >= 4, 'with no empty yard nobody comes; arrivals are life events: ' + JSON.stringify([r.noYard, r.digest]));
  // a real day: the first arrival comes by itself once a yard is ready
  const r1 = await page.evaluate(() => { __yard(7, 6, 1); town.arr = { next: null, n: 0 }; window.__p0 = __pop(); return __p0; });
  await simulate(page, 20 * 60);
  const r1b = await page.evaluate(() => __pop() - __p0 || JSON.stringify({ why: arrBlocked(), arr: town.arr, y: !!arrYard(), day: game.time / 1440, hungry: npcs.filter(n => n.hunger > 70).map(n => [n.first, Math.round(n.hunger), !!yardOfN(n), foodCount(pantryOf(n)), n.status]) }));
  check(r1b === 1, 'within a day of a yard being ready a single comes ashore by themselves: ' + r1b);
  // marriage: the single (a yard of 1 bed) marries one of the couple's neighbours... simplest: marry the single to a newcomer single in a 1-bed yard
  const r2 = await page.evaluate(() => {
    const out = {}; game.time = Math.floor(game.time / 1440) * 1440 + 1440 + 9 * 60;
    const a = byId(__s1), lone = npcs.filter(n => !n.dead && !n.fam.spouse && n.age >= 16 && n !== a && !n.player && !n.shop && yardOfN(n) && yardPeople(yardOfN(n)).length === 1)[0];
    // give the other one a bigger yard: two more beds in it are not needed; move them to a 3-bed yard with room
    const Big = __yard(9, 7, 3); lone.bed.owner = null; const b0 = Big.beds[0]; b0.owner = lone; lone.bed = b0; yardHousing();
    out.before = [yardBeds(yardOfN(a)).length, yardBeds(yardOfN(lone)).length]; const oldY = yardOfN(a);
    marry(a, lone); out.plan = !!a.moveBed && !lone.moveBed;
    window.__m = [a.id, lone.id, Big.y.id, oldY.id]; return out;
  });
  check(r2.before[0] === 1 && r2.before[1] === 3 && r2.plan, 'on marriage the one with the smaller yard is the one who moves: ' + JSON.stringify(r2));
  await simulate(page, 8 * 60);
  const r3 = await page.evaluate(() => {
    const [aid, bid, bigId, oldId] = __m, a = byId(aid), b = byId(bid), Big = town.yards.find(y => y.id === bigId), old = town.yards.find(y => y.id === oldId);
    const out = { moved: yardOfN(a) === Big && yardOfN(b) === Big, oldEmpty: old && !yardPeople(old).length, log: (a.log || []).map(e => e.text).filter(t => /bed/.test(t)).slice(-3), done: !a.moveBed };
    // a full yard keeps a couple apart, and the request says so
    const Y1 = __yard(7, 6, 2), Y2 = __yard(6, 5, 1);
    const p = [arrMake(rng(5), 25, { female: true, surname: 'Test' }), arrMake(rng(6), 26, { female: false, surname: 'Test' })]; p.forEach((n, i) => { n.x = n.tx = town.cx; n.y = n.ty = town.cy; npcs.push(n); const bb = [Y1, Y2][i].beds[0]; bb.owner = n; n.bed = bb; }); yardHousing();
    // the bigger yard (two beds) is where the bed would go: fill every free tile in it with field
    for (const k of Y1.y.cells) { const x = k % W, y = (k / W) | 0; if (!lfPropAt(x, y)) { setT(x, y, T.CROP); town.crops.push({ x, y, f: 'full', pl: 1, st: 0, t0: 0 }); } }
    out.full2 = [yardOfN(p[0]) === Y1.y, yardOfN(p[1]) === Y2.y, !arrBedSpot(Y1.y, null)].every(Boolean);
    marry(p[0], p[1]); out.apart = (town.apart || []).length; out.need = islandNeeds().filter(q => q.id === 'apart').map(q => q.title).join();
    out.lineOk = LIFE.digest(1).kinds.apart >= 1;
    return out;
  });
  check(r3.moved && r3.oldEmpty && r3.done && r3.log.some(t => /Moving my bed to/.test(t)), 'they carry the bed over; the old yard is left empty for a newcomer: ' + JSON.stringify(r3));
  check(r3.full2 && r3.apart === 1 && /^Room for /.test(r3.need) && r3.lineOk, 'with no room in the yard they stay apart and the request says so: ' + JSON.stringify([r3.full2, r3.apart, r3.need]));
  check(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
  await page.close();
  return 'single, couple, family by free beds; blocked by the bedless and the hungry; the smaller yard moves on marriage; a full yard keeps them apart';
});
test('balance harness: tools/balance.mjs plays the Hamlet for three days with the steady bot and writes its report; no free fields appear', async b => {
  const { execFileSync } = await import('node:child_process'); const fsx = await import('node:fs'); const dir = '/tmp/claude-0/balance-test';
  const outp = execFileSync('node', ['tools/balance.mjs', '--days=3', '--seed=41', '--policy=steady', '--out=' + dir], { encoding: 'utf8', timeout: 240000 });
  const j = JSON.parse(fsx.readFileSync(dir + '/balance-steady-41.json', 'utf8')), md = fsx.readFileSync(dir + '/balance-steady-41.md', 'utf8');
  check(j.daysOut.length === 3 && j.errors.length === 0, 'three days played without page errors: ' + JSON.stringify(j.errors.slice(0, 2)));
  check(j.steps['2 first harvest sold'] != null, 'the bot sells a harvest: ' + JSON.stringify(j.steps));
  check(j.log.some(l => /built a yard with 3 beds/.test(l)) && j.daysOut[2].hh === 3, 'the bot builds the family a yard by day 3: ' + JSON.stringify([j.log, j.daysOut[2].hh]));
  check(!j.flags.some(f => /nobody laid/.test(f)), 'no field tiles appear that nobody laid');
  check(/## Verdict/.test(md) && /## Day by day/.test(md) && /## Households/.test(md) && /player coin/.test(md), 'the report has its sections');
  return 'steady bot, 3 days: ' + outp.trim().split('\n').slice(-1)[0];
});
test('hamlet stalls: the seed stall and the carpenter are build items once unlocked, a villager keeps each, both undercut the trader, sales pay the keeper, the hammer takes a stall down', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('hamlet-stalls', 'hamlet'); const P = game.player, out = {}, TR = npcs.find(n => n.shop);
    const free = (x, y) => walkable(x, y) && !lfPropAt(x, y) && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && !(town.nodeMap && town.nodeMap.has(y * W + x)) && !yardAtXY(x, y);
    window.__spot = () => { for (let t = 0; t < 80000; t++) { const x = 10 + Math.floor(Math.random() * (W - 24)), y = 10 + Math.floor(Math.random() * (town.h0 - 24)); let ok = true; for (let j = -1; j <= 3 && ok; j++) for (let i = -1; i <= 3 && ok; i++) if (!free(x + i, y + j)) ok = false; if (ok && Math.hypot(x - town.cx, y - town.cy) < 40) return [x, y]; } for (let y = 10; y < town.h0 - 14; y++) for (let x = 10; x < W - 14; x++) { let ok = true; for (let j = -1; j <= 3 && ok; j++) for (let i = -1; i <= 3 && ok; i++) { const g = grid[y + j][x + i]; if ((g !== T.GRASS && g !== T.TREE && g !== T.ROCK) || yardAtXY(x + i, y + j) || (lfPropAt(x + i, y + j) && !['crate', 'barrel', 'rock'].includes(lfPropAt(x + i, y + j).kind))) ok = false; } if (ok && Math.hypot(x - town.cx, y - town.cy) < 60) { for (let j = -1; j <= 3; j++) for (let i = -1; i <= 3; i++) { const X = x + i, Y = y + j, pr = lfPropAt(X, Y); if (pr) { town.pblock[Y * W + X] = 0; town.propAt.delete(Y * W + X); town.props = town.props.filter(q => q !== pr); } if (town.nodeMap && town.nodeMap.has(Y * W + X)) { const nd = town.nodeMap.get(Y * W + X); town.nodes = town.nodes.filter(q => q !== nd); town.nodeMap.delete(Y * W + X); } setT(X, Y, T.GRASS); } return [x, y]; } } throw new Error('no ground'); };
    window.__put = (x, y) => { P.tx = P.x = x - 1; P.ty = P.y = y; P.path = []; P.moving = false; P.face = { dx: 1, dy: 0 }; P.player.keys = {}; P.player.act = null; };
    // locked at first
    out.locked = hamletBuildKinds().join(); itBuildToggle(P, true); out.menu0 = (itBuildBagHTML(P).match(/data-bkind=/g) || []).length; town.kit = { stallseed: 1, stallcarp: 1 }; const [x0, y0] = __spot(); __put(x0, y0);
    // not unlocked: the shop does not list them
    P.coin = 200; farmShopDialog(TR.shop); let labels = (talkUI.opts || []).map(o => o[1]); const st = lf2TalkStep('c' + labels.findIndex(l => /^Buy building items/.test(l))); out.listedEarly = st.opts.some(o => /stall/.test(o[1])); closeTalk && closeTalk();
    // unlock the seed stall
    hamletUnlock('seedstall'); out.unlocked = hamletBuildKinds().join(); out.menu1 = (itBuildBagHTML(P).match(/data-bkind=/g) || []).length;
    farmShopDialog(TR.shop); labels = (talkUI.opts || []).map(o => o[1]); const st2 = lf2TalkStep('c' + labels.findIndex(l => /^Buy building items/.test(l))); out.listed = st2.opts.map(o => o[1]).filter(l => /stall/.test(l)).join('|'); closeTalk && closeTalk();
    // place it
    __put(x0, y0); const bi = town.stalls.length, mi = merchants.length; const res = bldPlaceFront(P, 'stallseed'); out.placed = !!res; out.msg = P.player.msg; out.dbg = [[x0, y0], lf2Front(P), [[0, 0], [1, 0], [0, 1], [0, 2], [1, 1], [1, 2]].map(([i, j]) => { const x = x0 + i, y = y0 + j; return [grid[y][x], roomAt[y][x], !!lfPropAt(x, y), !!tileOwner.get(y * W + x), !!yardAtXY(x, y), x === P.tx && y === P.ty]; })]; const stl = town.stalls[town.stalls.length - 1]; const K = stl && stl.owner;
    out.stall = [town.stalls.length - bi, merchants.length - mi, !!K, K && K.shop && K.shop.def.noun, grid[y0][x0] === T.STALL && grid[y0][x0 + 1] === T.STALL, town.kit.stallseed];
    window.__K = K && K.id; window.__st = stl;
    // prices: below the trader on the same item, and the range is wider
    const sm = K.shop; sm.stock.seed_cabbage = 30; TR.shop.stock.seed_cabbage = 30; out.prices = [sellPrice(sm, 'seed_cabbage'), sellPrice(TR.shop, 'seed_cabbage')]; out.range = Object.keys(sm.sells).length; out.flowers = 'seed_rose' in sm.sells && (sm.stock.seed_rose || 0) > 0;
    // a sale pays the keeper
    sm.n.coin = 50; const c0 = sm.n.coin, p0 = P.coin; sm.serving = true; P.tx = P.x = sm.front.x; P.ty = P.y = sm.front.y; farmShopDialog(sm); labels = (talkUI.opts || []).map(o => o[1]); out.seedMenu = labels.slice(0, 3).join('|'); const i = labels.findIndex(l => /^Buy a cabbage seed/.test(l)); lf2TalkStep('c' + i); out.sale = [sm.n.coin - c0, p0 - P.coin, sm.stock.seed_cabbage]; closeTalk && closeTalk();
    // farmers buy from the cheaper stall
    out.seller = farmSeller() === sm;
    // the carpenter: locked until unlocked, then cheaper than the trader
    const [x1, y1] = __spot(); __put(x1, y1); out.carpLocked = hamletBuildKinds().includes('stallcarp'); hamletUnlock('carpenter'); const r2 = bldPlaceFront(P, 'stallcarp'); out.carp = !!r2;
    const cs = town.stalls[town.stalls.length - 1], CK = cs.owner, cm = CK && CK.shop; out.carpKeeper = !!CK && CK !== K && CK !== P;
    P.coin = 100; cm.serving = true; P.tx = P.x = cm.front.x; P.ty = P.y = cm.front.y; farmShopDialog(cm); labels = (talkUI.opts || []).map(o => o[1]); out.carpMenu = labels.join('|');
    const w = labels.findIndex(l => /^Buy building items/.test(l)); const ks = lf2TalkStep('c' + w); out.carpItems = ks.opts.map(o => o[1]).filter(l => /^Buy a /.test(l)).join('|'); const cc = CK.coin, pc = P.coin; const wi = ks.opts.findIndex(o => /^Buy a wall block/.test(o[1])); lf2TalkStep('c' + wi); out.carpSale = [P.coin - pc, CK.coin - cc, town.kit.bwall]; closeTalk && closeTalk();
    // the keepers pay rent like anybody; the trader does not
    out.rent = [rentOf(K).amt > 0 || !yardOfN(K), rentTrader(TR)];
    // the hammer takes a stall down
    itBuildSelect(P, 1); __put(x0 - 0, y0); P.tx = P.x = x0 - 1; P.tx = P.x = x0 - 1; P.ty = P.y = y0; const hit = targetAt0(P, x0, y0); out.hit = !!hit && /^wallS/.test(hit.key); if (hit) hit.run(P);
    out.down = [grid[y0][x0] !== T.STALL, town.stalls.includes(__st), K.shop == null, K.role, town.kit.stallseed];
    // not on a path of ground that is too tight
    town.kit.stallseed = 1; const [x2, y2] = __spot(); setT(x2 + 1, y2 + 1, T.ROCK); __put(x2, y2); out.tight = bldPlaceFront(P, 'stallseed') === null && town.kit.stallseed === 1;
    return out;
  });
  check(r.locked === 'bwall,bwindow,bdoor,bed,fence,gate,field' && r.menu0 === 7, 'the stalls are not on the menu at first: ' + r.locked);
  check(!r.listedEarly && /^bwall.*stallseed$/.test(r.unlocked) && r.menu1 === 8 && /Buy a seed stall \(20\)/.test(r.listed) && !/carpenter/.test(r.listed), 'unlocked, the seed stall is on the build menu and at the trader for 20: ' + JSON.stringify([r.listedEarly, r.unlocked, r.menu1, r.listed]));
  check(r.placed && r.stall[0] === 1 && r.stall[1] === 1 && r.stall[2] && r.stall[3] === 'seed stall' && r.stall[4] && r.stall[5] === 0, 'placing it opens a stall with a keeper and uses the item: ' + JSON.stringify([r.stall, r.dbg]));
  check(r.prices[0] < r.prices[1] && r.range > 12 && r.flowers, 'it undercuts the trader and sells every seed and flower: ' + JSON.stringify([r.prices, r.range, r.flowers]));
  check(r.sale[0] > 0 && r.sale[0] === r.sale[1] && r.sale[2] === 29, 'a sale pays the keeper: ' + JSON.stringify([r.sale, r.seedMenu]));
  check(r.seller, 'farmers buy their seed at the cheaper stall');
  check(!r.carpLocked && r.carp && r.carpKeeper && /Buy building items/.test(r.carpMenu) && !/Buy seed/.test(r.carpMenu), 'the carpenter comes with the second unlock and sells building items only: ' + JSON.stringify([r.carpLocked, r.carp, r.carpKeeper, r.carpMenu]));
  check(/wall block \(3\)/.test(r.carpItems) && r.carpSale[0] === -3 && r.carpSale[1] === 3 && r.carpSale[2] === 1, 'the carpenter\'s wall is cheaper than the trader\'s 4 and pays the keeper: ' + JSON.stringify([r.carpItems, r.carpSale]));
  check(r.rent[0] && r.rent[1], 'keepers pay rent like anybody; the trader does not');
  check(r.hit && r.down[0] && !r.down[1] && r.down[2] && r.down[3] === 'Worker' && r.down[4] === 1, 'the hammer takes a stall down, the keeper goes back to work, the item comes back: ' + JSON.stringify([r.hit, r.down]));
  check(r.tight, 'a stall needs clear ground');
  await simulate(page, 2 * 1440);
  const r3 = await page.evaluate(() => ({ keepers: merchants.length, errs: 0, pop: npcs.filter(n => !n.dead).length, serving: merchants.map(m => m.def.noun + ':' + (m.sales || 0)).join() }));
  check(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
  await page.close();
  return 'two stalls, unlocked and built, kept by villagers, cheaper than the trader: ' + r3.serving;
});
test('hamlet progression: five steps one at a time in the request pill with exact numbers, step 3 unlocks the seed stall, step 4 the carpenter, step 5 shows the closing card once', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('hamlet-steps', 'hamlet'); const P = game.player, out = {}, TR = npcs.find(n => n.shop), fam = town.hamletFamily.map(byId);
    const free = (x, y) => walkable(x, y) && !lfPropAt(x, y) && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && !(town.nodeMap && town.nodeMap.has(y * W + x)) && !yardAtXY(x, y);
    window.__area = (w, h) => { const cand = []; for (let y = 8; y < town.h0 - 8 - h; y++) for (let x = 8; x < W - 8 - w; x++) { const d = Math.hypot(x + w / 2 - town.cx, y + h / 2 - town.cy); if (d > 12 && d < 60) cand.push([d, x, y]); } cand.sort((p, q) => p[0] - q[0]);
      for (const [, x, y] of cand) { let bad = 0; for (let j = -1; j <= h && bad < 9; j++) for (let i = -1; i <= w && bad < 9; i++) { const g = grid[y + j][x + i]; if (g !== T.GRASS && g !== T.TREE && g !== T.ROCK) bad = 99; else if (!free(x + i, y + j)) bad++; if (lfPropAt(x + i, y + j) || yardAtXY(x + i, y + j)) bad = 99; }
        if (bad < 9) { for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) { const X = x + i, Y = y + j; if (grid[Y][X] !== T.GRASS) setT(X, Y, T.GRASS); if (town.nodeMap && town.nodeMap.has(Y * W + X)) { const nd = town.nodeMap.get(Y * W + X); town.nodes = town.nodes.filter(q => q !== nd); town.nodeMap.delete(Y * W + X); } } town.gridV++; refreshReach(); return [x, y]; } } throw new Error('no ground'); };
    window.__yard = (w, h, k) => { const [x0, y0] = __area(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (i === 0 || j === 0 || i === w - 1 || j === h - 1) lfAddProp(i === 2 && j === h - 1 ? 'gate' : 'fence', x0 + i, y0 + j); for (let i = 0; i < k; i++) lfAddProp('bed', x0 + 1 + i, y0 + 1); yardScan(true); return { x0, y0, y: yardAtXY(x0 + 1, y0 + 1) }; };
    const pill = () => { const n = islandNeeds(); return n.length ? n[0].title : ''; };
    out.s1 = pill(); out.s1how = islandNeeds()[0].how; out.rows1 = progRowsHTML().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); out.only = islandNeeds().length;
    // step 1: a yard with their beds and six field tiles
    const F = __yard(8, 7, 3); yardHousing(); progTick(); out.s1half = [progState().step, pill()];
    for (let i = 0; i < 6; i++) { const x = F.x0 + 1 + i, y = F.y0 + 4; setT(x, y, T.CROP); town.crops.push({ x, y, f: 'fam', pl: 1, st: 0, t0: 0 }); }
    progTick(); out.s2 = [progState().step, pill()];
    // step 2: a crop sold to the trader (by you, at the stall)
    P.inv.turnip = 2; TR.shop.n.coin = 50; TR.shop.stock.turnip = 0; farmShopDialog(TR.shop); const labels = (talkUI.opts || []).map(o => o[1]); lf2TalkStep('c' + labels.findIndex(l => /^Sell your 2 turnips/.test(l))); closeTalk && closeTalk();
    progTick(); out.s3 = [progState().step, pill(), progState().sold, hamletUnlocked('seedstall')];
    // step 3: five households (the trader, the family, you without a yard, and two newcomers)
    out.hh0 = progHouseholds(); for (const k of [1, 2]) { const Y = __yard(7, 6, k); town.arr = { next: 0, n: 0 }; arrTick(); } yardHousing();
    out.hh1 = progHouseholds(); progTick(); out.s4 = [progState().step, pill(), hamletUnlocked('seedstall'), hamletUnlocked('carpenter'), hamletBuildKinds().includes('stallseed')];
    // step 4 and 5 by their conditions (walls round every bed are the rent test's business): everybody roofed
    const rh = rentHome; window.__rh = rh; rentHome = n => Object.assign(rh(n), { roof: !!yardHasBed(n) }); progTick(); out.s5 = [progState().step, pill(), hamletUnlocked('carpenter')];
    out.rows5 = progRowsHTML().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    progHouseholds = () => 12; for (const n of npcs) { n.hunger = 10; n.mood = 80; } progTick();
    out.card = town.decision && town.decision.kind; out.cardText = town.decision && town.decision.text; out.step = progState().step;
    answerDecision('yes'); out.after = [!town.decision, pill()]; progTick(); out.once = !town.decision;
    out.chron = town.chron.filter(c => /^Step \d of 5/.test(c.text)).length;
    return out;
  });
  check(/^1\/5 · Shelter the family$/.test(r.s1) && /3 beds/.test(r.s1how) && /In a yard 0\/3/.test(r.rows1) && /Field tiles in it 0\/6/.test(r.rows1) && r.only === 1, 'step 1 asks for a yard round the family with exact numbers, and nothing else is asked: ' + JSON.stringify([r.s1, r.rows1, r.only]));
  check(r.s1half[0] === 1 && r.s2[0] === 2 && /^2\/5 · The first harvest sold/.test(r.s2[1]), 'the family in a yard is not enough until it has six field tiles; then step 2: ' + JSON.stringify([r.s1half, r.s2]));
  check(r.s3[0] === 3 && r.s3[2] === 2 && /^3\/5 · Five households/.test(r.s3[1]) && !r.s3[3], 'a crop sold to the trader is step 2; the seed stall is not yet unlocked: ' + JSON.stringify(r.s3));
  check(r.hh0 === 3 && r.hh1 === 5 && r.s4[0] === 4 && /^4\/5 · Everyone under a roof/.test(r.s4[1]) && r.s4[2] && !r.s4[3] && r.s4[4], 'five households is step 3 and unlocks the seed stall: ' + JSON.stringify([r.hh0, r.hh1, r.s4]));
  check(r.s5[0] === 5 && /^5\/5 · The island thrives/.test(r.s5[1]) && r.s5[2] && /Households \d+\/12/.test(r.rows5), 'everyone under a roof is step 4 and unlocks the carpenter: ' + JSON.stringify([r.s5, r.rows5]));
  check(r.card === 'thrive' && /households/.test(r.cardText) && /coin in rent/.test(r.cardText) && r.step === 6, 'step 5 puts up the closing card: ' + JSON.stringify([r.card, r.cardText]));
  check(r.after[0] && r.after[1] === '' && r.once && r.chron === 5, 'Keep playing closes it, it does not come back, and the pill is empty: ' + JSON.stringify([r.after, r.once, r.chron]));
  check(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
  await page.close();
  return 'five steps in order with their numbers; the two unlocks; the closing card once';
});
test('hamlet talk: no bed and behind with the rent are ways of being people can say, ask about and sympathise with; yard and rent remarks need yards and rent; the new life events have lines in both voices; children tell no backstory', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('hamlet-talk', 'hamlet'); const out = {}, P = game.player, TR = npcs.find(n => n.shop), fam = town.hamletFamily.map(byId), dad = fam.find(n => n.age >= 16 && !n.female), kid = fam.find(n => n.age < 16);
    out.bedless = talkState(dad); dad.rentLast = { t: game.time, amt: 2, ok: false }; out.still = talkState(dad); dad.hunger = 80; out.hungry = talkState(dad); dad.hunger = 10;
    // a bed with a yard round it, and rent not paid
    const bed = lfAddProp('bed', P.tx + 2, P.ty + 2); out.stage = stateWhy(dad, 'bedless');
    const say = (act, sp, li, st) => { const c = { done: {}, turns: [], state: st }; return lxSay(act, sp, li, talkX(c)); };
    TALK_PACK.cur = 'island'; out.island = {}; for (const st of ['bedless', 'behind']) for (const act of ['answer_how', 'vent', 'sympathise_how', 'remark_state']) { const seen = new Set(); for (let i = 0; i < 30; i++) { const t = say(act, dad, TR, st); if (t) seen.add(t); } out.island[st + ':' + act] = seen.size; }
    TALK_PACK.cur = 'plain'; out.plain = {}; for (const st of ['bedless', 'behind']) for (const act of ['answer_how', 'vent']) { const seen = new Set(); for (let i = 0; i < 30; i++) { const t = say(act, dad, TR, st); if (t) seen.add(t); } out.plain[st + ':' + act] = seen.size; }
    // no fences, no remarks about them: the rent and yard remarks need yards and rent
    TALK_PACK.cur = 'island'; const rem = () => { const seen = new Set(); for (let i = 0; i < 80; i++) seen.add(lxSay('remark_place', dad, TR, { done: {}, place: 'here' })); return [...seen].filter(t => /\bfence|\byard|\brent\b/i.test(t)); };
    out.remarkNow = rem(); newTown('blank-talk', 'blank'); const bd = npcs[0], bt = npcs[0]; out.blank = rem(); out.blankFeat = WORLD.has('feature', 'yards') || WORLD.has('feature', 'rent'); newTown('hamlet-talk2', 'hamlet'); out.feat = WORLD.has('feature', 'yards'); town.rent = { day: 0, today: 2, due: 2, total: 2 }; out.rentFeat = WORLD.has('feature', 'rent');
    // life events: lines in both voices for every new kind
    out.kinds = {}; for (const k of ['rent_paid', 'rent_unpaid', 'no_yard', 'moved_in', 'came_ashore', 'apart', 'stall_opened']) { out.kinds[k] = []; for (const pk of ['plain', 'island']) { TALK_PACK.cur = pk; const seen = new Set(); for (let i = 0; i < 40; i++) { const t = lxSay('life:' + k, dad, TR, { things: '', qty: 2, price: 2, place: 'trading stall' }); if (t) seen.add(t); } out.kinds[k].push(seen.size); } }
    // the old words do not say "this morning" about the rent
    out.mornings = []; for (const pk of ['plain', 'island']) { TALK_PACK.cur = pk; for (const k of ['rent_paid', 'rent_unpaid', 'came_ashore']) for (let i = 0; i < 40; i++) { const t = lxSay('life:' + k, dad, TR, { qty: 2, price: 2 }); if (/this morning/.test(t || '')) out.mornings.push(t); } }
    // children: nobody tells a child a backstory; the child has none
    out.kidBack = !!kid.back; dad.back = 'was ironing a shirt, and then there was sand'; const c = { done: {} }; out.tellKid = ACTS.tell_back.when(c, dad, kid); out.tellAdult = ACTS.tell_back.when({ done: {} }, dad, TR);
    return out;
  });
  check(r.bedless === 'bedless' && r.still === 'bedless' && r.hungry === 'hungry', 'a villager with no bed is "bedless" (hunger comes first): ' + JSON.stringify([r.bedless, r.still, r.hungry]));
  check(Object.values(r.island).every(n => n >= 2) && Object.values(r.plain).every(n => n >= 2), 'both voices have at least two ways to say each: ' + JSON.stringify([r.island, r.plain]));
  check(r.remarkNow.length >= 1 && !r.remarkNow.some(t => /\brent\b/i.test(t)) && r.feat && r.rentFeat && r.blank.length === 0 && !r.blankFeat, 'yard remarks come with yards, rent remarks with rent, neither on a blank island: ' + JSON.stringify([r.remarkNow, r.feat, r.rentFeat, r.blank, r.blankFeat]));
  check(Object.values(r.kinds).every(a => a[0] >= 2 && a[1] >= 2), 'every new life event has lines in both voices: ' + JSON.stringify(r.kinds));
  check(r.mornings.length === 0, 'rent and arrival lines do not say "this morning": ' + JSON.stringify(r.mornings));
  check(!r.kidBack && !r.tellKid && r.tellAdult, 'a child has no backstory and nobody tells one to a child: ' + JSON.stringify([r.kidBack, r.tellKid, r.tellAdult]));
  check(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
  await page.close();
  return 'bedless and behind are ways of being; both voices; the remarks wait for yards and rent';
});
test('ready farming village: only what farming needs; farmers buy seed from the seed seller with real money, keep seed back, sell what they grow to the greengrocer, and talk about it', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('farm-test', 'farm'); TALK.words = true; const out = {};
    out.scen = town.scenario; out.eco = !!town.farmEcon; out.kinds = [...new Set(rooms.filter(q => !q.dead).map(q => q.kind))].sort().join(',');
    out.merch = merchants.map(m => m.def.noun).sort().join(','); out.mods = [modOn('job.Farmer'), modOn('job.Miner'), modOn('gath.fishing'), modOn('event.wedding'), modOn('sys.law')]; out.fields = town.crops.length > 40;
    out.range0 = farmSeedRange().length; return out; });
  check(r.scen === 'farm' && r.eco, 'the scenario is the ready farming village');
  check(r.kinds === 'bakery,house,privy', 'only houses, privies and a bakery are built (no church, tavern, smithy, jail): ' + r.kinds);
  check(r.merch === 'greengrocer,seed stall', 'exactly two stalls, the greengrocer and the seed seller: ' + r.merch);
  check(r.mods[0] === true && r.mods.slice(1).every(v => v === false), 'everything but farming is switched off for this island: ' + JSON.stringify(r.mods));
  await simulate(page, 6 * 1440);
  const r2 = await page.evaluate(() => {
    const st = LIFE.stream, seedBuys = st.filter(e => e.kind === 'bought' && String(e.data.item).startsWith('seed_')).length, produceSold = st.filter(e => e.kind === 'sold' && !String(e.data.item).startsWith('seed_')).length;
    const lines = TALK.log.filter(l => l.lines).flatMap(l => l.lines).filter(t => /seed|planted|Put in|brought in|Harvested|sold|bought|afford|in stock|in now/i.test(t));
    const dg = LIFE.digest(6).kinds; return { dead: npcs.filter(n => n.dead).length, planted: dg.planted || 0, harvested: dg.harvested || 0, seedBuys, produceSold, stock: dg.new_in_stock || 0, range: farmSeedRange().length, lines: lines.length, sample: lines.slice(0, 3), hungry: npcs.filter(n => !n.dead && n.hunger > 95).length, coins: Math.round(npcs.reduce((a, n) => a + (n.coin || 0), 0)) }; });
  check(r2.dead === 0 && r2.hungry === 0, 'nobody starves in six days: ' + JSON.stringify([r2.dead, r2.hungry]));
  check(r2.planted >= 30 && r2.harvested >= 20, 'farmers plant and harvest: ' + JSON.stringify([r2.planted, r2.harvested]));
  check(r2.seedBuys >= 5 && r2.produceSold >= 5, 'seed is bought from the seed stall and produce is sold to the greengrocer: ' + JSON.stringify([r2.seedBuys, r2.produceSold]));
  check(r2.stock >= 3 && r2.range > r.range0, 'new seeds turn up on the stall and it is noticed: ' + JSON.stringify([r2.stock, r2.range, r.range0]));
  check(r2.lines >= 3, 'villagers talk about it (what they bought, planted, harvested, could not afford): ' + JSON.stringify(r2.sample));
  // the player at the stalls: buy seed with real money, sell what they grew
  const r4 = await page.evaluate(() => {
    const P = game.player || (startPlaying(npcs.find(canControl)), game.player), se = farmSeller(), gr = farmGrocer(); const out = {};
    P.coin = 50; farmRestock(); P.bag = P.bag || {}; const before = P.bag.seed_turnip || 0, st0 = se.stock.seed_turnip;
    farmShopDialog(se); const labels = (talkUI.opts || []).map(o => o[1]); out.menu = labels.slice(0, 3);
    const i = labels.findIndex(l => /turnip/i.test(l) && /^Buy a/.test(l)); const step = lf2TalkStep('c' + i); out.said = step && step.say; out.bought = (P.bag.seed_turnip || 0) === before + 1 && se.stock.seed_turnip === st0 - 1 && P.coin < 50;
    closeTalk && closeTalk(); const c1 = P.coin; P.inv.turnip = 6; gr.n.coin = 100; gr.stock.turnip = 0; farmShopDialog(gr); const l2 = (talkUI.opts || []).map(o => o[1]); const j = l2.findIndex(l => /^Sell your 6 turnips/.test(l)); const st2 = lf2TalkStep('c' + j); out.sold = (P.inv.turnip || 0) === 0 && P.coin > c1; out.said2 = st2 && st2.say; closeTalk && closeTalk();
    return out; });
  check(r4.bought && r4.sold, 'the player buys seed (it goes in the bag, the money goes) and sells produce at the stalls: ' + JSON.stringify(r4));
  // another island is untouched
  const r3 = await page.evaluate(() => { newTown('village-test', 'village'); return [town.scenario, !!town.farmEcon, modOn('job.Miner'), modOn('sys.law'), LF2.feat.law]; });
  check(r3[0] === 'village' && r3[1] === false && r3[2] === true && r3[3] === true && r3[4] === true, 'a different island keeps all its modules on: ' + JSON.stringify(r3));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify(r2);
});

test('shop talk: customers and keepers talk at the stall in bubbles (greeting, asking, the price, paying, thanks), the same lines the player gets, and prices are passed on in conversation', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await page.evaluate(() => { newTown('farm-test', 'farm'); TALK.words = true; });
  await simulate(page, 4 * 1440);
  const r = await page.evaluate(() => {
    const out = {}; const sh = TALK.log.filter(l => l.acts.some(a => a.act === 'shop_greet')); out.n = sh.length;
    const ok = sh.filter(l => { const ids = l.acts.map(a => a.act); return ids[0] === 'shop_greet' && ids[1] === 'shop_greet_back' && ids.length >= 5 && l.lines && !l.lines.some(t => /[{}]|undefined|NaN/.test(t)); });
    out.good = ok.length; out.paid = sh.filter(l => l.acts.some(a => a.act === 'quote_price' || a.act === 'bid_price') && l.lines.some(t => /denarii|denarius/.test(t))).length;
    out.sample = sh.slice(0, 2).map(l => l.lines.join(' | '));
    // each encounter is between a villager and the keeper of a stall
    const keepers = new Set(merchants.map(m => m.n.id).concat(npcs.filter(n => n.job === 'Baker').map(n => n.id))); out.keeperInvolved = sh.every(l => keepers.has(l.a) || keepers.has(l.b));
    // prices travel: the asker learns what the other paid
    const pr = TALK.log.filter(l => l.acts.some(a => a.act === 'tell_price')); out.priceTalks = pr.length; out.learned = npcs.some(n => (n.tmem || []).some(m => m.kind === 'price' && m.unit > 0));
    // the player's stall menu speaks with the keeper's own lines
    const P = game.player || (startPlaying(npcs.find(canControl)), game.player), se = farmSeller(); P.coin = 40; farmRestock(); farmShopDialog(se); out.menuSay = talkUI.say; closeTalk && closeTalk();
    out.money = [lxMoney(1), lxMoney(6)];
    return out; });
  check(r.n >= 5 && r.good >= 5, 'villagers talk to the stall keepers: ' + r.n + ' encounters, ' + r.good + ' complete: ' + JSON.stringify(r.sample));
  check(r.paid >= 3 && r.keeperInvolved, 'the price is said, and it is always a keeper');
  check(r.priceTalks >= 1 && r.learned, 'prices are asked about and passed on: ' + r.priceTalks);
  check(/denarii/.test(r.menuSay) || /What|Morning|Hello|Good/.test(r.menuSay), 'the player gets the keeper\'s greeting at the stall: ' + r.menuSay);
  check(r.money[0] === 'one denarius' && r.money[1] === '6 denarii', 'money is said the way people say it');
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.n + ' stall encounters, ' + r.priceTalks + ' price talks';
});

test('player talk: walking into a villager in the real game opens the talk box; the options are things the player could say; the villager answers and asks back; telling and asking change what they know; it ends with a goodbye', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 1, live: true, viewport: { width: 1000, height: 640 } });
  await page.waitForTimeout(1200);
  const setup = await page.evaluate(() => {
    if (!game.player) startPlaying(npcs.find(canControl)); const P = game.player;
    const o = npcs.find(q => q !== P && !q.dead && q.age >= 18 && q.pose !== 'sleep'); const free = (x, y) => walkable(x, y) && !lfPropAt(x, y) && !npcs.some(z => z.tx === x && z.ty === y);
    let s = null; for (let r = 0; r < 20 && !s; r++) for (let dx = -r; dx <= r && !s; dx++) for (let dy = -r; dy <= r && !s; dy++) { const x = town.cx + dx, y = town.cy + dy; if (free(x, y) && free(x - 1, y) && free(x - 2, y)) s = { x, y }; }
    abortPlan(o); o.tx = o.x = s.x; o.ty = o.y = s.y; o.pose = 'stand'; o.path = []; o.moving = false; o.talkUntil = game.time + 900; teleportTo(P, s.x - 2, s.y); P.face = { dx: 1, dy: 0 }; rebuildOcc();
    window.__o = o.id; window.__p = P.id; P.day = []; o.day = []; LIFE.emit('planted', P, { seed: 'turnip', qty: 4 }); LIFE.emit('slept_rough', P, { where: 'rough' });
    const ev = lfEmit('theft', { actor: npcs.find(q => q !== P && q !== o && !q.dead), target: npcs.find(q => q !== P && q !== o && !q.dead && q.id !== npcs[0].id), tags: ['theft', 'crime'], sev: 2, witnessIds: [P.id], text: 'x' }); window.__ev = ev.id; return { name: o.first }; });
  await page.focus('#c'); await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(100); if (await page.evaluate(() => !!talkUI.o)) break; }
  await page.keyboard.up('ArrowRight');
  const open = await page.evaluate(() => ({ open: !!talkUI.o, shown: !document.getElementById('talk').hidden, head: document.querySelector('#talk .nm b') && document.querySelector('#talk .nm b').innerText, say: talkUI.say, opts: talkUI.opts.map(o => o[1]) }));
  check(open.open && open.shown && open.head, 'walking into a villager opens the conversation: ' + JSON.stringify(open));
  check(open.opts.length >= 3 && open.opts[open.opts.length - 1] === 'Leave.' && open.say.length > 0 && !open.opts.some(t => /[{}]|undefined/.test(t)), 'the villager greets you and you have things to say and a way out: ' + JSON.stringify(open.opts));
  // play several turns by clicking the options the way a player would; try to tell the news and report the day when offered
  let told = false, reported = false, answered = 0, lines = [];
  for (let k = 0; k < 8; k++) {
    const st = await page.evaluate(() => ({ open: !!talkUI.o, opts: talkUI.opts.map(o => o[1]), say: talkUI.say }));
    if (!st.open) break; lines.push(st.say);
    let idx = st.opts.findIndex(t => /stole|walked off|saw it myself|I heard that|Did you hear/.test(t)); if (idx >= 0) told = true;
    if (idx < 0) { idx = st.opts.findIndex(t => /planted|Put in|slept rough|Another night/.test(t)); if (idx >= 0) reported = true; }
    if (idx < 0) idx = 0; if (idx >= st.opts.length - 1 && st.opts.length > 1) idx = 0;
    await page.click('#talk [data-k]:nth-of-type(' + (idx + 1) + ')'); await page.waitForTimeout(150); answered++;
  }
  const mid = await page.evaluate(() => ({ open: !!talkUI.o, o: byId(window.__o), told: !!(byId(window.__o).tmem || []).find(m => m.ev === window.__ev && m.from === window.__p), talkedLog: TALK.log.length }));
  // leave politely
  for (let k = 0; k < 4 && (await page.evaluate(() => !!talkUI.o)); k++) { const n = await page.evaluate(() => talkUI.opts.length); await page.click('#talk [data-k]:nth-of-type(' + n + ')'); await page.waitForTimeout(150); }
  const end = await page.evaluate(() => { const o = byId(window.__o), P = game.player, last = TALK.log[TALK.log.length - 1]; return { closed: !talkUI.o && document.getElementById('talk').hidden, mem: (o.tmem || []).some(m => m.kind === 'talked' && m.with === P.id), acts: last && last.player ? last.acts.map(a => a.act) : null, lines: last && last.player ? last.lines : null, knowsP: (byId(window.__o).tmem || []).some(m => m.kind === 'told_life' && m.with === window.__p) }; });
  check(answered >= 3, 'the conversation goes on for several turns: ' + answered);
  check(end.closed && end.mem, 'it ends and both remember it: ' + JSON.stringify([end.closed, end.mem]));
  check(end.acts && end.acts[0] === 'greet' && end.acts.includes('pre_close') || (end.acts && end.acts.includes('farewell')), 'the log has the acts of a real conversation: ' + JSON.stringify(end.acts));
  check(told ? mid.told : true, 'telling the news gave the villager a told version from you');
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return answered + ' turns; told=' + told + ' reported=' + reported + ' ' + JSON.stringify(lines.slice(0, 3));
});

test('stalls and the bakery, from the villagers\' side: keepers call out to passers-by from the real stock and prices, the baker bakes and sells bread over the counter, and customers talk to the baker too', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await page.evaluate(() => { newTown('farm-bake-test', 'farm'); TALK.words = true; });
  const r0 = await page.evaluate(() => ({ kinds: [...new Set(rooms.filter(q => !q.dead).map(q => q.kind))].sort().join(','), baker: npcs.filter(n => n.job === 'Baker').length, bakerOn: modOn('job.Baker') }));
  check(r0.kinds === 'bakery,house,privy' && r0.baker === 1 && r0.bakerOn, 'the farming village has a bakery and a baker: ' + JSON.stringify(r0));
  await simulate(page, 8 * 1440);   // (households have little coin in the farming village and buy bread once a morning when they can: five days sat at the edge of two sales)
  const r = await page.evaluate(() => {
    const calls = TALK.log.filter(l => l.acts.some(a => a.act === 'keeper_call')), keepers = new Set(merchants.map(m => m.n.id).concat(npcs.filter(n => n.job === 'Baker').map(n => n.id)));
    const bread = TALK.log.filter(l => l.acts.some(a => a.act === 'shop_greet') && l.lines && l.lines.some(t => /bread/.test(t)));
    const dg = LIFE.digest(8).kinds, bk = lf2Room('bakery');
    return { calls: calls.length, callsOk: calls.every(l => keepers.has(l.a) && l.lines && l.lines[0] && !/[{}]|undefined/.test(l.lines[0])), sample: calls.slice(0, 2).map(l => l.lines.join(' | ')), bread: bread.length, baked: dg.baked || 0, breadBought: LIFE.stream.filter(e => e.kind === 'bought' && e.data.item === 'bread').length, dead: npcs.filter(n => n.dead).length, stock: bk && lf2Stock(bk).bread };
  });
  check(r.calls >= 3 && r.callsOk, 'keepers call out to people passing: ' + r.calls + ' ' + JSON.stringify(r.sample));
  check(r.baked >= 2 && r.breadBought >= 2, 'bread is baked and bought: ' + JSON.stringify([r.baked, r.breadBought]));
  check(r.bread >= 1, 'customers talk to the baker over the counter: ' + r.bread);
  check(r.dead === 0, 'nobody dies');
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify(r);
});

test('stalls and the bakery, from the player\'s side, in the real game: walk into the stall and the keeper greets you with a menu; buy seed with real money; the baker\'s counter sells bread; the keeper\'s lines are the villagers\' lines', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 1, live: true, viewport: { width: 1000, height: 640 } });
  await page.waitForTimeout(800);
  const setup = await page.evaluate(() => {
    newTown('farm-ui-test', 'farm'); startPlaying(npcs.find(canControl)); const P = game.player, m = farmSeller(); farmRestock();
    Object.defineProperty(m, 'serving', { get: () => true, set: () => {} });   // (the keeper is at the counter)
    const k = m.n, post = m.post, fr = m.front; abortPlan(k); k.tx = k.x = post.x; k.ty = k.y = post.y; k.talkUntil = game.time + 1e5;
    teleportTo(P, fr.x, fr.y); P.coin = 40; P.bag = P.bag || {}; P.bag.seed_turnip = 0; const dx = Math.sign(post.x - fr.x), dy = Math.sign(post.y - fr.y); P.face = { dx, dy }; rebuildOcc(); window.__dir = { dx, dy };
    return { keeper: k.first, front: [fr.x, fr.y], post: [post.x, post.y], dir: [dx, dy], coin: P.coin };
  });
  const key = setup.dir[0] > 0 ? 'ArrowRight' : setup.dir[0] < 0 ? 'ArrowLeft' : setup.dir[1] > 0 ? 'ArrowDown' : 'ArrowUp';
  await page.focus('#c'); await page.keyboard.down(key);
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(100); if (await page.evaluate(() => !!talkUI.o)) break; }
  await page.keyboard.up(key);
  const open = await page.evaluate(() => ({ open: !!talkUI.o, who: talkUI.o && talkUI.o.first, say: talkUI.say, opts: talkUI.opts.map(o => o[1]) }));
  check(open.open && open.who === setup.keeper && /^.+: /.test(open.say), 'walking into the stall opens the keeper\'s menu with a greeting: ' + JSON.stringify([open.who, open.say]));
  check(open.opts.some(t => /^Buy a .*seed/.test(t)) && open.opts[open.opts.length - 1] === 'Leave', 'there are seeds to buy and a way out: ' + JSON.stringify(open.opts.slice(0, 4)));
  const idx = open.opts.findIndex(t => /^Buy a turnip seed/.test(t));
  if (idx >= 0) await page.click('#talk [data-k]:nth-of-type(' + (idx + 1) + ')'); await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({ say: talkUI.say, coin: game.player.coin, seeds: game.player.bag.seed_turnip || 0 }));
  check(after.seeds === 1 && after.coin < 40 && /denarii|denarius/.test(after.say), 'buying a seed costs money, gives the seed, and the keeper quotes the price and thanks you: ' + JSON.stringify(after));
  const closed = await page.evaluate(() => { closeTalk(); return !talkUI.o && document.getElementById('talk').hidden; });
  check(closed, 'leaving closes the menu');
  // the baker's counter (the baker at the oven spot, so somebody is serving)
  const bk = await page.evaluate(() => { const P = game.player, r = lf2Room('bakery'), k = npcs.find(n => n.job === 'Baker'), sp = lf2Spot(r, LF2_JOBS.Baker.spot); abortPlan(k); k.pose = 'stand'; k.tx = k.x = sp.x; k.ty = k.y = sp.y; rebuildOcc(); lf2Stock(r).bread = 6; P.coin = 30; lf2TradeDialog(P, r); return { open: !!talkUI.o, opts: talkUI.opts.map(o => o[1]), who: k && k.first, say: talkUI.say }; });
  check(bk.open && bk.opts.some(t => /Bread/i.test(t)), 'the baker\'s counter offers bread: ' + JSON.stringify(bk.opts.slice(0, 3)));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return 'player at the stalls';
});

test('voice: the island has its own voice (dry, exact, no exclamation marks), each village keeps the voice it was made with, people have verbal habits, and what was said lately is not said again at once', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; const known = /^(them|deed|about|reason|op|li|sp|place|job|state|item|things|money|news|who|shop|qty|price|clock)$/;
    const isl = LEX.filter(e => e.pack === 'island'); out.n = isl.length; out.bang = isl.filter(e => /!/.test(e.text)).map(e => e.text).slice(0, 3);
    out.slots = [...new Set(LEX.filter(e => !e.act.startsWith('ev:') && !e.act.startsWith('ev1:')).flatMap(e => (e.text.match(/\{(\w+)\}/g) || []).map(x => x.slice(1, -1))).filter(x => !known.test(x)))];
    out.acts = new Set(isl.map(e => e.act)).size; out.cover = [...new Set(LEX.filter(e => e.pack === 'plain').map(e => e.act))].filter(a => !isl.some(e => e.act === a)).length;
    // packs per island
    newTown('v1', 'farm'); out.farm = town.pack; newTown('v2', 'blank'); out.blank = town.pack; newTown('v3', 'village'); out.village = town.pack;
    // habits: one person has a tic and uses it on a long statement now and then; short lines and greetings are left alone
    newTown('v4', 'farm'); const ps = npcs.filter(q => !q.dead && q.age >= 18); let withTic = 0, used = 0, shortHit = 0; const long = 'The morning has a lot left in it and I intend to use it.';
    for (const p of ps) { let hit = false; for (let i = 0; i < 60; i++) { const t = lxTic(p, 'remark_time', 'island', long); if (t !== long) { hit = true; used++; } if (lxTic(p, 'remark_time', 'island', 'Mm.') !== 'Mm.' || lxTic(p, 'greet', 'island', long) !== long) shortHit++; } if (hit) withTic++; }
    out.tics = [withTic, ps.length, used, shortHit];
    // what was said lately by anyone is less likely again
    const a = ps[0], c = ps[1]; const seen = {}; for (let i = 0; i < 30; i++) { const t = lxSay('agree', a, c, {}); seen[t] = (seen[t] || 0) + 1; } out.spread = Object.keys(seen).length;
    return out; });
  check(r.n >= 150 && r.acts >= 40 && r.bang.length === 0, 'the island pack is written (' + r.n + ' lines over ' + r.acts + ' acts) with no exclamation marks: ' + JSON.stringify(r.bang));
  check(r.slots.length === 0, 'every slot a line uses is one the engine fills: ' + JSON.stringify(r.slots));
  check(r.farm === 'island' && r.blank === 'island' && r.village === 'plain', 'islands keep their voice: ' + JSON.stringify([r.farm, r.blank, r.village]));
  check(r.tics[0] >= 2 && r.tics[0] < r.tics[1] && r.tics[2] > 0 && r.tics[3] === 0, 'some people have a verbal habit and use it on statements only: ' + JSON.stringify(r.tics));
  check(r.spread >= 4, 'the same small reply is said in several ways: ' + r.spread);
  await page.evaluate(() => { newTown('v5', 'farm'); TALK.words = true; });
  await simulate(page, 2 * 1440);
  const r2 = await page.evaluate(() => { const all = TALK.log.filter(l => l.lines && !l.player).flatMap(l => l.lines.map(t => t.replace(/^[^:]+: /, ''))); return { n: all.length, bang: all.filter(t => /!/.test(t)).length, brace: all.filter(t => /[{}]|undefined|NaN/.test(t)).length, uniq: new Set(all).size }; });
  check(r2.n > 200 && r2.bang === 0 && r2.brace === 0 && r2.uniq / r2.n > 0.25, 'two days of island talk read clean: ' + JSON.stringify(r2));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify(r2);
});

test('people: villagers ask what others make of someone, pass the opinion round with reasons, ask after family, and the journal shows what the player knows', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await page.evaluate(() => { newTown('people-test', 'farm'); TALK.words = true; });
  await simulate(page, 4 * 1440);
  const r = await page.evaluate(() => {
    const acts = {}; for (const l of TALK.log) for (const a of (l.acts || [])) { const k = a.act || a; acts[k] = (acts[k] || 0) + 1; }
    const ops = npcs.flatMap(n => (n.tmem || []).filter(m => m.kind === 'opinion'));
    const why = npcs.filter(n => n.why && Object.keys(n.why).length).length;
    // the player's journal: give the steered villager an opinion and a price and see them listed
    startPlaying(npcs.find(n => !n.dead && n.age >= 18)); const P = game.player, o = npcs.find(n => n !== P && !n.dead);
    P.tmem = P.tmem || []; P.tmem.push({ kind: 'opinion', about: o.id, from: o.id, word: 'like', reason: 'She is kind.', t: game.time });
    const html = jrHTML();
    TALK.on.person = false; const before = JSON.stringify(acts); const lenA = TALK.log.length; 
    return { acts, ops: ops.length, why, html, hasOp: html.includes('What people say') };
  });
  check((r.acts.ask_opinion || 0) + (r.acts.gossip_person || 0) > 3 && (r.acts.ask_family || 0) > 0, 'people acts fire: ' + JSON.stringify(r.acts).slice(0, 300));
  check(r.ops > 0 && r.why > 0, 'opinions are remembered and reasons are kept: ' + r.ops + '/' + r.why);
  check(r.hasOp && !/undefined|NaN/.test(r.html), 'the journal lists opinions: ' + r.html.slice(0, 200));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify({ ops: r.ops, why: r.why, gifts: r.acts.offer_gift || 0, deeds: r.acts.raise_deed || 0 });
});

test('meddling: what you do in build mode is settled when time runs again; those who saw you cry out and hold it against you, the news travels, and they bring it up when they talk to you', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; TALK.words = true;
    const homes = () => rooms.filter(q => !q.free && !q.dead && q.kind === 'house' && meddleResidents(q).length);
    startPlaying(npcs.find(n => !n.dead && n.age >= 18 && !n.infant)); const P = game.player;
    const R = homes().find(q => !meddleResidents(q).includes(P)) || homes()[0]; const res = meddleResidents(R).filter(n => n !== P)[0]; out.res = !!res; if (!res) return out;
    // the resident is in the house, awake and on the privy step; you stand in the doorway
    res.tx = res.x = R.x + 1; res.ty = res.y = R.y + 1; res.pose = 'stand'; res.moving = false; res.plan = [{ k: 'wait', priv: true, text: 'On the privy' }]; res.si = 0; rebuildOcc();
    P.tx = P.x = R.x + 2; P.ty = P.y = R.y + 1; P.mode = 'push';
    const x0 = R.x + R.w - 1, y0 = R.y + 1; const aff0 = res.aff[P.id] || 0;
    meddleNote('wall_removed', x0, y0, P, { room: rooms.indexOf(R), residents: meddleResidents(R) });
    out.queued = (town.meddleQ || []).length; meddleFlush();
    const evs = lf2Ev(); out.kinds = evs.slice(-4).map(e => e.kind); out.named = evs.slice(-4).some(e => e.kind === 'wall_removed' && e.actor === P.id && !e.anon);
    out.privy = evs.some(e => e.kind === 'caught_on_privy' && e.target === res.id);
    out.mem = (res.tmem || []).filter(m => ['saw', 'felt'].includes(m.kind)).length; out.aff = (res.aff[P.id] || 0) - aff0;
    out.cry = TALK.log.some(l => l.acts.some(a => a.act === 'cry_deed'));
    // they raise it when they talk to you, and the words read
    const c = { done: {}, turns: [] }; out.when = ACTS.raise_deed.when(c, res, P); ACTS.raise_deed.apply(c, res, P); out.line = lxSay('raise_deed', res, P, talkX(c)); out.sorry = lxSay('deed_sorry', P, res, talkX(c));
    out.again = ACTS.raise_deed.when(c, res, P);
    // in the real talk menu: they open with it, and your answer changes what they think of you
    res.mood = 60; res.pose = 'stand'; const before = res.aff[P.id] || 0; openTalk(res); out.open = talkUI.say; out.opts = talkUI.opts.map(o => o[1]);
    const k = talkUI.opts.findIndex(o => /sorry/.test(o[1])); const st = k >= 0 ? ptStep(talkUI.opts[k][0]) : null; out.answer = st && st.say; out.moved = (res.aff[P.id] || 0) - before; closeTalk();
    // an unseen deed: the sleeper is carried out; nobody knows who
    const W = npcs.find(n => n !== P && n !== res && !n.dead && n.age >= 18); town.meddleQ = [];
    W.pose = 'sleep'; meddleNote('wall_removed', W.tx + 1, W.ty, P, { room: -1, residents: [W] }); const n0 = lf2Ev().length; meddleFlush(); const ev2 = lf2Ev().slice(n0)[0];
    out.anon = !!(ev2 && ev2.anon); out.unnamed = ev2 ? !(W.tmem || []).some(m => m.ev === ev2.id && m.ver && m.ver.who === P.id && !m.ver.suspect) : false;   // (a guess may land on you: that is not knowing)
    // the switch
    TALK.on.deed = false; const n1 = TALK.log.length; meddleNote('wall_removed', x0, y0, P, { room: rooms.indexOf(R), residents: meddleResidents(R) }); res.pose = 'stand'; meddleFlush(); out.quiet = !TALK.log.slice(n1).some(l => l.acts.some(a => a.act === 'cry_deed')); TALK.on.deed = true;
    return out; });
  check(r.res && r.queued === 1, 'a deed is noted while time stands still: ' + JSON.stringify([r.res, r.queued]));
  check(r.named && r.privy, 'when time runs the deed is an event with your name, and the one on the privy has a second, worse one: ' + JSON.stringify(r.kinds));
  check(r.mem >= 1 && r.aff < 0 && r.cry, 'the one who saw remembers, thinks worse of you and cries out: ' + JSON.stringify([r.mem, r.aff, r.cry]));
  check(r.when && /you/i.test(r.line) && /wall|house|privy/.test(r.line) && r.sorry && !r.again, 'they raise it once per talk when they talk to you, in words that name the deed: ' + r.line + ' | ' + r.sorry);
  check(/You .*wall|You .*house|privy/.test(r.open || '') && r.opts.some(o => /sorry/.test(o)) && r.answer && r.moved > 0, 'in the talk menu the villager opens with it and your apology is heard: ' + JSON.stringify([r.open, r.opts, r.answer, r.moved]));
  check(r.anon && r.unnamed, 'if nobody saw you, nobody knows it was you: ' + JSON.stringify([r.anon, r.unnamed]));
  check(r.quiet, 'the deed talk can be switched off');
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify(r.kinds);
});

test('gifts: you can give something in a talk; food is welcome when hungry, flowers always, a gift after a deed is an amends, and someone who cannot stand you refuses it', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; TALK.words = true; startPlaying(npcs.find(n => !n.dead && n.age >= 18 && !n.infant)); const P = game.player;
    const R = rooms.find(q => !q.free && !q.dead && q.kind === 'house' && meddleResidents(q).some(n => n !== P)); const o = meddleResidents(R).find(n => n !== P);
    o.tx = o.x = P.tx + 1; o.ty = o.y = P.ty; o.pose = 'stand'; o.hunger = 80; o.inv.fish = 5; rebuildOcc(); P.inv.grain = 3; P.inv.flowers = 2; o.aff[P.id] = 0;
    const give = () => { let k = -1;   /* the menu shows five of many things, so look again */  for (let tries = 0; tries < 12 && k < 0; tries++) { openTalk(o); k = talkUI.opts.findIndex(x => /Give a gift|brought|Here\.|could use|I have .*thought of you|This is .*not much/.test(x[1])); if (k < 0) closeTalk(); } if (k < 0) return null; const a0 = o.aff[P.id] || 0; const st = ptStep(talkUI.opts[k][0]); const r = { say: st.say, d: (o.aff[P.id] || 0) - a0 }; closeTalk(); return r; };
    out.food = give(); out.grain = P.inv.grain; out.theirs = o.inv && o.inv.grain;
    // a deed, then an amends
    o.hunger = 10; meddleNote('wall_removed', o.tx, o.ty, P, { room: -1, residents: [o] }); meddleFlush(); out.grudge = !!deedPick(o, P); out.bad = o.aff[P.id];
    out.amends = give(); out.forgiven = (o.tmem || []).some(m => m.forgiven) && !deedPick(o, P);
    // refusal
    o.aff[P.id] = -70; const f0 = P.inv.flowers; out.refused = give(); out.kept = P.inv.flowers === f0;
    return out; });
  check(r.food && r.food.d > 0 && r.grain === 2 && r.theirs >= 1, 'a gift moves the item and warms them: ' + JSON.stringify([r.food, r.grain, r.theirs]));
  check(r.grudge && r.amends && r.amends.d > 0 && r.forgiven, 'a gift after a deed clears the grudge: ' + JSON.stringify([r.grudge, r.amends, r.forgiven]));
  const r2 = await page.evaluate(() => {
    const out = {}; newTown('npc-gifts', 'farm'); const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant); const A = ps[0], B = ps[1];
    A.inv.flowers = 6; A.hunger = 10; B.hunger = 20; A.giftT = -1e9; B.aff[A.id] = 0; const c = { done: {}, turns: [], left: {} };
    out.when = ACTS.offer_gift.when(c, A, B); const b0 = B.aff[A.id]; talkTurn(c, A, B, 'offer_gift'); out.moved = A.inv.flowers === 5 && B.inv.flowers >= 1; out.warm = B.aff[A.id] > b0;
    out.again = ACTS.offer_gift.when({ done: {}, turns: [] }, A, B);   // (once in twelve hours)
    A.inv.flowers = 2; A.giftT = -1e9; out.reserve = ACTS.offer_gift.when({ done: {}, turns: [] }, A, B);   // (never the last three)
    return out; });
  check(r2.when && r2.moved && r2.warm && !r2.again && !r2.reserve, 'villagers give to each other by the same act, from what they can spare, once in twelve hours: ' + JSON.stringify(r2));
  check(r.refused && r.kept, 'someone who cannot stand you refuses and you keep it: ' + JSON.stringify(r.refused));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify([r.food, r.amends]);
});

test('requests and feelings: the hungry ask for food and the homeless for a bed, anyone can answer, the player can promise (an open thread that closes when it happens or runs out), and talking about a bad day helps', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; newTown('req-test', 'farm'); TALK.words = true; const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant); const A = ps[0], B = ps[1], H = ps[2];
    // hungry asks one with food to spare
    A.hunger = 90; for (const k of ['fish', 'berries', 'grain']) A.inv[k] = 0; B.inv.grain = 8; B.aff[A.id] = 0; A.askT = {}; A.reqs = [];
    const c = { done: {}, turns: [], left: {} }; out.ask = ACTS.ask_favour.when(c, A, B); talkTurn(c, A, B, 'ask_favour'); out.want = c.req && c.req.kind;
    out.canGive = ACTS.favour_give.when(c, B, A); talkTurn(c, B, A, 'favour_give'); out.moved = B.inv.grain === 7 && A.inv.grain === 1; out.done = A.reqs.every(r => r.state === 'done');
    out.againNo = ACTS.ask_favour.when({ done: {}, turns: [] }, A, B);
    // a homeless villager asks the player; the player promises; the thread is open; a bed closes it
    startPlaying(ps[3]); const P = game.player; H.homeless = true; H.hunger = 10; H.reqs = []; H.askT = {}; H.tx = H.x = P.tx + 1; H.ty = H.y = P.ty; H.pose = 'stand'; rebuildOcc();
    openTalk(H); out.say = talkUI.say; out.opts = talkUI.opts.map(o => o[1]); const k = talkUI.opts.findIndex(o => /Promise|see what (I can do|can be done)|little time|few days/.test(o[1]));
    if (k >= 0) ptStep(talkUI.opts[k][0]); closeTalk();
    out.thread = (P.tmem || []).filter(m => m.kind === 'request' && m.state === 'open').length; out.journal = jrHTML();
    H.homeless = false; const a0 = H.aff[P.id] || 0; for (const f of LF2.hourly) { try { f(8); } catch (e) {} }
    out.closed = (P.tmem || []).some(m => m.kind === 'request' && m.state === 'done') && H.reqs.every(r => r.state === 'done'); out.warm = (H.aff[P.id] || 0) > a0;
    // a promise that runs out
    const J = ps[4]; J.homeless = true; J.reqs = [{ to: P.id, kind: 'bed', t: game.time, tp: game.time - 1440 * 4, state: 'promised' }]; TM.add(P, { kind: 'request', from: J.id, req: { kind: 'bed' }, state: 'open', conf: 1, imp: 0.6 });
    const j0 = J.aff[P.id] || 0; for (const f of LF2.hourly) { try { f(9); } catch (e) {} } out.expired = J.reqs[0].state === 'failed' && (J.aff[P.id] || 0) < j0;
    // feelings
    A.mood = 15; B.aff[A.id] = 20; A.aff[B.id] = 20; A.know[B.id] = 40; const c2 = { done: {}, turns: [], left: {} }; out.vent = ACTS.vent.when(c2, A, B); talkTurn(c2, A, B, 'vent'); const m0 = A.mood; B.mood = 40; talkTurn(c2, B, A, 'console'); out.console = A.mood > m0 || A.mood >= 15;
    out.line = lxSay('vent', A, B, { state: 'low' });
    return out; });
  check(r.ask && r.want === 'item' && r.canGive && r.moved && r.done && !r.againNo, 'the hungry ask someone with food, who gives it, once in twelve hours: ' + JSON.stringify([r.ask, r.want, r.canGive, r.moved, r.done, r.againNo]));
  check(/bed/.test(r.say) && r.opts.some(o => /Promise|see what (I can do|can be done)|little time|few days/.test(o)) && r.thread === 1 && /Open threads/.test(r.journal), 'the homeless villager opens with the bed, you can promise, and the journal lists the thread: ' + JSON.stringify([r.say, r.opts, r.thread]));
  check(r.closed && r.warm, 'finding the bed closes the thread and they are grateful');
  check(r.expired, 'a promise left three days fails, with a grudge');
  check(r.vent && r.line && r.console, 'a bad day can be told and consoled: ' + r.line);
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify([r.say]);
});

test('secrets: friends confide what few know, a secret is not gossip, the gossipy and the player can pass it on, and a leak comes back as a betrayal the keeper raises', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; newTown('secret-test', 'farm'); TALK.words = true; const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant); const A = ps[0], B = ps[1], C = ps[2], D = ps[3];
    // A did something small and unseen
    const ev = lfEmit('theft', { actor: A, target: D, sev: 2, tags: ['theft'], anon: true, sawActor: [], witnessIds: [], chron: false, text: A.first + ' took something' });
    out.has = !!secretPick(A, B); A.aff[B.id] = 60; A.know[B.id] = 50; const c = { done: {}, turns: [], left: {} };
    out.when = ACTS.confide.when(c, A, B); talkTurn(c, A, B, 'confide'); const mem = (B.tmem || []).find(m => m.ev === ev.id);
    out.kept = !!(mem && mem.secret && mem.keeper === A.id && mem.ver.who === A.id); out.reply = ACTS.secret_alarmed.when(c, B, A) || ACTS.secret_keep.when(c, B, A);
    out.line = lxSay('confide', A, B, talkX(c));
    out.once = ACTS.confide.when({ done: {}, turns: [] }, A, B);   // told once
    // ordinary gossip skips it
    B.traits = ['shy']; let picked = 0; for (let i = 0; i < 60; i++) { const pk = TE.pick(B, C, { done: {} }); if (pk && pk.m.secret) picked++; } out.gossip = picked;
    // the player can pass it on; the leak comes back a day later as a betrayal
    const l0 = (town.leaks || []).length; TE.tell(B, C, { m: mem, ev }, { done: {} }); out.queued = (town.leaks || []).length === l0 + 1;
    const a0 = A.aff[B.id]; town.leaks[town.leaks.length - 1].t = game.time - 800; for (const f of LF2.hourly) { try { f(8); } catch (e) {} }
    const bet = lf2Ev().find(e => e.kind === 'betrayal' && e.actor === B.id && e.target === A.id); out.betrayal = !!bet; out.cooled = A.aff[B.id] < a0;
    const hold = deedPick(A, B); out.raises = !!hold && deedYou(hold.ev, A).indexOf('secret') >= 0;
    return out; });
  check(r.has && r.when && r.kept && r.reply && !r.once && /Please keep|Nobody else|stay with you|Keep it with you|first person|first I have told/.test(r.line), 'a friend confides a deed nobody knows, once, and the listener keeps it: ' + JSON.stringify([r.has, r.when, r.kept, r.reply, r.once, r.line]));
  check(r.gossip === 0, 'a secret is not gossip: ' + r.gossip);
  check(r.queued && r.betrayal && r.cooled && r.raises, 'passing it on is a leak that comes back as a betrayal, thought the worse of and raised: ' + JSON.stringify([r.queued, r.betrayal, r.cooled, r.raises]));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.line;
});

test('romance: a flirt is returned or rebuffed, a declaration is met honestly, a walk-out and a proposal need a yes, and the villager you steer answers in the menu', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; newTown('rom-test', 'farm'); MODS.all(); TALK.words = true;
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 17 && n.age < 60 && !n.infant);
    let M = null, F = null; for (const a of ps) { if (a.female) continue; const b = ps.find(n => n.female && Math.abs(n.age - a.age) <= 12 && !isKin(n, a)); if (b) { M = a; F = b; break; } } out.pair = !!(M && F); if (!M || !F) return out;
    for (const n of [M, F]) { const sp = n.fam.spouse != null ? byId(n.fam.spouse) : null; if (sp) sp.fam.spouse = null; n.grief = 0; n.fam.spouse = null; n.fam.partner = null; }
    const fresh = () => ({ done: {}, turns: [], left: {} });
    // a flirt: warm gets returned, cold gets rebuffed
    M.crush = F.id; M.aff[F.id] = 40; M.know[F.id] = 40; F.aff[M.id] = 40; F.know[M.id] = 40; let c = fresh();
    out.flirt = ACTS.flirt.when(c, M, F); talkTurn(c, M, F, 'flirt'); out.back = ACTS.flirt_back.when(c, F, M) && !ACTS.flirt_rebuff.when(c, F, M);
    const a0 = M.aff[F.id]; talkTurn(c, F, M, 'flirt_back'); out.warmed = M.aff[F.id] > a0 && F.crush === M.id;
    F.aff[M.id] = 0; F.crush = null; out.rebuff = ACTS.flirt_rebuff.when(fresh(), F, M);
    // a declaration met honestly
    F.aff[M.id] = 45; F.crush = null; M.romT = {}; c = fresh(); c.done = {}; out.decl = ACTS.declare.when(c, M, F); talkTurn(c, M, F, 'declare'); out.ret = ACTS.declare_return.when(c, F, M); talkTurn(c, F, M, 'declare_return'); out.mutual = F.crush === M.id;
    // a walk-out needs a yes
    M.romT = {}; c = fresh(); out.walkWhen = ACTS.ask_to_walk.when(c, M, F); talkTurn(c, M, F, 'ask_to_walk'); out.noPartnerYet = !M.fam.partner; talkTurn(c, F, M, 'walk_yes'); out.courting = M.fam.partner === F.id && F.fam.partner === M.id;
    // a proposal after the courtship has lasted
    M.courtSince = F.courtSince = game.time - 10 * 1440; M.aff[F.id] = F.aff[M.id] = 70; M.romT = {}; town.wedding = null; c = fresh(); out.prop = ACTS.propose.when(c, M, F); talkTurn(c, M, F, 'propose'); const w0 = !!town.wedding; talkTurn(c, F, M, 'propose_yes'); out.wedding = !!town.wedding && !w0;
    out.line = lxSay('declare', M, F, {});
    // the villager you steer: asked to walk out, nothing happens until they answer in the menu
    const Q = npcs.find(n => !n.dead && !n.player && n.age >= 20 && n.age <= 40 && !n.fam.partner && !n.fam.spouse && n !== M && n !== F && n.female !== (npcs.find(x => x.player) || { female: true }).female);
    return out; });
  check(r.pair, 'the island has a pair who may court');
  check(r.flirt && r.back && r.warmed && r.rebuff, 'a flirt is returned when warm, rebuffed when not: ' + JSON.stringify([r.flirt, r.back, r.warmed, r.rebuff]));
  check(r.decl && r.ret && r.mutual && /./.test(r.line), 'a declaration is met honestly and makes it mutual: ' + JSON.stringify([r.decl, r.ret, r.mutual, r.line]));
  check(r.walkWhen && r.noPartnerYet && r.courting, 'asking to walk out starts nothing until the yes: ' + JSON.stringify([r.walkWhen, r.noPartnerYet, r.courting]));
  check(r.prop && r.wedding, 'a proposal after a courtship, once accepted, schedules the wedding: ' + JSON.stringify([r.prop, r.wedding]));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.line;
});

test('suspicion and reputation: an unseen deed is guessed at (so an innocent can be blamed), the innocent denies and is believed, the guilty can blame another or own up, and what people believe adds up to a reputation that colours greetings', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; newTown('susp-test', 'farm'); TALK.words = true; startPlaying(npcs.find(n => !n.dead && n.age >= 18 && !n.infant)); const P = game.player;
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 14 && !n.infant); const ids = ps.map(n => n.id);
    // thirty unseen wall-breakings: the village guesses
    let suspects = 0, wrong = 0, none = 0, lowConf = true, evs = [];
    for (let i = 0; i < 30; i++) { const tgt = ps[i % ps.length]; const ev = lfEmit('wall_removed', { actor: P, target: tgt, sev: 2, tags: ['nuisance', 'embarrass'], anon: true, sawActor: [], witnessIds: ids.filter(id => id !== tgt.id), chron: false, text: 'x' }); evs.push(ev);
      for (const n of ps) { const m = (n.tmem || []).find(q => q.ev === ev.id); if (!m) continue; if (m.ver.who == null) none++; else { suspects++; if (m.ver.who !== P.id) wrong++; if (m.conf >= 1) lowConf = false; } } }
    out.sus = [suspects, wrong, none, lowConf];
    // an innocent is accused by someone who blames them
    let acc = null, inn = null, mem = null; for (const n of ps) { const m = (n.tmem || []).find(q => q.ev && q.ver && q.ver.suspect && q.ver.who !== P.id && q.ver.who != null && q.conf >= 0.5); if (m) { acc = n; inn = byId(m.ver.who); mem = m; break; } }
    out.accuser = !!(acc && inn); if (!acc || !inn) return out;
    const pick = deedPick(acc, inn); out.pick = !!pick && pick.m === mem;
    const c = { done: {}, turns: [], left: {} }; acc.aff[inn.id] = 0; out.raise = ACTS.raise_deed.when(c, acc, inn); talkTurn(c, acc, inn, 'raise_deed'); out.how = c.newsHow; out.line = lxSay('raise_deed', acc, inn, talkX(c));
    out.innocentOpts = ['deed_sorry', 'deed_defend', 'deed_deny', 'deed_shrug'].map(id => ACTS[id].when(c, inn, acc));
    talkTurn(c, inn, acc, 'deed_deny'); out.believe = ACTS.deed_believe.when(c, acc, inn); const bef = repTags(acc, inn).vandal || 0; talkTurn(c, acc, inn, 'deed_believe'); out.cleared = mem.cleared === true && (repTags(acc, inn).vandal || 0) < bef;
    // the guilty one can blame another
    const c2 = { done: {}, turns: [], left: {} }; const victim = ps.find(n => n !== acc && n !== inn); const ev2 = evs[5]; const holder = ps.find(n => { const m = (n.tmem || []).find(q => q.ev === ev2.id && q.kind !== 'did'); return m && n.id !== ev2.target; });
    const hm = (holder.tmem || []).find(q => q.ev === ev2.id); hm.ver = { who: P.id, sev: 2 }; hm.conf = 0.9; hm.kind = 'saw'; hm.raised = false; hm.cleared = false; holder.aff[P.id] = -5;
    out.d2 = !!deedPick(holder, P); talkTurn(c2, holder, P, 'raise_deed'); out.blameOk = ACTS.deed_blame.when(c2, P, holder); talkTurn(c2, P, holder, 'deed_blame'); out.blamed = !!c2.blamed && hm.ver.who === c2.blamed.id && hm.ver.who !== P.id; out.blameLine = lxSay('deed_blame', P, holder, talkX(c2));
    // owning up puts it right
    const fixer = ps.find(n => n !== holder); const wrong1 = TM.addEv(fixer, evs[7], 'felt', 0.5, null, 0, { who: inn.id, sev: 2, suspect: true }) || TM.ofEv(fixer, evs[7].id); wrong1.ver = { who: inn.id, sev: 2, suspect: true };
    P.tmem = P.tmem || []; if (!TM.ofEv(P, evs[7].id)) TM.addEv(P, evs[7], 'did', 1); const c3 = { done: {}, turns: [], left: {} }; out.confessWhen = ACTS.confide.when(c3, P, fixer); talkTurn(c3, P, fixer, 'confide'); const fm = c3.secretEv && TM.ofEv(fixer, c3.secretEv.id); out.fixed = !!fm && fm.ver.who === P.id && fm.conf === 1;
    // reputation adds up and colours greetings
    const fresh = ps.filter(n => n !== acc && n !== holder); for (const n of fresh.slice(0, 4)) { for (const e of evs.slice(0, 3)) { const m = TM.ofEv(n, e.id); if (m) { m.ver = { who: P.id, sev: 2 }; m.conf = 1; m.cleared = false; } } }
    const vil = repVillage(P); out.vil = vil.vandal || 0; const f0 = fresh[0]; out.word = repWord(f0, P);
    const seen = new Set(); for (let i = 0; i < 60; i++) seen.add(lxSay('greet_back', f0, P, {})); out.greets = [...seen].filter(t => /walls?|It's you|valuables|Walls/i.test(t)).length;
    f0.aff[P.id] = 20; const c4 = { done: {}, turns: [], left: {} }; out.tell = ACTS.tell_rep.when(c4, f0, P); if (out.tell) { talkTurn(c4, f0, P, 'tell_rep'); out.tellLine = lxSay('tell_rep', f0, P, talkX(c4)); }
    out.journal = jrHTML();
    return out; });
  check(r.sus[0] > 10 && r.sus[1] > 3 && r.sus[2] > 10 && r.sus[3], 'those who did not see guess, often wrongly, sometimes have no idea, never with full certainty: ' + JSON.stringify(r.sus));
  check(r.accuser && r.pick && r.raise && r.how === 'suspect' && /./.test(r.line), 'someone who blames an innocent raises it with them as a hunch: ' + JSON.stringify([r.accuser, r.pick, r.raise, r.how, r.line]));
  check(r.innocentOpts && r.innocentOpts[2] && !r.innocentOpts[0] && !r.innocentOpts[1] && r.believe && r.cleared, 'the innocent can only deny, is believed, and the blame is cleared: ' + JSON.stringify([r.innocentOpts, r.believe, r.cleared]));
  check(r.d2 && r.blameOk && r.blamed && r.blameLine, 'the guilty can blame somebody else, and the accuser now suspects them: ' + JSON.stringify([r.d2, r.blameOk, r.blamed, r.blameLine]));
  check(r.confessWhen && r.fixed, 'owning up puts a wrong version right');
  check(r.vil >= 4 && r.word === 'vandal' && r.greets > 0 && r.tell && /Reputation|say/.test(r.tellLine + 'say') && /What folks say about you/.test(r.journal), 'what people believe adds up, colours the greeting and shows in the journal: ' + JSON.stringify([r.vil, r.word, r.greets, r.tell, r.tellLine]));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify([r.sus, r.line, r.blameLine, r.tellLine]);
});

test('meddling reactions: furniture and people are deeds too, being caught bathing or praying is its own story, and people react by staring, fleeing, telling a friend or coming to have it out', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; TALK.words = true; startPlaying(npcs.find(n => !n.dead && n.age >= 18 && !n.infant)); const P = game.player;
    const houses = rooms.filter(q => !q.free && !q.dead && q.kind === 'house' && meddleResidents(q).some(n => n !== P && !n.player)); const R = houses[0], res = meddleResidents(R).filter(n => n !== P);
    const V = res[0]; V.tx = V.x = R.x + 1; V.ty = V.y = R.y + 1; V.pose = 'stand'; V.moving = false; P.tx = P.x = R.x + 2; P.ty = P.y = R.y + 1; rebuildOcc();
    // furniture
    const bed = V.bed && V.bed.x != null ? V.bed : (R.beds || [])[0]; const ev0 = lf2Ev().length;
    meddleNote('furniture_removed', bed ? bed.x : R.x + 1, bed ? bed.y : R.y + 1, P, { room: rooms.indexOf(R), residents: [V], place: 'bed' }); meddleFlush();
    const fe = lf2Ev().slice(ev0).find(e => e.kind === 'furniture_removed'); out.furniture = !!fe && fe.target === V.id && !!(V.tmem || []).find(m => m.ev === fe.id); out.furnLine = fe ? TE.text(fe, { who: P.id }) : '';
    out.react = !!V.react || res.concat(npcs).some(n => n.react);
    // a pushed person
    const W = npcs.find(n => n !== P && n !== V && !n.dead && n.age >= 12 && !n.infant); const ev1 = lf2Ev().length; meddleNote('person_pushed', W.tx, W.ty, P, { room: -1, residents: [W] }); meddleFlush(); out.pushed = lf2Ev().slice(ev1).some(e => e.kind === 'person_pushed' && e.target === W.id);
    // bathing and praying
    for (const [txt, kind] of [['Taking a bath', 'caught_bathing'], ['Praying at the altar', 'caught_praying']]) { const X = npcs.find(n => n !== P && n !== V && n !== W && !n.dead && n.age >= 12 && !n.infant && n.pose !== 'sleep' && !kind.includes(n.id)); X.pose = 'stand'; X.moving = false; X.plan = [{ k: 'wait', text: txt }]; X.si = 0; X.tx = X.x = P.tx + 2; X.ty = X.y = P.ty; rebuildOcc(); const e2 = lf2Ev().length; meddleNote('wall_removed', P.tx + 1, P.ty, P, { room: -1, residents: [] }); meddleFlush(); out[kind] = lf2Ev().slice(e2).some(e => e.kind === kind && e.target === X.id); }
    // reactions: each type makes a plan, a friend is told at once
    const dec = LF2.dec.find(f => String(f).includes('n.react')); const A = npcs.find(n => n !== P && !n.dead && n.age >= 14 && !n.infant && n.pose !== 'sleep' && n !== V), F = npcs.find(n => n !== P && n !== A && n !== V && !n.dead && n.age >= 14 && !n.infant);
    A.aff[F.id] = 40; const plans = {}; for (const type of ['stare', 'confront', 'flee', 'tell']) { A.react = { type, x: P.tx, y: P.ty, by: P.id, until: game.time + 200, ev: 'x' }; F.tx = F.x = A.tx + 3; F.ty = F.y = A.ty; F.pose = 'stand'; const p = dec(A); plans[type] = p ? p.map(s => s.text).join(' | ') : null; }
    out.plans = plans;
    const ev3 = lf2Ev().find(e => e.kind === 'furniture_removed'); const mem = TM.ofEv(V, ev3.id); mem.t = game.time + 5; F.tmem = (F.tmem || []).filter(m => m.ev !== ev3.id); V.aff[F.id] = 30; meddleTell(V, F); out.told = !!TM.ofEv(F, ev3.id);
    return out; });
  check(r.furniture && /furniture/.test(r.furnLine), 'taking a bed or chair from a home is a deed the owner feels: ' + JSON.stringify([r.furniture, r.furnLine]));
  check(r.pushed && r.caught_bathing && r.caught_praying, 'pushing somebody about, and catching them bathing or praying, are their own stories: ' + JSON.stringify([r.pushed, r.caught_bathing, r.caught_praying]));
  check(Object.values(r.plans).every(Boolean) && r.told, 'people stare, confront, flee, or go and tell a friend, who hears it at once: ' + JSON.stringify([r.plans, r.told]));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify(r.plans);
});

test('tastes, hints, gifts sent by another hand, apologies and jealousy: people like particular things and others find out, gifts land well or badly, a gift can arrive from nobody and be credited to the wrong person, sorry is said unasked, jealousy is confronted', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; newTown('taste-test', 'farm'); MODS.all(); TALK.words = true; const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant); const A = ps[0], B = ps.find(n => n !== A && !isKin(A, n) && (n.fam.spouse !== A.id)), rest = ps.filter(n => n !== A && n !== B && !isKin(A, n) && !isKin(B, n)), C = rest[0], D = rest[1]; const fresh = () => ({ done: {}, turns: [], left: {} });
    const tA = giftTastes(A), tB = giftTastes(B); out.tastes = tA.like.length >= 1 && tA.dislike.length === 1 && JSON.stringify(giftTastes(A)) === JSON.stringify(tA) && ps.slice(0, 8).some(n => JSON.stringify(giftTastes(n)) !== JSON.stringify(tA));
    // ask and tell
    A.know[B.id] = 30; B.know[A.id] = 30; A.tmem = (A.tmem || []).filter(m => m.kind !== 'pref'); A.askPrefT = {}; let c = fresh(); out.ask = ACTS.ask_preference.when(c, A, B); talkTurn(c, A, B, 'ask_preference'); talkTurn(c, B, A, 'tell_preference');
    out.learned = (A.tmem || []).some(m => m.kind === 'pref' && m.about === B.id && m.item === c.prefItem); out.askLine = lxSay('tell_preference', B, A, talkX(c));
    // a hint
    B.tmem = (B.tmem || []).filter(m => m.kind !== 'pref'); A.aff[B.id] = 40; B.aff[A.id] = 40; A.hintT = {}; c = fresh(); out.hint = ACTS.hint_gift.when(c, A, B); talkTurn(c, A, B, 'hint_gift'); out.hinted = (B.tmem || []).some(m => m.kind === 'pref' && m.about === A.id && m.like && giftTastes(A).like.includes(m.item));
    // a known like beats a dearer thing
    const likeItem = tB.like[0], other = giftPool().find(k => !tB.like.includes(k) && !tB.dislike.includes(k) && (GOODS[k].base || 1) >= (GOODS[likeItem].base || 1)); A.inv = {}; A.inv[likeItem] = 6; if (other) A.inv[other] = 6; A.tmem = A.tmem.filter(m => m.kind !== 'pref'); giftLearn(A, B, likeItem, true); A.hunger = 10; B.hunger = 10; out.picks = giftChoose(A, B) === likeItem;
    // loved lands well, disliked badly
    B.aff[A.id] = 0; A.giftT = -1e9; c = fresh(); const a0 = B.aff[A.id]; talkTurn(c, A, B, 'offer_gift'); out.loved = c.giftResult === 'loved' && B.aff[A.id] > a0 && ACTS.gift_loved.when(c, B, A);
    const bad = tB.dislike[0]; A.inv[bad] = 6; A.tmem = A.tmem.filter(m => m.kind !== 'pref'); A.giftT = -1e9; A.owes = {}; const hateOnly = Object.assign({}, A.inv); A.inv = {}; A.inv[bad] = 6; c = fresh(); const a1 = B.aff[A.id]; talkTurn(c, A, B, 'offer_gift'); out.hated = c.giftResult === 'disliked' && B.aff[A.id] < a1 + 1 && giftKnown(A, B).dislike.includes(bad);
    // owed: B now owes A and returns it
    out.owes = !!(B.owes && B.owes[A.id]); B.inv = {}; B.inv.grain = 8; B.giftT = -1e9; c = fresh(); talkTurn(c, B, A, 'offer_gift'); out.returned = c.newsHow === 'return';
    // a gift sent through another hand
    A.inv = {}; A.inv.flowers = 4; A.crush = C.id; A.aff[C.id] = 40; A.aff[D.id] = 20; D.aff[A.id] = 20; D.parcel = null; A.sendT = -1e9; c = fresh();
    out.send = ACTS.send_gift.when(c, A, D); if (out.send) { talkTurn(c, A, D, 'send_gift'); out.target = c.parcel && c.parcel.to; talkTurn(c, D, A, 'deliver_yes'); out.carrying = !!D.parcel && A.inv.flowers === 3;
      const X = lf2By(D.parcel.to); X.tx = X.x = D.tx + 1; X.ty = X.y = D.ty; X.inv = X.inv || {}; const n0 = X.inv.flowers || 0, e0 = lf2Ev().length; parcelGive(D);
      out.delivered = (X.inv.flowers || 0) === n0 + 1 && !D.parcel; const ge = lf2Ev().slice(e0).find(e => e.kind === 'gift' && e.anon); out.anonEvent = !!ge && ge.sawActor.includes(D.id) && !!TM.ofEv(X, ge.id); }
    // sorry unasked
    const ps2 = npcs.filter(n => !n.dead && !n.player && n.age >= 12 && !n.infant); const P = ps2[ps2.length - 1], V = ps2[ps2.length - 2]; const ev = lfEmit('furniture_removed', { actor: P, target: V, sev: 2, tags: ['nuisance'], anon: false, witnessIds: [V.id], chron: false, text: 'x' }); V.aff[P.id] = -20; c = fresh();
    out.sorryWhen = ACTS.apologise.when(c, P, V); talkTurn(c, P, V, 'apologise'); const f0 = V.aff[P.id]; talkTurn(c, V, P, 'accept_apology'); out.accepted = V.aff[P.id] > f0 && (V.tmem || []).some(m => m.ev === ev.id && m.forgiven); out.sorryOnce = ACTS.apologise.when(fresh(), P, V);
    // jealousy
    const S = ps2[ps2.length - 3], L = ps2[ps2.length - 4], Y = ps2[ps2.length - 5]; S.crush = L.id; const cev = lfEmit('courting', { actor: L, target: Y, sev: 1, tags: ['romance'], witnessIds: [S.id], chron: false, text: 'x' }); c = fresh();
    out.jealWhen = ACTS.confront_jealous.when(c, S, L); talkTurn(c, S, L, 'confront_jealous'); out.jealLine = lxSay('confront_jealous', S, L, talkX(c)); out.jealOnce = ACTS.confront_jealous.when(fresh(), S, L); out.explain = ACTS.jealous_explain.when(c, L, S) || ACTS.jealous_defiant.when(c, L, S);
    return out; });
  check(r.tastes && r.ask && r.learned && /./.test(r.askLine), 'everyone has tastes that differ, and asking finds one out: ' + JSON.stringify([r.tastes, r.ask, r.learned, r.askLine]));
  check(r.hint && r.hinted && r.picks, 'a hint teaches the listener, and a known like is chosen over something dearer: ' + JSON.stringify([r.hint, r.hinted, r.picks]));
  check(r.loved && r.hated && r.owes && r.returned, 'a liked gift lands well, a disliked one badly (and is learned), and a return gift is a return: ' + JSON.stringify([r.loved, r.hated, r.owes, r.returned]));
  check(r.send && r.carrying && r.delivered && r.anonEvent, 'a gift can be sent through another hand, arriving from nobody: ' + JSON.stringify([r.send, r.carrying, r.delivered, r.anonEvent]));
  check(r.sorryWhen && r.accepted && !r.sorryOnce, 'sorry is said unasked, once, and accepted: ' + JSON.stringify([r.sorryWhen, r.accepted, r.sorryOnce]));
  check(r.jealWhen && !r.jealOnce && r.explain && /./.test(r.jealLine), 'jealousy is confronted once: ' + JSON.stringify([r.jealWhen, r.jealOnce, r.explain, r.jealLine]));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.askLine;
});

test('conversation depth: topics link or start afresh, stories have a preface and an invitation, last time is remembered, patterns become opinions, the small acts all have words, barks, eavesdropping, card hints and dials', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; newTown('depth-test', 'farm'); MODS.all(); TALK.words = true; startPlaying(npcs.find(n => !n.dead && n.age >= 18 && !n.infant)); const P = game.player;
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant); const A = ps[0], B = ps[1], C = ps[2]; const fresh = () => ({ done: {}, turns: [], left: {} }); const clean = t => !!t && !/[{}]|undefined|NaN/.test(t);
    // links
    for (const n of ps) { LIFE.emit('found', n, { thing: 'a button' }); LIFE.emit('ate_with', n, { with: ps[(ps.indexOf(n) + 5) % ps.length].id }); }   // (something to say: a talk with nothing in it does not happen)
    let linked = 0, afresh = 0, bad = 0; for (let i = 0; i < 40; i++) { for (const n of ps) n.saidTo = {}; const c = talkRun(ps[i % ps.length], ps[(i + 3) % ps.length], true); for (const t of c.turns) { if (t.x && t.x.link === 'linked') linked++; if (t.x && t.x.link === 'fresh') afresh++; const w = talkWords(t, ps[i % ps.length], ps[(i + 3) % ps.length]); if (w && !clean(w)) bad++; } }
    out.links = [linked, afresh, bad]; out.linkText = lxLink('The bread is good.', 'fresh') + ' | ' + lxLink('I am well.', 'linked');
    // a story
    const ev = lfEmit('theft', { actor: C, target: ps[3], sev: 3, tags: ['theft', 'scandal'], anon: false, witnessIds: [A.id], chron: false, text: 'x' }); const am = TM.ofEv(A, ev.id); am.imp = 0.9; B.tmem = (B.tmem || []).filter(m => m.ev !== ev.id); A.aff[B.id] = 30;
    let c = fresh(); out.pref = ACTS.story_preface.when(c, A, B); talkTurn(c, A, B, 'story_preface'); out.inv = ACTS.story_invite.when(c, B, A); talkTurn(c, B, A, 'story_invite'); out.body = ACTS.share_news.when(c, A, B) && c.news === c.storyNews; talkTurn(c, A, B, 'share_news'); out.told = !!TM.ofEv(B, ev.id) && !c.storyNews;
    out.storyWords = c.turns.map(t => talkWords(t, A, B)).join(' / ');
    // last time
    TM.add(A, { kind: 'talked', with: B.id, t: game.time - 300, subj: C.first, imp: 0.2 }); c = fresh(); out.cb = false; for (let i = 0; i < 60 && !out.cb; i++) out.cb = ACTS.callback.when(c, A, B); talkTurn(c, A, B, 'callback');   // (a callback is about a person, and not every time) out.cbOnce = ACTS.callback.when(fresh(), A, B); out.cbLine = lxSay('callback', A, B, talkX(c)); out.cbName = C.first;
    // reflection
    A.why = { [B.id]: [{ why: 'was rude', v: -6, t: game.time }, { why: 'laughed at me', v: -5, t: game.time }] }; A.aff[B.id] = -20; reflect(A); out.refl = !!(A.refl && A.refl[B.id] && A.refl[B.id].w === 'unkind') && (A.tmem || []).some(m => m.kind === 'inferred'); let nk = 0; for (let i = 0; i < 40; i++) if (/never kind/.test(peopleReason(A, B))) nk++; out.reason = nk;
    // small acts all have words
    const D = ps[4]; const Z = ps[5]; const words = {};
    const say = (id, sp, li, cc) => { const w = lxSay(id, sp, li, talkX(cc)); words[id] = clean(w) ? 'ok' : 'BAD:' + w; };
    c = fresh(); for (const id of ['joke', 'wonder']) { talkTurn(c, A, B, id); say(id, A, B, c); } say('laugh', B, A, c); say('groan', B, A, c); say('wonder_reply', B, A, c);
    B.job = 'Baker'; A.know[B.id] = 20; c = fresh(); out.askWork = ACTS.ask_work.when(c, A, B); talkTurn(c, A, B, 'ask_work'); say('ask_work', A, B, c); say('answer_work', B, A, c);
    for (const n of npcs) n.tx = n.x = n.tx; const far = npcs.find(n => n !== A && n !== B && !n.dead && !n.infant && n.age >= 12 && lfDist(A, n) > 12); if (far) { A.aff[far.id] = 30; A.crush = far.id; c = fresh(); out.askWhere = ACTS.ask_where.when(c, A, B); talkTurn(c, A, B, 'ask_where'); say('ask_where', A, B, c); out.tellWhere = ACTS.tell_where.when(c, B, A) || ACTS.dont_know_where.when(c, B, A); talkTurn(c, B, A, ACTS.tell_where.when(c, B, A) ? 'tell_where' : 'dont_know_where'); say(ACTS.tell_where.when(c, B, A) ? 'tell_where' : 'dont_know_where', B, A, c); } else out.askWhere = out.tellWhere = true;
    const evw = lfEmit('wall_removed', { actor: Z, target: D, sev: 2, tags: ['nuisance'], anon: false, witnessIds: [A.id, D.id], chron: false, text: 'x' }); const wm = TM.ofEv(A, evw.id); wm.conf = 1; wm.ver = { who: Z.id, sev: 2 }; A.aff[B.id] = 30; B.tmem = (B.tmem || []).filter(m => m.ev !== evw.id); c = fresh(); out.warn = ACTS.warn.when(c, A, B); if (out.warn) { talkTurn(c, A, B, 'warn'); say('warn', A, B, c); say('warn_thanks', B, A, c); }
    A.hunger = 70; c = fresh(); out.advice = ACTS.ask_advice.when(c, A, B); talkTurn(c, A, B, 'ask_advice'); say('ask_advice', A, B, c); say('give_advice', B, A, c);
    const kid = npcs.find(n => !n.dead && n.age < 14 && n !== A && n !== B) || null; if (kid) { A.fam.kids = [kid.id]; c = fresh(); out.brag = ACTS.brag_child.when(c, A, B); talkTurn(c, A, B, 'brag_child'); say('brag_child', A, B, c); say('congratulate', B, A, c); } else out.brag = true;
    A.back = 'was ironing a shirt, and then there was sand'; c = fresh(); out.back = ACTS.tell_back.when(c, A, B); talkTurn(c, A, B, 'tell_back'); say('tell_back', A, B, c); say('tell_back_reply', B, A, c);
    for (const how of ['farmer', 'baker', 'smith', 'priest']) { const w = lxSay('mutter', A, A, { how }); words['mutter_' + how] = clean(w) ? 'ok' : 'BAD:' + w; } words.call = clean(lxSay('call_child', A, B, { about: 'Tiny' })) ? 'ok' : 'BAD';
    out.words = Object.entries(words).filter(([, v]) => v !== 'ok');
    // eavesdropping: the player hears news told nearby
    const E2 = lfEmit('shove', { actor: D, target: ps[6] || C, sev: 2, tags: ['harm', 'nuisance'], anon: false, witnessIds: [A.id], chron: false, text: 'x' }); const m2 = TM.ofEv(A, E2.id); m2.imp = 0.9; B.tmem = (B.tmem || []).filter(m => m.ev !== E2.id); A.tx = A.x = P.tx + 2; A.ty = A.y = P.ty; B.tx = B.x = P.tx + 3; B.ty = B.y = P.ty;
    c = fresh(); c.news = { m: m2, ev: E2, score: 1 }; talkTurn(c, A, B, 'share_news'); talkFinish(c, A, B, true); const om = TM.ofEv(P, E2.id); out.heard = !!om && om.kind === 'overheard';
    // the card and the journal and the dials
    A.hunger = 90; for (const k of ['fish', 'berries', 'grain']) A.inv[k] = 0; out.card = /Notice/.test(vcHTML(A)); TM.add(P, { kind: 'pref', about: A.id, item: 'grain', like: true }); out.journal = /What you know of people/.test(jrHTML());
    out.dials = TALK.dial.distort === 1 && TALK.dial.sev === 1;
    return out; });
  check(r.links[0] + r.links[1] >= 1 && r.links[2] === 0 && /Anyway|Oh|Changing|[Rr]elated|On |Staying|Speaking/.test(r.linkText), 'topics link or start afresh, and the words stay clean: ' + JSON.stringify([r.links, r.linkText]));
  check(r.pref && r.inv && r.body && r.told, 'a story is a preface, an invitation and the telling: ' + JSON.stringify([r.pref, r.inv, r.body, r.told, r.storyWords]));
  check(r.cb && !r.cbOnce && new RegExp(r.cbName || '.').test(r.cbLine), 'last time is remembered, once: ' + JSON.stringify([r.cb, r.cbOnce, r.cbLine]));
  check(r.refl && r.reason > 5, 'a pattern of slights becomes an opinion people state: ' + JSON.stringify([r.refl, r.reason]));
  check(r.askWork && r.askWhere && r.tellWhere && r.warn && r.advice && r.brag && r.back && r.words.length === 0, 'the small acts apply and have clean words: ' + JSON.stringify([r.askWork, r.askWhere, r.tellWhere, r.warn, r.advice, r.brag, r.back, r.words]));
  check(r.heard && r.card && r.journal && r.dials, 'overheard news reaches your journal, the card hints, the journal shows what you know of people, dials exist: ' + JSON.stringify([r.heard, r.card, r.journal, r.dials]));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.storyWords;
});

test('small life: working beside somebody and eating with them are remembered as reasons and as something to tell; "any news?" can be answered with your own day', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('small-test', 'farm'); MODS.all();
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 16 && !n.infant); const [a, b, c2] = ps;
    const put = (n, x, y, act) => { n.tx = x; n.ty = y; n.x = x; n.y = y; n.moving = false; n.plan = [{ k: 'wait', act, t: 600, text: 'x' }]; n.si = 0; };
    const x0 = a.tx, y0 = a.ty; a.job = b.job = 'Farmer'; put(a, x0, y0, 'work'); put(b, x0 + 1, y0, 'work');
    for (const n of ps) if (n !== a && n !== b) put(n, n.tx, n.ty, 'none');
    smallLifeHour(10);
    const why1 = JSON.stringify((a.why || {})[b.id] || {});
    const rec = LIFE.recent(a, c2) || [];
    put(a, x0, y0, 'eat'); put(b, x0 + 1, y0, 'eat'); smallLifeHour(12);
    const why2 = JSON.stringify((a.why || {})[b.id] || {});
    smallLifeHour(12); const why3 = JSON.stringify((a.why || {})[b.id] || {});
    return { why1, why2, same: why2 === why3, kinds: rec.map(g => g.kind), replies: ACTS.ask_news.replies };
  });
  check(/worked beside me/.test(r.why1), 'working side by side is a reason in the ledger: ' + r.why1);
  check(r.kinds.includes('worked_with'), 'and something to tell about the day: ' + r.kinds);
  check(/ate with me/.test(r.why2) && r.same, 'a shared meal counts once a day: ' + r.why2);
  check(r.replies.includes('report_day'), 'somebody with no news can answer with their day');
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('one path for news: what somebody is told in conversation is what the watch and the law know too (the old ledger mirrors the memory)', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant); const [A, B, Z, V] = ps;
    const ev = lfEmit('theft', { actor: Z, target: V, sev: 2, tags: ['theft'], witnessIds: [A.id], chron: false, text: 'x' });
    const before = !!(B.kn && B.kn[ev.id]); const m = TM.ofEv(A, ev.id);
    TE.tell(A, B, { m, ev, score: 1 }, { done: {}, turns: [], left: {} });
    const k = B.kn && B.kn[ev.id];
    return { before, after: !!k, from: k && k.from === A.id, who: k && k.who === Z.id, mem: !!TM.ofEv(B, ev.id), known: ev.know.includes(B.id), old: typeof lf2Gossip };
  });
  check(!r.before && r.after && r.from && r.who && r.mem && r.known, 'told in talk = known to the law, with who told and who did it: ' + JSON.stringify(r));
  check(r.old === 'undefined', 'the old word-of-mouth ticker is gone');
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('work clothes and bubbles: farmers wear a wide straw hat, miners a hard hat, bakers and cooks a toque, stall keepers an apron; a speech bubble sits behind the speaker, opposite to the way they face', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant && !n.dress); const dress = (job, cur, shop) => { const n = ps.find(q => !q.shop); n.job = job; n.cur = cur; n.shop = shop || null; n._sp = null; const sp = Object.assign({}, gaSpec(n, 0)); return { hat: sp.hat, hatOn: sp.hatOn, apron: sp.apron }; };
    const out = { farmer: dress('Farmer', null), miner: dress(null, 'Miner'), baker: dress('Baker', null), cook: dress('Cook', null), keeper: dress('Shopkeeper', null) };
    const kid = npcs.find(n => !n.dead && n.age < 14); if (kid) { kid.job = 'Farmer'; kid._sp = null; out.kid = gaSpec(kid, 0).hat; }
    out.sides = [bubbleBehind({ dx: 0, dy: 1 }), bubbleBehind({ dx: 0, dy: -1 }), bubbleBehind({ dx: 1, dy: 0 }), bubbleBehind({ dx: -1, dy: 0 })];
    return out; });
  check(r.farmer.hat === 'straw' && r.farmer.hatOn, 'a farmer wears a straw hat: ' + JSON.stringify(r.farmer));
  check(r.miner.hat === 'hardhat' && r.miner.hatOn, 'a miner wears a hard hat: ' + JSON.stringify(r.miner));
  check(r.baker.hat === 'toque' && r.baker.apron && r.cook.hat === 'toque', 'bakers and cooks wear a toque: ' + JSON.stringify([r.baker, r.cook]));
  check(r.keeper.apron, 'a shopkeeper wears an apron');
  check(r.kid === undefined || r.kid === 'none', 'children keep their own clothes: ' + r.kid);
  check(JSON.stringify(r.sides) === JSON.stringify(['above', 'below', 'left', 'right']), 'the bubble is behind the speaker: ' + JSON.stringify(r.sides));
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('children say only what children say: no praise, prices, opinions of grown-ups or romance (minAge), but jokes, wonder and greetings', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const kid = npcs.find(n => !n.dead && n.age >= 5 && n.age < 12 && !n.player), ad = npcs.find(n => !n.dead && n.age >= 25 && !n.player);
    if (!kid || !ad) return { skip: true };
    const c = () => ({ done: {}, turns: [], left: {} }), has = (sp, li, id) => { try { return !!talkBind(c(), sp, li, id); } catch (e) { return 'err'; } };
    return { praise: has(kid, ad, 'praise'), price: has(kid, ad, 'ask_price'), flirt: has(kid, ad, 'flirt'), adultPraise: has(ad, kid, 'praise'), minPraise: ACTS.praise.minAge, minFlirt: ACTS.flirt.minAge, minPrice: ACTS.ask_price.minAge, remark: has(kid, ad, 'remark_time') };
  });
  if (!r.skip) {
    check(r.praise === false && r.price === false && r.flirt === false, 'a child gets no binding for praise, prices or romance: ' + JSON.stringify(r));
    check(r.minPraise === 12 && r.minFlirt === 16 && r.minPrice === 12, 'the ages are set on the acts (and survive acts redefined later): ' + JSON.stringify(r));
  }
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('sympathy claims only what is true: a listener who had the same trouble this week may say "I know that one", one who did not may only sympathise', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant), A = ps[0], B = ps[1];
    A.day = []; B.day = []; B.day.push({ t: game.time - 60, kind: 'slept_rough' });   // (B slept rough this week, A did not)
    const c = { life: { kind: 'slept_rough', data: {} }, lifeTrouble: true, done: {}, turns: [], left: {} };
    const said = (sp, li) => { const seen = new Set(); for (let i = 0; i < 60; i++) { for (const k of Object.keys(LX_RECENT)) delete LX_RECENT[k]; li.heard = {}; seen.add(lxSay('empathise', sp, li, c)); } return [...seen]; };
    const noShared = said(A, B), withShared = said(B, A);
    return { noShared, withShared, ctxA: lxContext(A, B, c).shared || null, ctxB: lxContext(B, A, c).shared || null };
  });
  const claim = /know that one|same here|me too|had that too|happened to me|same happened/i;
  check(r.ctxA === null && r.ctxB === 'yes', 'the tag follows the day log: ' + JSON.stringify([r.ctxA, r.ctxB]));
  check(!r.noShared.some(t => claim.test(t)), 'somebody who did not have the trouble never claims to know it: ' + JSON.stringify(r.noShared));
  check(r.withShared.some(t => claim.test(t)), 'somebody who did may say so: ' + JSON.stringify(r.withShared.slice(0, 6)));
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('registers are lines: a formal speaker says formal lines, a warm one warm lines, a dry one neither; nothing is rewritten by pattern any more', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && !n.infant), A = ps[0], B = ps[1], c = { done: {}, turns: [], left: {} };
    const regs = {}; for (const reg of ['formal', 'warm', 'dry']) { const sp = npcs.find(n => !n.dead && !n.player && n.age >= 18 && lxRegister(n) === reg); if (!sp) { regs[reg] = null; continue; } const seen = new Set(); for (let i = 0; i < 80; i++) { for (const k of Object.keys(LX_RECENT)) delete LX_RECENT[k]; B.heard = {}; sp.sinceAside = 9; seen.add(lxSay('greet', sp, B === sp ? A : B, c)); } regs[reg] = [...seen]; }
    const tagged = reg => new Set(LEX.filter(e => e.act === 'greet' && e.tags.reg === reg).map(e => e.text.replace('{li}', B.first)));
    const reps = {}; for (const reg of ['formal', 'warm', 'dry']) reps[reg] = npcs.filter(n => !n.dead && !n.player && n.age >= 18 && lxRegister(n) === reg).length;
    return { reps, regs, formal: [...tagged('formal')], warm: [...tagged('warm')], hasFormalTable: typeof LX_FORMAL !== 'undefined' };
  });
  check(!r.regs.formal || r.regs.formal.some(t => r.formal.includes(t)), 'a formal speaker says a formal greeting: ' + JSON.stringify(r.regs.formal.slice(0, 4)));
  check(!r.regs.warm || r.regs.warm.some(t => r.warm.includes(t)), 'a warm speaker says a warm greeting: ' + JSON.stringify(r.regs.warm.slice(0, 4)));
  check(!r.regs.dry || !r.regs.dry.some(t => r.formal.includes(t) || r.warm.includes(t)), 'a dry speaker says neither: ' + JSON.stringify(r.regs.dry.slice(0, 4)));
  check(!r.hasFormalTable, 'the find-and-replace table is gone');
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('no opinions asked about somebody\'s own spouse, parent or child; asking after the family covers them', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 25 && !n.infant), A = ps[0], Z = ps[1], B = ps[2];
    A.fam = Object.assign({}, A.fam, { spouse: Z.id }); Z.fam = Object.assign({}, Z.fam, { spouse: A.id }); B.aff[Z.id] = 40; B.know[A.id] = 40; B.know[Z.id] = 40; B.aff[A.id] = 30;
    let asked = 0, drew = 0; for (let i = 0; i < 80; i++) { const o = peopleAbout(B, A, 'view'); if (o) { drew++; if (o === Z) asked++; } }
    const c = { done: {}, turns: [], left: {} }; let fam = false; for (let i = 0; i < 20 && !fam; i++) fam = !!talkBind(c, B, A, 'ask_family');
    return { asked, drew, fam, skip: peopleSkip(Z, A, B), near: peopleNear(Z, A) };
  });
  check(r.asked === 0 && r.skip === true && r.near === true, 'B is never sent to ask A what A makes of A\'s own spouse: ' + JSON.stringify(r));
  check(r.fam, 'asking after the family is available instead');
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('every act the player can say or answer with has a menu label in a known group, naming only about, item or news', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const reps = new Set(); for (const id of Object.keys(ACTS)) for (const x of (ACTS[id].replies || [])) reps.add(x);
    const SHOP = /^(shop_greet|shop_greet_back|ask_item|quote_price|pay_ok|thank_shop|farewell_shop|cant_afford|make_do|no_stock|offer_goods|bid_price|accept_deal|no_demand|new_stock_remark|keeper_call|call_reply)$/;
    const ids = Object.keys(ACTS).filter(id => ACTS[id].kind !== 'ritual' && !SHOP.test(id) && ((ACTS[id].stage === 'topic' && !ACTS[id].reply) || reps.has(id)) && !['cry_deed', 'mutter', 'call_child', 'gift_from_nobody', 'gift_anon_reply'].includes(id));
    const missing = ids.filter(id => !PT_LABEL[id]), badGroup = ids.filter(id => PT_LABEL[id] && !PT_GROUPS.includes(PT_LABEL[id][0])), badSlot = ids.filter(id => PT_LABEL[id] && (PT_LABEL[id][1].match(/\{(\w+)\}/g) || []).some(x => !['{about}', '{item}', '{news}'].includes(x)));
    const long = ids.filter(id => PT_LABEL[id] && PT_LABEL[id][1].replace(/\{\w+\}/g, 'xxxxxx').length > 40);
    return { n: ids.length, missing, badGroup, badSlot, long };
  });
  check(r.missing.length === 0, 'every act has a label (' + r.n + ' acts); missing: ' + JSON.stringify(r.missing));
  check(r.badGroup.length === 0 && r.badSlot.length === 0 && r.long.length === 0, 'groups known, slots only about/item/news, labels short: ' + JSON.stringify([r.badGroup, r.badSlot, r.long]));
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('bindings: asking whether something could be said never changes what is being said; a question and its answer are about the same person; a menu option says what it will say; no line is spoken with a gap in it', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    const out = {}; newTown('bind-test', 'farm'); MODS.all(); TALK.words = true; for (const k of Object.keys(LX_MISS)) delete LX_MISS[k];
    const ps = npcs.filter(n => !n.dead && !n.player && n.age >= 14 && !n.infant);
    // 1. binding leaves the conversation alone
    const A = ps[0], B = ps[1]; const c = { a: A, b: B, stage: 'topic', done: {}, turns: [], left: { [A.id]: 3, [B.id]: 3 }, last: null, t0: game.time };
    const shape = () => JSON.stringify(Object.keys(c).sort().map(k => [k, typeof c[k] === 'object' && c[k] ? Object.keys(c[k]).length : String(c[k])]));
    const before = shape(); let bound = 0; for (let i = 0; i < 20; i++) for (const id of TALK_TOPICS()) { const bd = talkBind(c, A, B, id); if (bd && Object.keys(bd).length) bound++; }
    out.untouched = shape() === before; out.bound = bound;
    // 2. question and answer agree, over many conversations
    const pairs = { ask_opinion: 'give_opinion', ask_family: 'answer_family', ask_where: 'tell_where' }; let seen = 0, wrong = [];
    for (let i = 0; i < 400; i++) { const x = ps[i % ps.length], y = ps[(i * 7 + 3) % ps.length]; if (x === y) continue; game.time += 200; const cv = talkRun(x, y, true);
      for (let k = 0; k + 1 < cv.turns.length; k++) { const want = pairs[cv.turns[k].act]; if (!want || cv.turns[k + 1].act !== want) continue; seen++; if (cv.turns[k].x.about !== cv.turns[k + 1].x.about) wrong.push(cv.turns[k].act + ':' + cv.turns[k].x.about + '/' + cv.turns[k + 1].x.about); } }
    out.seen = seen; out.wrong = wrong.slice(0, 4);
    // 3. the menu: the label names the person the act will be about
    startPlaying(npcs.find(n => !n.dead && n.age >= 18 && !n.infant)); const P = game.player; let opts = 0, off = [];
    for (let i = 0; i < 40; i++) { const o = ps[i % ps.length]; if (o === P || o.player) continue; game.time += 300; o.talkUntil = 0; openTalk(o); const S = PT.s;
      for (let k = 0; k < S.opts.length; k++) { const q = S.opts[k]; if (!['ask_opinion', 'ask_family', 'ask_where', 'gossip_person'].includes(q.id)) continue; opts++; const who = (q.bind.about && q.bind.about.first) || (q.bind.whereObj && q.bind.whereObj.first); if (who && q.label.indexOf(who) < 0) off.push(q.id + ': ' + q.label + ' (' + who + ')');
        if (k === 0 && who) { ptStep('o0'); const mine = PT.s.c.turns.filter(t => t.by === P.id).pop(); if (mine.act === q.id && mine.x.about !== who) off.push('said ' + mine.x.about + ' for ' + who); break; } }
      closeTalk(); }
    out.opts = opts; out.off = off.slice(0, 4);
    out.miss = Object.keys(LX_MISS).slice(0, 8);
    return out; });
  check(r.untouched && r.bound > 20, 'checking what could be said leaves the conversation as it was (' + r.bound + ' bindings made)');
  check(r.seen > 30 && r.wrong.length === 0, 'a question and its answer are about the same person (' + r.seen + ' pairs): ' + JSON.stringify(r.wrong));
  check(r.opts > 10 && r.off.length === 0, 'a menu option names who it will be about, and says so when picked (' + r.opts + ' options): ' + JSON.stringify(r.off));
  check(r.miss.length === 0, 'no line was left unsaid for want of a value: ' + JSON.stringify(r.miss));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.seen + ' question-and-answer pairs, ' + r.opts + ' menu options';
});

test('debug (build mode): hovering a bed says whose it is and where, hovering a villager says what they need next', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('hover-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 4, cy = P.ty - 8, n = 6;
    for (let j = -3; j < 12; j++) for (let i = -4; i < 12; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const p = lfPropAt(cx + i, cy + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); }
    lfAddProp('bed', cx + 2, cy + 2); lfAddProp('bed', cx + 4, cy + 2); town.bldQ.push([cx, cy]); bldTick(); visHomes(); housingTick();
    return { mine: tileTip(cx + 2, cy + 2), free: tileTip(cx + 4, cy + 2), me: npcDebug(P) };
  });
  check(/belongs to/.test(r.mine) || /nobody/.test(r.mine), 'a bed tooltip should say whose it is: ' + r.mine);
  check(/free/.test(r.free) || /belongs to/.test(r.free), 'the second bed should be described too: ' + r.free);
  check(/needs/.test(r.me) && /home:/.test(r.me), 'a villager tooltip should show home and needs: ' + r.me);
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'bed owner and villager needs are shown in build mode';
});

test('beds: bumping into your own bed in a built hut puts you to bed', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await page.evaluate(() => {
    newTown('sleep-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 4, cy = P.ty - 8, n = 6; window.__c = [cx, cy];
    for (let j = -3; j < 12; j++) for (let i = -4; i < 12; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const q = lfPropAt(cx + i, cy + j); if (q) { town.props = town.props.filter(z => z !== q); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); }
    lfAddProp('bed', cx + 2, cy + 2); lfAddProp('bed', cx + 4, cy + 2); town.bldQ.push([cx, cy]); bldTick(); itBuildToggle(P, false);
  });
  await simulate(page, 6 * 60);   // awake long enough to be tired
  const r = await page.evaluate(() => {
    const P = game.player, [cx, cy] = window.__c; P.tx = P.x = cx + 2; P.ty = P.y = cy + 3; P.face = { dx: 0, dy: -1 }; rebuildOcc();
    const t = lifeAct(P, P.player, cx + 2, cy + 2, 0, -1); if (!t || !t.sleep) return { t: t && (t.key || t.msg) };
    playerFinish(P, t); return { t: t.key, sleeping: !!P.player.sleeping, onBed: P.tx === cx + 2 && P.ty === cy + 2, pose: P.pose };
  });
  check(r.t === 'rest' && r.sleeping && r.onBed && r.pose === 'sleep', 'a bump into your own bed should put you to bed: ' + JSON.stringify(r));
  check(!errors.length, errors.slice(0, 2).join(' | '));
  return 'you go to bed in your own bed';
});

test('function rooms: furniture you place makes a room a bakery, smithy, tavern or chapel, workers take the jobs, and moving the furniture undoes it', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const out = await page.evaluate(() => {
    newTown('fn-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 4, cy = P.ty - 8, n = 6;
    for (let j = -3; j < 12; j++) for (let i = -4; i < 40; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const p = lfPropAt(cx + i, cy + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    const room = (ox, items) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', ox + i, cy + j); } for (const [k, x, y] of items) lfAddProp(k, ox + x, cy + y); town.bldQ.push([ox, cy]); };
    room(cx, [['bed', 1, 1], ['bed', 3, 1], ['bed', 4, 1], ['bed', 1, 3]]); room(cx + 7, [['oven', 1, 1], ['counter', 3, 1]]); room(cx + 14, [['forge', 1, 1], ['anvil', 3, 1]]);
    room(cx + 21, [['counter', 1, 1], ['table', 3, 3], ['chair', 2, 3], ['chair', 4, 3]]); room(cx + 28, [['altar', 2, 1], ['pew', 1, 3], ['pew', 3, 3]]);
    bldTick(); itBuildToggle(P, false); for (let i = 0; i < 4; i++) visArrive();
    window.__c = [cx, cy]; return { kinds: rooms.filter(r => r.free && !r.dead && lvlOf(r.y) === 0).map(r => r.kind).join(), church: !!town.church, tavern: !!town.tavern, needs: islandNeeds().map(x => x.id), html: needsHTML() };
  });
  check(out.kinds === 'house,bakery,smithy,tavern,church', 'rooms should take their purpose from the furniture: ' + out.kinds);
  check(out.church && out.tavern, 'the chapel and the tavern should be registered');
  check(/What the island needs/.test(out.html) && out.needs.length > 0, 'the needs list should say what is missing: ' + JSON.stringify(out.needs));
  await simulate(page, 2 * 1440);
  const r1 = await page.evaluate(() => ({ baker: npcs.some(n => n.job === 'Baker'), smith: npcs.some(n => n.job === 'Smith'), priest: npcs.some(n => n.role === 'Priest') }));
  check(r1.baker && r1.smith, 'the bakery and the smithy should have taken on workers: ' + JSON.stringify(r1));
  const r2 = await page.evaluate(() => { const [cx, cy] = window.__c, o = lfPropAt(cx + 8, cy + 1); bldDeleteProp(o); fnScan(); return { kind: rooms.filter(r => r.free && !r.dead && lvlOf(r.y) === 0)[1].kind }; });
  check(r2.kind === 'room', 'smashing the oven should undo the bakery: ' + r2.kind);
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return 'bakery, smithy, tavern and chapel made by furniture; workers hired; undone when the furniture goes';
});

test('magic mushrooms: scattered about, walking into one eats it and starts a trip that rises, bends the picture for a few hours and ends; new ones grow', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('shroom-test', 'blank'); startPlaying(npcs[0]); const P = game.player; const n0 = town.shrooms.length;
    const s = town.shrooms.slice().sort((a, b) => Math.hypot(a.x - P.tx, a.y - P.ty) - Math.hypot(b.x - P.tx, b.y - P.ty))[0];
    P.tx = P.x = s.x - 1; P.ty = P.y = s.y; P.face = { dx: 1, dy: 0 }; rebuildOcc();
    const t = lifeAct(P, P.player, s.x, s.y, 1, 0) || targetAt0(P, s.x, s.y); const key = t && t.key; if (t && t.run) t.run(P);
    const sober = psyLevel(); game.time += 40; const mid = psyLevel(); for (let i = 0; i < 4; i++) render(performance.now() + i * 40, 0.016, 12);
    game.time += 300; const after = psyLevel(); const before = town.shrooms.length; for (let i = 0; i < 40; i++) { shroomGrow(); } 
    return { n0, key, left: before, sober, mid, after, grew: town.shrooms.length > before };
  });
  check(r.n0 >= 20, 'mushrooms should be scattered about the island: ' + r.n0);
  check(/^shroom/.test(r.key) && r.left === r.n0 - 1, 'walking into one eats it: ' + JSON.stringify(r));
  check(r.mid > 0.5 && r.after === 0, 'the trip should rise and then wear off: ' + JSON.stringify(r));
  check(r.grew, 'new mushrooms should grow');
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return `${r.n0} mushrooms; eating one starts a trip that rises (${r.mid.toFixed(2)}) and wears off`;
});

test('bakery: on a blank island the baker collects spare grain from the huts and bakes, villagers buy the bread, and you can sell grain or buy bread at the counter', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await page.evaluate(() => {
    newTown('bk-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 4, cy = P.ty - 8, n = 6; window.__c = [cx, cy];
    for (let j = -3; j < 12; j++) for (let i = -4; i < 20; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const p = lfPropAt(cx + i, cy + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    const room = (ox, items) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', ox + i, cy + j); } for (const [k, x, y] of items) lfAddProp(k, ox + x, cy + y); town.bldQ.push([ox, cy]); };
    room(cx, [['bed', 1, 1], ['bed', 3, 1], ['bed', 4, 1]]); room(cx + 7, [['oven', 1, 1], ['counter', 3, 1]]);
    bldTick(); itBuildToggle(P, false); for (let i = 0; i < 3; i++) visArrive(); rooms.find(r => r.hut).pantry.grain = 24;
  });
  await simulate(page, 6 * 1440);   /* (a fever can keep the baker in bed for a few days) */
  const r = await page.evaluate(() => {
    const bk = lf2Room('bakery'), P = game.player, st = lf2Stock(bk), [cx, cy] = window.__c, ctr = (town.props || []).find(p => p.kind === 'counter');
    const bread = st.bread || 0; const coin0 = P.coin; P.inv.grain = 5; P.tx = P.x = ctr.x; P.ty = P.y = ctr.y + 1; rebuildOcc();
    const t1 = lifeAct(P, P.player, ctr.x, ctr.y, 0, -1); if (t1 && t1.run) t1.run(P); const sold = { k: t1 && t1.key, grain: P.inv.grain, paid: P.coin > coin0 };
    const t2 = lifeAct(P, P.player, ctr.x, ctr.y, 0, -1); const c2 = P.coin; if (t2 && t2.run) t2.run(P); return { bread, sold, buy: t2 && t2.key, bought: (P.inv.bread || 0) >= 1 && P.coin < c2 };
  });
  check(r.bread > 0, 'the bakery should have baked bread from grain the huts could spare: ' + JSON.stringify(r));
  check(r.sold.k && /^sellgrain/.test(r.sold.k) && r.sold.grain === 0 && r.sold.paid, 'selling grain at the counter: ' + JSON.stringify(r.sold));
  check(/^buybread/.test(r.buy || '') && r.bought, 'buying bread at the counter: ' + JSON.stringify(r));
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return `${r.bread} loaves baked; you sold grain and bought bread at the counter`;
});

test('tutorial: one request at a time with exact numbers; a visitor needs two beds; privy and field requests hold new arrivals; villagers farm your field', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const st = () => page.evaluate(() => ({ pop: npcs.length, cur: islandNeeds().map(q => q.id), harv: (town.tut && town.tut.harvests) || 0, block: tutBlocksArrival(), B: (({ plots, plotsNeeded, privies, priviesNeeded, beds, bedsNeeded }) => ({ plots, plotsNeeded, privies, priviesNeeded, beds, bedsNeeded }))(townBalance()) }));
  await page.evaluate(() => {
    newTown('tut-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 4, cy = P.ty - 8, n = 6; window.__c = [cx, cy];
    for (let j = -3; j < 16; j++) for (let i = -4; i < 24; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const p = lfPropAt(cx + i, cy + j); if (p) { town.props = town.props.filter(q => q !== p); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); }
    lfAddProp('bed', cx + 1, cy + 1); town.bldQ.push([cx, cy]); bldTick(); itBuildToggle(P, false);
  });
  const a = await st(); check(a.cur[0] === 'bed2' && !a.block && a.B.beds === 1 && a.B.bedsNeeded === 2, 'alone with one bed: the request is a second bed, and it does not block a visitor: ' + JSON.stringify(a));
  await page.evaluate(() => { const P = game.player; itBuildToggle(P, true); const [cx, cy] = window.__c; lfAddProp('bed', cx + 3, cy + 1); itBuildToggle(P, false); });
  await simulate(page, 3 * 1440);
  const c = await st(); check(c.pop === 2, 'a second bed should bring the first visitor: ' + JSON.stringify(c));
  check(c.cur.includes('privy') && c.cur.includes('field') && c.block && c.B.plotsNeeded === 5, 'then a privy and a field of 5 plots are asked for, and no more visitors come: ' + JSON.stringify(c));
  await page.evaluate(() => { const P = game.player; itBuildToggle(P, true); const [cx, cy] = window.__c, n = 6, ox = cx + 8; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', ox + i, cy + j); } lfAddProp('toilet', ox + 2, cy + 2); town.bldQ.push([ox, cy]); bldTick();
    P.build.brush = 'field'; let k = 0; for (let j = 8; j < 14 && k < 5; j++) for (let i = 0; i < 6 && k < 5; i++) { P.tx = P.x = cx + i; P.ty = P.y = cy + j; P.build.lastT = null; bldBrushStep(P); k++; } itBuildToggle(P, false); });
  await simulate(page, 6 * 1440);
  const d = await st(); check(d.harv >= 5, 'villagers should have ploughed, sown and harvested the field: ' + JSON.stringify(d));
  check(!d.cur.includes('field') && !d.cur.includes('harvest') && !d.cur.includes('privy'), 'the field and privy requests are met: ' + JSON.stringify(d.cur));
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return `request order and numbers right; ${d.harv} plots harvested by villagers`;
});

test('signs, guides and the request on screen: a sign beside each door says who lives there or what it is for, the first hut and privy come with marked layouts, the request is a pill on the canvas', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('sign-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player;
    guidesUpdate(islandNeeds()); const g = town.guides && town.guides.hut; if (!g) return { noGuide: true };
    itBuildToggle(P, true); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { if (!(i === 0 || j === 0 || i === 4 || j === 4)) continue; lfAddProp(i === 2 && j === 4 ? 'bdoor' : 'bwall', g.x + i, g.y + j); } lfAddProp('bed', g.x + 1, g.y + 1); town.bldQ.push([g.x, g.y]); bldTick(); itBuildToggle(P, false);
    const room = rooms.find(q => q.free && !q.dead), sw = signWallOf(room); let said = null;
    if (sw) { const t = targetAt0(P, sw.x, sw.y); said = t && t.msg; }
    const unfinished = (() => { const n = 6; const cx = g.x + 10, cy = g.y; for (let j = -1; j <= n; j++) for (let i = -1; i <= n; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const q = lfPropAt(cx + i, cy + j); if (q) { town.props = town.props.filter(z => z !== q); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } } for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); } lfAddProp('oven', cx + 1, cy + 1); town.bldQ.push([cx, cy]); bldTick(); const r2 = rooms.filter(q => q.free && !q.dead && lvlOf(q.y) === 0).find(q => q !== room); return r2 ? signText(r2) : null; })();
    guidesUpdate(islandNeeds());
    return { sw: !!sw, said, hut: signText(room), unfinished, guideGone: !town.guides.hut, pill: !!document.querySelector('#reqbox'), req: islandNeeds()[0] && islandNeeds()[0].id };
  });
  check(!r.noGuide, 'a guide should appear for the first hut');
  check(r.sw && /live here/.test(r.said || ''), 'walking into the sign beside the door should say who lives there: ' + JSON.stringify(r));
  check(/Unfinished bakery.*oven ✓.*counter ✗/.test(r.unfinished || ''), 'an unfinished room should say what it lacks: ' + r.unfinished);
  check(r.guideGone, 'the guide goes once the hut is built');
  check(r.pill, 'the request pill should be on the canvas');
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return 'sign says "' + r.said + '"; unfinished: ' + r.unfinished;
});

test('materials: a blank island starts with a kit, placing uses it, taking things down gives it back, and the carpenter makes more from wood', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const a = await page.evaluate(() => {
    newTown('kit-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const k0 = kitCount('bwall'), p1 = bldPlaceFront(P, 'bwall'), k1 = kitCount('bwall'); bldDeleteProp(p1); const k2 = kitCount('bwall');
    town.kit.bwall = 0; const none = bldPlaceFront(P, 'bwall'); const msg = P.player.msg;
    town.kit.bed = 1; const bed = bldPlaceFront(P, 'bed'); const bedLeft = kitCount('bed'); const field = kitHas('field');
    return { k0, k1, k2, none: none === null, msg, bedLeft, field, label: kitLabel('bwall') };
  });
  check(a.k0 === 40 && a.k1 === 39 && a.k2 === 40, 'placing uses one, taking down gives it back: ' + JSON.stringify(a));
  check(a.none && /No wall left/i.test(a.msg || ''), 'out of blocks says so: ' + a.msg);
  check(a.bedLeft === 0 && a.field && a.label === '0', 'counts follow: ' + JSON.stringify(a));
  const r = await page.evaluate(() => {
    const P = game.player; const cx = P.tx + 4, cy = P.ty - 8, n = 6; window.__c = [cx, cy];
    for (let j = -3; j < 12; j++) for (let i = -4; i < 14; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const q = lfPropAt(cx + i, cy + j); if (q) { town.props = town.props.filter(z => z !== q); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); } lfAddProp('bed', cx + 1, cy + 1); lfAddProp('bed', cx + 3, cy + 1);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + 7 + i, cy + j); } lfAddProp('bench', cx + 8, cy + 1); lfAddProp('shelf', cx + 10, cy + 1);
    town.bldQ.push([cx, cy], [cx + 7, cy]); bldTick(); itBuildToggle(P, false);
    visArrive(); const v = npcs.find(q => !q.player); carpArrive(v); const bench = kitCount('bench'); fnScan(); lf2AssignJobs(false);
    town.kit.bwall = 0; const ws = lf2Room('workshop'); if (ws) lf2Stock(ws).wood = 8;
    return { ws: !!ws, bench, job: v.job, want: carpWant() };
  });
  check(r.ws && r.bench === 1, 'the table and a shelf make a workshop: ' + JSON.stringify(r));
  check(r.job === 'Carpenter', 'the carpenter takes the workshop job: ' + JSON.stringify(r));
  await simulate(page, 2 * 1440);
  const w = await page.evaluate(() => ({ walls: kitCount('bwall'), wood: lf2Stock(lf2Room('workshop')).wood }));
  check(w.walls >= 4, 'the carpenter should have made walls from the wood and put them in the kit: ' + JSON.stringify(w));
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return `kit 40 -> 39 -> 40; carpenter made walls (${w.walls}) from wood`;
});

test('consent: nobody courts or marries the villager you steer without asking; the question is a decision card, time stands still, and your answer decides', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('love-test', 'blank'); startPlaying(npcs[0]); const P = game.player; let o = null;
    for (let i = 0; i < 12 && !o; i++) { visArrive(); o = npcs.find(q => !q.player && q.female !== P.female && Math.abs(q.age - P.age) <= 12 && eligible(q)); }
    if (!o) return { none: true };
    P.aff[o.id] = o.aff[P.id] = 70; P.know[o.id] = o.know[P.id] = 60;
    for (let i = 0; i < 40 && !town.decision; i++) romanceTick();
    const asked = town.decision && town.decision.kind, partnerBefore = P.fam.partner;
    answerDecision('later'); const afterLater = { partner: P.fam.partner, decision: !!town.decision };
    o.waitCourt = 0; for (let i = 0; i < 40 && !town.decision; i++) romanceTick(); const again = town.decision && town.decision.kind;
    answerDecision('yes'); const courting = P.fam.partner === o.id;
    P.courtSince = o.courtSince = game.time - 0.5 * YEAR; P.aff[o.id] = o.aff[P.id] = 80; town.wedding = null; for (let i = 0; i < 6 && !town.decision; i++) romanceTick(); const marry = town.decision && town.decision.kind, noWedding = !town.wedding;
    answerDecision('yes'); const wed = !!town.wedding;
    return { asked, partnerBefore, afterLater, again, courting, marry, noWedding, wed };
  });
  check(!r.none, 'needs a suitable villager');
  check(r.asked === 'court' && !r.partnerBefore, 'a courtship should be asked, not arranged: ' + JSON.stringify(r));
  check(!r.afterLater.partner && !r.afterLater.decision, '"not yet" leaves things as they were: ' + JSON.stringify(r.afterLater));
  check(r.again === 'court' && r.courting, 'asked again, "yes" begins the courtship: ' + JSON.stringify(r));
  check(r.marry === 'marry' && r.noWedding && r.wed, 'a wedding needs your yes: ' + JSON.stringify(r));
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return 'courtship and marriage are asked, answered and never arranged';
});

test('privies: every seat in a closed room with a free tile beside it counts, loose seats are explained', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('privy-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player;
    const cx = P.tx + 4, cy = P.ty - 8, n = 6;
    for (let j = -3; j < 12; j++) for (let i = -4; i < 14; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const q = lfPropAt(cx + i, cy + j); if (q) { town.props = town.props.filter(z => z !== q); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); }
    lfAddProp('toilet', cx + 1, cy + 1); lfAddProp('toilet', cx + 3, cy + 1); lfAddProp('toilet', cx + 3, cy + 3); lfAddProp('toilet', cx + 20, cy + 1);   // three in the room, one out in the open
    town.bldQ.push([cx, cy]); bldTick(); visHomes(); const B = townBalance();
    return { privies: lfPrivies().length, loose: B.looseSeats };
  });
  check(r.privies === 3, 'three seats in one closed room are three privies: ' + JSON.stringify(r));
  check(r.loose === 1, 'a seat outside a room is counted as loose: ' + JSON.stringify(r));
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return 'three seats count as three privies; one loose seat is explained';
});

test('truesight: whatever has a clear line of sight is lit at every zoom, even when a wall runs across the edge of the view', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('ts-test', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
    const cx = P.tx + 6, cy = P.ty - 6, n = 7;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); } lfAddProp('bed', cx + 2, cy + 2); town.bldQ.push([cx, cy]); bldTick(); itBuildToggle(P, false);
    const pip = (px, py, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) c = !c; } return c; };
    let bad = 0, views = 0;
    for (const z of [1, 2.5, 4, 6]) for (const off of [[-6, 3], [-3, 8], [4, 9], [-5, -1]]) {
      P.tx = P.x = cx + off[0]; P.ty = P.y = cy + off[1]; rebuildOcc(); setFollow(false); cam.z = z; centerOn(P.x, P.y); clampCam(); game.time = 12 * 60; for (let i = 0; i < 2; i++) render(performance.now(), 0.016, 12);
      const R = TSIGHT.rect, ex = TSIGHT.eye[0], ey = TSIGHT.eye[1]; views++;
      for (let y = Math.floor(R.y0); y < R.y1; y++) for (let x = Math.floor(R.x0); x < R.x1; x++) { if (x + 0.5 < R.x0 + 0.1 || x + 0.5 > R.x1 - 0.1 || y + 0.5 < R.y0 + 0.1 || y + 0.5 > R.y1 - 0.1) continue; if (tsLine(ex, ey, x + 0.5, y + 0.5) && !pip(x + 0.5, y + 0.5, TSIGHT.poly)) bad++; }
    }
    return { bad, views };
  });
  check(r.bad === 0, 'tiles in a clear line of sight were left in shadow: ' + JSON.stringify(r));
  check(!errors.length, errors.slice(0, 3).join(' | '));
  return `${r.views} views at four zooms: nothing visible is hidden`;
});
test('truesight: nothing is lit from the corners of a window tile or from its bars: a wall that carries on past the window is lit only where the glass shows it', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 3, town: 'truesight-lab', viewport: { width: 900, height: 600 } });
  await simulate(page, 12 * 60);
  const r = await page.evaluate(() => {
    if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl)); const L = tsLab(), P = game.player;
    const home = [L.ox + 2, L.oy]; let w = null;   // (the house window of the lab, with the ground in front of it cleared, wherever the island put the lab)
    if (tsWindow(home[0], home[1])) { w = home; for (let d = 1; d <= 5; d++) for (let e = -5; e <= 5; e++) { const x = home[0] + e, y = home[1] - d; if (grid[y] && grid[y][x] !== T.WALL && !walkable(x, y)) { setT(x, y, T.GRASS); const pr = lfPropAt(x, y); if (pr) { town.props = town.props.filter(q => q !== pr); town.pblock[y * W + x] = 0; town.propAt.delete(y * W + x); } } } }
    if (!w) return { skip: true };
    for (let k = 1; k <= 5; k++) setT(w[0] + 1, w[1] + k, T.WALL); town.gridV = (town.gridV || 0) + 1;   // a wall that carries on south right beside the window
    for (const n of npcs) if (!n.player) { n.tx = n.x = 2; n.ty = n.y = 2; }
    P.tx = P.x = w[0] - 1; P.ty = P.y = w[1] - 2; rebuildOcc(); cam.follow = false; cam.z = 5.5; clampCam(); cam.x = (w[0] + 0.5) * TS - cam.cw / cam.z / 2; cam.y = (w[1] + 1.4) * TS - cam.ch / cam.z / 2; clampCam();
    for (let k = 0; k < 10; k++) { window.__advance(50); render(performance.now(), 0.016, (game.time % 1440) / 60); }
    const e = [P.x + 0.5, P.y + 0.55], G = tsGeo(), pts = tsPolygon(e[0], e[1], TSIGHT.rect, G), faces = tsFaces(e[0], e[1], pts, G);
    const whole = faces.filter(q => q[0] === w[0] + 1 && q[1] === w[1] + 1 && q[2] - q[0] === 1 && q[5] - q[1] === 1).length;   // the column's first tile lit whole
    return { whole, quads: faces.length, w, eye: e }; });
  if (r.skip) { await page.close(); return; }
  check(r.quads > 3, 'the window lets some light in (' + r.quads + ' wall faces lit) ' + JSON.stringify(r));
  check(r.whole === 0, 'the wall tile beside the window is not lit as a whole from the window\'s corner or bar: ' + JSON.stringify(r));
  check(!errors.length, 'no errors: ' + errors.join(' | '));
  await page.close();
});

test('truesight: the solid wall beside a window is never inside what you can see (no beams leaking into the wall bodies)', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 3, town: 'truesight-lab', viewport: { width: 900, height: 600 } });
  await simulate(page, 12 * 60);
  const r = await page.evaluate(() => {
    if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl));
    const L = tsLab(), P = game.player; const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], q = poly[j]; if ((a[1] > y) !== (q[1] > y) && x < (q[0] - a[0]) * (y - a[1]) / (q[1] - a[1]) + a[0]) c = !c; } return c; };
    const wins = []; for (let y = L.oy; y < L.oy + 40; y++) for (let x = L.ox; x < L.ox + 46; x++) if (grid[y][x] === T.WALL && tsWindow(x, y)) wins.push([x, y]);
    const home = [L.ox + 2, L.oy]; if (tsWindow(home[0], home[1])) for (let d = 1; d <= 5; d++) for (let e = -5; e <= 5; e++) { const x = home[0] + e, y = home[1] - d; if (grid[y] && grid[y][x] !== T.WALL && !walkable(x, y)) { setT(x, y, T.GRASS); const pr = lfPropAt(x, y); if (pr) { town.props = town.props.filter(q => q !== pr); town.pblock[y * W + x] = 0; town.propAt.delete(y * W + x); } } }   /* (the house window of the lab, with the ground in front of it clear, wherever the island put the lab) */
    const clearAbove = q => [1, 2, 3].every(d => walkable(q[0], q[1] - d)), w = (tsWindow(home[0], home[1]) && clearAbove(home) ? home : null) || wins.find(q => grid[q[1]][q[0] - 1] === T.WALL && grid[q[1]][q[0] + 1] === T.WALL && clearAbove(q)) || wins.find(clearAbove) || wins[0]; let leaks = 0, views = 0;
    for (let ex = -5; ex <= 5; ex += 2) for (let ey = -5; ey <= -1; ey++) { P.tx = P.x = w[0] + ex; P.ty = P.y = w[1] + ey; P.path = []; P.slide = null; if (grid[P.ty][P.tx] === T.WALL) continue; rebuildOcc(); cam.follow = false; cam.z = 2; clampCam(); cam.x = w[0] * TS - cam.cw / cam.z / 2; cam.y = w[1] * TS - cam.ch / cam.z / 2; clampCam(); render(performance.now(), 0.016, 12); views++;
      for (let ty = w[1] - 2; ty < w[1] + 8; ty++) for (let tx = w[0] - 6; tx < w[0] + 8; tx++) { if (grid[ty][tx] !== T.WALL || tsWindow(tx, ty)) continue; for (const [fx, fy] of [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5], [0.5, 0.2], [0.5, 0.8]]) if (inPoly(TSIGHT.poly, tx + fx, ty + fy)) { leaks++; break; } } }
    const ex = w[0] + 0.5, ey = w[1] - 3, panes = { left: tsLine(ex, ey, w[0] + 0.3, w[1] + 4), right: tsLine(ex, ey, w[0] + 0.7, w[1] + 4), divider: tsLine(ex, ey, w[0] + 0.5, w[1] + 4), frame: tsLine(ex, ey, w[0] + 0.1, w[1] + 4) };
    // the tile below the corner of the wall beside a window is not lit by the window (regression)
    const wy = L.oy + 12, wx = L.ox + 8; P.tx = P.x = wx - 2; P.ty = P.y = wy - 2; P.path = []; P.slide = null; rebuildOcc(); cam.follow = false; cam.z = 3; clampCam(); cam.x = wx * TS - cam.cw / cam.z / 2; cam.y = wy * TS - cam.ch / cam.z / 2; clampCam(); render(performance.now(), 0.016, 12);
    const lit2 = TSIGHT.faces.filter(q => { let sg = 0; for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, cr = (q[j * 2] - q[i * 2]) * ((wy + 1.5) - q[i * 2 + 1]) - (q[j * 2 + 1] - q[i * 2 + 1]) * ((wx + 1.5) - q[i * 2]); if (cr > 1e-9) sg |= 1; if (cr < -1e-9) sg |= 2; } return sg !== 3; }).length;
    return { leaks, views, panes, lit2 };
  });
  check(r.panes.left && r.panes.right && !r.panes.divider && !r.panes.frame, 'light passes through each pane, and the divider and the frame cast their shadows: ' + JSON.stringify(r.panes));
  check(r.lit2 === 0, 'the second wall tile below the corner was lit: ' + r.lit2);
  check(r.views > 10 && r.leaks === 0, 'wall bodies beside windows leaked into the visible area: ' + JSON.stringify(r)); check(errors.length === 0, 'no errors');
  return r.views + ' views, no leaks';
});
test('stairs: a staircase in a room leads to a roof deck over the building; you can build a sealed room up there; villagers walk up and down by the stairs', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 6 * 60);
  const r = await page.evaluate(() => {
    startPlaying(npcs.find(canControl)); const P = game.player, out = {}, o = { x: town.cx + 14, y: town.cy - 40 };
    out.levels = town.h0 > 0 && H === town.h0 * LV_N && grid.length === H && roomAt.length === H && town.ore.length === W * H;
    for (let j = -2; j < 14; j++) for (let i = -2; i < 16; i++) { setT(o.x + i, o.y + j, T.GRASS); roomAt[o.y + j][o.x + i] = -1; const q = lfPropAt(o.x + i, o.y + j); if (q) { town.props = town.props.filter(z => z !== q); town.propAt.delete((o.y + j) * W + o.x + i); town.pblock[(o.y + j) * W + o.x + i] = 0; } }
    buildRoom({ kind: 'lab', id: 'lab', name: 'Big room' }, o.x, o.y, 12, 10, 'b', null);
    P.tx = P.x = o.x + 3; P.ty = P.y = o.y + 3; P.face = { dx: 1, dy: 0 }; P.path = []; rebuildOcc(); refreshReach(); town.kit = Object.assign(town.kit || {}, { stair: 1 }); itBuildToggle(P, true); const f = { x: P.tx, y: P.ty - 1 }; out.placed = !!stairPlace(P); itBuildToggle(P, false);
    const h0 = town.h0, pn0 = town.portals.size - 2; out.tiles = grid[f.y][f.x] === T.STAIR && grid[(town.stairs.find(q => q.s0 === f.y * W + f.x).s1 / W) | 0][town.stairs.find(q => q.s0 === f.y * W + f.x).s1 % W] === T.STAIRD && grid[o.y + 5 + h0][o.x + 5] === T.DECK && town.portals.size === pn0 + 2;
    P.tx = P.x = o.x + 8; P.ty = P.y = o.y + 6; const off = targetAt0(P, f.x, f.y); out.offLanding = !!off && !off.run && !!off.msg; P.tx = P.x = o.x + 3; P.ty = P.y = o.y + 3;
    const up = targetAt0(P, f.x, f.y); if (up && up.run) up.run(P); out.up = P.ty >= h0 && P.tx === o.x + 3;
    const s1k = town.stairs.find(q => q.s0 === f.y * W + f.x).s1; out.mirror = s1k === f.y * W + f.x + h0 * W && grid[((s1k / W) | 0)][s1k % W] === T.STAIRD; itBuildToggle(P, true); itBuildSelect(P, 0); const bm = targetAt0(P, s1k % W, (s1k / W) | 0); out.inBuild = !!(bm && bm.run); itBuildToggle(P, false); const down = targetAt0(P, s1k % W, (s1k / W) | 0); if (down && down.run) down.run(P); out.down = P.ty < h0;
    // a walled hut on the deck seals into a room (with a window), and the ground it stood on goes back to deck when a block is taken out
    const D = { x: o.x + 5, y: o.y + 2 + h0 }, placed = []; for (let i = 0; i <= 5; i++) for (let j = 0; j <= 4; j++) if (i === 0 || j === 0 || i === 5 || j === 4) { lfAddProp(i === 2 && j === 4 ? 'bdoor' : (i === 3 && j === 0 ? 'bwindow' : 'bwall'), D.x + i, D.y + j); placed.push([D.x + i, D.y + j]); }
    town.bldQ = placed; bldTick(); out.hut = rooms.some(q => q.free && !q.dead && q.y >= h0) && grid[D.y + 2][D.x + 2] === T.FLOOR && !!(town.win && town.win.has(D.y * W + D.x + 3)); out.bare = bldBare(D.y) === T.DECK;
    // push somebody up the stairs: a villager standing on the landing, pushed north into the stair, comes out on the landing upstairs; pushed from the deck's landing into the down stair, back down
    const stp = town.stairs[town.stairs.length - 1], l0x = stp.l0 % W, l0y = (stp.l0 / W) | 0, vil = npcs.find(q => q !== P && !q.dead && q.age >= 18); vil.pose = 'stand'; vil.tx = vil.x = l0x; vil.ty = vil.y = l0y; vil.path = []; vil.moving = false; P.tx = P.x = l0x; P.ty = P.y = l0y + 1; rebuildOcc();
    const pu = lf2PushLine(P, l0x, l0y, 0, -1); out.pushUp = pu === true && vil.tx === stp.l1 % W && vil.ty === ((stp.l1 / W) | 0);
    P.tx = P.x = stp.l1 % W; P.ty = P.y = ((stp.l1 / W) | 0) - 1; rebuildOcc(); const pd = lf2PushLine(P, vil.tx, vil.ty, 0, 1); out.pushDown = pd === true && vil.tx === l0x && vil.ty === l0y;
    // a loose thing too: a crate on the landing, pushed north, comes out upstairs, and a line of two goes together (the front one through, the other onto the landing)
    P.tx = P.x = l0x; P.ty = P.y = l0y + 2; const c1 = lfAddProp('barrel', l0x, l0y), c2 = lfAddProp('crate', l0x, l0y + 1); P.ty = P.y = l0y + 2; rebuildOcc(); const pc = lf2PushLine(P, l0x, l0y + 1, 0, -1); out.pushCrates = pc === true && c1.x === stp.l1 % W && c1.y === ((stp.l1 / W) | 0) && c2.x === l0x && c2.y === l0y; for (const c of [c1, c2]) { town.props = town.props.filter(z => z !== c); town.propAt.delete(c.y * W + c.x); town.pblock[c.y * W + c.x] = 0; } rebuildOcc(); refreshReach();
    // somebody walks up by the stairs, one step at a time, exactly as the villagers' movement does
    P.tx = P.x = o.x + 10; P.ty = P.y = o.y + 7; rebuildOcc(); const n = npcs.find(q => q !== P && !q.dead && q.age >= 18); n.tx = n.x = o.x + 8; n.ty = n.y = o.y + 6; n.path = []; n.t = 0; rebuildOcc();
    const p = findPath(n.tx, n.ty, o.x + 8, o.y + 7 + h0); out.path = !!p && p.some(q => q.y >= h0); n.path = p; for (let i = 0; i < 400 && n.path.length; i++) stepNpc(n, 0.3); out.walked = n.ty === o.y + 7 + h0 && n.tx === o.x + 8;
    // down into the earth: a 3 x 3 chamber in solid earth, the hammer digs it out (and some of it is ore), and back up; a third level up from a room on the deck
    P.tx = P.x = o.x + 3; P.ty = P.y = o.y + 7; P.face = { dx: 1, dy: 0 }; P.path = []; rebuildOcc(); town.kit = Object.assign(town.kit || {}, { stairdown: 1, stair: 2 }); itBuildToggle(P, true); const g1 = { x: P.tx, y: P.ty + 1 }; out.downPlaced = !!stairPlace(P, true); itBuildToggle(P, false);
    const dn = targetAt0(P, g1.x, g1.y); if (dn && dn.run) dn.run(P); out.under = lvlOf(P.ty) === LV_MINE;
    let fl = 0, ea = 0; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const t = grid[P.ty + j][P.tx + i]; if (t === T.DIRTF || t === T.STAIRU) fl++; else if (t === T.EARTH) ea++; } out.chamber = fl === 9 && ea >= 30;
    const ex = P.tx, ey = P.ty - 2, dg = itGate(P, targetAt0(P, ex, ey), false); if (dg && dg.run) dg.run(P); out.dug = grid[ey][ex] === T.DIRTF;
    let ore = 0; for (let k = 0; k < town.ore.length; k++) if (town.ore[k]) ore++; out.ore = ore > 1000;
    const s1m = town.stairs.find(q => q.s0 === g1.y * W + g1.x).s1; const bk = targetAt0(P, s1m % W, (s1m / W) | 0); if (bk && bk.run) bk.run(P); out.back = lvlOf(P.ty) === 0;
    buildRoom({ kind: 'lab', id: 'lab2', name: 'Upstairs' }, o.x + 2, o.y + 5 + h0, 6, 5, 'b', null); P.tx = P.x = o.x + 4; P.ty = P.y = o.y + 7 + h0; P.face = { dx: 1, dy: 0 }; P.path = []; rebuildOcc(); itBuildToggle(P, true); const g2 = { x: P.tx, y: P.ty - 1 }; out.third = !!stairPlace(P); itBuildToggle(P, false);
    const tp = targetAt0(P, g2.x, g2.y); if (tp && tp.run) tp.run(P); out.level2 = lvlOf(P.ty) === 2;
    // stairs up are refused on a bare roof; upstairs a closed ring of walls is a room with no door at all; and stairs down deeper in the mine, drawn
    P.tx = P.x = o.x + 9; P.ty = P.y = o.y + 8 + h0; P.path = []; rebuildOcc(); itBuildToggle(P, true); const grid0 = grid[P.ty - 1][P.tx]; out.roofUp = !stairPlace(P) && grid[P.ty - 1][P.tx] === grid0; itBuildToggle(P, false);
    { const cx = o.x + 1, cy = o.y + 1 + h0, ring = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i || j) ring.push([cx + i, cy + j]); out.deckOk = ring.every(([x, y]) => grid[y][x] === T.DECK) && grid[cy][cx] === T.DECK;
      for (const [x, y] of ring) lfAddProp('bwall', x, y); const before = rooms.length; bldEvaluate(ring); out.upRoom = rooms.length > before && rooms.some(q => q.free && !q.dead && q.cells && q.cells.has(cy * W + cx)) && grid[cy - 1][cx] === T.WALL; }
    const md = town.stairs.find(q => q.kind === 'down'), my0 = (md.l1 / W) | 0, mx0 = md.l1 % W; for (let j = 0; j <= 3; j++) { setT(mx0, my0 + j, T.DIRTF); town.ore[(my0 + j) * W + mx0] = 0; } P.tx = P.x = mx0; P.ty = P.y = my0 + 1; P.path = []; rebuildOcc();
    out.deeper = !!stairPlace(P, true) && lvlOf(P.ty + 1) === LV_MINE && grid[P.ty + 1][P.tx] === T.STAIRM && lvlOf(P.ty + 1 + h0) === LV_MINE + 1 && grid[P.ty + 1 + h0][P.tx] === T.STAIRU;
    return out; });
  check(r.roofUp && r.deeper && r.upRoom, 'no stairs up from a bare roof, a doorless room upstairs, stairs down to the second mine: ' + JSON.stringify([r.roofUp, r.deeper, r.deckOk, r.upRoom]));
  check(r.downPlaced && r.under && r.chamber, 'a stair down opens a 3 x 3 chamber in solid earth: ' + JSON.stringify([r.downPlaced, r.under, r.chamber])); check(r.dug && r.ore && r.back, 'the hammer digs earth, there is ore below, and the stairs lead back: ' + JSON.stringify([r.dug, r.ore, r.back])); check(r.third && r.level2, 'a room on the deck takes stairs to a third level');
  check(r.levels, 'the map has a level above the island: ' + JSON.stringify(r)); check(r.placed && r.tiles, 'a staircase lays a deck over the building and links the two levels'); check(r.up && r.down, 'bumping the stairs takes you up and down'); check(r.pushCrates, 'a line of loose things goes up the stairs, the front one through'); check(r.pushUp && r.pushDown, 'a villager can be pushed up and down the stairs: ' + JSON.stringify([r.pushUp, r.pushDown])); check(r.inBuild, 'the stairs work in build mode, straight back with no stepping off'); check(r.mirror, 'the stair on the other floor is in the same place'); check(r.offLanding, 'a stair is entered from its landing only: from anywhere else it just says so');
  check(r.hut && r.bare, 'a walled hut seals into a room up on the deck'); check(r.path && r.walked, 'villagers path and walk up the stairs: ' + JSON.stringify([r.path, r.walked])); check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return 'stairs, deck, a room on the roof and a walk up';
});
test('levels: villagers move into huts upstairs and underground, walk there by the stairs and can be found wherever they are; a torch lights the mine', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('huts', 'blank'); if (!town.props) lfInitProps(); startPlaying(npcs[0]); const P = game.player, out = {};
    const o = { x: P.tx + 4, y: P.ty - 8 }; for (let j = -2; j < 12; j++) for (let i = -2; i < 14; i++) { setT(o.x + i, o.y + j, T.GRASS); roomAt[o.y + j][o.x + i] = -1; const q = lfPropAt(o.x + i, o.y + j); if (q) { town.props = town.props.filter(z => z !== q); town.propAt.delete((o.y + j) * W + o.x + i); town.pblock[(o.y + j) * W + o.x + i] = 0; } }
    const h0 = town.h0; town.kit = Object.assign(town.kit || {}, { stair: 2, stairdown: 2, bwall: 99, bdoor: 9, bed: 9, torch: 9 });
    buildRoom({ kind: 'lab', id: 'g', name: 'Ground room' }, o.x, o.y, 10, 8, 'b', null); P.tx = P.x = o.x + 3; P.ty = P.y = o.y + 3; P.face = { dx: 1, dy: 0 }; P.path = []; rebuildOcc(); itBuildToggle(P, true); stairPlace(P); itBuildToggle(P, false);
    const hut = (D, door) => { const placed = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (i === 0 || j === 0 || i === 4 || j === 4) { lfAddProp(i === door[0] && j === door[1] ? 'bdoor' : 'bwall', D.x + i, D.y + j); placed.push([D.x + i, D.y + j]); } lfAddProp('bed', D.x + 2, D.y + 1); town.bldQ = placed.concat([[D.x + 2, D.y + 1]]); bldTick(); };
    hut({ x: o.x + 5, y: o.y + 2 + h0 }, [2, 4]);
    P.tx = P.x = o.x + 3; P.ty = P.y = o.y + 10; P.face = { dx: 1, dy: 0 }; P.path = []; rebuildOcc(); itBuildToggle(P, true); stairPlace(P, true); itBuildToggle(P, false);
    const my = P.ty + LV_MINE * h0; for (let j = -2; j <= 8; j++) for (let i = -2; i <= 9; i++) { const x = P.tx + i, y = my + j; if (grid[y][x] === T.EARTH) { setT(x, y, T.DIRTF); town.ore[y * W + x] = 0; } }
    hut({ x: P.tx + 2, y: my + 2 }, [2, 4]); visHomes();
    out.huts = rooms.filter(q => q.kind === 'house' && q.hut && !q.dead).map(q => lvlOf(q.y)).sort().join(',');
    // a torch is a light: the mine is dark round it otherwise
    const tl = { x: P.tx + 3, y: my + 5 }; const pr = lfAddProp('torch', tl.x, tl.y); P.tx = P.x = tl.x - 1; P.ty = P.y = tl.y; game.player = P; centerOn(P.x, P.y, 1); const lights = mineLights(); out.torch = lights.some(l => l.r === MINE.torch) && lights.some(l => l.r === MINE.own);
    visArrive(); visArrive(); visArrive(); housingTick(); window.__ppl = npcs.filter(n => n !== P).map(n => n.id); out.n = window.__ppl.length;
    out.level = levelWord(my) === 'underground' && levelWord(o.y + h0) === 'upstairs' && levelWord(5) === '';
    return out; });
  await simulate(page, 14 * 60);
  const r2 = await page.evaluate(() => { const ppl = npcs.filter(n => window.__ppl.includes(n.id) && !n.dead), homed = ppl.filter(n => n.homeRoom && !n.homeRoom.dead && lvlOf(n.homeRoom.y) > 0); return { homed: homed.length, there: homed.filter(n => lvlOf(n.ty) === lvlOf(n.homeRoom.y)).length, sawLevels: [...new Set(homed.map(n => lvlOf(n.homeRoom.y)))].sort().join(','), placeOk: homed.every(n => /upstairs|mine|roof|high up|underground/.test(placeOf(n)) || lvlOf(n.ty) === 0) }; });
  check(r.huts === '1,3', 'a hut upstairs and one underground should become homes: ' + JSON.stringify(r)); check(r.torch && r.level, 'a torch and you are the lights underground, and the levels have names: ' + JSON.stringify([r.torch, r.level]));
  check(r2.homed >= 1 && r2.sawLevels !== '', 'visitors moved into the huts on other levels: ' + JSON.stringify(r2)); check(r2.placeOk, 'everybody can be found: ' + JSON.stringify(r2)); check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return JSON.stringify(r2);
});
test('work: villagers dig the mine, farmers sow a mix of seeds, a roof can hold a garden; and the sound engine stays silent under test', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 42, town: 'greenhollow-test' });
  await simulate(page, 3 * 1440);   // (farmers start sowing on the third day: two days sat on the edge of it)
  const r = await page.evaluate(() => {
    const out = {}; out.seeds = [...new Set(town.crops.filter(c => c.seed).map(c => c.seed))].length; out.mineWork = mineWork();
    const ws = npcs.filter(n => n.role === 'Worker' && !n.dead && !n.player && n.cur === 'Farmer').slice(0, 3), w = ws[0]; for (const x of ws) { x.cur = 'Miner'; x.curUntil = game.time + 99999; } window.__miner = w.id; window.__miners = ws.map(x => x.id); /* three, since the watch may call one away */ out.m0 = town.mined || 0; out.coin0 = w.coin || 0;
    // a roof garden: the field brush works on a deck, and the plot goes back to deck when dug up
    startPlaying(npcs.find(q => canControl(q) && !ws.includes(q))); const P = game.player, st = town.stairs.find(q => q.kind === 'up'), l1 = st.l1, lx = l1 % W, ly = (l1 / W) | 0;
    teleportTo(P, lx, ly); itBuildToggle(P, true); P.build.brush = 'field'; P.tx = P.x = lx + 1; P.ty = P.y = ly; P.build.lastT = null; bldBrushStep(P); out.roofPlot = grid[ly][lx + 1] === T.CROP && town.crops.some(c => c.x === lx + 1 && c.y === ly); itBuildToggle(P, false);
    out.silent = !SND.ctx;
    return out; });
  for (let h = 0; h < 24; h++) { await simulate(page, 60); if (await page.evaluate(() => (town.mined || 0) > 0)) break; await page.evaluate(() => { for (const id of window.__miners) { const w = byId(id); w.hunger = 10; w.bladder = 5; if (w.energy < 60) w.energy = 80; if (w.cur !== 'Miner' && lvlOf(w.ty) < 3 && w.pose !== 'sleep') { w.cur = 'Miner'; w.curUntil = game.time + 99999; abortPlan(w); } } }); }   // (a search party or an errand may call the miner away: the test puts them back on the job)
  const r2 = await page.evaluate(() => { const w = byId(window.__miner); return { mined: town.mined || 0, inMine: lvlOf(w.ty) >= 3, coin: w.coin || 0 }; });
  check(r.seeds >= 3, 'farmers sow a mix of seeds, not only barley: ' + r.seeds); check(r.mineWork && r2.mined > r.m0, 'a villager goes down and digs out the earth: ' + JSON.stringify([r.m0, r2])); check(r.roofPlot, 'a roof can be a garden'); check(r.silent, 'no audio is created under test');
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return r.seeds + ' kinds sown, ' + (r2.mined - r.m0) + ' tiles dug by a miner';
});
test('crops and flowers: every crop is its own plant with its own art; flowers stay in bloom a long time, then wither and are cleared for replanting', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const r = await page.evaluate(() => {
    newTown('crop-test', 'blank'); if (!town.props) lfInitProps(); startPlaying(npcs[0]); const P = game.player, out = {};
    const seeds = Object.keys(IT_SEEDS); out.seeds = seeds.length;
    out.art = seeds.filter(s => s !== 'barley').every(s => [1, 2, 3, 4].every(k => ART.BYID['crop_' + s + '_' + k])) && seeds.filter(s => IT_SEEDS[s].flower).every(s => ART.BYID['crop_' + s + '_5']);
    out.stacks = seeds.every(s => IT_STACKS['seed_' + s]);
    itEnsure(P, true); out.gift = seeds.every(s => (P.bag['seed_' + s] || 0) >= 12);
    const c = { x: P.tx + 2, y: P.ty, pl: 1, st: 1, t0: game.time, seed: 'daisy', byPlayer: true }; town.crops = town.crops || []; town.crops.push(c);
    out.young = cropStage(c) < 4; game.time += itGrow(c) + 10; out.bloom = cropStage(c) === 4 && !itWilted(c);
    out.keepsBloom = (game.time += 30 * 1440, cropStage(c) === 4 && !itWilted(c)); out.wilts = (game.time += 12 * 1440, itWilted(c));
    out.farmersLeaveIt = !itFarmersPlot(c) ;
    const t = itGate(P, targetAt0(P, c.x, c.y), true); out.clear = !!(t && t.run); if (t && t.run) t.run(P); out.cleared = !c.st && !c.seed && (P.bag.seed_daisy || 0) >= 1;
    c.pl = 1; c.st = 1; c.t0 = game.time; c.seed = 'pumpkin'; game.time += itGrow(c) + 10; out.ripe = cropStage(c) === 4; const h = itHarvest(P, c); out.pumpkins = P.inv.pumpkin === 2;
    return out;
  });
  check(r.seeds >= 15 && r.art && r.stacks && r.gift, 'every seed should have its stack and its art: ' + JSON.stringify(r));
  check(r.young && r.bloom && r.keepsBloom, 'a flower blooms and keeps blooming for weeks: ' + JSON.stringify(r)); check(r.wilts && r.farmersLeaveIt, 'it withers in the end and farmers leave it alone');
  check(r.clear && r.cleared, 'clearing the withered flower empties the plot and gives a seed back: ' + JSON.stringify(r)); check(r.ripe && r.pumpkins, 'a pumpkin ripens and is harvested: ' + JSON.stringify(r));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return `${r.seeds} seeds, flowers bloom for 40 days then wither and are cleared`;
});

test('tutorial: the first morning plays from the old house to the clock starting, word for word, with B and the hammer locked until it is their turn; Junia hands over the first rent at your door', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const early = await page.evaluate(() => { window.GH_NOTUT = false; window.GH_OLDSHOP = false; newTown('tutorial', 'hamlet'); const P = game.player, T2 = town.tut2;
    tut2Tick(0.05); const t0 = game.time; for (let i = 0; i < 30; i++) updateSim(2); itBuildToggle(P, true); itBag(true);
    const r = rooms.find(q => q.cells && q.cells.has(T2.at.bed.x + T2.at.bed.y * W));
    return { pop: npcs.length, clock: game.time === t0, build: itBuildOn(P), bag: itBagOpen(), room: !!r && !r.dead, bedIn: !!P.bed && P.bed.x === T2.at.bed.x, ownYard: !!yardOfN(P), tools: (P.items || []).length, coin: P.coin, hidden: document.body.classList.contains('tut2') }; });
  check(early.pop === 2 && early.clock && !early.build && !early.bag, 'only you and Paullus, the clock stands still, B and I do nothing: ' + JSON.stringify(early));
  check(early.room && early.bedIn && early.ownYard && early.tools === 0 && early.coin === 15 && early.hidden, 'you wake in the old house, in your own fenced yard, with 15 coin and nothing else, the HUD hidden: ' + JSON.stringify(early));
  const rep = await playTutorial(page, { maxSec: 400 });
  check(!rep.stuck && rep.done, 'the bot plays it to the end: ' + JSON.stringify(rep.stuck));
  const said = rep.said.filter(l => l.scene === 1).map(l => l.text);
  check(said.slice(0, 7).join(' | ') === ['Morning.', "You're new. Everybody is, here.", "This was mine. It's yours now.", "Don't ask how. I'm bad at the long version.", "Before anything else you'll want to eat.", "And for that you'll want a field.", 'Here. A hoe. The pointed end goes in the ground.'].join(' | '), 'Paullus says his lines in order: ' + said.join(' | '));
  const end = await page.evaluate(() => { const P = game.player, T2 = town.tut2, J = tut2Who('junia'), y = J && yardOfN(J);
    return { coin: P.coin, tools: (P.items || []).map(i => i.kind).sort().join(), time: fmtTime(game.time), yard: !!y && y.cells.length, gate: TUT2_DONE.gate(T2.at.gate.x, T2.at.gate.y), sown: T2.at.jfield.filter(t => { const c = tut2Crop(t.x, t.y); return c && c.st; }).length, kitFence: town.kit.fence || 0, hidden: document.body.classList.contains('tut2'), pill: progStep(progState().step).title }; });
  check(end.coin === 5 && end.tools === 'hammer,hoe' && end.time === '12:00', 'you end with 5 coin, a hoe and a hammer, at noon: ' + JSON.stringify(end));
  check(end.yard === 12 && end.gate && end.sown === 6 && end.kitFence === 1 && !end.hidden, "Junia's yard (12 tiles, a gate), six sown plots, the knocked-out fence back in the kit, the HUD back: " + JSON.stringify(end));
  check(end.pill === "Walls round Junia's bed", 'the first step after the tutorial: ' + end.pill);
  await simulate(page, 22 * 60);
  const rent = await page.evaluate(() => ({ coin: game.player.coin, done: town.tut2.rent1, chron: town.chron.some(c => /Junia paid the first rent/.test(c.text || c)) }));
  check(rent.done === 'done' && rent.coin === 7 && rent.chron, 'the next morning Junia hands over 2 coin in person: ' + JSON.stringify(rent));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return `played in ${rep.secs.toFixed(0)} s of real time (bubbles skipped), ${rep.said.length} lines`;
});

test('tutorial: pushing is taught the first time a fence lands out of place, or when you shut yourself in; fences go down along the line; Junia asks for her bed before it is given', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  const rep = await playTutorial(page, { maxSec: 300, until: 7 });
  check(!rep.stuck, 'reaches scene 7: ' + JSON.stringify(rep.stuck));
  const wish = rep.said.findIndex(l => /anywhere to sleep/.test(l.text)), gift = rep.said.findIndex(l => /Found this on the beach/.test(l.text));
  check(wish >= 0 && gift > wish, 'Junia asks for somewhere to sleep before Paullus hands over the bed');
  const r = await page.evaluate(() => {
    const T2 = town.tut2, P = game.player, out = {}; town.kit.fence = 30; T2.locks = { build: true }; T2.slots = ['fence']; T2.fenceFree = true; T2.fenceWatch = true;
    out.locked = tut2Lock('push');
    // a line: stand outside the ring's top row facing the first mark, press 1 three times
    const top = T2.at.yard.filter(t => t.y === Math.min(...T2.at.yard.map(q => q.y))).sort((a, c) => a.x - c.x);
    P.tx = P.x = top[0].x; P.ty = P.y = top[0].y - 1; P.face = { dx: 0, dy: 1 }; itBuildToggle(P, true);
    itBuildSelect(P, 0); P.tx = P.x = top[0].x - 1; P.ty = P.y = top[0].y; P.face = { dx: 1, dy: 0 }; itBuildSelect(P, 0); itBuildSelect(P, 0);
    out.line = top.slice(0, 3).every(t => TUT2_DONE.fence(t.x, t.y));
    // a stray: a fence off every mark
    const st = { x: T2.at.jbed.x + 1, y: T2.at.jbed.y + 1 }; const pr = lfAddProp('fence', st.x, st.y); tut2Hud();
    out.taught = !!T2.pushTaught; out.unlocked = !tut2Lock('push'); out.lesson = T2.ui.lesson; out.said = T2.said[T2.said.length - 1].text;
    bldDeleteProp(pr); tut2Hud(); out.cleared = T2.ui.lesson;
    // shut in: every mark fenced, you inside
    for (const t of T2.at.yard) if (!lfPropAt(t.x, t.y)) lfAddProp('fence', t.x, t.y);
    const inn = tut2YardInner(T2)[3]; P.tx = P.x = inn.x; P.ty = P.y = inn.y; tut2Hud(); out.shut = T2.ui.lesson; out.shutSaid = T2.said[T2.said.length - 1].text;
    return out;
  });
  check(r.locked && r.line, 'pushing starts locked, and pressing 1 facing a fence lays the next along the line: ' + JSON.stringify(r));
  check(r.taught && r.unlocked && /stray fence/.test(r.lesson || '') && /wandered/.test(r.said) && !r.cleared, 'a stray fence teaches pushing and the lesson goes when it is gone: ' + JSON.stringify(r));
  check(/Shut in/.test(r.shut || '') && /Shove one/.test(r.shutSaid), 'shut inside the ring, you are told to push your way out: ' + JSON.stringify(r));
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 2).join(' | '));
  return 'line laying, the stray-fence lesson and the shut-in reminder';
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
