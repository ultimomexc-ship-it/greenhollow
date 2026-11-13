/* ---------- sites: house, church, tavern, market, field, graveyard, road, demolition ---------- */
// graves are left in peace: nothing is built on a cross or right next to one (or on a grave being dug)
function nearGrave(x, y) {
  if (town.drops && town.drops.length && town.drops.some(d => d.x === x && d.y === y)) return true; // a log or stone lying there
  const f = town.funeral; if (f && !f.done && f.slot && Math.abs(f.slot.x - x) <= 1 && Math.abs(f.slot.y - y) <= 1) return true;
  if (!town.crossAt || !town.crossAt.size) return false;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (town.crossAt.has((y + j) * W + x + i)) return true;
  return false;
}
const remainsAt = (x, y) => (town.remains || []).find(r => r.x === x && r.y === y) || null;
const wildTile = (x, y) => !!(town.fmask && town.fmask[y * W + x]);   // (the old forest was cleared; nothing is off limits now)
const tileFree = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && (grid[y][x] === T.GRASS || (grid[y][x] === T.SAND && !(town.islet && town.islet[y * W + x]))) && !wildTile(x, y) && roomAt[y][x] < 0 && !town.siteAt[y * W + x] && !town.nodeMap.has(y * W + x) && !nearGrave(x, y);
function pathDistField() {
  const d = new Int16Array(W * H).fill(-1), q = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (grid[y][x] === T.PATH && roomAt[y][x] < 0 && reach[y * W + x]) { d[y * W + x] = 0; q.push(y * W + x); }
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % W, y = (c / W) | 0, dd = d[c]; if (dd >= 22) continue;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, ni = ny * W + nx; if (d[ni] < 0 && tileFree(nx, ny)) { d[ni] = dd + 1; q.push(ni); } }
  }
  return d;
}
function rectMap(test) {
  const ps = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ps[(y + 1) * (W + 1) + x + 1] = ps[y * (W + 1) + x + 1] + ps[(y + 1) * (W + 1) + x] - ps[y * (W + 1) + x] + (test(x, y) ? 1 : 0);
  return (x, y, w, h) => x >= 0 && y >= 0 && x + w <= W && y + h <= H && (ps[(y + h) * (W + 1) + x + w] - ps[y * (W + 1) + x + w] - ps[(y + h) * (W + 1) + x] + ps[y * (W + 1) + x]) === w * h;
}
const freeMap = () => rectMap(tileFree);
const OPENT = new Set([T.GRASS, T.TREE, T.PATH, T.SAND]);
const marginOK = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && OPENT.has(grid[y][x]) && !wildTile(x, y) && roomAt[y][x] < 0 && !town.siteAt[y * W + x] && !nearGrave(x, y);
function createSite(kind, w, h, o) {
  o = o || {};
  const dist = pathDistField(), free = freeMap(), marg = rectMap(marginOK), cx = town.cx, cy = town.cy, R = rng((town.seed + town.nextSite * 131 + Math.floor(game.time)) >>> 0);
  const freeB = o.clear ? rectMap((x, y) => tileFree(x, y) || (grid[y][x] === T.TREE && roomAt[y][x] < 0 && !town.siteAt[y * W + x] && !town.nodeMap.has(y * W + x) && !nearGrave(x, y))) : free;
  const cands = [];
  for (let y = 2; y < H - h - 2; y++) for (let x = 2; x < W - w - 2; x++) {
    const mx = x + w / 2 - cx, my = y + h / 2 - cy, base = BUILDING[kind] ? marketDist(x + w / 2, y + h / 2) : Math.hypot(mx, my * 1.25);
    if (BUILDING[kind]) {
      if (!freeB(x, y, w, h) || (!o.tight && !marg(x - 1, y - 1, w + 2, h + 2))) continue;
      cands.push({ x, y, s: (kind === 'church' ? Math.abs(base - 9) : kind === 'tavern' ? Math.abs(base - 7) : kind === 'privy' ? (o.near ? Math.hypot(x + w / 2 - o.near.x, y + h / 2 - o.near.y) : base) : base) + R() * 3 });
    } else if (kind === 'market') {
      if (!free(x, y, w, h)) continue;
      const dm = marketDist(x + w / 2, y + h / 2); if (dm < (o.first ? 7 : 20)) continue;
      cands.push({ x, y, s: o.first ? Math.abs(dm - 10) + R() * 3 : o.near ? Math.hypot(x + w / 2 - o.near.x, y + h / 2 - o.near.y) + R() * 3 : Math.abs(dm - 26) + R() * 3 });
    } else {
      if (!free(x, y, w, h)) continue;
      cands.push({ x, y, s: o.near ? Math.hypot(x + w / 2 - o.near.x, y + h / 2 - o.near.y) + R() * 3 : Math.abs(base - 15) * 0.8 + R() * 3 });
    }
  }
  cands.sort((a, b) => a.s - b.s);
  for (let i = 0; i < Math.min(cands.length, 700); i++) {
    const c = cands[i], x = c.x, y = c.y;
    let side = null, route = [];
    if (BUILDING[kind]) {
      const dx = x + (w >> 1), best = [];
      for (const sd of ['b', 't']) {
        const o2 = { x: dx, y: sd === 'b' ? y + h : y - 1 };
        if (dist[o2.y * W + o2.x] < 0) continue;
        const rt = []; let cur = o2, ok = true;
        const inRect = (p) => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;
        rt.push(cur);
        while (dist[cur.y * W + cur.x] > 0) {
          let nb = null;
          for (const [ax, ay] of DIRS) { const p = { x: cur.x + ax, y: cur.y + ay }; if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) continue; if (dist[p.y * W + p.x] === dist[cur.y * W + cur.x] - 1 && !inRect(p)) { nb = p; break; } }
          if (!nb) { ok = false; break; }
          cur = nb; if (dist[cur.y * W + cur.x] > 0) rt.push(cur);
        }
        if (ok) best.push({ sd, rt });
      }
      if (!best.length) continue;
      best.sort((a, b) => a.rt.length - b.rt.length); side = best[0].sd; route = best[0].rt;
      if (route.length > 16) continue;
    } else if (kind === 'market') {
      let bt = null, bd = 99; const inRect = p => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;
      const ring = []; for (let k = 0; k < w; k++) ring.push({ x: x + k, y: y - 1 }, { x: x + k, y: y + h }); for (let k = 0; k < h; k++) ring.push({ x: x - 1, y: y + k }, { x: x + w, y: y + k });
      ring.forEach(p => { if (p.x < 1 || p.y < 1 || p.x >= W - 1 || p.y >= H - 1) return; const d = dist[p.y * W + p.x]; if (d >= 0 && d < bd) { bd = d; bt = p; } });
      if (!bt || bd > 12) continue;
      route = [bt]; let cur = bt, ok = true;
      while (dist[cur.y * W + cur.x] > 0) {
        let nb = null; for (const [ax, ay] of DIRS) { const p = { x: cur.x + ax, y: cur.y + ay }; if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) continue; if (dist[p.y * W + p.x] === dist[cur.y * W + cur.x] - 1 && !inRect(p)) { nb = p; break; } }
        if (!nb) { ok = false; break; } cur = nb; if (dist[cur.y * W + cur.x] > 0) route.push(cur);
      }
      if (!ok) continue;
    } else {
      let near = false;
      for (let k = 0; k < w && !near; k++) if ((dist[(y - 1) * W + x + k] >= 0 && dist[(y - 1) * W + x + k] <= 3) || (dist[(y + h) * W + x + k] >= 0 && dist[(y + h) * W + x + k] <= 3)) near = true;
      for (let k = 0; k < h && !near; k++) if ((dist[(y + k) * W + x - 1] >= 0 && dist[(y + k) * W + x - 1] <= 3) || (dist[(y + k) * W + x + w] >= 0 && dist[(y + k) * W + x + w] <= 3)) near = true;
      if (!near) continue;
    }
    const site: any = { id: town.nextSite++, kind, x, y, w, h, side, route, done: 0, wood: 0, crew: [], created: game.time, owners: (o.owners || []).map(p => p.id), beds: o.beds || 0, surname: o.surname || '', note: o.note || '' };
    site.labor = 0; site.woodNeed = 0;
    if (BUILDING[kind]) site.door = { x: x + (w >> 1), y: side === 'b' ? y + h - 1 : y }; else if (kind !== 'field') site.name = o.name || '';
    const m = BUILDING[kind] ? 1 : 0;
    for (let yy = y - m; yy < y + h + m; yy++) for (let xx = x - m; xx < x + w + m; xx++) town.siteAt[yy * W + xx] = site.id;
    route.forEach(t => { town.siteAt[t.y * W + t.x] = site.id; });
    if (o.clear) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (grid[yy][xx] === T.TREE) { setT(xx, yy, T.GRASS); markDirty(xx, yy, 1, 1); town.treeDirty = true; town.treeCache = null; }
    if (kind === 'market') { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) town.block[yy * W + xx] = 1; ejectFrom(x, y, w, h, site); }
    town.sites.push(site); return site;
  }
  town.clearR += 2.5;
  return null;
}
function releaseSiteTiles(site) {
  if (town.block) for (let yy = site.y; yy < site.y + site.h; yy++) for (let xx = site.x; xx < site.x + site.w; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H && town.siteAt[yy * W + xx] === site.id) town.block[yy * W + xx] = 0;
  const m = BUILDING[site.kind] ? 1 : 0;
  for (let yy = site.y - m; yy < site.y + site.h + m; yy++) for (let xx = site.x - m; xx < site.x + site.w + m; xx++) if (town.siteAt[yy * W + xx] === site.id) town.siteAt[yy * W + xx] = 0;
  site.route.forEach(t => { if (town.siteAt[t.y * W + t.x] === site.id) town.siteAt[t.y * W + t.x] = 0; });
}
function completeSite(site, instant) {
  releaseSiteTiles(site);
  town.sites = town.sites.filter(s => s !== site);
  const x = site.x, y = site.y, w = site.w, h = site.h;
  if (BUILDING[site.kind]) {
    const TAV = ['Flagon', 'Goose', 'Lantern', 'Anchor', 'Stag', 'Barrel', 'Heron', 'Plough', 'Crown', 'Kettle'];
    const spec = site.kind === 'church' ? { kind: 'church', id: 'church', name: town.name + ' Church of the Flying Spaghetti Monster', beds: 1 }
      : site.kind === 'tavern' ? { kind: 'tavern', id: 'tavern', name: 'The ' + TAV[Math.floor(Math.random() * TAV.length)], beds: 1 }
      : site.kind === 'privy' ? { kind: 'privy', id: 'privy' + site.id, name: lfPrivyName(), beds: 0 }
      : LF2_BLD[site.kind] ? { kind: site.kind, id: site.kind + site.id, name: LF2_BLD[site.kind], beds: 0 }
      : { kind: 'house', id: 'house' + site.id, name: (site.surname || 'New') + ' House', beds: site.beds };
    const room: any = buildRoom(spec, x, y, w, h, site.side, null);
    room.pantry = {}; room.built = game.time; room.vacantSince = null; room.owners = site.owners.slice();
    if (site.kind !== 'house') room.beds = [];
    queueRoad(site.route);
    const owners = site.owners.map(byId).filter(isAlive);
    npcs.forEach(n => { if (n.x > x - 0.5 && n.x < x + w - 0.5 && n.y > y - 0.5 && n.y < y + h - 0.5) { const o = site.route[0]; if (o) { n.tx = o.x; n.ty = o.y; n.x = o.x; n.y = o.y; n.path = []; n.moving = false; abortPlan && abortPlan(n); } } });
    if (!instant) { /* the owners move in, together with any dependants */ }
    const movers = owners.slice();
    owners.forEach(p => { kidsAt(p).forEach(k => { if (!movers.includes(k)) movers.push(k); }); });
    if (movers.length) moveIn(movers, room);
    markDirty(x - 1, y - 1, w + 2, h + 2, site.route);
    if (site.kind === 'church') {
      room.floorTiles = []; for (let j = y + 1; j < y + h - 1; j++) for (let i = x + 1; i < x + w - 1; i++) if (grid[j][i] === T.FLOOR) room.floorTiles.push({ x: i, y: j });
      town.church = room; chron(`${room.name} is finished. Weddings and funerals can be held at last.`, 'build');
    } else if (site.kind === 'tavern') { town.tavern = room; chron(`${room.name} has opened its doors.`, 'build'); }
    if (site.helped) Object.keys(site.helped).forEach(id => owners.forEach(o => { o.helpedBy = o.helpedBy || {}; o.helpedBy[id] = { n: site.helped[id], t: game.time, what: site.kind }; }));
    if (site.kind === 'house' && !instant) { owners.forEach(p => addMem(p, 'home', `the day our house was finished`, `the day we moved into our own house`, owners.find(q => q !== p) ? owners.find(q => q !== p).id : null)); if (owners.length) requestFeast(`the new ${site.surname || ''} house`.replace('  ', ' ')); }
    if (site.kind === 'church' || site.kind === 'tavern') requestFeast(site.kind === 'church' ? 'the new chapel' : 'the new tavern');
    if (site.kind === 'church' || site.kind === 'tavern') {} else if (!instant) chron(`A new house is finished for ${owners.length ? owners.map(p => p.first).join(' and ') : 'whoever needs it'}. ${(site.surname ? site.surname + ' House' : 'It')} has ${site.beds} beds.`, 'build');
    return room;
  }
  if (site.kind === 'market') {
    rectT(x, y, w, h, T.PATH);
    const dx = x + w / 2 - town.cx, dy = y + h / 2 - town.cy, dir = Math.abs(dx) > Math.abs(dy) * 1.5 ? (dx > 0 ? 'East' : 'West') : Math.abs(dy) > Math.abs(dx) * 1.5 ? (dy > 0 ? 'South' : 'North') : (dy > 0 ? 'South' : 'North') + (dx > 0 ? 'east' : 'west');
    let nm = dir + ' Green'; if (town.markets.some(m => m.name === nm)) nm = dir + ' Commons';
    const mk = { id: town.markets.length + 1, x: x + (w >> 1), y: y + (h >> 1), name: nm, stalls: [], plaza: [] };
    town.markets.push(mk);
    [x + 1, x + w - 3].forEach(sx => { setT(sx, y, T.STALL); setT(sx + 1, y, T.STALL); const st = { x: sx, y: y + 1, face: { dx: 0, dy: -1 }, front: { x: sx, y: y + 2 }, tiles: [{ x: sx, y }, { x: sx + 1, y }], owner: null, market: mk }; town.stalls.push(st); mk.stalls.push(st); });
    [[x, y + h - 1], [x + w - 1, y + h - 1]].forEach(([lx, ly]) => { setT(lx, ly, T.LAMP); lamps.push({ x: lx, y: ly }); });
    for (let j = y + 1; j < y + h; j++) for (let i = x; i < x + w; i++) if (grid[j][i] === T.PATH) mk.plaza.push({ x: i, y: j });
    queueRoad(site.route);
    markDirty(x - 1, y - 1, w + 2, h + 2, site.route);
    chron(`${nm} has opened: a new square with stalls, for the families living out this way.`, 'build');
    staffMarkets();
    return mk;
  }
  if (site.kind === 'field') {
    const fid = town.nextField = (town.nextField || 0) + 1;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { setT(i, j, T.CROP); town.crops.push({ x: i, y: j, f: fid, st: 0, t0: 0, pl: 0, claim: null }); }
    town.fields++; markDirty(x, y, w, h);
    chron('A new field has been marked out. It needs ploughing, then sowing.', 'build');
  } else if (site.kind === 'graveyard') {
    rectT(x, y, w, h, T.PLOT); markDirty(x, y, w, h); if (!town.graveyard.blocks.length) { town.graveyard.x = x; town.graveyard.y = y; town.graveyard.w = w; town.graveyard.h = h; }
    for (let j = 0; j < Math.floor((h - 1) / 2); j++) for (let i = 0; i < Math.floor((w - 1) / 2); i++) town.graveyard.slots.push({ x: x + 1 + i * 2, y: y + 1 + j * 2, used: null });
    town.graveyard.blocks.push({ x, y, w, h });
    chron(town.graveyard.blocks.length > 1 ? 'The churchyard has been extended.' : 'The churchyard has been laid out beside the chapel.', 'build');
  } else if (site.kind === 'demolish') {
    const room = site.room; room.dead = true;
    for (let j = room.y; j < room.y + room.h; j++) for (let i = room.x; i < room.x + room.w; i++) { setT(i, j, T.GRASS); roomAt[j][i] = -1; }
    doors = doors.filter(d => rooms[d.room] !== room);
    chron(`${room.name} has been taken down. `, 'build');
  }
}
const kidsAt = p => npcs.filter(k => k.age < 16 && k.homeRoom === p.homeRoom && (k.fam.mother === p.id || k.fam.father === p.id));
let dirtyList = []; let GRAVE_LIFE = 75 * YEAR;
function markDirty(x, y, w, h, extra?) { dirtyList.push({ x, y, w, h }); (extra || []).forEach(t => dirtyList.push({ x: t.x, y: t.y, w: 1, h: 1 })); }

