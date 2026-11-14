/* Arrivals and moving on marriage (the Hamlet, docs/minimum-game.md "Arrivals"). Who comes ashore depends on what you built: an empty yard with one free bed brings a
   single, two a couple, three or more a family (a couple and children for the rest). Nobody comes while somebody is still without a bed or a household is hungry.
   When two villagers marry, the one whose yard has fewer beds carries their bed into the other's yard (a plan they walk through), and their old yard is free for the next. */

const ARR_FIRST = 0.5, ARR_GAP = [1.5, 2.5], ARR_KIDS = 3;   // days before the first arrival once a yard is ready, days between arrivals*, most children in a family

/** an empty, closed yard with free beds, the one with the most beds first */
function arrYard(): any {
  if (!yardOn()) return null; yardScan();
  return town.yards.filter((y: any) => y.open == null && !yardPeople(y).length && yardFreeBeds(y).length).sort((a: any, b: any) => yardFreeBeds(b).length - yardFreeBeds(a).length || a.id - b.id)[0] || null;
}
/** why nobody comes yet (null when somebody may) */
function arrBlocked(): string | null {
  const pl = yardPlayer();
  if (npcs.some((n: any) => !n.dead && n !== pl && n.age >= 3 && !yardHasBed(n) && !isPaullus(n))) return 'bedless';
  if (npcs.some((n: any) => !n.dead && n !== pl && n.hunger > 70 && yardOfN(n))) return 'hungry';
  return null;
}
function arrMake(R: any, age: number, o: any): any {
  const n: any = newPerson(R, 'Child', age, town.used, o);
  n.adult = n.age >= 16; n.infant = false; n.age = ageNow(n); updateLook(n); n.rand = rng(town.seed + n.id * 977); n.jit = 0; n.bornHere = false;
  n.homeRoom = null; n.bed = { owner: null }; n.seat = null; n.homeless = true; routine(R, n); town.byId.set(n.id, n); initNpcSim(n); if (n.adult) setRole(n, 'Worker');
  n.inv = n.inv || {}; n.coin = 0; return n;
}
/** somebody comes ashore for this yard: a single, a couple or a family, by its free beds */
function arrArrive(y: any): any[] {
  const R = rng(town.seed + Math.floor(game.time) * 13), beds = yardFreeBeds(y), k = beds.length, sn = pick(R, SURNAMES);
  const male = npcs.filter((n: any) => n.age >= 16 && !n.female).length, fem = npcs.filter((n: any) => n.age >= 16 && n.female).length;
  const grp: any[] = [arrMake(R, ri(R, 20, 36), { female: male > fem ? true : male < fem ? false : chance(R, .5), surname: sn })];
  if (k >= 2) { const b = arrMake(R, ri(R, 20, 36), { female: !grp[0].female, surname: sn }); setSpouse(grp[0], b); grp.push(b); }
  if (k >= 3) { const mum = grp.find(n => n.female), dad = grp.find(n => !n.female); for (let i = 0; i < Math.min(ARR_KIDS, k - 2); i++) { const c = arrMake(R, ri(R, 4, 13), { mother: mum, father: dad, surname: sn }); linkKin(mum, dad, c); fam2(mum, c, 'parent', 'child'); fam2(dad, c, 'parent', 'child'); grp.push(c); }
    for (const c of grp) for (const d of grp) if (c !== d && c.age < 16 && d.age < 16) fam2(c, d, 'sibling'); }
  const how = grp.length === 1 ? 'single' : k >= 3 ? 'family' : 'couple';
  const sh = shoreTiles.length ? shoreTiles[Math.floor(R() * shoreTiles.length)] : null, p = sh ? { x: sh.x, y: sh.y } : { x: town.cx, y: town.cy };
  grp.forEach((n, i) => {
    n.x = n.tx = p.x; n.y = n.ty = p.y; if (n.adult) n.back = pick(R, VIS_ORD) + ', ' + pick(R, VIS_ARR); n.newcomer = { t0: game.time, met: [], next: game.time + 20 };
    if (n.adult) { n.coin = how === 'single' ? 8 : 10; n.inv.grain = 4; n.inv.seed_barley = 3; if (i === 1) n.inv.seed_turnip = 2; }   // (a little money and seed of their own*)
    npcs.push(n); const b = beds[i]; if (b) { b.owner = n; n.bed = b; }
  });
  for (const n of grp) npcs.forEach((o: any) => { if (o !== n && !n.know[o.id]) { n.know[o.id] = 4; o.know[n.id] = 4; n.aff[o.id] = 8; o.aff[n.id] = 8; } });
  yardHousing(); refreshReach();
  const a = grp[0], names = grp.filter(n => n.adult).map(n => n.first).join(' and ') + (grp.length > 2 ? ` and ${grp.length - 2 === 1 ? 'a child' : grp.length - 2 + ' children'}` : '');
  chron(`${names} came ashore, looking as though they had just woken up, and went straight to the empty yard. ${a.first} ${a.back}.`, 'life');
  lfEmit('arrival', { actor: a, tags: ['news'], sev: 1.6, loud: true, chron: false });
  for (const n of grp) if (n.adult) LIFE.emit('came_ashore', n, { qty: grp.length, how });
  lfShout(a, anyOf(['Excuse me, is this a dream?', 'Hm. Sand. Of course.', 'There is a yard with our name on it, apparently.', 'Is anybody here? Or is that not how it works?']));
  const pl = game.player; if (pl && pl.player) playerSay(pl, `${names} came ashore and went to the empty yard. I did not have to explain anything.`);
  return grp;
}
function arrTick() {
  if (!yardOn()) return; const v = town.arr = town.arr || { next: null, n: 0 }, day = game.time / 1440;
  const y = arrYard(); if (!y) { v.next = null; return; }
  if (v.next == null) v.next = day + ARR_FIRST;
  if (day < v.next || arrBlocked()) return;
  arrArrive(y); v.n++; v.next = day + ARR_GAP[0] + Math.random() * (ARR_GAP[1] - ARR_GAP[0]);
}

/* ---- marriage: one of them carries their bed into the other's yard ---- */
/** a free tile in a yard for one more bed, near the partner's bed */
function arrBedSpot(y: any, near: any): any {
  let best: any = null, bd = 1e9;
  for (const k of y.cells) { const x = k % W, yy = (k / W) | 0, g = grid[yy][x];
    if ((g !== T.GRASS && g !== T.PATH && g !== T.FLOOR && g !== T.SAND) || lfPropAt(x, yy) || !walkable(x, yy) || tileOwner.get(k) || (town.nodeMap && town.nodeMap.has(k))) continue;
    const d = near ? Math.abs(x - near.x) + Math.abs(yy - near.y) : 0; if (d < bd) { bd = d; best = { x, y: yy }; } }
  return best;
}
/** decide who moves; the mover gets `n.moveBed` (a plan from LF2.dec), or the pair is listed as apart until there is room */
function arrWedMove(a: any, b: any) {
  if (!yardOn() || a.dead || b.dead) return;
  const ya = yardOfN(a), yb = yardOfN(b); if (ya && ya === yb) { arrApartClear(a, b); return; }
  let mover: any, stay: any;
  if (!ya && !yb) return;   // (neither has a yard: housing finds them one together)
  if (!ya || !yb) { mover = ya ? b : a; stay = ya ? a : b; }
  else { const na = yardBeds(ya).length, nb = yardBeds(yb).length; mover = na < nb ? a : nb < na ? b : (a.id > b.id ? a : b); stay = mover === a ? b : a; }
  const y = yardOfN(stay), spot = arrBedSpot(y, stay.bed);
  if (!spot || !yardHasBed(mover)) { const ap = town.apart = town.apart || []; if (!ap.some((q: any) => q.a === a.id && q.b === b.id)) { ap.push({ a: a.id, b: b.id, t: game.time }); chron(`${a.first} and ${b.first} are married but live in two yards: there is no room for another bed in ${yardName(y)}.`, 'family'); LIFE.emit('apart', mover, { who: stay.id }); } return; }
  arrApartClear(a, b);
  if (mover.player || mover === yardPlayer()) { arrMoveBed(mover, spot); playerSay(mover, `I moved my bed into ${yardName(y).replace(/^your/, 'our')}. It seemed simplest.`); return; }
  mover.moveBed = { x: spot.x, y: spot.y, yard: y.id, to: stay.id }; if (typeof abortPlan === 'function') abortPlan(mover);
}
function arrApartClear(a: any, b: any) { if (town.apart) town.apart = town.apart.filter((q: any) => !((q.a === a.id && q.b === b.id) || (q.a === b.id && q.b === a.id))); }
/** the bed goes to its new tile; the old yard's store goes with them when nobody is left there */
function arrMoveBed(n: any, to: any) {
  const pr = n.bed; if (!pr || pr.x == null || !town.props.includes(pr)) return false;
  const old = yardOfN(n);
  town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); pr.x = to.x; pr.y = to.y; pr.home = { x: to.x, y: to.y }; pr.fx = to.x; pr.fy = to.y; pr.follow = null;
  town.propAt.set(to.y * W + to.x, pr); town.pblock[to.y * W + to.x] = 1; town.lfPV = (town.lfPV || 0) + 1;
  yardHousing(); const now = yardOfN(n);
  if (old && now && old !== now && !yardPeople(old).length) { for (const g of Object.keys(old.store || {})) { now.store[g] = (now.store[g] || 0) + old.store[g]; } old.store = {}; }
  if (typeof refreshReach === 'function') refreshReach(); return true;
}
/** the mover's plan: fetch the bed, carry it over, set it down */
LF2.dec.push(function arrMovePlan(n: any) {
  const m = n.moveBed; if (!m || n.player || n.dead) return null;
  const to = byId(m.to), y = (town.yards || []).find((q: any) => q.id === m.yard);
  if (!to || to.dead || !y || !yardHasBed(n)) { n.moveBed = null; return null; }
  if (yardOfN(n) === y) { n.moveBed = null; return null; }
  const from = { x: n.bed.x, y: n.bed.y };
  return [goS({ x: from.x, y: from.y, face: null }, 'Packing up my bed'), waitS(3, 'work', 'Taking my bed apart', { nopie: true }),
    goS({ x: m.x, y: m.y, face: null }, `Moving my bed to ${to.first}'s`), waitS(4, 'work', 'Setting my bed down', { nopie: true, onEnd(nn: any) {
      const mm = nn.moveBed; nn.moveBed = null; if (!mm) return; let spot: any = { x: mm.x, y: mm.y }; const yy = (town.yards || []).find((q: any) => q.id === mm.yard); if (!yy) return;
      if (lfPropAt(spot.x, spot.y) || yardAtXY(spot.x, spot.y) !== yy) spot = arrBedSpot(yy, to.bed); if (!spot) { arrWedMove(nn, to); return; }
      if (arrMoveBed(nn, spot)) { chron(`${nn.first} carried their bed into ${yardName(yy)} and moved in with ${to.first}.`, 'family'); LIFE.emit('moved_in', nn, { qty: 1 }); }
    } })];
});
/** couples living apart try again every hour (a fence moved, a bed taken away) */
LF2.hourly.push(() => {
  if (!yardOn()) return;
  for (const q of (town.apart || []).slice()) { const a = byId(q.a), b = byId(q.b); if (!a || !b || a.dead || b.dead || a.fam.spouse !== b.id) { town.apart = town.apart.filter((x: any) => x !== q); continue; } if (!a.moveBed && !b.moveBed) { town.apart = town.apart.filter((x: any) => x !== q); arrWedMove(a, b); } }
  arrTick();
});
