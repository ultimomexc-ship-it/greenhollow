/* ---------- housing manager ---------- */
function houseRooms() { return rooms.filter(r => r.kind === 'house' && !r.dead); }
function housingTick() {
  if (yardOn()) { yardHousing(); return; }   // (the Hamlet houses people by yard: life2/yards.ts)
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
  // (empty houses stay: nobody rebuilds them any more)
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
function staffMarkets() {
  town.markets.forEach(mk => {
    if (!mk.stalls.length || mk.stalls.some(st => st.owner) || mk.stalls.every(st => st.gone)) return;   // (stalls cleared away: the sellers are in the Market Hall)
    if (typeof hallStalls === 'function' && hallStalls().some(st => st.owner)) return;
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
  recycleGraves();
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

