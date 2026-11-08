/* ================= life2 / town: workplaces, trades, coins, prices that follow supply ================= */
Object.assign(GOODS, { bread: { base: 2, sat: 34, name: 'bread' }, stew: { base: 4, sat: 46, name: 'stew' }, tools: { base: 16, name: 'tools' }, cloth: { base: 9, name: 'cloth' },
  iron: { base: 6, name: 'iron' }, wool: { base: 3, name: 'wool' }, wine: { base: 1, name: 'wine' } });
FOODS.push('bread', 'stew');
T.POOL = 31; BLOCKED.add(T.POOL);
const LF2_BLD = { bakery: 'The Bakery', smithy: 'The Smithy', shop: 'The Taberna', thermopolium: 'The Thermopolium', baths: 'The Baths', jail: 'The Carcer', macellum: 'The Market Hall' };
Object.keys(LF2_BLD).forEach(k => { BUILDING[k] = 1; });
/* what each workplace sells, and how much stock counts as "plenty" (prices rise as stock runs low) */
const LF2_SELL = { bakery: { bread: 14 }, thermopolium: { stew: 8 }, smithy: { tools: 4 }, shop: { tools: 3, cloth: 4, bread: 6 } };
const LF2_JOBS = {
  Guard: { name: 'Watchman', room: 'jail', n: p => p < 16 ? 1 : Math.min(3, Math.max(2, Math.round(p / 12))), fit: ['brave', 'proud', 'grumpy'], unfit: ['shy', 'anxious', 'lazy'], wage: 9 },
  Baker: { name: 'Baker', room: 'bakery', spot: 'oven', tool: 'wipe', text: 'Kneading and baking bread', recipe: { in: { grain: 2 }, out: { bread: 4 }, min: 40 }, fetch: { grain: 6 }, fit: ['early bird', 'cheerful'] },
  Cook: { name: 'Cook', room: 'thermopolium', spot: 'cook', tool: 'wipe', text: 'Stirring the stew pots', recipe: { in: { fish: 1, grain: 1 }, out: { stew: 3 }, min: 35 }, fetch: { fish: 4, grain: 4 }, fit: ['generous', 'jovial'] },
  Smith: { name: 'Blacksmith', room: 'smithy', spot: 'work', tool: 'hammer', text: 'Hammering at the anvil', recipe: { in: { iron: 1 }, out: { tools: 1 }, min: 80 }, fit: ['brave', 'grumpy'] },
  Shopkeeper: { name: 'Shopkeeper', room: 'shop', spot: 'counter', fit: ['sociable', 'greedy'] },
  Weaver: { name: 'Weaver', room: 'shop', spot: 'loom', tool: 'wipe', text: 'Weaving cloth at the loom', recipe: { in: { wool: 2 }, out: { cloth: 1 }, min: 70 }, fit: ['dreamy', 'shy'] },
  BathKeeper: { name: 'Bath keeper', room: 'baths', spot: 'keeper', fit: ['jovial', 'sociable'], wage: 4 },
  Builder: { name: 'Builder', room: null, fit: ['curious', 'brave'], wage: 7 },
  Labourer: { name: 'Labourer', room: null, fit: ['brave'], unfit: ['lazy'], wage: 6 }
};
const LF2_JOBORDER = ['Guard', 'Baker', 'Cook', 'Smith', 'Shopkeeper', 'Builder', 'BathKeeper', 'Labourer', 'Weaver'];
const lf2Busy = (n, tod) => !!LF2_JOBS[n.job] && working(n, tod);
const lf2Room = kind => rooms.find(r => !r.dead && r.kind === kind) || null;
const lf2Work = n => { const J = LF2_JOBS[n.job]; return J && J.room ? lf2Room(J.room) : null; };
const lf2Stock = r => r.stock || (r.stock = {});
const lf2Spot = (r, k) => r && r.spots && r.spots[k] ? Object.assign({}, r.spots[k]) : null;

/* the new rooms: furniture for the kinds the old builder does not know */
function lf2Furnish(kind, room, put, spot, seat, bed, w, h, doorU) {
  if (kind === 'thermopolium') {
    put(w - 2, 1, T.OVEN); for (let u = 2; u <= w - 3; u++) put(u, 2, T.COUNTER);
    spot('cook', 3, 1, 0, 1); spot('front', 3, 3, 0, -1);
    seat(1, h - 3, 1, 0); seat(w - 2, h - 3, -1, 0); seat(1, h - 2, 0, -1); seat(w - 2, h - 2, 0, -1);
  } else if (kind === 'mill') {
    // the sawmill: a saw bench along the back
    for (let u = 2; u <= w - 3; u++) put(u, 2, T.COUNTER);   // (no barrels: both ends of the bench must stay clear to reach the saw, whichever side the door is on)
    spot('saw', 3, 1, 0, 1); spot('front', 3, 3, 0, -1);
  } else if (kind === 'macellum') {
    // the market hall: a counter for each seller along the back, with room to stand behind it and a place for customers in front
    const us = [2, 4, 6, 8].filter(u => u <= w - 2); us.forEach((u, i) => { put(u, 2, T.COUNTER); spot('post' + i, u, 1, 0, 1); spot('front' + i, u, 3, 0, -1); });
    put(1, h - 2, T.BARREL); put(w - 2, h - 2, T.BARREL);
  } else if (kind === 'baths') {
    for (let u = 3; u <= w - 4; u++) for (let v = 2; v <= h - 4; v++) put(u, v, T.POOL);
    for (let u = 3; u <= w - 4; u++) { seat(u, 1, 0, 1); if (u !== doorU) seat(u, h - 3, 0, -1); }
    seat(2, 3, 1, 0); seat(w - 3, 3, -1, 0); put(1, 1, T.OVEN); spot('keeper', 1, h - 2, 1, 0); spot('front', 2, h - 2, -1, 0);
  } else if (kind === 'jail') {
    bed(1, 1); seat(w - 2, 1, 0, 1); spot('cell', 2, 2, 0, 1); spot('desk', w - 2, h - 2, -1, 0);
  }
}
function lf2DrawPool(g, x, y) {
  const X = x * TS, Y = y * TS, up = grid[y - 1][x] !== T.POOL, dn = grid[y + 1][x] !== T.POOL, lf = grid[y][x - 1] !== T.POOL, rt = grid[y][x + 1] !== T.POOL;
  g.fillStyle = '#5a9fb8'; g.fillRect(X, Y, TS, TS);
  g.fillStyle = 'rgba(255,255,255,.18)'; const h = ART.h32(x, y, 3, 7); g.fillRect(X + 4 + h * 8, Y + 6 + h * 6, 7, 1.4); g.fillRect(X + 12 - h * 6, Y + 15, 6, 1.2);
  g.fillStyle = '#d9cfb8'; if (up) g.fillRect(X, Y, TS, 3); if (dn) g.fillRect(X, Y + TS - 3, TS, 3); if (lf) g.fillRect(X, Y, 3, TS); if (rt) g.fillRect(X + TS - 3, Y, 3, TS);
  g.fillStyle = 'rgba(30,60,80,.25)'; if (up) g.fillRect(X, Y + 3, TS, 2); if (lf) g.fillRect(X + 3, Y, 2, TS);
}

/* ---------------- the ready-built Roman quarter ---------------- */
function lf2Prebuild() {
  // the town has cleared the scattered trees around the forum
  const mk = town.markets[0], cx = mk ? mk.x + (mk.w >> 1) : town.cx, cy = mk ? mk.y + (mk.h >> 1) : town.cy, R = rng(town.seed + 4242);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { if (grid[y][x] !== T.TREE || wildTile(x, y) || roomAt[y][x] >= 0 || Math.hypot(x - cx, y - cy) > 40 || R() < 0.12) continue; setT(x, y, T.GRASS); }
  town.treeDirty = true; town.treeCache = null; refreshReach();
  // tradespeople come to settle: each brings a trade the town needs, and gets a house
  const before = town.chron.length, trades = ['Baker', 'Guard', 'Smith', 'Cook', 'Shopkeeper', 'BathKeeper'];
  for (const job of trades) {
    const k = npcs.length, t0 = game.time; game.time = t0 + 1 + trades.indexOf(job) * 37 + (k % 5) * 3; settlerArrives(); game.time = t0; const grp = npcs.slice(k); if (!grp.length) continue;
    const used = new Set(npcs.filter(o => !grp.includes(o)).map(o => o.surname)), sn = SURNAMES.find(x => !used.has(x)) || grp[0].surname; grp.forEach(n => { n.surname = sn; });
    grp[0].lf2Want = job; const beds = Math.min(6, grp.length + 1), d = houseDims(beds);
    for (const x of [{}, { tight: true }, { clear: true }, { tight: true, clear: true }]) if (lfBuild('house', d.w, d.h, Object.assign({ beds, owners: grp.slice(), surname: grp[0].surname }, x))) break;
    if (grp[0].homeRoom) { const p = grp[0].homeRoom.pantry; p.berries = 3 * grp.length; p.fish = 2 * grp.length; p.grain = 2 * grp.length; }
    grp.forEach(n => { n.coin = 25 + Math.floor(R() * 20); n.inv = {}; });
  }
  town.chron.length = before;
  // more land under the plough to feed the newcomers
  for (let i = 0; i < 2; i++) lfBuild('field', 10, 5, {}) || lfBuild('field', 8, 4, {}) || lfBuild('field', 8, 4, { clear: true });
  const tries = { bakery: [[7, 7], [7, 6]], smithy: [[8, 7], [8, 6]], shop: [[9, 8], [8, 7]], thermopolium: [[7, 6], [7, 5]], baths: [[11, 8], [11, 7], [10, 7]], jail: [[7, 6], [6, 5]], macellum: [[10, 6], [10, 7], [9, 6]], mill: [[7, 6], [7, 5], [6, 5]] };
  for (const k of Object.keys(tries)) {
    if (lf2Room(k)) continue;
    let ok = null; for (const [w, h] of tries[k]) { for (const o of [{}, { tight: true }, { clear: true }, { tight: true, clear: true }]) { ok = lfBuild(k, w, h, Object.assign({}, o)); if (ok) break; } if (ok) break; }
  }
  const st = (k, o) => { const r = lf2Room(k); if (r) Object.assign(lf2Stock(r), o); };
  st('bakery', { grain: 6, bread: 8 }); st('thermopolium', { fish: 3, grain: 3, stew: 4 }); st('smithy', { iron: 4, tools: 3 }); st('shop', { wool: 4, cloth: 2, tools: 1, bread: 2 });
  npcs.forEach(n => { if (n.age >= 16 && n.toolQ == null) n.toolQ = 40 + Math.random() * 60; n.clean = 60 + Math.random() * 40; });
  lf2AssignJobs(true); moveSellersIndoors();
}
function lf2AssignJobs(first) {
  const pool = npcs.filter(n => !n.dead && !n.player && n.role === 'Worker' && n.age >= 18 && n.age < 60 && !n.shop);
  const pop = npcs.filter(n => !n.dead).length, maxTrades = Math.max(2, Math.ceil(pool.length * 0.6));
  let have = pool.filter(n => LF2_JOBS[n.job]).length;
  // settlers who came for a trade take it up first
  for (const n of pool) if (n.lf2Want && !LF2_JOBS[n.job] && !((n.lf2NoTrade || 0) > game.time)) { const J = LF2_JOBS[n.lf2Want]; if (!J.room || lf2Room(J.room)) { lf2SetJob(n, n.lf2Want, first); have++; } }
  for (const k of LF2_JOBORDER) {
    const J = LF2_JOBS[k]; if (J.room && !lf2Room(J.room)) continue;
    const want = J.n ? J.n(pop) : 1;
    while (npcs.filter(n => !n.dead && n.job === k).length < want && have < maxTrades) {
      const c = pool.filter(n => !LF2_JOBS[n.job] && !((n.lf2NoTrade || 0) > game.time)).map(n => ({ n, s: (J.fit || []).reduce((s, t) => s + (lf2Has(n, t) ? 3 : 0), 0) - (J.unfit || []).reduce((s, t) => s + (lf2Has(n, t) ? 4 : 0), 0) + Math.random() * 2 })).sort((a, b) => b.s - a.s)[0];
      if (!c) break;
      lf2SetJob(c.n, k, first); have++;
    }
  }
}
function lf2SetJob(n, k, quiet) {
  const old = n.job; n.job = k; n.cur = null; n.curUntil = 0; n.jobSat = 60;
  if (k === 'Guard') { n.hat = 'helmet'; n.hatCol = GUARD_UNIFORM.helmet; n.shirt = GUARD_UNIFORM.tunic; if (typeof updateLook === 'function') updateLook(n); }   // the uniform itself is drawn in gaSpec
  if (!quiet) { chron(`${nameOf(n)} became the ${LF2_JOBS[k].name.toLowerCase()}${old && LF_JOBN && LF_JOBN[old] ? ', giving up ' + LF_JOBN[old] : ''}.`, 'life'); addMem(n, 'job', `the day I became the ${LF2_JOBS[k].name.toLowerCase()}`, null, null); }
}

/* ---------------- prices: scarce things cost more ---------------- */
function lf2Price(r, g, buyer?) {
  const tgt = (LF2_SELL[r.kind] || {})[g] || 6, s = lf2Stock(r)[g] || 0;
  let p = GOODS[g].base * (1.75 - 0.95 * Math.min(1, s / tgt));
  if (buyer && LF2.on('gossip')) { const k = lf2Server(r); if (k && (k.aff[buyer.id] || 0) < -30) p *= 1.5; }
  return Math.max(1, Math.round(p));
}
function lf2Server(r) {
  if (!r) return null;
  for (const n of npcs) { if (n.dead || n.player || n.pose === 'sleep' || n.jail) continue; const J = LF2_JOBS[n.job]; if (!J || J.room !== r.kind) continue; if (J.spot === 'loom') continue;
    const s = r.spots && r.spots[J.spot]; if (s && Math.abs(n.tx - s.x) + Math.abs(n.ty - s.y) <= 2) return n; }
  return null;
}
function lf2Buy(n, r, g, qty) {
  const s = lf2Stock(r); let got = 0, paid = 0;
  while (got < qty && (s[g] || 0) > 0) { const p = lf2Price(r, g, n); if (n.coin < p) break; n.coin -= p; r.till = (r.till || 0) + p; s[g]--; got++; paid += p; }
  if (got) { n.inv[g] = (n.inv[g] || 0) + got; (town.lf2Sales = town.lf2Sales || []).push({ t: game.time, g, q: got, p: paid, who: n.id, r: r.kind }); if (town.lf2Sales.length > 300) town.lf2Sales.shift(); }
  return got;
}
/* the larder pays the people who fill it (the grain dole stays free to eat) */
function lf2Paid(n, tot) { if (LF2.on('economy') && n) n.coin += tot * 0.5; }

/* ---------------- the working day ---------------- */
function lf2GoWork(r, key, text, min, act, o?) { const s = lf2Spot(r, key); if (!s) return null; return [goS(s, text), waitS(min, act || 'stand', text, o)]; }
const lf2Reserve = g => Math.ceil(npcs.filter(o => !o.dead).length * (g === 'grain' ? 1.2 : 0.6));
const lf2FoodStock = () => { let t = 0; for (const r of rooms) if (!r.dead && r.stock) for (const g of FOODS) t += (r.stock[g] || 0) * GOODS[g].sat; return t; };
function lf2FetchPlan(n, r, need) {
  const spare = (m, g) => Math.floor((m.stock[g] || 0) - lf2Reserve(g));
  const m = merchants.filter(m => Object.keys(need).some(g => spare(m, g) >= 2))[0]; if (!m) return null;
  return [goS(m.front, `Fetching ${Object.keys(need).join(' and ')} from the larder`), waitS(2, 'stand', 'Loading up at the larder', { nopie: true, onEnd(nn) {
    for (const g in need) { const q = Math.min(need[g], spare(m, g)); if (q > 0) { m.stock[g] -= q; nn.inv[g] = (nn.inv[g] || 0) + q; } } } }),
    goS(lf2Spot(r, 'front') || lf2Spot(r, LF2_JOBS[n.job] ? LF2_JOBS[n.job].spot : 'front'), 'Carrying it back to ' + r.name), waitS(1, 'stand', 'Unloading', { nopie: true, onEnd(nn) { const s = lf2Stock(r); for (const g in need) { const q = nn.inv[g] || 0; if (q > 0) { s[g] = (s[g] || 0) + q; nn.inv[g] = 0; } } } })];
}
function lf2Craft(n, r, J) {
  const s = lf2Stock(r), R = J.recipe;
  return lf2GoWork(r, J.spot, J.text, R.min, 'work', { tool: J.tool, onEnd(nn) {
    if (r.broken) return; if (!Object.keys(R.in).every(g => (s[g] || 0) >= R.in[g])) return;
    for (const g in R.in) s[g] -= R.in[g]; for (const g in R.out) s[g] = (s[g] || 0) + R.out[g];
    nn.made = (nn.made || 0) + 1;
  } });
}
const lf2Full = (r, g) => (lf2Stock(r)[g] || 0) >= ((LF2_SELL[r.kind] || {})[g] || 6) * 1.4;
function lf2WorkPlan(n, tod) {
  const J = LF2_JOBS[n.job]; if (!J || n.player) return null;
  if (n.job === 'Guard') return typeof lf2GuardPlan === 'function' ? lf2GuardPlan(n, tod) : null;
  if (n.job === 'Builder') return lf2BuilderPlan(n, tod);
  if (n.job === 'Labourer') return lf2LabourPlan(n, tod);
  const r = lf2Work(n); if (!r) return null;
  if (J.recipe) {
    if (r.broken) { if (Math.random() < 0.3) lfShout(n, anyOf([`Who broke my ${r.broken.what}?!`, `I cannot work like this. The ${r.broken.what} is ruined.`])); return lf2GoWork(r, J.spot, `Waiting for someone to mend the ${r.broken.what}`, 25, 'stand'); }
    const s = lf2Stock(r), R = J.recipe, out = Object.keys(R.out)[0];
    if (!Object.keys(R.in).every(g => (s[g] || 0) >= R.in[g])) {
      if (n.job === 'Miller') { const f = itMillerLogs(n, r); if (f) return f; }   // (life2/items-trade.ts)
      if (J.fetch && !npcs.some(o => o.job === 'Labourer' && !o.dead && o.lf2Haul === r.kind)) { const f = lf2FetchPlan(n, r, J.fetch); if (f) return f; }
      return lf2GoWork(r, J.spot, `Out of ${Object.keys(R.in).join(' and ')}. Waiting for more`, 20, 'stand');
    }
    if (!lf2Full(r, out)) return lf2Craft(n, r, J);
    return lf2GoWork(r, J.spot, 'Minding the counter', 25, 'stand', { roam: [8, 14], area: [lf2Spot(r, J.spot)] });
  }
  if (n.job === 'Shopkeeper') {
    const sm = lf2Room('smithy'), bk = lf2Room('bakery'), s = lf2Stock(r);
    if ((s.tools || 0) < 2 && sm && (lf2Stock(sm).tools || 0) >= 2 && !npcs.some(o => o.job === 'Labourer' && !o.dead)) return lf2MovePlan(n, sm, r, { tools: 2 });
    if ((s.bread || 0) < 2 && bk && (lf2Stock(bk).bread || 0) >= 8 && !npcs.some(o => o.job === 'Labourer' && !o.dead)) return lf2MovePlan(n, bk, r, { bread: 4 });
    return lf2GoWork(r, 'counter', 'Minding the shop', 30, 'stand');
  }
  if (n.job === 'BathKeeper') return Math.random() < 0.4 ? lf2GoWork(lf2Room('baths'), 'keeper', 'Stoking the furnace under the baths', 30, 'work', { tool: 'wipe' }) : lf2GoWork(r, 'keeper', 'Taking coins at the door of the baths', 30, 'stand');
  return null;
}
/* carry goods from one workplace to another (the seller is paid on delivery) */
function lf2MovePlan(n, a, b, what) {
  const g = Object.keys(what)[0];
  return [goS(lf2Spot(a, 'front'), `Collecting ${GOODS[g].name} from ${a.name}`), waitS(2, 'stand', 'Loading up', { nopie: true, onEnd(nn) { const s = lf2Stock(a), q = Math.min(what[g], s[g] || 0); s[g] -= q; nn.inv[g] = (nn.inv[g] || 0) + q; a.till = (a.till || 0) + q * GOODS[g].base * 0.6; } }),
    goS(lf2Spot(b, 'front'), `Carrying ${GOODS[g].name} to ${b.name}`), waitS(1, 'stand', 'Unloading', { nopie: true, onEnd(nn) { const s = lf2Stock(b), q = nn.inv[g] || 0; s[g] = (s[g] || 0) + q; nn.inv[g] = 0; } })];
}
function lf2LabourPlan(n, tod) {
  n.tidy = true; n.lf2Haul = null;
  const bk = lf2Room('bakery'), th = lf2Room('thermopolium'), sm = lf2Room('smithy'), sh = lf2Room('shop');
  if (bk && (lf2Stock(bk).grain || 0) < 4) { const f = lf2FetchPlan(n, bk, { grain: 8 }); if (f) { n.lf2Haul = 'bakery'; return f; } }
  if (th && ((lf2Stock(th).fish || 0) < 2 || (lf2Stock(th).grain || 0) < 2)) { const f = lf2FetchPlan(n, th, { fish: 4, grain: 4 }); if (f) { n.lf2Haul = 'thermopolium'; return f; } }
  if (sh && sm && (lf2Stock(sh).tools || 0) < 2 && (lf2Stock(sm).tools || 0) >= 2) return lf2MovePlan(n, sm, sh, { tools: 2 });
  if (sh && bk && (lf2Stock(sh).bread || 0) < 3 && (lf2Stock(bk).bread || 0) >= 8) return lf2MovePlan(n, bk, sh, { bread: 4 });
  const tp = typeof lfTidyPlan === 'function' ? lfTidyPlan(n) : null; if (tp) return tp;
  const mk = town.markets[0]; return mk ? [goS(() => floorSpot(null, n), 'Looking for work about the forum'), waitS(20, 'stand', 'Waiting for someone to need a strong back')] : null;
}
function lf2BuilderPlan(n, tod) {
  n.tidy = true;
  const br = rooms.find(r => !r.dead && r.broken);
  if (br) { const sp = lf2Spot(br, br.broken.spot) || lf2Spot(br, 'front'); if (sp) return [goS(sp, `Going to mend the ${br.broken.what} at ${br.name}`), waitS(35, 'work', `Mending the ${br.broken.what}`, { tool: 'hammer', onEnd(nn) { if (br.broken) { const w = br.broken; br.broken = null; lfEmit('repair', { actor: nn, sev: 1, tags: ['help'], chron: true, text: `${nn.first} mended the ${w.what} at ${br.name}` }); } } })]; }
  const tp = typeof lfTidyPlan === 'function' ? lfTidyPlan(n) : null; if (tp) return tp;
  const r = anyOf(rooms.filter(r => !r.dead && r.kind !== 'privy')); if (!r) return null;
  const b = besideTile(r.doorX, r.side === 'b' ? r.doorY + 1 : r.doorY - 1, null);
  return b ? [goS({ x: b.x, y: b.y, face: null }, `Checking the walls of ${r.name}`), waitS(30, 'work', `Patching the plaster on ${r.name}`, { tool: 'hammer' })] : null;
}

/* ---------------- customers: bread in the morning, stew at noon, new tools when the old ones wear out ---------------- */
function lf2ShopPlan(n, tod) {
  if (!LF2.on('economy') || n.age < 16 || n.player || n.jail || (n.lf2Shop || 0) > game.time || lf2Busy(n, tod)) return null;
  n.lf2Shop = game.time + 45; const h = tod / 60;
  const go = (r, g, q, text, after?) => { const f = lf2Spot(r, 'front'); if (!f) return null; return [goS(f, text), waitS(2, 'stand', 'Buying ' + GOODS[g].name, { nopie: true, onEnd(nn) {
    if (!lf2Server(r) && r.kind !== 'shop') { lfShout(nn, anyOf(['Nobody serving? Typical.', 'Closed again!'])); return; }
    if (!(lf2Stock(r)[g] > 0)) { lfShout(nn, anyOf([`No ${GOODS[g].name} left?!`, `Sold out of ${GOODS[g].name}. Again.`])); lfMod(nn, 'soldout', `cross that the ${GOODS[g].name} ran out`, -4, 300); (town.lf2Short = town.lf2Short || {})[g] = game.time; return; }
    const got = lf2Buy(nn, r, g, q); if (got && after) after(nn, got); } })].concat(after && after.eat ? [] : []); };
  // bread for the household, once a morning
  const bk = lf2Room('bakery');
  if (bk && h >= 6.5 && h < 10.5 && n.homeRoom && n.coin >= 4 && (n.homeRoom.breadDay || -1) !== dayN() && (hhOf(n).filter(o => o.age >= 16 && !LF2_JOBS[o.job])[0] || hhOf(n).filter(o => o.age >= 16)[0]) === n) { n.homeRoom.breadDay = dayN(); const k = Math.min(hhOf(n).length, 4); return go(bk, 'bread', k, 'Off to the bakery for the morning bread'); }
  // lunch out, for those with coins to spare
  const th = lf2Room('thermopolium');
  if (th && h >= 11.5 && h < 13.5 && n.hunger >= 35 && n.coin >= 8 && (n.lunchDay || -1) !== dayN() && Math.random() < 0.5) {
    n.lunchDay = dayN(); const seat = (th.seats || []).find(s => !npcs.some(o => o !== n && o.tx === s.x && o.ty === s.y));
    const p = go(th, 'stew', 1, 'Going to the thermopolium for a bowl of stew'); if (!p) return null;
    return p.concat(seat ? [goS(seat, 'Finding a seat'), waitS(18, 'eat', 'Eating stew at the thermopolium', { hold: 'plate', social: true, onEnd(nn) { if (nn.inv.stew > 0) { nn.inv.stew--; nn.hunger = Math.max(0, nn.hunger - 46); lfMod(nn, 'stew', 'had a hot lunch', 5, 300); } } })] : []);
  }
  // a new tool when the old one is worn out
  if (n.toolQ != null && n.toolQ < 25 && n.role === 'Worker' && !LF2_JOBS[n.job]) {
    const src = [lf2Room('smithy'), lf2Room('shop')].filter(r => r && (lf2Stock(r).tools || 0) > 0 && n.coin >= lf2Price(r, 'tools', n))[0];
    if (src) return go(src, 'tools', 1, 'Off to buy a new tool, the old one is worn out', (nn) => { nn.inv.tools--; itNpcNewTool(nn); lfMod(nn, 'newtool', 'pleased with a new tool', 4, 400); });
    if ((n.lf2Grumble || 0) < game.time) { n.lf2Grumble = game.time + 600; lfMod(n, 'blunt', 'struggling with a worn-out tool', -5, 700); }
  }
  // new clothes, now and then, for those doing well
  const sh = lf2Room('shop');
  if (sh && n.coin >= 40 && Math.random() < 0.08 && (lf2Stock(sh).cloth || 0) > 0) return go(sh, 'cloth', 1, 'Treating themself to new cloth', (nn) => { nn.inv.cloth--; lfMod(nn, 'newclothes', 'showing off a new tunic', 6, 900); lfEmit('newclothes', { actor: nn, sev: 1, tags: ['rich'], chron: false, text: `${nn.first} has a fine new tunic` }); });
  return null;
}

/* ---------------- the player at a counter: buy, steal, sabotage ---------------- */
function lf2CounterRoom(x, y) { const ri = roomAt[y] && roomAt[y][x]; if (ri == null || ri < 0) return null; const r = rooms[ri]; return r && LF2_SELL[r.kind] ? r : null; }
const LF2_STATION = { [T.OVEN]: 'oven', [T.FORGE]: 'forge', [T.ANVIL]: 'anvil', [T.LOOM]: 'loom' };
function lf2TradeDialog(n, r) {
  const k = lf2Server(r); if (!k) { playerSay(n, `Nobody is serving at ${r.name}.`); return; }
  if ((k.aff[n.id] || 0) < -55 && LF2.on('gossip')) { lf2Dialog(k, anyOf([`I do not serve your kind. Out.`, `After what you did? Get out of my shop.`]), []); return; }
  let menu = () => {
    const s = lf2Stock(r), goods = Object.keys(LF2_SELL[r.kind] || {});
    const o = goods.flatMap(g => itOffers(n, r, g, menu) || [[`${lf2Cap(GOODS[g].name)}: ${s[g] > 0 ? lf2Price(r, g, n) + LF2_COIN + ' (' + s[g] + ' left)' : 'sold out'}`, () => {
      if (!(s[g] > 0)) return { say: `We are out of ${GOODS[g].name}. ${g === 'bread' ? 'The oven has not caught up.' : 'Come back tomorrow.'}`, opts: menu() };
      const p = lf2Price(r, g, n); if (n.coin < p) return { say: `That is ${p} denarii, and you have ${Math.floor(n.coin)}.`, opts: menu() };
      lf2Buy(n, r, g, 1); if (g === 'tools') { n.inv.tools--; itNpcNewTool(n); }
      return { say: anyOf(['There you are.', 'Enjoy it.', 'Pleasure doing business.']) + (s[g] < 2 ? ` That was nearly the last of the ${GOODS[g].name}.` : ''), opts: menu() };
    }]]).concat(itExtras(n, r, menu));
    return o;
  };
  const sc = Object.keys(LF2_SELL[r.kind]).filter(g => (lf2Stock(r)[g] || 0) < 2);
  const menu0 = menu; menu = () => menu0().concat([['Just talk', () => { setTimeout(() => openTalk(k), 0); return null; }]]);
  lf2Dialog(k, (sc.length ? `${lf2Cap(GOODS[sc[0]].name)} is short today, so it costs more. ` : '') + anyOf(['What can I get you?', 'Yes?', `Welcome to ${r.name}.`]), menu());
}
function lf2Sabotage(n, r, x, y) {
  const what = LF2_STATION[grid[y][x]] || 'counter', J = Object.keys(LF2_JOBS).find(k => LF2_JOBS[k].room === r.kind && LF2_JOBS[k].recipe);
  r.broken = { what, spot: J ? LF2_JOBS[J].spot : 'front', t: game.time, by: n.id };
  const w = J ? npcs.find(o => o.job === J && !o.dead) : null;
  const ev = lfEmit('sabotage', { actor: n, target: w, x, y, sev: 2, aware: false, tags: ['sabotage', 'crime', 'harm'], chron: false, text: `${n.first} wrecked the ${what} at ${r.name}` });
  r.broken.ev = ev.id; lf2Say(n, `The ${what} will not work until somebody mends it.`);
}
function lf2StealStock(n, r, g) {
  const s = lf2Stock(r); if (!(s[g] > 0)) { lf2Say(n, 'Nothing to take.'); return; }
  const q = Math.min(s[g], g === 'tools' ? 1 : 2); s[g] -= q; n.inv[g] = (n.inv[g] || 0) + q; lf2Say(n, 'Swiped ' + q + ' ' + GOODS[g].name + '.');
  lfEmit('theft', { actor: n, target: lf2Server(r) || npcs.find(o => LF2_JOBS[o.job] && LF2_JOBS[o.job].room === r.kind && !o.dead), x: n.tx, y: n.ty, sev: g === 'tools' ? 2 : 1, aware: false, value: q * GOODS[g].base, tags: ['theft', 'crime'], chron: false, text: `${n.first} swiped ${q} ${GOODS[g].name} from ${r.name}` });
}
LF2.pre.push({ player(n, p, fx, fy) {
  const r = lf2CounterRoom(fx, fy), g = grid[fy] && grid[fy][fx];
  if (r && (g === T.COUNTER || (r.kind === 'smithy' && (g === T.ANVIL || g === T.FORGE)))) return { key: 'trade' + r.id, min: 0.6, text: 'Stepping up to the counter', run(nn) { lf2TradeDialog(nn, r); } };
  return null;
} });
LF2.pre.push({ person(n, p, o) {
  if (!itTalking(n)) return null; /* Talk buys; Push pushes past the seller */ const J = LF2_JOBS[o.job]; if (!J || !J.room) return null; const r = lf2Room(J.room);
  if (r && LF2_SELL[r.kind] && lf2Server(r) === o) return { key: 'trade' + o.id, min: 0.6, text: 'Stepping up to ' + o.first, run(nn) { lf2TradeDialog(nn, r); } };
  return null;
} });
LF2.verbs.push((n, x, y, o, add) => {
  if (o) return null; const ri = roomAt[y] && roomAt[y][x]; if (ri == null || ri < 0) return null; const r = rooms[ri]; if (!r || !(LF2_SELL[r.kind] || r.kind === 'baths')) return null;
  const g = grid[y][x];
  if (LF2_SELL[r.kind] && (g === T.COUNTER || LF2_STATION[g])) {
    add('Buy something', nn => lf2TradeDialog(nn, r));
    for (const k of Object.keys(LF2_SELL[r.kind])) if ((lf2Stock(r)[k] || 0) > 0) add('Steal ' + GOODS[k].name, nn => lf2StealStock(nn, r, k), 2, 'Reaching over the counter', 'pick');
    add('Look at the stock', nn => lf2Say(nn, Object.keys(LF2_SELL[r.kind]).map(k => `${GOODS[k].name}: ${lf2Stock(r)[k] || 0} at ${lf2Price(r, k, nn)}${LF2_COIN}`).join(', ') + (r.broken ? `. The ${r.broken.what} is broken.` : '')));
  }
  if (LF2_STATION[g] && !r.broken) add('Wreck the ' + LF2_STATION[g], nn => lf2Sabotage(nn, r, x, y), 4, 'Quietly wrecking the ' + LF2_STATION[g], 'hammer');
  return r.name;
});

/* ---------------- money comes and goes: once a day ---------------- */
function lf2Payday() {
  if (!LF2.on('economy')) return;
  for (const r of rooms) { if (r.dead || !r.till) continue; const ws = npcs.filter(n => !n.dead && LF2_JOBS[n.job] && LF2_JOBS[n.job].room === r.kind && !LF2_JOBS[n.job].wage); const tax = r.till * 0.12; town.treasury += tax; const share = (r.till - tax) / Math.max(1, ws.length); ws.forEach(w => { w.coin += share; w.dayEarn = (w.dayEarn || 0) + share; }); r.till = 0; }
  for (const n of npcs) { const J = LF2_JOBS[n.job]; if (n.dead || !J || !J.wage) continue; n.coin += J.wage; town.treasury -= J.wage * 0.5; }
  const sm = lf2Room('smithy'), sh = lf2Room('shop');
  if (sm) { const s = lf2Stock(sm); if ((s.iron || 0) < 6) s.iron = (s.iron || 0) + 3; }
  if (sh) { const s = lf2Stock(sh); if ((s.wool || 0) < 8) s.wool = (s.wool || 0) + 4; }
  if (npcs.some(n => !n.dead && n.toolQ != null)) npcs.forEach(n => { if (!n.dead && n.toolQ == null && n.age >= 16) n.toolQ = 100; });
  const fd = typeof foodDaysNow === 'function' ? foodDaysNow() : 3;
  if (fd >= 0.5) lf2AssignJobs(false);
  if (fd < 0.3) { const t = npcs.filter(n => !n.dead && ['Miller', 'Labourer', 'Weaver', 'BathKeeper', 'Builder'].includes(n.job))[0]; if (t) { const old = LF2_JOBS[t.job].name; t.job = 'Farmer'; t.lf2NoTrade = game.time + 3 * 1440; chron(`Food is short, so ${nameOf(t)} put down the work of a ${old.toLowerCase()} and went to the fields.`, 'life'); } }
}
LF2.hourly.push(h => { if (h === 21) lf2Payday(); if (h === 15) lf2GrainShip(); moveSellersIndoors(); });
/* the grain dole: when the larder runs low, the council buys grain off a ship (if it can afford it) */
function lf2GrainShip() {
  if (!LF2.on('economy') || typeof foodDaysNow !== 'function' || foodDaysNow() >= 0.45) return;
  const m = merchants[0]; if (!m) return; const pop = npcs.filter(n => !n.dead).length, q = Math.ceil(pop * 1.5), cost = q;
  if (town.treasury - cost < -250) { chron('The larder is running low, and the council is too deep in debt to buy grain.', 'note'); return; }
  m.stock.grain = (m.stock.grain || 0) + q; town.treasury -= cost; chron(`A grain ship put in, and the council bought ${q} sacks for the larder${town.treasury < 0 ? ', on credit' : ''}.`, 'life');
}
/* tools wear out with use; a worn tool makes the work slow */
LF2.tickers.push(() => {
  for (const n of npcs) { if (n.dead || n.toolQ == null) continue; const st = n.plan && n.plan[n.si]; if (st && st.act === 'work' && n.stepStarted && !LF2_JOBS[n.job]) n.toolQ = Math.max(0, n.toolQ - 0.12); }
});
/* housekeeping: a trade belongs to a working villager; the one you steer is not given one (or the shop would never open) */
LF2.tickers.push(() => {
  for (const n of npcs) if (!n.dead && LF2_JOBS[n.job] && n.role !== 'Worker') n.job = null;
  const p = game.player;
  if (p && LF2_JOBS[p.job] && !p.lf2Kept) { const k = p.job; p.job = 'Farmer'; const c = npcs.filter(o => !o.dead && !o.player && o.role === 'Worker' && o.age >= 18 && o.age < 60 && !o.shop && !LF2_JOBS[o.job]).sort((a, b) => (LF2_JOBS[k].fit || []).filter(t => lf2Has(b, t)).length - (LF2_JOBS[k].fit || []).filter(t => lf2Has(a, t)).length)[0]; if (c) lf2SetJob(c, k, true); }
  // the grain dole: nobody is left to starve to death in the street
  if (LF2.on('economy')) for (const n of npcs) { if (n.dead || n.player || n.infant || !(n.starving > (n.age < 14 ? 120 : 300)) || (n.lf2Dole || 0) > game.time) continue; n.lf2Dole = game.time + 600; n.inv.grain = (n.inv.grain || 0) + 3; town.treasury -= 3;
    lfEmit('dole', { target: n, sev: 1, tags: ['misfortune'], witnessIds: [], aware: false, chron: false, text: `${n.first} was so hungry the council handed out grain from the dole` }); }
});
LF2.work.push((n, tod) => {
  if (LF2_JOBS[n.job]) return lf2WorkPlan(n, tod);
  return null;
});
LF2.dec.push(lf2ShopPlan);
function lf2HungryPlan(n, tod) {
  if (n.player || n.jail || n.age < 6 || n.hunger < 55 || foodSat(pantryOf(n)) + foodSat(n.inv) >= 30 || (n.lf2HungryT || 0) > game.time) return null;
  n.lf2HungryT = game.time + 60;
  const has = r => Object.keys(LF2_SELL[r.kind]).some(g => FOODS.includes(g) && (lf2Stock(r)[g] || 0) > 0);
  const r = ['bakery', 'thermopolium', 'shop'].map(lf2Room).filter(r => r && has(r)).sort((a, b) => lfDist(n, { tx: a.doorX, ty: a.doorY }) - lfDist(n, { tx: b.doorX, ty: b.doorY }))[0]; if (!r) return null;
  const f = lf2Spot(r, 'front'); if (!f) return null;
  return [goS(f, 'Starving. Off to ' + r.name), waitS(2, 'stand', 'Asking for something to eat', { nopie: true, onEnd(nn) {
    const s = lf2Stock(r), g = Object.keys(LF2_SELL[r.kind]).find(g => FOODS.includes(g) && (s[g] || 0) > 0); if (!g) return;
    let got = LF2.on('economy') ? lf2Buy(nn, r, g, 2) : 0;
    if (!got) { s[g]--; nn.inv[g] = (nn.inv[g] || 0) + 1; got = 1; const k = lf2Server(r) || npcs.find(o => LF2_JOBS[o.job] && LF2_JOBS[o.job].room === r.kind && !o.dead);
      if (k && k !== nn) lfEmit('charity', { actor: k, target: nn, sev: 1, tags: ['kindness', 'generous'], chron: false, text: `${k.first} gave ${nn.first} free ${GOODS[g].name}, seeing how hungry ${cvPron(nn).he} was` }); }
    eatSat(nn, nn.inv);
  } })];
}
LF2.dec.unshift(lf2HungryPlan);

