/* ---------- shared stockpile and what is wanted ---------- */
const perim = (w, h) => 2 * (w + h) - 4;
const BUILDING = { house: 1, church: 1, tavern: 1, privy: 1 };
function costOf(kind, w, h) {
  if (kind === 'house' || kind === 'tavern') return { wood: perim(w, h) };
  if (kind === 'church') return { stone: perim(w, h) - 1, wood: 1 };
  if (kind === 'market') return { wood: 12 };
  return {};
}
const HANDS = 3;
function handsMax(n) { return (n.age < 16 || n.age >= 60 || n.role === 'Child' || n.role === 'Elder') ? 1 : HANDS; }
function handsUsed(n) { return (n.inv.wood || 0) + (n.inv.stone || 0); }
const costTotal = c => (c.wood || 0) + (c.stone || 0) + (c.any || 0);
/* materials go straight to the building site: how many more blocks of a kind will this site take? */
function siteExplicit(s, k) { return Math.max(0, ((s.cost || {})[k] || 0) - (s.got ? s.got[k] : 0)); }
function siteAnyRem(s) { const c = s.cost || {}, g = s.got || { wood: 0, stone: 0 }; return Math.max(0, (c.any || 0) - Math.max(0, g.wood - (c.wood || 0)) - Math.max(0, g.stone - (c.stone || 0))); }
const siteRem = (s, k) => s.slots ? s.slots.filter(q => !q.built && q.mat === k).length : s.got ? siteExplicit(s, k) + siteAnyRem(s) : 0;
const siteReqT = s => s.slots ? s.slots.length : costTotal(s.cost || {});
const siteGot = s => s.slots ? s.slots.filter(q => q.built).length : s.got ? s.got.wood + s.got.stone : 0;
const siteFrac = s => { const t = siteReqT(s); return t ? Math.min(1, siteGot(s) / t) : 0; };
function demand() {
  let wood = 0, stone = 0;
  for (const s of town.sites) if (s.slots) { wood += siteRem(s, 'wood'); stone += siteRem(s, 'stone'); } else if (s.got) { wood += siteExplicit(s, 'wood') + siteAnyRem(s); stone += siteExplicit(s, 'stone'); }
  return { wood, stone };
}
const shortfall = demand;
function siteNeedText(s) { if (!s.got) return ''; const w = siteRem(s, 'wood'), st = siteRem(s, 'stone'); return [w ? w + ' timber' : '', st ? st + ' stone' : ''].filter(Boolean).join(' · '); }
function deliverSite(n, k) {
  let best = null, bs = 1e9;
  for (const s of town.sites) { if (!s.got || siteRem(s, k) < 1) continue; const sc = (SITE_PRI[s.kind] || 5) * 12 + Math.hypot(s.x - n.tx, s.y - n.ty); if (sc < bs) { bs = sc; best = s; } }
  return best;
}
/* there must always be somewhere to put what is picked up */
function ensureSite(kind) {
  if (demand()[kind] > 0) return true;
  if (kind === 'stone') { if (!town.church && !town.sites.some(s => s.kind === 'church')) { churchProject(true); } return demand().stone > 0; }
  if (kind === 'wood') {
    const spareBeds = houseRooms().reduce((s, h) => s + bedsFree(h), 0), homeless = npcs.filter(p => !p.infant && !(p.bed && p.bed.x != null)).length;
    if ((spareBeds < 3 || homeless > 0) && !town.sites.some(s => s.kind === 'house' && s.owners.length === 0)) startProject('house', 8, 6, { beds: 3, owners: [], surname: '' }, 'house:spare', 'A spare house for newcomers');
    return demand().wood > 0;
  }
  return false;
}
function startProject(kind, w, h, o, key, text) {
  key = key || kind; const cost: any = costOf(kind, w, h), d = demand();
  const wait = (extra) => { const old = town.wants[key]; town.wants[key] = Object.assign({ kind, cost, text: text || kind, since: old ? old.since : game.time }, extra || {}); return null; };
  if (((cost.wood || 0) + (cost.any || 0) > 0 && d.wood > 24) || ((cost.stone || 0) > 0 && d.stone > 30)) return wait({ queued: true });
  const s: any = createSite(kind, w, h, o);
  if (s) { s.cost = cost; s.got = { wood: 0, stone: 0 }; delete town.wants[key]; return s; }
  return wait({ noRoom: true });
}
function queueRoad(route) {
  const tiles = (route || []).filter(t => (grid[t.y][t.x] === T.GRASS || grid[t.y][t.x] === T.SAND) && roomAt[t.y][t.x] < 0);
  if (!tiles.length) return null;
  const site = { id: town.nextSite++, kind: 'road', x: tiles[0].x, y: tiles[0].y, w: 1, h: 1, side: null, route: tiles, done: 0, laid: 0, labor: 0, crew: [], created: game.time, owners: [], beds: 0, woodNeed: 0, wood: 0, cost: { stone: tiles.length }, got: { wood: 0, stone: 0 } };
  tiles.forEach(t => { town.siteAt[t.y * W + t.x] = site.id; });
  town.sites.push(site); return site;
}
function layRoad(s, q) {
  let n = 0;
  while (s.laid < s.route.length && n < q) { const t = s.route[s.laid++]; n++; if (grid[t.y][t.x] === T.GRASS || grid[t.y][t.x] === T.SAND) { setT(t.x, t.y, T.PATH); markDirty(t.x, t.y, 1, 1); } }
}
/* the one way anything gets built: blocks of timber or stone are thrown onto the site */
function throwOnSite(n, s, k, max?) {
  if (!town.sites.includes(s)) return 0;
  const q = Math.min(n.inv[k] || 0, siteRem(s, k), max || 99); if (q < 1) return 0;
  s.got[k] += q; n.inv[k] -= q;
  if (n.player) { s.helped = s.helped || {}; s.helped[n.id] = (s.helped[n.id] || 0) + q; }
  if (s.kind === 'road') layRoad(s, q);
  const pay = Math.min(town.treasury, q * (k === 'wood' ? 2 : 3)); town.treasury -= pay; n.coin += pay; n.earned += pay; n.dayEarn += pay;
  s.done = siteGot(s);
  if (siteReqT(s) - siteGot(s) <= 0) completeSite(s, false);
  return q;
}
/* walls go up one tile per block: a ring of slots round the footprint, door last */
function makeSlots(site) {
  const { x, y, w, h, door } = site, ring = [];
  for (let i = 0; i < w; i++) ring.push([x + i, y]);
  for (let j = 1; j < h; j++) ring.push([x + w - 1, y + j]);
  for (let i = w - 2; i >= 0; i--) ring.push([x + i, y + h - 1]);
  for (let j = h - 2; j >= 1; j--) ring.push([x, y + j]);
  const di = ring.findIndex(p => p[0] === door.x && p[1] === door.y), rot = di < 0 ? ring : ring.slice(di + 1).concat(ring.slice(0, di + 1));
  return rot.map(p => ({ x: p[0], y: p[1], mat: site.kind === 'church' && p[0] === door.x && p[1] === door.y ? 'wood' : site.kind === 'church' ? 'stone' : 'wood', built: false, claim: 0, door: p[0] === door.x && p[1] === door.y }));
}
const slotAt = (s, x, y) => s.slots && s.slots.find(q => q.x === x && q.y === y);
const slotReady = (s, q) => !q.built && (!q.door || s.slots.every(o => o.built || o === q));
function buildSlot(n, s, q) {
  if (!town.sites.includes(s) || q.built || !(n.inv[q.mat] > 0) || !slotReady(s, q)) return 0;
  const oc = tileOwner.get(q.y * W + q.x); if (oc && oc !== n) return 0;
  q.built = true; q.claim = 0; s.got[q.mat]++; n.inv[q.mat]--; town.block[q.y * W + q.x] = 1;
  if (n.player) { s.helped = s.helped || {}; s.helped[n.id] = (s.helped[n.id] || 0) + 1; }
  const pay = Math.min(town.treasury, q.mat === 'wood' ? 2 : 3); town.treasury -= pay; n.coin += pay; n.earned += pay; n.dayEarn += pay;
  markDirty(q.x, q.y, 1, 1);
  if (s.slots.every(o => o.built)) completeSite(s, false);
  return 1;
}
/* people standing on a footprint when it is marked out are moved clear */
function ejectFrom(x, y, w, h, site) {
  const out = (xx, yy) => (xx < x || xx >= x + w || yy < y || yy >= y + h) && walkable(xx, yy) && roomAt[yy][xx] < 0;
  npcs.forEach(n => {
    if (n.x > x - 0.5 && n.x < x + w - 0.5 && n.y > y - 0.5 && n.y < y + h - 0.5) {
      let best = null, bd = 1e9;
      for (let yy = y - 3; yy < y + h + 3; yy++) for (let xx = x - 3; xx < x + w + 3; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W && out(xx, yy)) { const d = Math.hypot(xx - n.x, yy - n.y); if (d < bd) { bd = d; best = { x: xx, y: yy }; } }
      if (best) { n.tx = best.x; n.ty = best.y; n.x = best.x; n.y = best.y; n.path = []; n.moving = false; abortPlan && abortPlan(n); }
    }
  });
}

