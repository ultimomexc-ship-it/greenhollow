/* ---------- housing manager ---------- */
function houseRooms() { return rooms.filter(r => r.kind === 'house' && !r.dead); }
function housingTick() {
  const homes = houseRooms();
  // anyone without a valid home or bed looks for a free bed, near kin first
  const needy = npcs.filter(n => n.age >= 3 && !n.waitHouse && (!homeOK(n) || n.bed.owner !== n));
  needy.forEach(n => {
    const kin = npcs.filter(o => o !== n && homeOK(o) && (isKin(n, o) || o.fam.spouse === n.id)).map(o => o.homeRoom).filter(r => bedsFree(r) > 0);
    const any = homes.filter(r => bedsFree(r) > 0);
    const hasKin = npcs.some(o => o !== n && (isKin(n, o) || o.fam.spouse === n.id || n.fam.spouse === o.id));
    const r = kin[0] || (hasKin ? null : any[0]);
    if (r) moveIn([n], r);
  });
  // orphans without an adult move to relatives
  homes.forEach(r => {
    const occ = occupants(r), kids = occ.filter(k => k.age < 16);
    if (kids.length && !occ.some(a => a.age >= 16)) {
      const kin = npcs.filter(o => o.age >= 16 && homeOK(o) && kids.some(k => isKin(k, o))).map(o => o.homeRoom);
      const t = kin.find(rr => bedsFree(rr) >= kids.length) || homes.find(rr => rr !== r && occupants(rr).some(a => a.age >= 16) && bedsFree(rr) >= kids.length);
      if (t) { moveIn(kids, t); chron(`${kids.map(k => k.first).join(' and ')} went to live in ${t.name}.`, 'family'); }
    }
  });
  // still unhoused: plan a house for the whole family (it waits if timber or stone is short)
  Object.keys(town.wants).forEach(k => { if (k.startsWith('house:')) delete town.wants[k]; });
  const still = npcs.filter(n => n.age >= 3 && (!homeOK(n) || n.bed.owner !== n));
  const activeH = town.sites.filter(s => s.kind === 'house');
  const seen = new Set();
  still.filter(n => n.age >= 16).forEach(adult => {
    if (seen.has(adult.id)) return;
    const fam = new Set([adult]); let ch = true;
    const rel = (p, q) => q.fam.spouse === p.id || p.fam.spouse === q.id || q.fam.kids.includes(p.id) || p.fam.kids.includes(q.id) || q.fam.mother === p.id || q.fam.father === p.id || p.fam.mother === q.id || p.fam.father === q.id;
    while (ch) { ch = false; still.forEach(p => { if (!fam.has(p) && [...fam].some(q => rel(p, q))) { fam.add(p); ch = true; } }); }
    const group = [...fam]; group.forEach(p => seen.add(p.id));
    if (activeH.some(s => s.owners.some(id => group.some(p => p.id === id)))) return;
    if (activeH.length >= 2) return;
    const beds = Math.min(6, group.filter(n => n.age >= 3).length + 1), d = houseDims(beds);
    const s = startProject('house', d.w, d.h, { beds, owners: group.slice(0, 6), surname: adult.surname }, 'house:' + adult.id, 'House for the ' + adult.surname + ' family');
    if (s) { activeH.push(s); chron(`${adult.first} ${adult.surname} and family will have a house. The site is marked out and waits for timber.`, 'build'); }
  });
  // demolition of empty houses
  homes.forEach(r => {
    if (occupants(r).length) { r.vacantSince = null; return; }
    if (r.vacantSince === null || r.vacantSince === undefined) { r.vacantSince = game.time; return; }
    const reserved = town.sites.some(s => s.owners.some(id => { const p = byId(id); return p && !p.dead && p.homeRoom === r; }));
    const spare = homes.reduce((s, h) => s + (h !== r ? bedsFree(h) : 0), 0);
    if (!reserved && game.time - r.vacantSince > YEAR * (spare >= 8 ? 0.7 : 2.5) && spare >= 5 && !town.sites.some(s => s.kind === 'demolish' && s.room === r)) {
      const site = { id: 0, kind: 'demolish', room: r, x: r.x, y: r.y, w: r.w, h: r.h, side: r.side, route: [], done: 0, labor: 0 };
      completeSite(site, true);
    }
  });
}
function nearbyHomes(r, rad) { return houseRooms().filter(o => Math.hypot(o.x - r.x, o.y - r.y) <= rad); }
function recycleGraves() {
  const gy = town.graveyard, old = gy.slots.filter(sl => sl.used && sl.used !== 'reserved' && game.time - sl.used.died > GRAVE_LIFE);
  if (old.length) {
    old.forEach(sl => { sl.used.cleared = true; sl.used = null; setT(sl.x, sl.y, T.PLOT); markDirty(sl.x, sl.y, 1, 1); });
    chron(`The oldest graves in the churchyard have been cleared for new burials: ${old.length} in all, kept in the records only.`, 'death');
  }
  // an extra plot nobody is buried in can go back to the land
  for (const b of gy.blocks.slice(1)) {
    const inside = gy.slots.filter(sl => sl.x >= b.x && sl.x < b.x + b.w && sl.y >= b.y && sl.y < b.y + b.h);
    if (inside.length && inside.every(sl => !sl.used) && gy.slots.length - inside.length - gy.slots.filter(sl => sl.used).length >= 6 && !town.sites.some(s => s.kind === 'graveyard')) {
      rectT(b.x, b.y, b.w, b.h, T.GRASS); markDirty(b.x, b.y, b.w, b.h);
      gy.slots = gy.slots.filter(sl => !inside.includes(sl)); gy.blocks = gy.blocks.filter(q => q !== b);
      chron('An unused corner of the churchyard has been given back to the land.', 'build'); break;
    }
  }
}
function marketProject() {
  if (town.sites.some(s => s.kind === 'market')) return;
  if (!town.markets.some(m => m.stalls.length)) {
    if (houseRooms().length < 1) return;
    const st = startProject('market', 9, 7, { first: true }, 'market', 'A village green with a larder');
    if (st) chron('The settlers will lay out a village green near the camp, with a shared larder where anyone can leave what they gathered and take what they need.', 'build');
    return;
  }
  if (npcs.length < 18) return;
  const far = houseRooms().filter(r => marketDist(r.x + r.w / 2, r.y + r.h / 2) >= 22);
  if (far.length < 3) return;
  let best = null, bc = 0; far.forEach(r => { const c = far.filter(o => Math.hypot(o.x - r.x, o.y - r.y) <= 13); if (c.length > bc) { bc = c.length; best = c; } });
  if (bc < 3) return;
  const near = { x: best.reduce((s, r) => s + r.x + r.w / 2, 0) / best.length, y: best.reduce((s, r) => s + r.y + r.h / 2, 0) / best.length };
  const s = startProject('market', 9, 7, { near }, 'market', 'A second green for the outlying families');
  if (s) chron(`The families out past the old green want a larder nearer home. A second green will be laid out.`, 'build');
}
function churchProject(force?) {
  if (town.church || town.sites.some(s => s.kind === 'church')) return;
  if (!force && houseRooms().length < 2) return;
  let s = null;
  for (const [w, h, tight, clear] of [[15, 11], [15, 11, false, true], [14, 10, false, true], [13, 9, false, true], [13, 9, true, true], [12, 9, true, true], [11, 8], [11, 8, true], [11, 8, true, true]]) {
    s = startProject('church', w, h, { tight: !!tight, clear: !!clear }, 'church', 'A chapel, built of stone');
    if (s) break;
    if (!town.wants.church || !town.wants.church.noRoom) break;
    delete town.wants.church.noRoom;
  }
  if (!s && town.wants.church) town.wants.church.noRoom = true;
  if (s) chron('The settlers have gathered enough stone to start a chapel. There can be no weddings or funerals until it stands.', 'build');
}
function tavernProject() {
  if (town.tavern || !town.church || npcs.length < 18 || town.sites.some(s => s.kind === 'tavern') || !town.markets.some(m => m.stalls.length)) return;
  let s = null;
  for (const [w, h, tight] of [[10, 7], [9, 6], [9, 6, true]]) { s = startProject('tavern', w, h, { tight: !!tight }, 'tavern', 'A tavern'); if (s || !(town.wants.tavern && town.wants.tavern.noRoom)) break; }
  if (s) chron('A tavern will be raised near the square.', 'build');
}
function staffMarkets() {
  town.markets.forEach(mk => {
    if (!mk.stalls.length || mk.stalls.some(st => st.owner)) return;
    const adults = npcs.filter(n => n.age >= 16 && n.age < 60 && n.role === 'Worker' && !n.shop && !n.player);
    if (adults.length < 3) return;
    const c = adults.sort((a, b) => marketDist2(a, mk) - marketDist2(b, mk))[0]; if (!c) return;
    setRole(c, 'Trader', mk); chron(`${nameOf(c)} will keep the larder on ${mk.name}, so nothing goes to waste.`, 'life');
  });
}
function staffSpecialists() {
  const adults = () => npcs.filter(n => n.age >= 22 && n.age < 58 && n.role === 'Worker' && !n.player);
  if (false) {
    const c = adults().sort((a, b) => (b.traits.includes('devout') ? 3 : 0) - (a.traits.includes('devout') ? 3 : 0) || Math.random() - .5)[0];
    if (c) { setRole(c, 'Priest'); chron(`${nameOf(c)} has been chosen as the priest of ${town.church.name}.`, 'life'); }
  }
  if (town.tavern && !npcs.some(n => n.role === 'Barkeep') && npcs.length >= 14) {
    const c = adults().sort((a, b) => (b.traits.includes('sociable') ? 3 : 0) - (a.traits.includes('sociable') ? 3 : 0) || Math.random() - .5)[0];
    if (c) { setRole(c, 'Barkeep'); chron(`${nameOf(c)} will run ${town.tavern.name}.`, 'life'); }
  }
}
const marketDist2 = (n, mk) => Math.hypot((n.homeRoom ? n.homeRoom.x : n.x) - mk.x, (n.homeRoom ? n.homeRoom.y : n.y) - mk.y);
function growthProjects() {
  recycleGraves(); churchProject(); marketProject(); tavernProject();
  const pop = npcs.length;
  if (pop >= 10 && town.fields < Math.floor(pop / 6) && !town.sites.some(s => s.kind === 'field')) {
    const s = createSite('field', 10, 5, {}); if (s) completeSite(s, true);
  } else if (pop >= 8 && foodDaysNow() < 2.5 && town.fields < Math.ceil(pop / 4) && game.time - (town.lastField || 0) > YEAR * 0.6 && !town.sites.some(s => s.kind === 'field')) {
    const s = createSite('field', 10, 5, {}); if (s) { completeSite(s, true); town.lastField = game.time; chron('Food is running short, so a new field has been marked out.', 'build'); }
  } else if (pop >= 6 && town.fields === 0 && !town.sites.some(s => s.kind === 'field') && houseRooms().length) {
    const s = createSite('field', 10, 5, {}); if (s) completeSite(s, true);
  }
  if (town.church) {
    const free = town.graveyard.slots.filter(s => !s.used).length;
    if (false) {
      const c = { x: town.church.x + town.church.w / 2, y: town.church.y + town.church.h / 2 };
      const s = createSite('graveyard', 11, 9, { near: c }); if (s) completeSite(s, true);
    }
  }
}
function siteWoodNeed() { return 0; }
function siteBuildable(s) { return true; }

