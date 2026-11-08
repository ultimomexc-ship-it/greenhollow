/* ================= Goods: the shared larder, crops, pond =================
   There is no money on the island. Whoever gathers more than their family needs drops it at the village larder,
   and anyone can take what they need from it. (The old trading code is still the plumbing; nothing costs anything.) */
const GOODS = {
  fish: { base: 4, sat: 30, name: 'fish' }, berries: { base: 2, sat: 20, name: 'berries' }, grain: { base: 2, sat: 24, name: 'grain' },
  wood: { base: 3, name: 'timber' }, herbs: { base: 4, name: 'herbs' }
};
const FOODS = ['fish', 'berries', 'grain'];
const SELLABLE = ['fish', 'berries', 'grain', 'herbs'];
const MERCH_DEF = { buys: { fish: 30, berries: 30, grain: 24, herbs: 14 }, sells: { fish: 30, berries: 30, grain: 24, herbs: 14 }, open: [7, 18.5], tool: 'wipe', noun: 'stall' };
const AGENDA = { Woodcutter: 1, Stonecutter: 1, Fisher: 1, Gatherer: 1, Farmer: 1 };
const MAINGOOD = { Woodcutter: 'wood', Fisher: 'fish', Gatherer: 'berries', Farmer: 'grain' };
const GROW = 2600, TAX = 0.07;
let merchants = [];
const hours = () => (game.time % 1440) / 60;
const cap = (m, g) => Math.max(m.buys[g] || 0, m.sells[g] || 0);
function sellPrice(m, g) { const f = Math.min(1, (m.stock[g] || 0) / cap(m, g)); return Math.max(1, Math.round(GOODS[g].base * (1.7 - 0.7 * f))); }
function buyPrice(m, g) { const k = m.buys[g]; if (!k) return 0; const f = (m.stock[g] || 0) / k; if (f >= 1) return 0; return Math.max(1, Math.round(GOODS[g].base * (1.0 - 0.55 * f))); }
function marketPrice(g) { const ps = merchants.filter(m => m.sells[g] && (m.stock[g] || 0) > 0).map(m => sellPrice(m, g)); if (!ps.length) return null; ps.sort((a, b) => a - b); return ps[ps.length >> 1]; }
function cropStage(c) { if (!c.st) return 0; const p = (game.time - c.t0) / (typeof itGrow === 'function' ? itGrow(c) : GROW); return p >= 1 ? 4 : p > .66 ? 3 : p > .3 ? 2 : 1; }
const foodCount = p => FOODS.reduce((s, g) => s + (p[g] || 0), 0);
const foodSat = p => FOODS.reduce((s, g) => s + (p[g] || 0) * GOODS[g].sat, 0);
const hhOf = n => n.homeRoom ? npcs.filter(o => o.homeRoom === n.homeRoom) : [n];
const pantryOf = n => n.homeRoom ? (n.homeRoom.pantry || (n.homeRoom.pantry = {})) : n.inv;
const pantryDays = n => foodSat(pantryOf(n)) / (Math.max(1, hhOf(n).filter(o => !o.infant).length) * 100);
const carried = n => SELLABLE.reduce((s, g) => s + (n.inv[g] || 0), 0) + (n.inv.wood || 0) + (n.inv.stone || 0);
const coinsOf = n => Math.floor(n.coin);
const dist = (n, p) => Math.abs(p.x - n.x) + Math.abs(p.y - n.y);

function initNpcSim(n) {
  const R = n.rand || Math.random;
  n.coin = n.coin !== undefined ? n.coin : (n.age >= 16 ? 14 + Math.floor(R() * 18) : 0);
  n.inv = {}; n.hunger = 8 + R() * 30; n.health = 50 + R() * 50; n.avoid = {}; n.sellCool = 0; n.claims = []; n.log = []; n.earned = 0; n.spent = 0; n.foraged = 0; n.hungryMin = 0; n.starving = 0;
  n.plan = null; n.si = 0; n.stepStarted = false; n.roaming = false; n.carry = null; n.tool = null; n.dayEarn = 0; n.lastEarn = 0; n.joy = 50; n.cur = null; n.curUntil = 0;
  n.taste = { fish: 0.75 + R() * 0.75, grain: 0.6 + R() * 0.6, berries: 0.7 + R() * 0.7 };
  n.speed = (n.age >= 16 ? 0.9 : 1.0) + R() * 0.22; n.claim = null; n.spot = null; n.walked = 0; n.talk = null; n.pi = 0; n.nextMove = 0; n.roamRange = null;
  n.t = 0; n.path = []; n.moving = false; n.pose = 'stand'; n.hold = null; n.face = { dx: 0, dy: 1 }; n.status = 'Arriving'; n.mourning = null; n.mealKey = -1;
  if (n.bed && n.bed.x != null && n.x === undefined) { n.x = n.tx = n.bed.x; n.y = n.ty = n.bed.y; }
  n.dead = false; lifeInit(n);
}
/** the counters in the market hall, as stalls (a seller stands at x,y behind the counter; customers at front) */
function hallStalls() {
  const r = typeof lf2Room === 'function' ? lf2Room('macellum') : null; if (!r) return [];
  if (!r.hall) r.hall = [0, 1, 2, 3].filter(i => r.spots['post' + i]).map(i => ({ x: r.spots['post' + i].x, y: r.spots['post' + i].y, face: r.spots['post' + i].face, front: { x: r.spots['front' + i].x, y: r.spots['front' + i].y }, owner: null, market: town.markets[0], hall: r }));
  return r.hall;
}
/** sellers work in the market hall: anyone still at an open-air stall moves in when there is a counter free, and the empty stalls on the green are cleared away */
function moveSellersIndoors() {
  const H = hallStalls(); if (!H.length) return;
  for (const m of merchants) { if (m.post && m.post.hall) continue; const free = H.find(s => !s.owner); if (!free) break; const n = m.n;
    if (n.stall) n.stall.owner = null; n.stall = free; free.owner = n; m.post = free; m.front = { x: free.front.x, y: free.front.y, face: free.face }; }
  for (const mk of town.markets) for (const st of mk.stalls) { if (st.owner || st.gone) continue; st.gone = true;
    for (const t of st.tiles || []) if (grid[t.y][t.x] === T.STALL) { setT(t.x, t.y, T.PATH); if (typeof markDirty === 'function') markDirty(t.x, t.y, 1, 1); } }
}
function makeMerchant(n, mk?) {
  let stall = hallStalls().find(s => !s.owner);
  if (!stall && mk) stall = mk.stalls.find(s => !s.owner && !s.gone);
  if (!stall) { const opts = town.markets.filter(m => m.stalls.some(s => !s.owner && !s.gone)).map(m => ({ m, sc: m.stalls.filter(s => s.owner).length * 40 + marketDist2(n, m) })).sort((a, c) => a.sc - c.sc); stall = opts.length ? opts[0].m.stalls.find(s => !s.owner && !s.gone) : null; }
  if (!stall) return null;
  n.stall = stall; stall.owner = n;
  const m = { n, role: 'Trader', def: MERCH_DEF, buys: MERCH_DEF.buys, sells: MERCH_DEF.sells, stock: {}, post: stall, front: { x: stall.front.x, y: stall.front.y, face: stall.face }, serving: false, sales: 0, revenue: 0, outlay: 0 };
  for (const g of Object.keys(MERCH_DEF.buys)) m.stock[g] = Math.floor(MERCH_DEF.buys[g] * (0.12 + Math.random() * 0.15));
  n.coin += 60; n.shop = m; merchants.push(m); return m;
}
function dropMerchant(n) {
  const m = n.shop; if (!m) return;
  merchants = merchants.filter(x => x !== m); if (n.stall) { n.stall.owner = null; n.stall = null; } n.shop = null;
}
function initEconomy() {
  const R = rng(((town.seed || 1) ^ 0xec0) >>> 0);
  merchants = []; town.eco = { exported: 0, tax: 0, foraged: 0, hungryMin: 0, trades: 0 };
  town.treasury = 150;
  rooms.forEach(r => { r.pantry = r.pantry || {}; });
  npcs.forEach(n => { n.rand = n.rand || rng(town.seed + n.id * 977); initNpcSim(n); if (n.bed && n.bed.x != null) { n.x = n.bed.x; n.y = n.bed.y; n.tx = n.bed.x; n.ty = n.bed.y; } if (n.age >= 3 && !n.homeRoom) n.inv = { fish: 3, berries: 3, grain: 3 }; });
  npcs.forEach(n => { if (n.role === 'Trader') makeMerchant(n); });
  const seen = new Set();
  npcs.forEach(n => {
    if (seen.has(n.homeRoom)) return; seen.add(n.homeRoom);
    if (!n.homeRoom) return;
    const k = hhOf(n).length, p = n.homeRoom.pantry;
    p.berries = Math.round(k * (3 + R() * 2)); p.fish = Math.round(k * (2 + R() * 2)); p.grain = Math.round(k * R() * 2);
  });
  game.trades = []; game.econLog = []; lastHr = Math.floor(game.time / 60);
}

function logTrade(buyer, seller, g, q, total, verb) {
  town.eco.trades++;
  game.trades.push({ time: game.time, buyer, seller, g, q, total, verb });
  if (game.trades.length > 200) game.trades.splice(0, 50);
}
function pay(from, to, amt) { /* nothing changes hands but the goods */ }
function consume(n, g, q) { if (g === 'herbs') n.health = Math.min(100, n.health + 55); else n.inv[g] = (n.inv[g] || 0) + q; }
function doBuy(n, m, g, qty) {
  if (!m.serving || Math.abs(n.x - m.front.x) + Math.abs(n.y - m.front.y) > 1.5) return 0;
  let got = 0, tot = 0;
  while (got < qty && (m.stock[g] || 0) >= 1) {
    const p = sellPrice(m, g);
    pay(n, m.n, p); m.stock[g]--; m.sales++; m.revenue += p; tot += p; got++; consume(n, g, 1);
  }
  if (got) logTrade(n, m.n, g, got, tot, 'buy');
  return got;
}
function doSell(n, m, g, qty) {
  if (!m.serving || Math.abs(n.x - m.front.x) + Math.abs(n.y - m.front.y) > 1.5) return 0;
  let got = 0, tot = 0;
  while (got < qty && (n.inv[g] || 0) >= 1) {
    const p = buyPrice(m, g); if (p <= 0) break;
    pay(m.n, n, p); m.stock[g] = (m.stock[g] || 0) + 1; n.inv[g]--; m.outlay += p; tot += p; got++;
  }
  if (got) { logTrade(m.n, n, g, got, tot, 'sell'); lf2Paid(n, tot); }
  return got;
}
function isOpen(m) { if (m.serving) return true; const h = hours(); return h >= m.def.open[0] && h < m.def.open[1] && isAwake(m.n, game.time % 1440); }
function findSeller(n, g) {
  let best = null, bs = 1e9;
  for (const m of merchants) {
    if (m.n === n || !m.sells[g] || !((m.stock[g] || 0) > 0) || !isOpen(m) || (n.avoid[m.n.id] || 0) > game.time) continue;
    const sc = sellPrice(m, g) + dist(n, m.front) * 0.2; if (sc < bs) { bs = sc; best = m; }
  }
  return best;
}
function findBuyer(n, g, any) {
  let best = null, bs = -1e9;
  for (const m of merchants) {
    if (m.n === n || !m.buys[g] || !isOpen(m) || (n.avoid[m.n.id] || 0) > game.time) continue;
    const p = buyPrice(m, g); if (p <= 0) continue;
    const sc = p - dist(n, m.front) * 0.2; if (sc > bs) { bs = sc; best = m; }
  }
  return best;
}

/* ---------- hourly / daily ---------- */
let lastHr = 0;
function hourly(hr) {
  const h = hr % 24;
  if (h === 15) caravan();
  if (h === 0) { npcs.forEach(n => { n.lastEarn = n.dayEarn; n.dayEarn = 0; }); town.pondInfo.fishedToday = 0; dailyLife(); }
  if (h % 8 === 0) town.nodes.forEach(nd => { if (nd.amt < nd.max) nd.amt++; });
  hourlyLife(); lifeHourly(hr); lf2Hourly(hr);
  if (town.treeDirty) { refreshReach(); refreshShore(); town.treeDirty = false; }
  { let st = 0, cp = 0; for (const k in town.fishZones) { st += town.fishZones[k].stock; cp += town.fishZones[k].cap; } town.pondInfo.stock = st; town.pondInfo.cap = cp; }
  const ph = town.hist.price;
  for (const g of Object.keys(GOODS)) { const p = marketPrice(g); if (p !== null) { (ph[g] = ph[g] || []).push(p); if (ph[g].length > 96) ph[g].shift(); } }
  town.hist.coins.push(Math.round(npcs.reduce((s, n) => s + n.coin, 0))); town.hist.treasury.push(Math.round(town.treasury));
  if (town.hist.coins.length > 96) { town.hist.coins.shift(); town.hist.treasury.shift(); }
}
function caravan() {
  const lim = Math.ceil(npcs.length * 0.5 + 3); let total = 0;
  merchants.forEach(m => {
    for (const g of SELLABLE) {
      if (!m.buys[g]) continue;
      const surplus = Math.floor((m.stock[g] || 0) - cap(m, g) * 0.4), take = Math.min(lim, surplus);
      if (take > 0) { const val = take * Math.max(1, Math.round(GOODS[g].base * 0.8)); m.stock[g] -= take; m.n.coin += val; total += val; m.revenue += val; }
    }
    m.n.coin += 8; m.n.earned += 8; total += 8;
    const due = Math.min(25, Math.max(0, (m.n.coin - 90) * 0.12)); if (due > 0) { m.n.coin -= due; town.treasury += due; }
  });
  town.eco.exported += total; town.treasury += total * 0.06;
  if (total > 8) game.econLog.push({ time: game.time, text: 'Some of the larder\'s surplus went off and was thrown to the gulls.' });
  if (game.econLog.length > 60) game.econLog.shift();
}
function tickEcon(dt) {
  lifeTick(dt);
  for (const n of npcs) {
    if (n.infant) continue;
    n.hunger = Math.min(100, n.hunger + dt * (n.pose === 'sleep' ? 1.8 : 4.6) / 60);
    if (n.hunger >= 98) { n.starving += dt; n.hungryMin += dt; town.eco.hungryMin += dt; } else if (n.hunger < 90) n.starving = Math.max(0, n.starving - dt * 2);
    n.health = Math.max(0, n.health - dt * 100 / (5 * 1440));
    n.joy = Math.max(0, n.joy - dt * 100 / (4 * 1440));
    n.social = Math.max(0, n.social - dt * 100 / (1.6 * 1440));
  }
  for (const k in town.fishZones) { const z = town.fishZones[k]; z.stock = Math.min(z.cap, z.stock + dt * z.cap * 0.0006); }
  const hr = Math.floor(game.time / 60); while (lastHr < hr) { lastHr++; hourly(lastHr); }
}

