/* ---------- gatherable plants ---------- */
function spawnNodes(n) {
  for (let t = 0; t < n * 14 && n > 0; t++) {
    const x = ri(Math.random, 3, W - 4), y = ri(Math.random, 3, H - 4), d = marketDist(x, y);
    if (d < 8 || d > 34 || !tileFree(x, y) || !reach[y * W + x]) continue;
    let ok = true; for (let j = -2; j <= 2 && ok; j++) for (let i = -2; i <= 2; i++) { const xx = x + i, yy = y + j; if (xx > 0 && yy > 0 && xx < W && yy < H && (roomAt[yy][xx] >= 0 || town.siteAt[yy * W + xx] || grid[yy][xx] === T.PATH)) { ok = false; break; } }
    if (!ok) continue;
    const kind = chance(Math.random, .72) ? 'berry' : 'herb';
    const node = { x, y, kind, amt: 3, max: 6 }; town.nodes.push(node); town.nodeMap.set(y * W + x, node); n--;
  }
}
function pruneNodes() {
  town.nodes = town.nodes.filter(nd => { const bad = roomAt[nd.y][nd.x] >= 0 || grid[nd.y][nd.x] !== T.GRASS || town.siteAt[nd.y * W + nd.x] || !reach[nd.y * W + nd.x] && !DIRS.some(([dx, dy]) => reach[(nd.y + dy) * W + nd.x + dx]); if (bad) town.nodeMap.delete(nd.y * W + nd.x); return !bad; });
}

/* ---------- aging, jobs ---------- */
function chooseJob() { return 'Worker'; }
function handOffMats(n) {
  for (const k of ['wood', 'stone']) { let q = n.inv[k] || 0; if (!q) continue;
    const ws = npcs.filter(o => o !== n && o.role === 'Worker' && !o.player && o.age >= 16 && o.age < 60 && handsUsed(o) < handsMax(o)).sort((a, b) => Math.hypot(a.tx - n.tx, a.ty - n.ty) - Math.hypot(b.tx - n.tx, b.ty - n.ty));
    for (const o of ws) { if (!q) break; const t = Math.min(q, handsMax(o) - handsUsed(o)); o.inv[k] = (o.inv[k] || 0) + t; q -= t; }
    n.inv[k] = 0; }
}
function setRole(n, role, mk) {
  if (n.player && !['Worker', 'Elder', 'Child'].includes(role)) releasePlayer();
  if (role !== 'Worker' && ((n.inv.wood || 0) + (n.inv.stone || 0)) > 0) handOffMats(n);
  const was = n.role; n.role = role; styleFor(rng(town.seed + n.id * 53 + Math.floor(game.time)), n); routine(rng(town.seed ^ n.id), n);
  if (was === 'Trader' && n.shop) dropMerchant(n);
  if (role === 'Trader') makeMerchant(n, mk);
  n.cur = null; n.curUntil = 0;
}
function becomeAdult(n) {
  n.adult = true; setRole(n, chooseJob()); n.coin = Math.max(n.coin, 6);
  const lj = Object.entries(n.learn || {}).sort((a, b) => b[1] - a[1])[0]; if (lj && lj[1] >= 2) n.pref = lj[0];
  chron(`${nameOf(n)} turned sixteen and joined the workers${n.pref ? ', hoping to be ' + JOB_NOUN[n.pref] + ' like ' + (npcs.find(p => isParentOf(p, n) && !p.dead) || { first: 'family' }).first : ''}.`, 'life'); calAdd('birthday', `${nameOf(n)} became an adult`);
}
function annualMortality(a) { return a < 1 ? 0.03 : a < 12 ? 0.004 : a < 45 ? 0.006 : a < 60 ? 0.018 : a < 70 ? 0.05 : a < 80 ? 0.12 : 0.25; }
function dailyLife() {
  const day = Math.floor(game.time / 1440);
  // birthdays
  npcs.slice().forEach(n => {
    const a = ageNow(n);
    if (a !== n.age) {
      n.age = a; updateLook(n);
      if (typeof partyAge === 'function' && partyAge(a) && !n.infant) scheduleParty(n);
      if (a === 16) becomeAdult(n);
      else if (a === 3) { n.infant = false; }
      else if (a === 60 && n.role === 'Worker') { setRole(n, 'Elder'); chron(`${nameOf(n)} turned sixty and hung up the tools.`, 'life'); calAdd('birthday', `${nameOf(n)} became an elder`); }
      else if (a === 68 && (n.role === 'Priest' || n.role === 'Trader' || n.role === 'Barkeep')) { const was = n.role; setRole(n, 'Elder'); chron(`${nameOf(n)} retired after a lifetime as ${was === 'Trader' ? 'a shopkeeper' : 'the ' + was.toLowerCase()}.`, 'life'); calAdd('birthday', `${nameOf(n)} became an elder`); }
      if (n.age >= 16 && n.role === 'Child') becomeAdult(n);
    }
  });
  // death
  npcs.slice().forEach(n => {
    if (npcs.length <= 2) return;
    // everyone lives to a ripe old age, and goes at a time of their own somewhere between 70 and 88
    if (n.lifespan == null) n.lifespan = 70 + Math.floor((n.rand ? n.rand() : Math.random()) * 19);
    if (n.age >= n.lifespan && day >= 6) die(n, 'old age');
  });
  romanceTick(); fertilityTick(); housingTick(); growthProjects(); pruneNodes();
  if (!town.sites.length || day % 3 === 0) { refreshReach(); refreshShore(); }
  const target = 16 + npcs.length;
  if (town.nodes.length < target) spawnNodes(Math.min(6, target - town.nodes.length));
  staffMarkets(); staffSpecialists();
  regrowTrees();
  // travellers who decide to settle
  if (day % 3 === 1 && Math.random() < (npcs.length < 20 ? 0.9 : npcs.length < 40 ? 0.5 : npcs.length < 80 ? 0.3 : 0.1) && (npcs.length < 16 || !town.sites.some(x => x.kind === 'house')) && houseRooms().length >= 2 && npcs.filter(n => !homeOK(n)).length < 2) settlerArrives();
  // settlers' grant for a young town
  if (day < 90) town.treasury += npcs.length * 1.5;
  town.hist.pop.push(npcs.length); if (town.hist.pop.length > 400) town.hist.pop.shift();
}

/* ---------- romance, weddings, birth ---------- */
function eligible(n) { return n.age >= 16 && n.age < 65 && !n.fam.spouse && !n.fam.partner && game.time > n.grief; }
function romanceTick() {
  const pool = npcs.filter(eligible), pairs = [];
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    const a = pool[i], b = pool[j];
    if (a.female === b.female || Math.abs(a.age - b.age) > 14 || isKin(a, b)) continue;
    const aff = Math.min(a.aff[b.id] || 0, b.aff[a.id] || 0), kn = Math.min(a.know[b.id] || 0, b.know[a.id] || 0);
    if (aff >= 30 && kn >= 22) pairs.push([a, b, aff + kn * 0.3]);
  }
  pairs.sort((x, y) => y[2] - x[2]);
  pairs.forEach(([a, b]) => {
    if (!eligible(a) || !eligible(b) || Math.random() > 0.45) return;
    a.fam.partner = b.id; b.fam.partner = a.id; a.courtSince = b.courtSince = game.time; a.rel[b.id] = b.rel[a.id] = 'partner';
    chron(`${a.first} ${a.surname} and ${b.first} ${b.surname} have been seen walking out together.`, 'love');
    town.events && game.events.push({ time: game.time, a, b, place: 'the lanes', topic: 'courting', quiet: false, lines: [{ who: a, text: `I was thinking. Would you walk with me later, ${b.first}?` }, { who: b, text: 'I was hoping you would ask.' }] });
  });
  // maintain courtships
  npcs.forEach(a => {
    const pid = a.fam.partner; if (!pid || a.fam.spouse === pid || a.female) return;
    const b = byId(pid);
    if (!b || b.dead) { a.fam.partner = null; return; }
    const aff = Math.min(a.aff[b.id] || 0, b.aff[a.id] || 0);
    a.aff[b.id] = (a.aff[b.id] || 0) + 1.5; b.aff[a.id] = (b.aff[a.id] || 0) + 1.5;
    if (aff < 15) { a.fam.partner = b.fam.partner = null; a.rel[b.id] = b.rel[a.id] = 'friend'; chron(`${a.first} and ${b.first} have stopped walking out together.`, 'love'); return; }
    if (game.time - a.courtSince > 0.45 * YEAR && aff >= 60 && !town.wedding) { if (true) scheduleWedding(a, b); else if (!a.waitedChurch) { a.waitedChurch = true; chron(`${a.first} and ${b.first} want to marry, but ${town.name} has no church yet.`, 'love'); } }
  });
}
function nextAt(hour, minGap) { let t = Math.floor(game.time / 1440) * 1440 + hour * 60; while (t < game.time + minGap) t += 1440; return t; }
function scheduleWedding(a, b) {
  const at = nextAt(16, 12 * 60);
  const ch = town.church; town.wedding = { a, b, at, end: at + 70, done: false, mk: { plaza: ch.floorTiles, x: ch.x + ch.w / 2, y: ch.y + ch.h / 2, arch: { x: ch.doorX, y: ch.doorY + (ch.side === 'b' ? 1 : -1) }, church: true } };
  chron(`${a.first} ${a.surname} and ${b.first} ${b.surname} will be married on ${dayLabel(at)}.`, 'love');
}
const dayLabel = t => `day ${Math.floor(t / 1440) % 3 + 1} of year ${yearsOf(t) + 1}`;
function marry(a, b) {
  const groom = a.female ? b : a, bride = a.female ? a : b;
  setSpouse(a, b); bride.surname = groom.surname; town.weddings++;
  addMem(a, 'wedding', `marrying ${b.first}`, 'our wedding day', b.id); addMem(b, 'wedding', `marrying ${a.first}`, 'our wedding day', a.id);
  npcs.forEach(o => { if (o !== a && o !== b && (isKin(o, a) || isKin(o, b)) && o.age >= 6) addMem(o, 'wedding', `${a.first} and ${b.first}'s wedding`, null, null); });
  [a, b].forEach(p => { p.social = Math.min(100, p.social + 50); p.coin += 10; });
  town.treasury -= Math.min(town.treasury, 20);
  chron(`${nameOf(groom)} and ${bride.first} were married ${town.church ? 'at the chapel' : 'by the camp fire'}. The whole town came.`, 'love'); calAdd('wedding', `${nameOf(groom)} and ${nameOf(bride)} were married`);
  // where will they live?
  const ra = a.homeRoom, rb = b.homeRoom;
  const cands = [[ra, a, b], [rb, b, a]].filter(([r]) => r && !r.dead && bedsFree(r) >= 1);
  if (ra === rb) return;
  if (cands.length) { const [r, , mover] = cands.sort((x, y) => occupants(y[0]).length - occupants(x[0]).length)[0]; moveIn([mover], r); chron(`${mover.first} moved in with ${mover === a ? b.first : a.first}.`, 'family'); }
  else chron(`${groom.first} and ${bride.first} will need a home of their own.`, 'family');
}
function fertilityTick() {
  npcs.forEach(m => {
    const isl = false;   // on the island, families grow quickly (nobody else is coming), even before they have a house
    if (!m.female || m.preg || m.age < 17 || m.age > (isl ? 45 : 41) || !m.fam.spouse) return;
    const f = byId(m.fam.spouse); if (!f || f.dead || (!isl && (!m.homeRoom || f.homeRoom !== m.homeRoom))) return;
    if (game.time - m.lastBirth < (isl ? 0.45 : 0.9) * YEAR || (m.homeRoom && m.homeRoom.dead)) return;
    if ((!isl && pantryDays(m) < 1.2) || npcs.length >= (isl ? 60 : 400)) return;
    const kids = m.homeRoom ? occupants(m.homeRoom).filter(k => k.age < 16).length : m.fam.kids.filter(id => { const k = byId(id); return k && !k.dead && k.age < 16; }).length;
    if (Math.random() < (isl ? 0.4 - kids * 0.03 : 0.2 - kids * 0.02)) { m.preg = { due: game.time + 0.75 * YEAR * (0.95 + Math.random() * 0.1), father: f.id }; if (Math.random() < .5) chron(`${nameOf(m)} is expecting a child.`, 'family'); }
  });
}
