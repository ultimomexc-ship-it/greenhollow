/* ---------- work plans ---------- */
function farmPlan(n) {
  const free = town.crops.filter(c => !c.claim && itFarmersPlot(c) && yardMine(n, c)); let list, kind;   // (the player's garden and what the player sowed are left alone)
  list = free.filter(c => c.st && cropStage(c) === 4); kind = 'harvest';
  if (!list.length) { list = free.filter(c => !c.st && c.pl && fieldPlowed(c)); kind = 'sow'; }
  if (!list.length) { list = free.filter(c => !c.pl); kind = 'plow'; }
  if (!list.length) return null;
  const steps = []; let cx = n.tx, cy = n.ty, prev = { x: -9, y: -9 }; const txt = { harvest: 'Harvesting grain', sow: 'Sowing seed', plow: 'Ploughing the field' }[kind];
  if (kind === 'sow' && town.farmEcon) { const buy = farmSeedBuy(n, Math.min(8, list.length)); steps.push(...buy); if (!buy.length && !farmSeedCount(n)) return null; }   // (seed is bought, and kept back from the harvest; with none and the stall shut there is nothing to sow)
  for (let i = 0; i < 8 && list.length; i++) {
    let bi = 0, bd = 1e9; list.forEach((c, j) => { const d = Math.abs(c.x - cx) + Math.abs(c.y - cy); if (d < bd) { bd = d; bi = j; } });
    const c = list.splice(bi, 1)[0]; c.claim = n; n.claims.push(c); cx = c.x; cy = c.y;
    /* stand beside the plant, facing it, like the player does: along a row that is the tile just worked */
    let st = null; if (i && Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y) === 1) st = { x: prev.x, y: prev.y };
    if (!st) { let bd = 1e9; for (const [dx, dy] of DIRS) { const x = c.x + dx, y = c.y + dy; if (!walkable(x, y) || roomAt[y][x] >= 0) continue; const d = Math.hypot(x - n.tx, y - n.ty); if (d < bd) { bd = d; st = { x, y }; } } }
    if (!st) st = { x: c.x, y: c.y };
    steps.push(goS({ x: st.x, y: st.y, face: { dx: Math.sign(c.x - st.x), dy: Math.sign(c.y - st.y) } }, i ? 'Moving along the rows' : 'Heading to the fields'));
    prev = { x: c.x, y: c.y };
    steps.push(waitS(kind === 'plow' ? 3 : kind === 'harvest' ? 4 : 7, 'work', txt, { tool: 'hoe', onEnd(n) {
      if (kind === 'harvest') { if (c.st && cropStage(c) === 4) itHarvest(n, c); }
      else if (kind === 'sow') { if (!c.st && c.pl && fieldPlowed(c)) { const sk = town.farmEcon ? farmSow(n) : farmSeed(n); if (!sk) return; c.st = 1; c.t0 = game.time; c.seed = sk; if (!n.player) LIFE.emit('planted', n, { seed: c.seed, qty: 1 }); } }
      else c.pl = 1;
    } }));
  }
  return steps;
}
const fishOK = t => { const z = town.fishZones[t.z]; return z && z.stock >= 3; };
function fishAvail() { for (const k in town.fishZones) if (town.fishZones[k].stock >= 4) return true; return false; }
function fishPlan(n) {
  const pi = town.pondInfo; if (!shoreTiles.length) return null;
  const spots = nearTiles(shoreTiles, n, 9, fishOK);
  if (!spots.length) return [waitS(30, 'work', 'Mending nets while the fish recover', { tool: 'weave' })];
  const sp = spots[Math.floor(n.rand() * spots.length)], z = town.fishZones[sp.z];
  return [goS({ x: sp.x, y: sp.y, face: sp.face }, 'Walking to the water'),
    waitS(14, 'work', 'Fishing', { tool: 'fish', onEnd(n) {
      const p = (0.2 + 0.7 * z.stock / z.cap), r = n.rand();
      if (r < p && z.stock >= 1) { const q = r < p * 0.22 ? 2 : 1; z.stock -= q; pi.fishedToday += q; pi.fishedTotal += q; n.inv.fish = (n.inv.fish || 0) + q; }
    } })];
}
function treeList() {
  const tc = town.treeCache;
  if (tc && game.time - tc.t < 120 && tc.list.length) return tc.list;
  let list = [];
  for (const f of [1, 1.7, 2.6, 4.5]) {
  const R0 = (14 + town.clearR * 0.8 + Math.min(14, npcs.length * 0.25)) * f; list = [];
  const ms = town.markets.map(m => ({ x: m.x, y: m.y, r: m === town.markets[0] ? R0 + 6 : R0 }));
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; ms.forEach(m => { x0 = Math.min(x0, m.x - m.r); x1 = Math.max(x1, m.x + m.r); y0 = Math.min(y0, m.y - m.r * .7); y1 = Math.max(y1, m.y + m.r * .7); });
  for (let y = Math.max(1, Math.floor(y0)); y <= Math.min(H - 2, Math.ceil(y1)); y++) for (let x = Math.max(1, Math.floor(x0)); x <= Math.min(W - 2, Math.ceil(x1)); x++) {
    if (grid[y][x] !== T.TREE || (town.fmask && town.fmask[y * W + x])) continue;
    let d = 1e9; for (const m of ms) { const dd = Math.hypot((x - m.x) / m.r, (y - m.y) / (m.r * 0.7)); if (dd < d) d = dd; }
    if (d > 1) continue;
    let stand = null;
    for (const [dx, dy] of DIRS) { const sx = x + dx, sy = y + dy; if (walkable(sx, sy) && reach[sy * W + sx] && roomAt[sy][sx] < 0) { stand = { x: sx, y: sy, face: { dx: -dx, dy: -dy } }; break; } }
    if (stand) list.push({ x, y, stand, d });
  }
  if (list.length >= 6) break;
  }
  list.sort((a, b) => a.d - b.d); town.treeCache = { t: game.time, list };
  return list;
}
function woodPlan(n) {
  if (handsUsed(n) >= handsMax(n)) return null;
  const list = treeList(); let tr = null;
  for (let i = 0; i < Math.min(list.length, 40); i++) { const c = list[i]; const k = c.y * W + c.x; if (grid[c.y][c.x] === T.TREE && !town.treeClaim.has(k)) { tr = c; break; } }
  if (!tr) return null;
  const k = tr.y * W + tr.x; town.treeClaim.add(k);
  return [goS(tr.stand, 'Walking out to the tree line'), waitS(10, 'work', 'Felling a tree', { tool: 'axe', onEnd(n) {
    town.treeClaim.delete(k);
    if (grid[tr.y][tr.x] === T.TREE) { workFx('fall', tr.x, tr.y, n); setT(tr.x, tr.y, T.GRASS); markDirty(tr.x, tr.y, 1, 1); n.inv.wood = (n.inv.wood || 0) + 1; town.treeDirty = true; if (town.treeCache) town.treeCache.list = town.treeCache.list.filter(c => c !== tr); }
  } })];
}
function stoneList() {
  const sc = town.stoneCache;
  if (sc && game.time - sc.t < 240 && sc.list.length) return sc.list;
  const yd = town.yard, list = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (grid[y][x] !== T.ROCK) continue;
    let stand = null;
    for (const [dx, dy] of DIRS) { const sx = x + dx, sy = y + dy; if (walkable(sx, sy) && reach[sy * W + sx] && roomAt[sy][sx] < 0) { stand = { x: sx, y: sy, face: { dx: -dx, dy: -dy } }; break; } }
    if (stand) list.push({ x, y, stand, d: Math.hypot(x - yd.x, y - yd.y) });
  }
  list.sort((a, b) => a.d - b.d); town.stoneCache = { t: game.time, list: list.slice(0, 120) };
  return town.stoneCache.list;
}
function stonePlan(n) {
  if (handsUsed(n) >= handsMax(n)) return null;
  const list = stoneList(); let tr = null;
  for (let i = 0; i < Math.min(list.length, 40); i++) { const c = list[i]; if (grid[c.y][c.x] === T.ROCK && !town.treeClaim.has(c.y * W + c.x)) { tr = c; break; } }
  if (!tr) return null;
  const k = tr.y * W + tr.x; town.treeClaim.add(k);
  return [goS(tr.stand, 'Walking out to the rocks'), waitS(13, 'work', 'Breaking stone', { tool: 'hammer', onEnd(n) {
    town.treeClaim.delete(k);
    if (grid[tr.y][tr.x] === T.ROCK) { workFx('split', tr.x, tr.y, n); setT(tr.x, tr.y, T.GRASS); markDirty(tr.x, tr.y, 1, 1); n.inv.stone = (n.inv.stone || 0) + 1; itRockOre(n); town.treeDirty = true; town.stoneCache = null; }
  } })];
}
/* a free tile beside (x,y), facing it: people work what they face instead of standing on it */
function besideSpot(n, x, y) {
  let best = null, bd = 1e9;
  for (const [dx, dy] of DIRS) { const sx = x + dx, sy = y + dy; if (!walkable(sx, sy) || roomAt[sy][sx] >= 0 || !reach[sy * W + sx]) continue; const d = Math.hypot(sx - n.tx, sy - n.ty); if (d < bd) { bd = d; best = { x: sx, y: sy, face: { dx: -dx, dy: -dy } }; } }
  return best || { x, y, face: null };
}
function gatherPlan(n) {
  const ok = town.nodes.filter(x => x.amt >= 1 && !x.claim && reach[x.y * W + x.x]).sort((a, b) => Math.hypot(a.x - n.tx, a.y - n.ty) - Math.hypot(b.x - n.tx, b.y - n.ty));
  const nd = ok[Math.floor(n.rand() * Math.min(3, ok.length))]; if (!nd) return null;
  nd.claim = n; n.claims.push(nd);
  return [goS(nn => besideSpot(nn, nd.x, nd.y), nd.kind === 'berry' ? 'Walking out to the berry bushes' : 'Walking out to the herb patch'),
    waitS(7, 'work', nd.kind === 'berry' ? 'Picking berries' : 'Gathering herbs', { tool: 'pick', onEnd(n) {
      const t = Math.min(nd.amt, nd.kind === 'berry' ? 3 : 2); nd.amt -= t; if (t) { const g = nd.kind === 'berry' ? 'berries' : 'herbs'; n.inv[g] = (n.inv[g] || 0) + t; }
    } })];
}
function merchPlan(n, tod) {
  const m = n.shop, h = tod / 60, open = h >= m.def.open[0] && h < m.def.open[1];
  if (open) return [goS(m.post, m.post.hall ? 'Opening up at the market hall' : 'Opening up the stall'), waitS(14, 'work', m.post.hall ? 'Minding the counter at the market hall' : 'Minding the stall', { serve: true, tool: 'wipe' })];
  return null;
}
function demandFor(g) {
  let v = 0; merchants.forEach(m => { const p = buyPrice(m, g); if (p > 0) v += Math.min(m.buys[g] - (m.stock[g] || 0), 12) * p; });
  if (g === 'wood') v += 30;
  if (g === 'berries') v += 20;
  return v;
}
const CROP_YIELD = 3;
/** what a farmer sows: mostly barley (the staple the bakery needs), the rest a mix of the other food crops; the same villager keeps a liking for one or two */
function farmSeed(n) {
  const food = Object.keys(IT_SEEDS).filter(k => k !== 'barley' && !IT_SEEDS[k].flower), r = n.rand ? n.rand() : Math.random();
  if (town.farmEcon && r > 0.88) { const fl = Object.keys(IT_SEEDS).filter(k => IT_SEEDS[k].flower); return fl[(n.id * 5 + Math.floor(r * 1000)) % fl.length]; }   // (a few plots of flowers for the stall)
  if (r < 0.5) return 'barley';
  const fav = food[(n.id * 7) % food.length], fav2 = food[(n.id * 7 + 3) % food.length], q = (r - 0.5) * 2;   // 0..1 over the other half
  return q < 0.35 ? fav : q < 0.55 ? fav2 : food[Math.floor((q * 997) % food.length)];
}
const fieldPlowed = c => town.crops.every(o => o.f !== c.f || o.pl);
function farmWork(n?) { return town.crops.some(c => !c.claim && itFarmersPlot(c) && (!n || yardMine(n, c)) && ((c.st && cropStage(c) === 4) || !c.pl || (!c.st && c.pl && fieldPlowed(c)))); }
function foodDaysNow() {
  let t = 0; const seen = new Set(); const pop = Math.max(1, npcs.filter(n => !n.infant).length);
  npcs.forEach(n => { if (n.homeRoom && !seen.has(n.homeRoom)) { seen.add(n.homeRoom); t += foodSat(n.homeRoom.pantry || {}); } t += foodSat(n.inv); });
  merchants.forEach(m => FOODS.forEach(g => { t += (m.stock[g] || 0) * GOODS[g].sat; }));
  t += lf2FoodStock();
  return t / (pop * 300);
}
function pickAgenda(n) {
  if (n.cur && game.time < n.curUntil && modOn('job.' + n.cur)) return n.cur;
  const cnt = {}; npcs.forEach(p => { if (p !== n && p.role === 'Worker' && p.cur && !p.player) cnt[p.cur] = (cnt[p.cur] || 0) + 1; });   // (the villager you steer takes no job from anybody)
  const fd = foodDaysNow(), need = Math.max(0, 3.5 - fd), sc: any = {};
  if (shoreTiles.length && fishAvail()) sc.Fisher = 5 + need * 20;
  if (yardOn()) { if (farmWork(n)) sc.Farmer = 60; } else if (farmWork()) sc.Farmer = 5 + need * 18;   // (with yards, a household works its own fields and nobody else's)
  if (town.nodes.some(x => x.amt >= 1 && reach[x.y * W + x.x])) sc.Gatherer = 5 + need * 16;
  if (town.scenario === 'blank' && typeof lf2Room === 'function') { const ws = lf2Room('workshop'); if (ws && !n.player && (lf2Stock(ws).wood || 0) < 14 && ((cnt as any).Woodcutter || 0) < Math.max(1, Math.floor(npcs.length / 3)) && typeof carpWant === 'function' && carpWant()) sc.Woodcutter = 22; }   // (everybody helps with the wood the carpenter needs)
  if (typeof mineWork === 'function' && fd >= 2.0 && !n.player && mineWork()) sc.Miner = 14;   // (when the island is fed, somebody goes down to dig)
  { const foodOK = fd >= 3.0;
    if (foodOK) { if (sc.Fisher) sc.Fisher = 3; if (sc.Gatherer) sc.Gatherer = 3;
      const pw = town.crops.some(c => !c.claim && (!c.pl || (!c.st && c.pl && fieldPlowed(c))));
      if (pw && sc.Farmer) sc.Farmer = Math.max(sc.Farmer, 55); }
    else { const k = Math.min(1.6, 1 + (3.0 - fd) * 0.4); if (sc.Fisher) sc.Fisher *= k; if (sc.Farmer) sc.Farmer *= k; if (sc.Gatherer) sc.Gatherer *= k; } }
  { const pop = npcs.length, tasks = town.crops.filter(c => !c.claim && ((c.st && cropStage(c) === 4) || !c.pl || (!c.st && fieldPlowed(c)))).length;
    const capF = { Fisher: Math.max(1, Math.ceil(pop / 7)), Gatherer: Math.max(1, Math.ceil(pop / 7)), Farmer: Math.max(1, Math.ceil(tasks / 6)), Miner: Math.max(1, Math.floor(pop / 8)) };
    if (fd >= 1.5 && !yardOn()) for (const r in capF) if (sc[r] && (cnt[r] || 0) >= capF[r]) sc[r] *= 0.15; }
  lfJobBias(n, sc);
  for (const r of Object.keys(sc)) if (!modOn('job.' + r)) delete sc[r];   // (a switched-off job is nobody's choice: docs/world-modules.md)
  if (n.pref && sc[n.pref]) sc[n.pref] += 10;
  let best = n.role === 'Worker' ? 'Gatherer' : n.role, bs = -1;
  for (const r of Object.keys(sc)) {
    const v = sc[r] / (1 + 0.6 * (cnt[r] || 0)) * (n.cur === r ? 1.3 : 1) + Math.random() * 2;
    if (v > bs) { bs = v; best = r; }
  }
  n.cur = best; n.curUntil = game.time + 240; return best;
}
function workPlan(n, tod) {
  if (n.shop) return merchPlan(n, tod);
  if (n.role === 'Priest') return priestPlan(n, tod);
  if (n.role === 'Barkeep') return barPlan(n, tod);
  const span = awakeSpan(n), left = span - awakeFor(n, tod);
  if (n.role === 'Worker') {
    const r = pickAgenda(n);
    const mats = 0;
    const load = carried(n) - ((n.inv.wood || 0) + (n.inv.stone || 0)), thr0 = { Farmer: 12, Fisher: 6, Woodcutter: 99, Stonecutter: 99, Miner: 99, Gatherer: 8 }[r] || 8, thr = town.farmEcon && n.coin < 12 ? Math.min(thr0, 4) : thr0;   // (a farmer short of money takes the crop to market sooner)
    if (load >= thr || ((load > 0 || mats > 0) && left < 200)) { if (game.time >= n.sellCool || (n.inv.wood || 0) + (n.inv.stone || 0) > 0) { const hp = haulPlan(n); if (hp && hp.length) return hp; } }
    if (r === 'Farmer') return farmPlan(n) || (n.curUntil = 0, null);
    if (r === 'Fisher') return fishPlan(n) || (n.curUntil = 0, null);
    if (r === 'Woodcutter') return (town.scenario === 'blank' && typeof wcPlan === 'function' ? wcPlan(n) : woodPlan(n)) || (n.curUntil = 0, null);
    if (r === 'Stonecutter') return stonePlan(n) || (n.curUntil = 0, null);
    if (r === 'Miner') return minePlan(n) || (n.curUntil = 0, null);
    if (r === 'Gatherer') return gatherPlan(n) || (n.curUntil = 0, null);
  }
  return null;
}

/* ---------- the social goal: walk up to someone and bump into them ---------- */
function chatPlan(n, only?) {
  if (n.age < 5) return null;
  let best = null, bs = -1e9; const now = game.time;
  for (const o of only ? [only] : npcs) {
    if (o === n || o.dead || o.infant || o.inShip || o.age < 3 || o.pose === 'sleep' || o.talkUntil > now) continue;
    const key = Math.min(n.id, o.id) * 1000 + Math.max(n.id, o.id); if ((pairCool.get(key) || -1e9) > now) continue;
    const d = Math.abs(o.tx - n.tx) + Math.abs(o.ty - n.ty); if (!only && d > 34) continue;
    const kn = n.know[o.id] || 0, af = n.aff[o.id] || 0;
    let sc = -d * 0.16 + (kn < 45 ? 3 * (1 - kn / 45) : 0) + (af > 15 ? 1.5 : 0) + (af < -20 ? -4 : 0) + Math.random() * 2.5;
    if (n.fam.partner === o.id) sc += 6;
    if ((n.age < 16) !== (o.age < 16)) sc -= 2.5;
    if (sc > bs) { bs = sc; best = o; }
  }
  if (!best) return null;
  const o = best; n.chatTarget = o; n.chatUntil = now + 75;
  return [goS(() => ({ x: o.tx, y: o.ty, face: null }), 'Going to talk with ' + o.first), waitS(5, 'stand', 'Having a word with ' + o.first, { onEnd(n) { n.chatTarget = null; } })];
}

/* ---------- leisure and social life ---------- */
function meetSpot(n, p) {
  const k = Math.floor(game.time / 1440) * 31 + (n.id + p.id) * 17, pl = plazaNear(n), idx = Math.abs((k * 2654435761) >>> 0) % pl.length;
  const sh = shoreTiles.length ? nearTiles(shoreTiles, n, 6) : [];
  const t = sh.length && (k & 1) ? sh[Math.abs(k >> 1) % sh.length] : pl[idx]; return { x: t.x, y: t.y, face: t.face || null };
}
function leisurePlan(n, tod) {
  const h = tod / 60, has = t => n.traits.includes(t), opts: any = {};
  if (n.age < 16) { opts.plaza = 3; if (shoreTiles.length) opts.pond = 2; opts.home = 1; }
  else {
    opts.plaza = 1.5 + (100 - n.social) / 22 + (has('sociable') ? 1.5 : 0) + (h >= 16.5 && h < 19 ? 2 : 0); opts.home = 2 + (has('homebody') ? 3 : 0) - (n.social < 30 ? 1.5 : 0);
    if (shoreTiles.length) opts.pond = 1;
    if (town.tavern && h >= 17 && h < 23) opts.tavern = 2.5 + (has('sociable') ? 2 : 0) + (100 - n.social) / 30;
    const p = n.fam.partner && !n.fam.spouse ? byId(n.fam.partner) : null; if (p && !p.dead) opts.meet = 6;
    opts.chat = 1.5 + (100 - n.social) / 18 + (has('sociable') ? 1.5 : 0);
  }
  const k = wpick(n.rand, opts);
  if (k === 'meet') { const p = byId(n.fam.partner); const cp = chatPlan(n, p); if (cp) return cp.concat([waitS(30, 'leisure', 'Spending time with ' + p.first)]); }
  if (k === 'chat') { const cp = chatPlan(n); if (cp) return cp; }
  if (k === 'tavern') { const tv = town.tavern; return [goS(nn => { const s = tv.seats[Math.floor(nn.rand() * tv.seats.length)]; return { x: s.x, y: s.y, face: s.face, sit: true }; }, 'Heading to ' + tv.name), waitS(40 + n.rand() * 30, 'leisure', 'Having a drink at ' + tv.name, { onEnd(n) { n.social = Math.min(100, n.social + 14); if (n.coin >= 1) { const bk = npcs.find(p => p.role === 'Barkeep'); if (bk) { n.coin -= 1; bk.coin += 1; bk.earned += 1; } } } })]; }
  if (k === 'pond') return [goS(nn => pickFrom(nearTiles(shoreTiles, nn, 6), nn), n.age >= 16 ? 'Walking to the water' : 'Running to the water'), waitS(20 + n.rand() * 25, 'leisure', n.age >= 16 ? 'Taking a walk by the water' : 'Skipping stones on the water', { area: nearTiles(shoreTiles, n, 6), roam: [10, 22] })];
  if (k === 'plaza') return [goS(nn => pickFrom(plazaNear(nn), nn), n.age >= 16 ? 'Heading to the square' : 'Running off to play'), waitS(25 + n.rand() * 35, 'leisure', n.age >= 16 ? 'Catching up on the square' : 'Playing on the square', { area: plazaNear(n), roam: [n.age >= 16 ? 25 : 8, n.age >= 16 ? 55 : 18] })];
  return [goS(homeSpot, 'Heading home'), waitS(25 + n.rand() * 25, 'leisure', n.role === 'Elder' ? 'Dozing by the window' : 'Relaxing at home')];
}

