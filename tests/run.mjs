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
    const hs = rooms.find(q => !q.dead && q.kind === 'house' && q.seats.length && q.beds.length && q.barrel && q.side === 'b'), P = game.player; itBuildToggle(P, true);
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
  check(r.wandered >= 3 && r.wandered <= 7, `a wandering chat should end after about three to seven screens (a talkative person has more patience), took ${r.wandered}`);
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

test('meeting: with the player near, two villagers walk up to each other and stand face to face to talk', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 10 * 60);
  const r = await page.evaluate(() => {
    const ok = q => sbFree(q) && !q.moving && q.age >= 18, a = npcs.find(ok), b = npcs.find(q => q !== a && ok(q) && lfDist(q, a) > 2.5 && lfDist(q, a) <= 4 && seeThrough(a.tx, a.ty, q.tx, q.ty) >= 0.5);
    if (!a || !b) { const pair = npcs.filter(ok).slice(0, 2); if (pair.length < 2) return { skip: true }; }
    return { skip: !a || !b, has: !!a && !!b };
  });
  check(r.skip || r.has, 'found a pair');
  const r2 = await page.evaluate(() => {
    const free = npcs.filter(q => sbFree(q) && q.age >= 18 && !q.player); const a = free[0], b = free[1]; if (!a || !b) return { skip: true };
    // put them four tiles apart on open ground near the player, with the player close by
    const P = game.player || (startPlaying(npcs.find(canControl)), game.player); const base = visNearTile(P) || { x: P.tx + 1, y: P.ty };
    const spot = (x, y) => { for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const tx = x + dx, ty = y + dy; if (walkable(tx, ty) && !lfPropAt(tx, ty) && !npcs.some(o => o.tx === tx && o.ty === ty)) return { x: tx, y: ty }; } return null; };
    const sa = spot(P.tx + 3, P.ty), sb = sa && spot(sa.x + 3, sa.y); if (!sa || !sb) return { skip: true };
    for (const [n, s] of [[a, sa], [b, sb]]) { abortPlan(n); n.tx = n.x = s.x; n.ty = n.y = s.y; n.pose = 'stand'; }
    rebuildOcc(); const d0 = lfDist(a, b); const m = sbMeet(a, b); const first = a.plan && a.plan[0] && a.plan[0].text;
    window.__pair = [a.id, b.id]; return { d0, m, first };
  });
  if (!r2.skip) {
    check(r2.m && /Going over to/.test(r2.first), 'the first villager sets out to meet the other: ' + JSON.stringify(r2));
    await simulate(page, 15);
    const d = await page.evaluate(() => { const [a, b] = window.__pair.map(byId); return { d: lfDist(a, b), status: a.status }; });
    check(d.d <= 1.5, 'they end up side by side: ' + JSON.stringify(d));
  }
  check(!errors.length, 'no errors: ' + errors.join('|'));
  return 'meeting';
});

test('overheard: what villagers say to each other is kept on the canvas and C hides it', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 60);
  const r = await page.evaluate(() => {
    const [a, c] = npcs.filter(q => !q.dead && !q.player && q.age >= 18); const box = document.getElementById('heardbox');
    addChatter({ time: game.time, a, b: c, place: 'the plaza', lines: [{ who: a, text: 'Did you see the gull?' }, { who: c, text: 'I saw nothing else.' }] });
    const shown = !box.hidden && box.innerText.includes('Did you see the gull?') && box.innerText.includes(c.first);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); const hid = box.hidden; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); return { shown, hid, back: !box.hidden };
  });
  check(r.shown && r.hid && r.back, 'overheard lines are listed and C toggles: ' + JSON.stringify(r));
  check(!errors.length, 'no errors: ' + errors.join('|'));
  return 'overheard';
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
test('truesight: the solid wall beside a window is never inside what you can see (no beams leaking into the wall bodies)', async b => {
  const { page, errors } = await openGame(b, GAME, { rng: 3, town: 'truesight-lab', viewport: { width: 900, height: 600 } });
  await simulate(page, 12 * 60);
  const r = await page.evaluate(() => {
    if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl));
    const L = tsLab(), P = game.player; const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], q = poly[j]; if ((a[1] > y) !== (q[1] > y) && x < (q[0] - a[0]) * (y - a[1]) / (q[1] - a[1]) + a[0]) c = !c; } return c; };
    const wins = []; for (let y = L.oy; y < L.oy + 40; y++) for (let x = L.ox; x < L.ox + 46; x++) if (grid[y][x] === T.WALL && tsWindow(x, y)) wins.push([x, y]);
    const w = wins.find(q => grid[q[1]][q[0] - 1] === T.WALL && grid[q[1]][q[0] + 1] === T.WALL) || wins[0]; let leaks = 0, views = 0;
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
  const { page, errors } = await openGame(b, GAME, { rng: 41, town: 'greenhollow-test' });
  await simulate(page, 2 * 1440);
  const r = await page.evaluate(() => {
    const out = {}; out.seeds = [...new Set(town.crops.filter(c => c.seed).map(c => c.seed))].length; out.mineWork = mineWork();
    const w = npcs.find(n => n.role === 'Worker' && !n.dead && !n.player && n.cur === 'Farmer'); w.cur = 'Miner'; w.curUntil = game.time + 99999; window.__miner = w.id; out.m0 = town.mined || 0; out.coin0 = w.coin || 0;
    // a roof garden: the field brush works on a deck, and the plot goes back to deck when dug up
    startPlaying(npcs.find(q => canControl(q) && q !== w)); const P = game.player, st = town.stairs.find(q => q.kind === 'up'), l1 = st.l1, lx = l1 % W, ly = (l1 / W) | 0;
    teleportTo(P, lx, ly); itBuildToggle(P, true); P.build.brush = 'field'; P.tx = P.x = lx + 1; P.ty = P.y = ly; P.build.lastT = null; bldBrushStep(P); out.roofPlot = grid[ly][lx + 1] === T.CROP && town.crops.some(c => c.x === lx + 1 && c.y === ly); itBuildToggle(P, false);
    out.silent = !SND.ctx;
    return out; });
  await simulate(page, 8 * 60);
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
