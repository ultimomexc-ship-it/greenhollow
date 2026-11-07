/* ================= Plans: small step lists that villagers build themselves ================= */
const goS = (spot, text) => ({ k: 'go', spot, text });
const waitS = (min, act, text, o?) => Object.assign({ k: 'wait', min: Math.max(1, Math.round(min)), act, text }, o || {});
function release(n) { if (n.tent) { if (n.tent.owner === n) n.tent.owner = null; n.tent = null; } n.chatTarget = null; if (n.claim) { if (n.claim.owner === n) n.claim.owner = null; n.claim = null; } n.claims.forEach(c => { if (c.claim === n) c.claim = null; }); n.claims.length = 0; }
function pickFrom(arr, n) {
  let t, i = 0;
  do { t = arr[Math.floor(n.rand() * arr.length)]; i++; } while (t.x === n.tx && t.y === n.ty && i < 6);
  return { x: t.x, y: t.y, face: t.face || null };
}
function floorSpot(room, n) {
  if (!room) { const pl = n ? plazaNear(n) : plazaTiles, p = pl[(n && n.id || 0) % pl.length] || { x: town.cx, y: town.cy }; return { x: p.x, y: p.y }; }
  const tiles = [];
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
    const t = grid[y][x]; if ((t === T.FLOOR || t === T.RUG) && !(x === room.doorX && Math.abs(y - room.doorY) <= 1)) tiles.push({ x, y });
  }
  const t = tiles[Math.floor(n.rand() * tiles.length)] || { x: room.doorX, y: room.doorY };
  return { x: t.x, y: t.y, face: null, fallback: true };
}
const pantrySpot = n => (n.homeRoom && n.homeRoom.spots && n.homeRoom.spots.pantry) || homeSpot(n);
const homeSpot = n => (n.seat && !n.seat.owner) ? n.seat : floorSpot(n.homeRoom, n);
function awakeFor(n, tod) { return (tod - n.wake + 1440) % 1440; }
function awakeSpan(n) { return (n.sleepAt - n.wake + 1440) % 1440; }
function isAwake(n, tod) { return awakeFor(n, tod) < awakeSpan(n); }
function working(n, tod) {
  if (n.age < 16 || n.role === 'Elder') return false;
  if (n.role === 'Worker' && isRestDay() && tod >= 720) return false;
  if (n.traits.includes('lazy') && n.role === 'Worker' && awakeSpan(n) - awakeFor(n, tod) < 220) return false;
  const a = awakeFor(n, tod), span = awakeSpan(n);
  if (a < 20) return false;
  return a < span - (n.shop ? 40 : 160);
}
function eatSat(n, pool) {
  let ate = 0;
  while (n.hunger > 20) {
    const g = FOODS.filter(f => (pool[f] || 0) > 0).sort((a, b) => GOODS[b].sat - GOODS[a].sat)[0];
    if (!g) break; pool[g]--; n.hunger = Math.max(0, n.hunger - GOODS[g].sat); ate++;
    if (ate >= 3) break;
  }
  return ate;
}
function stash(n) {
  if (!n.homeRoom) return;
  const p = pantryOf(n), hh = hhOf(n).length;
  FOODS.forEach(g => { const q = n.inv[g] || 0; if (q > 0) { const room = Math.max(0, hh * 14 - foodCount(p)); const t = Math.min(q, room); p[g] = (p[g] || 0) + t; n.inv[g] -= t; } });
}
function buyStep(n, m, g, qty) {
  return [goS(m.front, 'Walking to the larder for ' + GOODS[g].name),
    waitS(2, 'stand', 'Taking ' + GOODS[g].name + ' from the larder', { onEnd(n) { const got = doBuy(n, m, g, qty); if (!got) { n.avoid[m.n.id] = game.time + 90; return false; } } })];
}
function sellStep(n, m, g, qty) {
  return [goS(m.front, 'Carrying spare ' + GOODS[g].name + ' to the larder'),
    waitS(2, 'stand', 'Leaving ' + GOODS[g].name + ' at the larder', { onEnd(n) { const got = doSell(n, m, g, qty); if (!got) { n.avoid[m.n.id] = game.time + 90; return false; } } })];
}
/* where a person stands to throw onto a site: a free tile beside the footprint (or beside the next unlaid road tile) */
function throwSpot(s, n) {
  const ok = (x, y) => walkable(x, y) && roomAt[y][x] < 0;
  const cand = [];
  if (s.kind === 'road') { const t = s.route[Math.min(s.laid || 0, s.route.length - 1)]; cand.push({ x: t.x, y: t.y }); for (const [dx, dy] of DIRS) cand.push({ x: t.x + dx, y: t.y + dy }); }
  else { for (let k = 0; k < s.w; k++) cand.push({ x: s.x + k, y: s.y - 1 }, { x: s.x + k, y: s.y + s.h }); for (let k = 0; k < s.h; k++) cand.push({ x: s.x - 1, y: s.y + k }, { x: s.x + s.w, y: s.y + k }); }
  let best = null, bd = 1e9;
  for (const c of cand) { if (c.x < 1 || c.y < 1 || c.x >= W - 1 || c.y >= H - 1 || !ok(c.x, c.y)) continue; const occ = tileOwner.get(tkey(c.x, c.y)); const d = Math.hypot(c.x - n.tx, c.y - n.ty) + (occ && occ !== n ? 6 : 0); if (d < bd) { bd = d; best = c; } }
  if (!best) return { x: s.x, y: s.y - 1, face: null };
  const tg = s.kind === 'road' ? s.route[Math.min(s.laid || 0, s.route.length - 1)] : { x: s.x + (s.w - 1) / 2, y: s.y + (s.h - 1) / 2 };
  return { x: best.x, y: best.y, face: { dx: Math.sign(tg.x - best.x), dy: Math.abs(tg.x - best.x) > Math.abs(tg.y - best.y) ? 0 : Math.sign(tg.y - best.y) } };
}
function haulPlan(n) {
  const steps = [];
  const foodHave = FOODS.some(g => (n.inv[g] || 0) > 0);
  if (foodHave && n.homeRoom && pantryDays(n) < 3.5) steps.push(goS(pantrySpot, 'Taking food home'), waitS(2, 'stand', 'Stocking the pantry', { onEnd: stash }));
  { const dm = deliverMatsPlan(n); if (dm) steps.push(...dm); }
  let sold = 0;
  for (const g of SELLABLE) {
    const q = n.inv[g] || 0; if (q < 1) continue;
    const m = findBuyer(n, g, n.coin < 8); if (!m) continue;
    steps.push(...sellStep(n, m, g, q)); if (++sold >= 2) break;
  }
  if (!sold && !steps.length) { n.sellCool = game.time + 80; return null; }
  if (!sold) n.sellCool = game.time + 60;
  return steps;
}
function foodShopPlan(n) {
  const hh = hhOf(n).filter(o => !o.infant).length, need = 3 * hh * 100 - foodSat(pantryOf(n));
  if (need < 40) return null;
  const steps = []; let left = need, spend = 1e9, bought = false; const tried = new Set();
  for (let k = 0; k < 2 && left > 20 && spend >= 1; k++) {
    let best = null, bs = 1e9;
    for (const g of FOODS) {
      const m = findSeller(n, g); if (!m || tried.has(m)) continue;
      const have = (pantryOf(n)[g] || 0) / (3 * Math.max(1, hh)), sc = sellPrice(m, g) / GOODS[g].sat * (1 + 1.5 * have) / n.taste[g]; if (sc < bs) { bs = sc; best = { m, g }; }
    }
    if (!best) break;
    tried.add(best.m);
    const price = sellPrice(best.m, best.g), qty = Math.min(Math.ceil(left / GOODS[best.g].sat), best.m.stock[best.g], Math.floor(spend / price));
    if (qty < 1) break;
    steps.push(...buyStep(n, best.m, best.g, qty)); left -= qty * GOODS[best.g].sat; spend -= qty * price; bought = true;
  }
  if (!bought) return null;
  steps.push(goS(pantrySpot, 'Taking the shopping home'), waitS(2, 'stand', 'Stocking the pantry', { onEnd: stash }));
  return steps;
}
function homeEatPlan(n) {
  if (!foodCount(pantryOf(n))) return null;
  return [goS(homeSpot, 'Heading home to eat'), waitS(18, 'eat', 'Eating at home', { hold: 'plate', onEnd(n) { eatSat(n, pantryOf(n)); } })];
}
function packedPlan(n) {
  if (!FOODS.some(g => (n.inv[g] || 0) > 0)) return null;
  return [waitS(12, 'eat', 'Eating a packed meal', { hold: 'plate', onEnd(n) { eatSat(n, n.inv); } })];
}
function stockEatPlan(n) {
  const m = n.shop; if (!m) return null;
  const g = FOODS.filter(f => (m.stock[f] || 0) > 0)[0]; if (!g) return null;
  return [goS(m.post, 'Back to the stall'), waitS(10, 'eat', 'Having a bite behind the stall', { hold: 'plate', serve: true, onEnd(n) { if ((m.stock[g] || 0) > 0) { m.stock[g]--; n.hunger = Math.max(0, n.hunger - GOODS[g].sat); } } })];
}
function foragePlan(n) {
  const nd = town.nodes.filter(x => x.kind === 'berry' && x.amt >= 1).sort((a, b) => Math.hypot(a.x - n.tx, a.y - n.ty) - Math.hypot(b.x - n.tx, b.y - n.ty))[0];
  if (nd) return [goS(nn => besideSpot(nn, nd.x, nd.y), 'Going out to forage'), waitS(14, 'work', 'Foraging for berries', { tool: 'pick', onEnd(n) { const t = Math.min(2, nd.amt); nd.amt -= t; n.hunger = Math.max(0, n.hunger - t * 24); n.foraged++; town.eco.foraged++; } })];
  return [waitS(20, 'stand', 'Hungry, with nothing to eat')];
}
function eatPlan(n) {
  const cheapest = Math.min.apply(null, FOODS.map(g => { const m = findSeller(n, g); return m ? sellPrice(m, g) : 99; }));
  if (n.age < 16) return homeEatPlan(n) || packedPlan(n) || (n.hunger > 55 ? sharePlan(n) : null) || (n.hunger > 65 ? foragePlan(n) : null);
  if (n.shop) { const p = stockEatPlan(n); if (p) return p; }
  const inside = roomAt[Math.round(n.y)] && roomAt[Math.round(n.y)][Math.round(n.x)] >= 0;
  if (!inside) { const p = packedPlan(n); if (p && pantryDays(n) < 1) return p; }
  const h = homeEatPlan(n); if (h) return h;
  const pk = packedPlan(n); if (pk) return pk;
  if (carried(n) > 0 && cheapest >= 99 && game.time >= n.sellCool) { const hp = haulPlan(n); if (hp) return hp; }
  if (cheapest < 99) {
    const s = foodShopPlan(n); if (s) return s.concat([goS(homeSpot, 'Going home to eat'), waitS(18, 'eat', 'Eating at home', { hold: 'plate', onEnd(n) { eatSat(n, pantryOf(n)); } })]);
  }
  if (n.hunger >= 60) { const sp = sharePlan(n); if (sp) return sp; }
  return foragePlan(n);
}
function familyMealPlan(n, tod) {
  if (n.age < 3 || !n.homeRoom) return null;
  const hh = hhOf(n).filter(o => !o.infant); if (hh.length < 2 || !foodCount(pantryOf(n))) return null;
  const h = tod / 60, dinner = h >= 17.6 && h < 19.3, brk = !dinner && awakeFor(n, tod) < 60 && awakeFor(n, tod) >= 5;
  if (!dinner && !brk) return null;
  const key = Math.floor(game.time / 1440) * 2 + (dinner ? 1 : 0); if (n.mealKey === key) return null; n.mealKey = key;
  // supper is eaten together: everyone sits at their own place and eats when the table is full (or at a quarter past seven)
  const room = n.homeRoom, sit = homeSpot(n);
  const dur = dinner ? Math.max(20, 19.25 * 60 - tod) : 16;
  return [goS(sit, dinner ? 'Heading home for supper with the family' : 'Heading to the table for breakfast'),
    waitS(2, 'stand', 'Sitting down at the table', { nopie: true, onEnd(n) { if (dinner && room.graceKey !== key) { room.graceKey = key; const kids = hh.filter(o => o.age < 16 && o !== n); say(n, kids[0] || hh.find(o => o !== n), [[n, anyOf(n.traits.includes('devout') ? ['For what we are about to receive...', 'Bless this table and everyone at it.'] : ['Right. Everybody eat.', 'Pass the bread, would you?', 'Who is hungry?', 'Elbows off the table.'])], [kids[0] || hh.find(o => o !== n), kids[0] ? anyOf(['I am starving!', 'Can I have the big bit?', 'Is it stew again?']) : anyOf(['Smells good.', 'Finally.', 'Mm.'])]]); } } }),
    waitS(dur - 2, 'eat', dinner ? 'Eating supper with the family' : 'Eating breakfast with the family', { hold: 'plate', nopie: true, onEnd(n) { eatSat(n, pantryOf(n)); n.social = Math.min(100, n.social + 18); } })];
}
function needsPlan(n) {
  if (n.age < 16) return null;
  if (pantryDays(n) < 1.5 && !n.shop) { const s = foodShopPlan(n); if (s) return s; }
  if (n.health < 40) { const m = findSeller(n, 'herbs'); if (m) return buyStep(n, m, 'herbs', 1); }
  return null;
}

/* ---------- community plans: funerals, weddings, building ---------- */
function assignCrews() {}
const SITE_PRI = { church: 0, house: 1, market: 2, tavern: 3, graveyard: 4, field: 5, road: 6, demolish: 7 };
const KINDTXT = { wood: 'timber', stone: 'stone' };
function slotSpot(s, q, n) {
  let best = null, bd = 1e9;
  const inRect = (x, y) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
  for (const [dx, dy] of DIRS) {
    const x = q.x + dx, y = q.y + dy; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || !walkable(x, y) || roomAt[y][x] >= 0) continue;
    if (!findPath(n.tx, n.ty, x, y)) continue; // a pocket nobody can get into is no use
    const occ = tileOwner.get(tkey(x, y)), sl = slotAt(s, x, y);
    const d = Math.hypot(x - n.tx, y - n.ty) + (occ && occ !== n ? 6 : 0) + (inRect(x, y) ? 3 : 0) + (sl && !sl.built ? 8 : 0) + (reach[y * W + x] ? 0 : 40) + (findPath(n.tx, n.ty, x, y) ? 0 : 80);
    if (d < bd) { bd = d; best = { x, y, face: { dx: -dx, dy: -dy } }; }
  }
  if (!best && (q.cleared || 0) < 3) { /* hemmed in: clear the trees and boulders around it so the wall can be reached */
    q.cleared = (q.cleared || 0) + 1; let cut = 0;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const x = q.x + i, y = q.y + j; if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && (grid[y][x] === T.TREE || grid[y][x] === T.ROCK) && roomAt[y][x] < 0) { setT(x, y, T.GRASS); markDirty(x, y, 1, 1); cut++; } }
    if (cut) { town.treeDirty = true; town.treeCache = null; town.stoneCache = null; if (typeof refreshReach === 'function') refreshReach(); return slotSpot(s, q, n); }
    for (const [dx, dy] of DIRS) { const x = q.x + dx, y = q.y + dy; if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && grid[y][x] === T.TREE && roomAt[y][x] < 0) { setT(x, y, T.GRASS); markDirty(x, y, 1, 1); town.treeDirty = true; town.treeCache = null; return { x, y, face: { dx: -dx, dy: -dy } }; } }
  }
  if (!best) { // still boxed in (a corner tucked against water or rock): reach over from a diagonal or one tile further out
    let bd2 = 1e9;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (!i && !j) continue; const x = q.x + i, y = q.y + j; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || !walkable(x, y) || roomAt[y][x] >= 0 || !findPath(n.tx, n.ty, x, y)) continue; const d = Math.hypot(i, j) * 4 + Math.hypot(x - n.tx, y - n.ty); if (d < bd2) { bd2 = d; best = { x, y, face: { dx: Math.sign(q.x - x), dy: Math.abs(q.x - x) >= Math.abs(q.y - y) ? 0 : Math.sign(q.y - y) } }; } }
  }
  return best || { x: q.x, y: q.y - 1, face: { dx: 0, dy: 1 } };
}
function deliverMatsPlan(n) {
  for (const k of ((n.inv.stone || 0) >= (n.inv.wood || 0) ? ['stone', 'wood'] : ['wood', 'stone'])) {
    if (!(n.inv[k] > 0)) continue;
    const s = deliverSite(n, k) || (ensureSite(k) && deliverSite(n, k)); if (!s) continue;
    if (s.slots) {
      const steps = [], now = game.time;
      const free = s.slots.filter(q => !q.built && q.mat === k && (!q.claim || q.claim < now) && slotReady(s, q));
      if (!free.length) continue;
      let cur = { x: n.tx, y: n.ty };
      free.sort((a, c) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(c.x - cur.x, c.y - cur.y));
      free.slice(0, Math.min(handsMax(n), n.inv[k])).forEach(q => {
        q.claim = now + 40;
        steps.push(goS(nn => slotSpot(s, q, nn), 'Carrying ' + KINDTXT[k] + ' to the ' + (s.kind === 'church' ? 'chapel' : s.kind)),
          waitS(3, 'work', 'Putting up a ' + (k === 'wood' ? 'timber' : 'stone') + ' wall', { tool: 'hammer', slot: q, onEnd(n) { if (!buildSlot(n, s, q)) { q.claim = 0; return false; } } }));
      });
      return steps;
    }
    return [goS(nn => throwSpot(s, nn), 'Carrying ' + KINDTXT[k] + ' to the building site'),
      waitS(Math.max(1.5, Math.min(handsMax(n), n.inv[k]) * 0.8), 'work', 'Throwing ' + KINDTXT[k] + ' onto the site', { onEnd(n) { if (!throwOnSite(n, s, k)) return false; } })];
  }
  return null;
}
function barPlan(n, tod) {
  const c = town.tavern; if (!c || !c.spots.bar) return null;
  const h = tod / 60; if (h < 16.5) return null;
  return [goS(c.spots.bar, 'Opening the bar'), waitS(25, 'work', 'Pouring drinks', { tool: 'wipe' })];
}

