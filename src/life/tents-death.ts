/* ---------- tents: anonymous camp beds, one per homeless person ---------- */
function addTent() {
  const cx = town.cx, cy = town.cy, c = [];
  // first choice: the edge of the camp yard, so tents stay out of the building land
  const occupied = new Set(town.tents.map(t => t.x + ',' + t.y));
  // tents go round the rim of the camp circle, leaving the middle open
  for (let y = cy - 7; y <= cy + 8; y++) for (let x = cx - 7; x <= cx + 7; x++) { const r = Math.hypot(x - cx, y - cy - 0.5); if (r >= 5.3 && r <= 6.6 && grid[y][x] === T.PATH && !occupied.has(x + ',' + y) && !town.siteAt[y * W + x]) { const a = Math.atan2(y - cy - 0.5, x - cx); c.push({ x, y, d: ((Math.round(a * 4) % 2 + 2) % 2) * 20 + Math.abs(Math.sin(a)) * 3 + (r < 5.8 ? 0 : 1) }); } }
  if (!c.length) for (let y = cy - 16; y <= cy + 16; y++) for (let x = cx - 22; x <= cx + 22; x++) {
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || grid[y][x] !== T.GRASS || roomAt[y][x] >= 0 || town.siteAt[y * W + x] || town.nodeMap.has(y * W + x)) continue;
    if (Math.hypot(x - cx, y - cy - 0.5) <= 7.6) continue;
    c.push({ x, y, d: Math.hypot(x - (cx - 7), (y - (cy + 6)) * 1.3) });
  }
  c.sort((a, b) => a.d - b.d);
  const p = c[0]; if (!p) return null;
  const t = { x: p.x, y: p.y, owner: null, under: grid[p.y][p.x] }; town.tents.push(t); setT(p.x, p.y, T.TENT);
  if (typeof dirtyList !== 'undefined' && dirtyList) markDirty(p.x, p.y, 1, 1);
  return t;
}
/** every camp tent tile goes back to grass (also tiles no record points at: the generator and old saves leave some) */
function clearTentTiles() { let k = 0; const own = new Set((town.props || []).filter(p => p.kind === 'tent').map(p => p.x + p.y * W)); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === T.TENT && !own.has(x + y * W)) { setT(x, y, T.GRASS); markDirty(x, y, 1, 1); k++; } if (k) town.gridV = (town.gridV || 0) + 1; return k; }
const LF_TENTS = false;   // no camp tents: people without a bed bed down by the square until they get one
function syncTents() {
  if (!town.tents) return;
  if (!LF_TENTS) { for (const t of town.tents.splice(0)) { if (grid[t.y][t.x] === T.TENT) { setT(t.x, t.y, t.under || T.GRASS); markDirty(t.x, t.y, 1, 1); } if (t.owner && t.owner.tent === t) t.owner.tent = null; } clearTentTiles(); return; }
  const homeless = npcs.filter(n => !n.infant && !n.dead && !n.inShip && n.age >= 3 && !(n.bed && n.bed.x != null)).length;   /* a tent goes up for each person once they are off the ship */
  while (town.tents.length < homeless) if (!addTent()) break;
  let extra = town.tents.length - homeless;
  if (extra > 0) {
    const free = town.tents.filter(t => !t.owner).sort((a, b) => Math.hypot(b.x - town.cx, b.y - town.cy) - Math.hypot(a.x - town.cx, a.y - town.cy));
    for (const t of free) { if (extra <= 0) break; town.tents.splice(town.tents.indexOf(t), 1); if (grid[t.y][t.x] === T.TENT) setT(t.x, t.y, t.under || T.GRASS); markDirty(t.x, t.y, 1, 1); extra--; }
  }
}
function claimTent(n) {
  let best = null, bd = 1e9;
  for (const t of town.tents || []) { if (t.owner && t.owner !== n) continue; const d = Math.abs(t.x - n.tx) + Math.abs(t.y - n.ty); if (d < bd) { bd = d; best = t; } }
  if (best) { best.owner = n; n.tent = best; }
  return best;
}
function checkPass() {
  const r = town.region; if (!r || r.open || !r.rubble) return;
  const left = r.rubble.filter(k => grid[Math.floor(k / W)][k % W] === T.ROCK).length;
  if (!r.half && left <= r.rubble.length / 2 && left) { r.half = true; chron('Half the rockfall in the old pass has been cleared. Cold air blows through from the far side.', 'build'); }
  if (left === 0) { r.open = true; refreshReach(); chron(`The old pass is clear! Beyond the mountains lies ${r.name}, dark and ancient. The elders say nobody has walked there in living memory.`, 'build');
    const el = npcs.filter(n => n.age >= 50 && !n.player).sort((a, b) => b.age - a.age)[0]; if (el && typeof say === 'function') say(el, el, [[el, anyOf(['So the old pass is open. My grandmother said the forest beyond had a will of its own.', 'The Old Forest... Mind you are home before dark if you go in there.'])]]); }
}
function rockfall() {
  let nb = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (grid[y][x] === T.ROCK && DIRS.some(([dx, dy]) => reach[(y + dy) * W + x + dx])) nb++;
  const cap = Math.max(30, Math.round((town.rockCap || 40) * 0.6)); if (nb >= cap) return;
  let made = 0;
  for (let t = 0; t < 4000 && made < 3 && nb + made < cap; t++) {
    const x = 2 + Math.floor(Math.random() * (W - 4)), y = 2 + Math.floor(Math.random() * (GH() - 4));
    if (grid[y][x] !== T.GRASS || roomAt[y][x] >= 0 || town.siteAt[y * W + x] || town.nodeMap.has(y * W + x) || (town.block && town.block[y * W + x]) || nearGrave(x, y)) continue;
    let mt = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (grid[y + j][x + i] === T.MOUNTAIN) mt++;
    if (!mt || npcs.some(n => n.tx === x && n.ty === y)) continue;
    if (inForest(x, y) || inCoast(x, y)) continue;
    // only where people can actually get at it
    if (!DIRS.some(([dx, dy]) => reach[(y + dy) * W + x + dx] && walkable(x + dx, y + dy))) continue;
    setT(x, y, T.ROCK); markDirty(x, y, 1, 1); made++;
  }
  if (made) { town.stoneCache = null; town.treeDirty = true; if (typeof refreshReach === 'function') refreshReach(); }
}
function hourlyLife() {
  syncTents(); staffMarkets(); if (typeof ensurePriest === 'function') ensurePriest(); if (typeof crossTick === 'function') crossTick();
  // before dawn: a few boulders tumble down from the mountains, so stone never quite runs out
  if (Math.floor((game.time % 1440) / 60) === 5) rockfall();
  checkPass();
  // six o'clock: families down tools and head home for supper together
  if (Math.floor((game.time % 1440) / 60) === 18 && !(typeof eventsBusy === 'function' && eventsBusy())) {
    const key = Math.floor(game.time / 1440) * 2 + 1;
    npcs.forEach(n => { if (n.player || n.infant || !n.homeRoom || n.shop || n.role === 'Priest' || n.role === 'Barkeep' || n.pose === 'sleep' || n.mealKey === key || n.talkUntil > game.time) return;
      if (hhOf(n).filter(o => !o.infant).length < 2 || !foodCount(pantryOf(n))) return;
      const st = n.plan && n.plan[n.si]; if (st && (st.act === 'eat' || (n.outUntil || 0) > game.time)) return;
      abortPlan(n); });
  }
  if (Math.floor(game.time / 1440) % 3 === 1 && (game.time % 1440) < 600 && foodDaysNow() > 4) requestFeast('a good harvest');
  npcs.slice().forEach(m => { if (m.preg && game.time >= m.preg.due && modOn('rule.births')) giveBirth(m); });
  // wedding and funeral start/finish
  const w = town.wedding; if (w && !w.done && game.time >= w.end) { w.done = true; if (!w.renewal && !w.a.dead && !w.b.dead) marry(w.a, w.b); else if (w.renewal) chron(`${w.a.first} and ${w.b.first} renewed their vows.`, "love"); town.wedding = null; }
  const fn = town.funeral;
  if (fn && game.time >= fn.end) finishFuneral(fn);
  else if (!fn && town.funeralQ && town.funeralQ.length && true) startFuneral(town.funeralQ.shift());
}
function giveBirth(m) {
  const f = byId(m.preg.father) || null; m.preg = null; m.lastBirth = game.time;
  const R = rng(town.seed + game.time * 7 + m.id);
  const kid: any = newPerson(R, 'Child', 0, town.used, { mother: m, father: f, surname: f ? f.surname : m.surname });
  kid.born = game.time; kid.age = 0; updateLook(kid);
  linkKin(m, f, kid); kid.rand = rng(town.seed + kid.id * 977); routine(R, kid); kid.jit = 0;
  town.byId.set(kid.id, kid); initNpcSim(kid); kid.x = kid.tx = m.tx; kid.y = kid.ty = m.ty;
  kid.homeRoom = m.homeRoom; kid.bed = m.bed; kid.seat = null;
  npcs.forEach(o => { if (o !== kid && (o.fam.mother === m.id || (f && o.fam.father === f.id)) && o.age < 16) fam2(kid, o, 'sibling'); });
  [m, f].forEach(p => { if (p) { kid.aff[p.id] = 90; p.aff[kid.id] = 90; kid.know[p.id] = p.know[kid.id] = 100; p.social = Math.min(100, p.social + 30); } });
  npcs.push(kid); town.births++; addMem(m, 'birth', `the day ${kid.first} was born`, `the day ${kid.first} was born`, f ? f.id : null); if (f) addMem(f, 'birth', `the day ${kid.first} was born`, `the day ${kid.first} was born`, m.id); calAdd('birth', `${kid.first} ${kid.surname} was born to ${m.first}`);
  chron(`${nameOf(m)} gave birth to ${kid.female ? 'a daughter' : 'a son'}, ${kid.first}.`, 'life');
  game.events.push({ time: game.time, a: m, b: f || m, place: m.homeRoom ? m.homeRoom.name : 'the camp', topic: 'birth', quiet: false, lines: [{ who: m, text: `Meet ${kid.first}.` }, { who: f || m, text: f ? `Look at those tiny hands. ${kid.first}, welcome to ${town.name}.` : `Welcome to ${town.name}, ${kid.first}.` }] });
}

/* ---------- death and funerals ---------- */
function die(n, cause) {
  if (n.dead) return;
  const wasPlayer = game.player === n;
  if (wasPlayer) releasePlayer();
  n.dead = true; n.deathTime = game.time; npcs.splice(npcs.indexOf(n), 1);
  release(n); leaveHome(n); if (n.shop) dropMerchant(n);
  const rec = { id: n.id, name: nameOf(n), first: n.first, age: n.age, born: n.born, died: game.time, cause, role: n.role, female: n.female, quirk: n.quirk, traits: n.traits, kids: n.fam.kids.length, spouse: n.fam.spouse, person: n };
  town.dead.push(rec); town.deaths++;
  // what is left lies where they fell until the funeral
  (town.remains = town.remains || []).push({ id: rec.id, x: n.tx, y: n.ty, rec, at: game.time });
  // inheritance
  const heirs = [n.fam.spouse && byId(n.fam.spouse), ...n.fam.kids.map(byId)].filter(h => h && !h.dead && h.age >= 16);
  if (heirs.length) heirs.forEach(h => { h.coin += n.coin / heirs.length; }); else town.treasury += n.coin;
  n.coin = 0;
  const sp = n.fam.spouse && byId(n.fam.spouse);
  if (sp && !sp.dead) { sp.fam.spouse = null; sp.fam.partner = null; sp.grief = game.time + YEAR; sp.social = Math.max(0, sp.social - 30); }
  const pt = n.fam.partner && byId(n.fam.partner); if (pt && !pt.dead) pt.fam.partner = null;
  chron(`${nameOf(n)} died, age ${n.age}${cause === 'old age' ? ', of old age' : cause === 'hunger' ? ', of hunger' : ', of ' + cause}.`, 'death');
  if (wasPlayer && typeof beginSuccession === 'function') beginSuccession(rec, n);
  npcs.forEach(o => { if (o.age >= 5 && (isKin(o, n) || (o.aff[n.id] || 0) >= 50)) addMem(o, 'loss', `losing ${n.first}`, null, null); });
  town.funeralQ = town.funeralQ || []; if (modOn('event.funeral')) town.funeralQ.push(rec);
  if (false) chron(`${n.first} cannot have a funeral yet: ${town.name} has no church.`, 'death');
  if (town.sites.length) town.sites.forEach(s => { s.owners = s.owners.filter(id => id !== n.id); s.crew = s.crew.filter(id => id !== n.id); });
}
function attends(n, rec) {
  if (n.infant) return false;
  if (n.age < 16) return !!npcs.find(p => p.age >= 16 && (n.fam.mother === p.id || n.fam.father === p.id)) || (n.know[rec.id] || 0) > 40;
  return npcs.length <= 24 || isKinOf(n, rec) || (n.know[rec.id] || 0) >= 20 || (n.aff[rec.id] || 0) >= 15;
}
const isKinOf = (n, rec) => rec.person && isKin(n, rec.person);

/* ---------- people helpers shared with the sim ---------- */
function makeTownIndex() { town.byId = new Map(); npcs.forEach(n => town.byId.set(n.id, n)); town.funeralQ = []; town.funeral = null; town.wedding = null; }

function settlerArrives() {
  const R = rng(town.seed + game.time * 13), male = npcs.filter(n => n.age >= 16 && !n.female).length, fem = npcs.filter(n => n.age >= 16 && n.female).length;
  const female = male > fem ? true : male < fem ? false : chance(R, .5);
  const sn = pick(R, SURNAMES), a = newPerson(R, 'Child', ri(R, 18, 30), town.used, { female, surname: sn });
  const grp = [a];
  if (chance(R, .25)) { const b = newPerson(R, 'Child', ri(R, 18, 30), town.used, { female: !female, surname: sn }); setSpouse(a, b); grp.push(b); }
  const p = town.markets[0].plaza[0] || { x: town.cx, y: town.cy };
  grp.forEach((n: any) => {
    n.adult = true; n.infant = false; n.age = ageNow(n); updateLook(n); n.rand = rng(town.seed + n.id * 977); n.jit = 0; n.bornHere = false;
    n.homeRoom = null; n.bed = { owner: null }; routine(R, n); town.byId.set(n.id, n); initNpcSim(n);
    setRole(n, chooseJob()); n.coin = 20; n.x = n.tx = p.x; n.y = n.ty = p.y; n.seat = null; npcs.push(n);
    npcs.forEach(o => { if (o !== n && !n.know[o.id]) { n.know[o.id] = 4; o.know[n.id] = 4; n.aff[o.id] = 8; o.aff[n.id] = 8; } });
  });
  chron(grp.length > 1 ? `${nameOf(a)} and ${nameOf(grp[1])} arrived from the road and asked to stay.` : `${nameOf(a)} arrived from the road and asked to stay.`, 'life');
}

/* ---------- the forest grows back ---------- */
function regrowTrees() {
  const tries = Math.round(W * (town.h0 || H) / 45); let made = 0;
  const okG = new Set([T.GRASS, T.TREE, T.WATER, T.SAND, T.ROCK, T.MOUNTAIN]);
  for (let t = 0; t < tries; t++) {
    const x = ri(Math.random, 2, W - 3), y = ri(Math.random, 2, GH() - 3);
    if (grid[y][x] !== T.GRASS || roomAt[y][x] >= 0 || town.siteAt[y * W + x] || town.nodeMap.has(y * W + x) || nearGrave(x, y)) continue;
    if (marketDist(x, y) < 14) continue;
    let near = 0, bad = false;
    for (let j = -2; j <= 2 && !bad; j++) for (let i = -2; i <= 2; i++) {
      const xx = x + i, yy = y + j; if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) continue;
      const g = grid[yy][xx];
      if (g === T.TREE && Math.abs(i) <= 2 && Math.abs(j) <= 2) near++;
      if (!okG.has(g) || roomAt[yy][xx] >= 0 || town.siteAt[yy * W + xx] || town.nodeMap.has(yy * W + xx)) { bad = true; break; }
    }
    if (bad) continue;
    if (Math.random() > (near >= 3 ? 0.6 : near >= 1 ? 0.3 : 0.04)) continue;
    if (npcs.some(n => Math.abs(n.x - x) < 2 && Math.abs(n.y - y) < 2)) continue;
    setT(x, y, T.TREE); markDirty(x, y, 1, 1); made++;
  }
  if (made) { town.treeDirty = true; town.treeCache = null; }
}

