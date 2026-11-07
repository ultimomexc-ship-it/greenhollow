/* ================= Life: building, aging, love, birth, death, funerals ================= */
const yearsOf = t => Math.floor(t / YEAR);
const ageNow = n => Math.floor((game.time - n.born) / YEAR);
const byId = id => (town.byId && town.byId.get(id)) || null;
function chron(text, kind) {
  town.chron.push({ time: game.time, text, kind: kind || 'note' });
  if (town.chron.length > 400) town.chron.shift();
}
function calAdd(kind, text) { (town.cal = town.cal || []).push({ time: game.time, kind, text }); if (town.cal.length > 300) town.cal.shift(); }
const nameOf = n => n.first + ' ' + (n.female && /ius$/.test(n.surname || '') ? n.surname.replace(/ius$/, 'ia') : n.surname);
const isAlive = n => n && !n.dead;

/* ---------- kin ---------- */
function ancestors(n, depth) {
  const out = new Set(); let cur = [n];
  for (let d = 0; d < depth; d++) { const nx = []; cur.forEach(p => [p.fam.mother, p.fam.father].forEach(id => { const q = id && byId(id); if (q) { out.add(q.id); nx.push(q); } })); cur = nx; }
  return out;
}
function isKin(a, b) {
  if (a === b) return true;
  const A = ancestors(a, 3), B = ancestors(b, 3);
  if (A.has(b.id) || B.has(a.id)) return true;
  for (const x of A) if (B.has(x)) return true;
  return false;
}

/* ---------- homes ---------- */
const occupants = room => npcs.filter(n => n.homeRoom === room);
const bedsFree = room => room.beds.filter(b => !b.owner || b.owner.dead || b.owner.homeRoom !== room).length;
function leaveHome(n) { if (n.bed && n.bed.owner === n) n.bed.owner = null; }
function claimBed(room, n) {
  leaveHome(n);
  const b = room.beds.find(x => !x.owner || x.owner.dead || x.owner.homeRoom !== room) || null;
  n.homeRoom = room;
  if (b) { b.owner = n; n.bed = b; n.seat = room.seats[room.beds.indexOf(b)] || null; }
  else { n.bed = room.beds[0]; n.seat = null; }
  n.homeless = false;
}
function moveIn(list, room) {
  list.forEach(p => {
    if (p.dead) return;
    const old = p.homeRoom;
    if (old && old !== room && !old.dead) {
      const k = Math.max(1, occupants(old).length);
      FOODS.forEach(g => { const q = Math.floor((old.pantry[g] || 0) / k); if (q > 0) { old.pantry[g] -= q; room.pantry[g] = (room.pantry[g] || 0) + q; } });
    }
    claimBed(room, p);
    if (p.fam.mother && p.age < 3) { /* infants ride with their carer */ }
  });
}
const marketDist = (x, y) => { let d = 1e9; for (const m of town.markets) d = Math.min(d, Math.hypot(x - m.x, (y - m.y) * 1.2)); return d; };
function marketOf(n) {
  const x = n.homeRoom && !n.homeRoom.dead ? n.homeRoom.x + n.homeRoom.w / 2 : n.x, y = n.homeRoom && !n.homeRoom.dead ? n.homeRoom.y + n.homeRoom.h / 2 : n.y;
  let best = town.markets[0], bd = 1e9; for (const m of town.markets) { const d = Math.hypot(x - m.x, (y - m.y) * 1.2); if (d < bd) { bd = d; best = m; } } return best;
}
const plazaNear = n => marketOf(n).plaza;
function nearTiles(list, n, slack, ok?) {
  const ox = n.homeRoom && !n.homeRoom.dead ? n.homeRoom.x + n.homeRoom.w / 2 : n.tx, oy = n.homeRoom && !n.homeRoom.dead ? n.homeRoom.y + n.homeRoom.h / 2 : n.ty;
  let dm = 1e9; const c = [];
  for (const t of list) { if (ok && !ok(t)) continue; const d = Math.hypot(t.x - ox, t.y - oy); c.push([d, t]); if (d < dm) dm = d; }
  return c.filter(e => e[0] <= dm + slack).map(e => e[1]);
}
const homeOK = n => n.homeRoom && !n.homeRoom.dead && n.bed;

