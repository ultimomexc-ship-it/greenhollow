/* Balance harness for the Hamlet (docs/minimum-game.md): a bot builder plays the minimum game for a month of game time and the numbers are written down:
   coin over time for the player, every household and the trader, rent, food, people, contentment, and the day each progression step was reached.
   Same seed = same run. Use it before and after changing a price, a yield or a rent.

     node tools/balance.mjs [--days=30] [--seed=41] [--policy=steady|greedy|lazy] [--out=/tmp/claude-0/balance] [--file=dist/index.html]
                            [--tune=pay=1.5,carter=1,rentBase=3] [--price=bed=8,field=1] [--tag=name]   (HAMLET_TUNE and HAMLET_PRICES, for trying a number without a build)

   The bot is a model of a player, not a player: it pays the trader's prices (HAMLET_PRICES) and puts things down at once (build mode stops time anyway), clears
   trees and rocks where it builds (free, as the hammer is), and farms its own fields at up to BOT.acts actions an hour between 6 and 20.
     steady: houses the bedless first, keeps its own 12 fields, gives every household 6 field tiles an adult, keeps one empty yard ready (single, couple, family in
             turn), and walls beds in (a room, a window, poppies) once five households live on the island.
     greedy: as steady, but only couples' yards, and every yard gets its room, window and flowers before anybody moves in (the most rent a head).
     lazy:   builds nothing but its own fields (what farming alone earns). */
import path from 'node:path';
import fs from 'node:fs';
import { launch, openGame, simulate } from '../tests/lib.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const tune = opt('tune', ''), price = opt('price', ''), days = +opt('days', 30), seed = +opt('seed', 41), policy = opt('policy', 'steady'), out = opt('out', '/tmp/claude-0/balance'), file = opt('file', 'dist/index.html');
fs.mkdirSync(out, { recursive: true });

const browser = await launch();
const { page, errors } = await openGame(browser, path.resolve(file), { rng: seed, town: 'balance-' + seed });

await page.evaluate(([policy, seed, tune, price]) => {
  for (const kv of tune.split(',').filter(Boolean)) { const [k, v] = kv.split('='); HAMLET_TUNE[k] = +v; } for (const kv of price.split(',').filter(Boolean)) { const [k, v] = kv.split('='); HAMLET_PRICES[k] = +v; }
  newTown('balance-' + seed, 'hamlet');
  const P = game.player, TR = npcs.find(n => n.shop), PR = HAMLET_PRICES;
  const B = window.BOT = { policy, acts: 6, spent: 0, farm: 0, spentDay: 0, farmDay: 0, built: [], log: [], cycle: 0, stuck: 0, wantCost: 0, want: '', ownTarget: 12, firstSale: null, steps: {} };
  const note = t => B.log.push('day ' + (Math.floor(game.time / 1440) + 1) + ' ' + fmtTime(game.time) + ': ' + t);
  const spend = c => { pay(P, TR, c); B.spent += c; B.spentDay += c; };
  const drop = (x, y) => { const pr = lfPropAt(x, y); if (pr) { town.pblock[y * W + x] = 0; town.propAt.delete(y * W + x); town.props = town.props.filter(q => q !== pr); } if (town.nodeMap && town.nodeMap.has(y * W + x)) { const nd = town.nodeMap.get(y * W + x); town.nodes = town.nodes.filter(q => q !== nd); town.nodeMap.delete(y * W + x); } if (grid[y][x] !== T.GRASS) setT(x, y, T.GRASS); };
  /** ground for a w x h block (one tile of margin), as near the stall as there is: grass, trees and rocks only (the bot clears them), nothing built, no yard */
  /* what each villager earned selling and spent buying, from the trade log (the player's own sales are the bot's `farm`) */
  B.flow = {}; const _lt = logTrade; logTrade = function (buyer, seller, g, q, total) { const f = id => B.flow[id] || (B.flow[id] = { earn: 0, spend: 0 }); if (buyer && buyer.id != null && !buyer.shop) f(buyer.id).spend += total; if (seller && seller.id != null && !seller.shop) f(seller.id).earn += total; return _lt.apply(this, arguments); };
  B.ground = (w, h) => {
    const sx = TR.shop.front.x, sy = TR.shop.front.y, cand = [];
    for (let y = 6; y < town.h0 - 6 - h; y++) for (let x = 6; x < W - 6 - w; x++) { const d = Math.hypot(x + w / 2 - sx, y + h / 2 - sy); if (d < 70) cand.push([d, x, y]); }
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, x, y] of cand) { let ok = true;
      for (let j = -1; j <= h && ok; j++) for (let i = -1; i <= w && ok; i++) { const X = x + i, Y = y + j, g = grid[Y][X], pr = lfPropAt(X, Y); if ((g !== T.GRASS && g !== T.TREE && g !== T.ROCK) || roomAt[Y][X] >= 0 || yardAtXY(X, Y) || (pr && !['crate', 'crate1', 'barrel', 'stool', 'rock'].includes(pr.kind)) || (town.fmask && town.fmask[Y * W + X]) || npcs.some(n => n.bed && n.bed.x === X && n.bed.y === Y)) ok = false; }
      if (!ok) continue; for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) drop(x + i, y + j); town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; return [x, y]; }
    return null;
  };
  const fieldAt = (x, y, f) => { setT(x, y, T.CROP); const c = { x, y, f, pl: 1, st: 0, t0: 0, byField: P.id }; town.crops.push(c); return c; };
  /* ---- a yard: 6 or more wide inside; rows: wall, beds, wall and door, a free row, then fields ---- */
  B.yardPlan = beds => { const adults = Math.min(2, beds), iw = Math.max(6, beds + 2), rows = Math.ceil(adults * 6 / iw), ih = 4 + rows; return { beds, adults, iw, ih, w: iw + 2, h: ih + 2, shell: (2 * (iw + 2) + 2 * (ih + 2) - 5) * PR.fence + PR.gate + beds * PR.bed, fields: rows * iw, room: (2 * (beds + 2) + 2 - 2) * PR.bwall + PR.bdoor + PR.bwindow, flowers: PR.field + 2 }; };
  B.buildYard = (beds, withRoom) => {
    const pl = B.yardPlan(beds), g = B.ground(pl.w, pl.h); if (!g) { note('no ground for a yard'); return null; }
    const [x0, y0] = g, rec = { x0, y0, pl, beds: [], fields: 0, room: false, flowers: false, id: null };
    for (let j = 0; j < pl.h; j++) for (let i = 0; i < pl.w; i++) if (i === 0 || j === 0 || i === pl.w - 1 || j === pl.h - 1) lfAddProp(i === 3 && j === pl.h - 1 ? 'gate' : 'fence', x0 + i, y0 + j);
    spend(pl.shell - beds * PR.bed);
    if (withRoom) { B.roomFor(rec); B.flowersFor(rec); }
    for (let i = 0; i < beds; i++) { const b = lfAddProp('bed', x0 + 2 + i, y0 + 2); b.v = i; b.rot = 0; rec.beds.push(b); } spend(beds * PR.bed);
    refreshReach(); yardScan(true); const Y = yardAtXY(x0 + 1, y0 + 4); rec.id = Y ? Y.id : null; if (withRoom) { visHomes(); }
    yardHousing(); B.built.push(rec); note(`built a yard with ${beds} bed${beds > 1 ? 's' : ''}${withRoom ? ', a room, a window and poppies' : ''} (${pl.shell + (withRoom ? pl.room + pl.flowers : 0)} coin)`); return rec;
  };
  B.roomFor = rec => { const { x0, y0, pl } = rec, k = pl.beds;
    for (let j = 1; j <= 3; j++) for (let i = 1; i <= k + 2; i++) { if (j === 2 && i > 1 && i < k + 2) continue; const x = x0 + i, y = y0 + j; if (lfPropAt(x, y)) continue; const p = lfAddProp(j === 3 && i === 2 ? 'bdoor' : j === 1 && i === 2 ? 'bwindow' : 'bwall', x, y); bldQueue(p); }
    spend(pl.room); bldTick(); visHomes(); yardScan(true); yardHousing(); rec.room = roomAt[y0 + 2][x0 + 2] >= 0; if (!rec.room) note('a room did not close at ' + x0 + ',' + y0); };
  B.flowersFor = rec => { const { x0, y0, pl } = rec, out = pl.beds + 3 <= pl.iw, x = out ? x0 + pl.beds + 3 : x0 + 1, y = out ? y0 + 2 : y0 + 4; rec.flowers = true; if (grid[y][x] !== T.GRASS || lfPropAt(x, y)) { note('no room for poppies at ' + x + ',' + y); return; } const c = fieldAt(x, y, 'fl' + x0); c.st = 1; c.seed = 'poppy'; c.t0 = game.time; c.byPlayer = true; spend(pl.flowers); rec.flowers = true; };
  B.fieldsFor = (rec, n) => { const { x0, y0, pl } = rec; let laid = 0; for (let k = rec.fields; k < pl.fields && laid < n; k++) { const x = x0 + 1 + (k % pl.iw), y = y0 + 5 + Math.floor(k / pl.iw); if (grid[y][x] === T.GRASS && !lfPropAt(x, y)) { fieldAt(x, y, 'y' + x0 + '_' + y0); laid++; } rec.fields = k + 1; } spend(laid * PR.field); if (laid) refreshReach(); return laid; };
  /* ---- the bot's own fields: rows of six beside its bed ---- */
  B.own = { x0: null, y0: null, n: 0 };
  B.ownField = n => { const o = B.own; if (o.x0 == null) { const g = B.ground(6, 4); if (!g) return 0; o.x0 = g[0]; o.y0 = g[1]; } let laid = 0; while (laid < n && o.n < 24) { fieldAt(o.x0 + (o.n % 6), o.y0 + Math.floor(o.n / 6), 'own'); o.n++; laid++; } spend(laid * PR.field); if (laid) refreshReach(); return laid; };
  /** one hour of the bot farming and selling */
  B.farmHour = () => {
    const h = (game.time % 1440) / 60; if (h < 6 || h >= 20) return; let acts = B.acts; const m = TR.shop, mine = town.crops.filter(c => c.f === 'own');
    for (const c of mine) { if (acts <= 0) break; if (c.st && cropStage(c) === 4 && !itIsFlower(c)) { itHarvest(P, c); acts--; } }
    for (const c of mine) { if (acts <= 0) break; if (c.st) continue; let k = Object.keys(P.bag || {}).filter(q => q.startsWith('seed_') && P.bag[q] > 0 && !IT_SEEDS[q.slice(5)].flower).sort((a, b) => P.bag[b] - P.bag[a])[0];
      if (!k && isOpen(m)) { const g = ['seed_barley', 'seed_turnip', 'seed_cabbage'].filter(q => (m.stock[q] || 0) >= 1).sort((a, b) => sellPrice(m, a) - sellPrice(m, b))[0]; if (g && P.coin >= sellPrice(m, g)) { const p = sellPrice(m, g); pay(P, TR, p); m.stock[g]--; B.spent += p; B.spentDay += p; P.bag[g] = (P.bag[g] || 0) + 1; k = g; } }
      if (!k) break; P.bag[k]--; c.st = 1; c.t0 = game.time; c.seed = k.slice(5); c.byPlayer = true; acts--; }
    const carry = SELLABLE.reduce((s, g) => s + (P.inv[g] || 0), 0);
    if (carry >= 8 && isOpen(m)) for (const g of Object.keys(m.buys)) { let q = P.inv[g] || 0, got = 0, tot = 0; while (q > 0) { const p = buyPrice(m, g); if (p <= 0 || TR.coin < p) break; pay(TR, P, p); m.stock[g] = (m.stock[g] || 0) + 1; P.inv[g]--; q--; got++; tot += p; } if (got) { logTrade(TR, P, g, got, tot, 'sell'); B.farm += tot; B.farmDay += tot; if (B.firstSale == null) B.firstSale = game.time; } }
  };
  /** what the bot would build next: { what, cost, run } */
  B.next = () => {
    const pol = B.policy, pl = P, ppl = npcs.filter(n => !n.dead && n !== pl), bedless = ppl.filter(n => !yardHasBed(n) && !isPaullus(n));
    const lived = B.built.filter(r => { const Y = town.yards.find(y => y.id === r.id); return Y && yardPeople(Y).length; }), empty = B.built.filter(r => { const Y = town.yards.find(y => y.id === r.id); return Y && !yardPeople(Y).length; });
    if (B.own.n < 6) return { what: 'own fields', cost: PR.field, run: () => B.ownField(Math.min(6 - B.own.n, Math.floor(P.coin / PR.field))) };
    if (pol === 'lazy') return B.own.n < 24 ? { what: 'own fields', cost: PR.field * 3, run: () => B.ownField(Math.min(6, Math.floor(P.coin / PR.field))) } : null;
    if (bedless.length && !empty.length) { const k = Math.min(5, bedless.length), y = B.yardPlan(k); return { what: `a yard for the ${k} without beds`, cost: y.shell, run: () => B.buildYard(k, false) }; }
    for (const r of lived) if (r.fields < r.pl.fields) return { what: 'fields for a household', cost: PR.field * 3, run: () => B.fieldsFor(r, Math.min(6, Math.floor(P.coin / PR.field))) };
    if (B.own.n < B.ownTarget) return { what: 'own fields', cost: PR.field * 3, run: () => B.ownField(Math.min(6, Math.floor(P.coin / PR.field))) };
    const hh = progHouseholds();
    if (pol === 'steady' && hh >= 5) for (const r of lived) { if (!r.room) return { what: 'a room round the beds', cost: r.pl.room, run: () => B.roomFor(r) }; if (!r.flowers) return { what: 'poppies by the beds', cost: r.pl.flowers, run: () => B.flowersFor(r) }; }
    for (const r of empty) { const Y = town.yards.find(y => y.id === r.id); if (Y && !yardFreeBeds(Y).length) { const k = [1, 2, 4][B.cycle % 3]; return { what: `${k} bed${k > 1 ? 's' : ''} for an empty yard`, cost: PR.bed * k, run: () => { let n = 0; for (let i = 0; i < k; i++) { const sp = arrBedSpot(Y, null); if (!sp) break; const b = lfAddProp('bed', sp.x, sp.y); b.v = i; b.rot = 0; n++; } spend(PR.bed * n); yardScan(true); yardHousing(); B.cycle++; note('put ' + n + ' beds in an empty yard'); } }; } }
    for (const r of empty) if (r.fields < r.pl.fields) return { what: 'fields for the empty yard', cost: PR.field * 3, run: () => B.fieldsFor(r, Math.min(6, Math.floor(P.coin / PR.field))) };
    if (!empty.length) { const k = pol === 'greedy' ? 2 : [1, 2, 4][B.cycle % 3], y = B.yardPlan(k), cost = y.shell + (pol === 'greedy' ? y.room + y.flowers : 0); return { what: `an empty yard with ${k} bed${k > 1 ? 's' : ''}`, cost, run: () => { if (B.buildYard(k, pol === 'greedy')) B.cycle++; } }; }
    return null;
  };
  B.buildHour = () => { for (let i = 0; i < 6; i++) { const nx = B.next(); if (!nx) { B.want = ''; B.wantCost = 0; return; } B.want = nx.what; B.wantCost = nx.cost; if (P.coin < nx.cost) return; const c0 = P.coin; nx.run(); if (P.coin === c0) return; } };
  /** the progression steps of docs/minimum-game.md, the day each was first true */
  B.check = () => {
    const pl = P, day = +(game.time / 1440).toFixed(2), ppl = npcs.filter(n => !n.dead && n !== pl), st = B.steps, set = (k, ok) => { if (ok && st[k] == null) { st[k] = day; note('step reached: ' + k); } };
    const fam = ppl.filter(n => !n.shop).slice(0, 3), hh = progHouseholds();
    const roofed = ppl.every(n => rentTrader(n) || (yardHasBed(n) && rentHome(n).roof)), hungry = ppl.filter(n => n.hunger > 70).length, mood = ppl.reduce((s, n) => s + n.mood, 0) / Math.max(1, ppl.length);
    progTick(); const names = ['1 shelter the family', '2 first harvest sold', '3 five households', '4 everyone under a roof', '5 the island thrives'], done = (town.prog && town.prog.done) || {};   // (the game's own steps: life2/progress.ts)
    for (let k = 1; k <= 5; k++) set(names[k - 1], done[k] != null);
    if (town.decision && town.decision.kind === 'thrive') answerDecision('yes');
    return { hh, hungry, mood };
  };
  B.snap = () => {
    const pl = P, ppl = npcs.filter(n => !n.dead && n !== pl), c = B.check(), R = town.rent || { today: 0, due: 0, total: 0 };
    const all = npcs.reduce((s, n) => s + (n.coin || 0), 0);
    const hhs = town.yards.filter(y => y.open == null && yardPeople(y).length && !yardPeople(y).some(rentTrader)).map(y => { const p = yardPeople(y), ad = p.filter(n => n.age >= 16); return { id: y.id, name: yardName(y), people: p.length, coin: Math.round(ad.reduce((s, n) => s + n.coin, 0)), store: foodCount(y.store || {}), due: ad.reduce((s, n) => s + rentOf(n).amt, 0), unpaid: ad.filter(n => n.rentLast && !n.rentLast.ok).length, hungry: p.filter(n => n.hunger > 70).length, mood: Math.round(p.reduce((s, n) => s + n.mood, 0) / p.length), fields: town.crops.filter(q => yardAtXY(q.x, q.y) === y).length, earn: Math.round(p.reduce((t, q) => t + (B.flow[q.id] ? B.flow[q.id].earn : 0), 0)), spend: Math.round(p.reduce((t, q) => t + (B.flow[q.id] ? B.flow[q.id].spend : 0), 0)) }; });
    const s = { day: Math.floor(game.time / 1440), pop: npcs.filter(n => !n.dead).length, hh: c.hh, coin: Math.round(pl.coin), rent: R.today, due: R.due, rentTotal: R.total, farm: B.farmDay, spent: B.spentDay, all: Math.round(all), trader: Math.round(TR.coin), traderGrain: Math.round(TR.shop.stock.grain || 0), exported: town.eco.exported || 0, harvests: (town.tut && town.tut.harvests) || 0, hungry: c.hungry, bedless: ppl.filter(n => !yardHasBed(n)).length, mood: Math.round(c.mood), want: B.want, wantCost: B.wantCost, hhs, apart: (town.apart || []).length };
    /* stuck = a day wanting something, short of its price, and buying nothing */
    if (B.want && pl.coin < B.wantCost && !B.spentDay) B.stuck++; else B.stuck = 0; s.stuck = B.stuck; B.farmDay = 0; B.spentDay = 0; return s;
  };
}, [policy, seed, tune, price]);

/* ---- play ---- */
const daysOut = []; let maxHungry = 0;
for (let d = 0; d < days; d++) {
  for (let h = 0; h < 24; h++) {
    await simulate(page, 60);
    maxHungry = Math.max(maxHungry, await page.evaluate(() => { BOT.farmHour(); BOT.buildHour(); BOT.check(); return npcs.filter(n => !n.dead && !n.player && n.hunger > 70).length; }));
  }
  const s = await page.evaluate(() => BOT.snap()); s.maxHungry = maxHungry; maxHungry = 0; daysOut.push(s);
  process.stdout.write(`day ${String(s.day).padStart(2)}  pop ${String(s.pop).padStart(2)}  hh ${String(s.hh).padStart(2)}  coin ${String(s.coin).padStart(4)}  rent ${s.rent}/${s.due}  farm ${s.farm}  spent ${s.spent}  hungry ${s.maxHungry}  mood ${s.mood}  next: ${s.want || '-'} (${s.wantCost})\n`);
}
if (opt('why', '')) console.log(await page.evaluate(() => JSON.stringify({ blocked: arrBlocked(), arrYard: !!arrYard(), arr: town.arr, bedless: npcs.filter(n => !n.dead && n !== game.player && n.age >= 3 && !yardHasBed(n) && !isPaullus(n)).map(n => [n.first, n.age, n.homeless, !!n.moveBed]), hungry: npcs.filter(n => n.hunger > 70).map(n => [n.first, Math.round(n.hunger), n.status]), empty: town.yards.filter(y => !yardPeople(y).length).map(y => [y.id, yardFreeBeds(y).length, y.open]) })));
if (opt('debug', '')) console.log(await page.evaluate(() => JSON.stringify({ own: BOT.own, built: BOT.built.map(r => [r.x0, r.y0, r.pl.w, r.pl.h, r.id]), yards: town.yards.map(y => { const xs = y.cells.map(k => k % W), ys = y.cells.map(k => (k / W) | 0); return [y.id, y.cells.length, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), y.gates.length, y.open]; }) })));
const fin = await page.evaluate(() => ({ strayFields: town.crops.filter(c => typeof c.f === 'number').length, steps: BOT.steps, log: BOT.log, spent: BOT.spent, farm: BOT.farm, rent: (town.rent || {}).total || 0, prices: HAMLET_PRICES, tune: HAMLET_TUNE, rentRule: [HAMLET_TUNE.rentBase, HAMLET_TUNE.rentRoof, HAMLET_TUNE.rentWindow, HAMLET_TUNE.rentFlowers], weddings: town.weddings, digest: LIFE.digest(60).kinds }));
await browser.close();

/* ---- the report ---- */
const SP = '▁▂▃▄▅▆▇█', spark = a => { const mx = Math.max(1, ...a), mn = Math.min(0, ...a); return a.map(v => SP[Math.min(7, Math.floor((v - mn) / (mx - mn || 1) * 7.999))]).join(''); };
const col = k => daysOut.map(s => s[k]);
const flags = [];
const hhStat = new Map();
for (const s of daysOut) for (const h of s.hhs) { const q = hhStat.get(h.id) || { name: h.name, days: 0, broke: 0, unpaid: 0, hungry: 0, coin: [], people: h.people, fields: h.fields, earn0: h.earn, spend0: h.spend }; q.days++; if (h.coin < h.due) q.broke++; if (h.unpaid) q.unpaid++; if (h.hungry) q.hungry++; q.coin.push(h.coin); q.name = h.name; q.people = h.people; q.fields = h.fields; q.earn = h.earn - q.earn0; q.spend = h.spend - q.spend0; hhStat.set(h.id, q); }
for (const q of hhStat.values()) { if (q.days >= 4 && q.broke / q.days > 0.6) flags.push(`${q.name} (${q.people} people, ${q.fields} field tiles) is broke most days: under a day's rent in coin on ${q.broke} of ${q.days} days, rent unpaid on ${q.unpaid}.`); if (q.days >= 4 && q.hungry / q.days > 0.4) flags.push(`${q.name} is hungry on ${q.hungry} of ${q.days} days.`); }
{ let run = 0, worst = 0, at = 0; daysOut.forEach(s => { run = s.stuck ? run + 1 : 0; if (run > worst) { worst = run; at = s.day; } }); if (worst >= 3) flags.push(`The player is stuck: ${worst} days in a row (to day ${at}) without the coin for the next thing (${daysOut[at - 1] ? daysOut[at - 1].want + ', ' + daysOut[at - 1].wantCost + ' coin' : ''}).`); }
if (policy !== 'lazy' && daysOut.some(s => s.coin > 300 && !s.want)) flags.push('Coin piles up with nothing to buy: over 300 coin and nothing wanted.');
if (policy !== 'lazy' && daysOut.length && daysOut[daysOut.length - 1].coin > 400) flags.push(`Coin piles up: ${daysOut[daysOut.length - 1].coin} at the end.`);
{ const names = ['1 shelter the family', '2 first harvest sold', '3 five households', '4 everyone under a roof', '5 the island thrives']; let prev = 0; for (const k of names) { const d = fin.steps[k]; if (d == null) { if (policy !== 'lazy') flags.push(`Step "${k}" was not reached in ${days} days.`); break; } if (d - prev > 10) flags.push(`Step "${k}" took ${(d - prev).toFixed(1)} days (reached on day ${d}).`); prev = d; } }
{ const last = daysOut[daysOut.length - 1]; if (last && last.traderGrain >= 85) flags.push(`The trader's stall is full of grain (${last.traderGrain}): it has stopped paying for more.`); if (daysOut.some(s => s.trader < 5)) flags.push('The trader ran out of coin on ' + daysOut.filter(s => s.trader < 5).length + ' days: he could not pay for crops.'); }
{ const wk = daysOut.slice(-7), r = wk.reduce((s, x) => s + x.rent, 0), f = wk.reduce((s, x) => s + x.farm, 0); if (policy !== 'lazy' && r <= f) flags.push(`In the last week rent (${r}) is not above the player's own farm income (${f}): still a farmer, not a landlord.`); }
if (fin.strayFields) flags.push(`${fin.strayFields} field tiles appeared that nobody laid (the old village growth?).`);
if (daysOut.some(s => s.bedless > 0 && s.day > 3)) flags.push('Somebody had no bed after day 3 on ' + daysOut.filter(s => s.bedless > 0 && s.day > 3).length + ' days.');

const L = [];
L.push(`# Balance: ${policy}, seed ${seed}, ${days} days`, '');
L.push(`Tuning: ${Object.entries(fin.tune).map(([k, v]) => k + ' ' + v).join(', ')}.`, '');
L.push(`Prices: ${Object.entries(fin.prices).map(([k, v]) => k + ' ' + v).join(', ')}. Rent: ${fin.rentRule[0]} a yard, +${fin.rentRule[1]} roof, +${fin.rentRule[2]} window, +${fin.rentRule[3]} flowers.`, '');
L.push('## Verdict', '', flags.length ? flags.map(f => '- ' + f).join('\n') : '- Nothing flagged.', '');
L.push('## Steps', '', '| step | day reached |', '| --- | --- |', ...['1 shelter the family', '2 first harvest sold', '3 five households', '4 everyone under a roof', '5 the island thrives'].map(k => `| ${k} | ${fin.steps[k] != null ? fin.steps[k] : 'not reached'} |`), '');
L.push('## Totals', '', `- Rent collected: ${fin.rent} coin. The player's own crops sold: ${fin.farm} coin. Spent at the trader: ${fin.spent} coin.`, `- People ${daysOut.at(-1).pop}, households ${daysOut.at(-1).hh}, weddings ${fin.weddings}, couples living apart ${daysOut.at(-1).apart}.`, `- Life events: ${['planted', 'harvested', 'sold', 'bought', 'rent_paid', 'rent_unpaid', 'no_yard', 'went_hungry', 'slept_rough', 'came_ashore', 'moved_in', 'could_not_afford'].map(k => k + ' ' + (fin.digest[k] || 0)).join(', ')}.`, '');
L.push('## Curves (one mark a day)', '', '```', `player coin   ${spark(col('coin'))}  ${Math.min(...col('coin'))}..${Math.max(...col('coin'))}`, `rent paid     ${spark(col('rent'))}  0..${Math.max(...col('rent'))}`, `rent due      ${spark(col('due'))}  0..${Math.max(...col('due'))}`, `own farm coin ${spark(col('farm'))}  0..${Math.max(...col('farm'))}`, `spent         ${spark(col('spent'))}  0..${Math.max(...col('spent'))}`, `all coin      ${spark(col('all'))}  ${Math.min(...col('all'))}..${Math.max(...col('all'))}`, `trader coin   ${spark(col('trader'))}  ${Math.min(...col('trader'))}..${Math.max(...col('trader'))}`, `people        ${spark(col('pop'))}  ${Math.min(...col('pop'))}..${Math.max(...col('pop'))}`, `households    ${spark(col('hh'))}  ${Math.min(...col('hh'))}..${Math.max(...col('hh'))}`, `hungry (max)  ${spark(col('maxHungry'))}  0..${Math.max(...col('maxHungry'))}`, `mood          ${spark(col('mood'))}  ${Math.min(...col('mood'))}..${Math.max(...col('mood'))}`, '```', '');
L.push('## Day by day', '', '| day | people | households | player coin | rent paid / due | own farm | spent | all coin | trader coin | trader grain | harvests | hungry (max) | no bed | mood | wants next |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...daysOut.map(s => `| ${s.day} | ${s.pop} | ${s.hh} | ${s.coin} | ${s.rent} / ${s.due} | ${s.farm} | ${s.spent} | ${s.all} | ${s.trader} | ${s.traderGrain} | ${s.harvests} | ${s.maxHungry} | ${s.bedless} | ${s.mood} | ${s.want ? s.want + ' (' + s.wantCost + ')' : '-'} |`), '');
L.push('## Households', '', '| household | people | field tiles | days | coin (first..last, low) | days under a day\'s rent | days rent unpaid | days hungry | sold for | bought for |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |', ...[...hhStat.values()].map(q => `| ${q.name} | ${q.people} | ${q.fields} | ${q.days} | ${q.coin[0]}..${q.coin.at(-1)}, low ${Math.min(...q.coin)} \`${spark(q.coin)}\` | ${q.broke} | ${q.unpaid} | ${q.hungry} | ${q.earn || 0} | ${q.spend || 0} |`), '');
L.push('## What the bot did', '', ...fin.log.map(l => '- ' + l), '');
if (errors.length) L.push('## Page errors', '', ...errors.slice(0, 10).map(e => '- ' + e), '');
const base = path.join(out, `balance-${policy}-${seed}${opt('tag', '') ? '-' + opt('tag', '') : ''}`);
fs.writeFileSync(base + '.md', L.join('\n')); fs.writeFileSync(base + '.json', JSON.stringify({ policy, seed, days, flags, steps: fin.steps, totals: { rent: fin.rent, farm: fin.farm, spent: fin.spent }, daysOut, households: [...hhStat.values()], log: fin.log, errors }, null, 1));
console.log('\n' + (flags.length ? flags.map(f => '! ' + f).join('\n') : 'Nothing flagged.') + '\n\nwrote ' + base + '.md');
if (errors.length) { console.log('page errors:', errors.slice(0, 3)); process.exitCode = 1; }
