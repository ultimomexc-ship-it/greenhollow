/* Rooms you build take on a purpose from the furniture you put in them: an oven and a counter make a bakery, a forge and an anvil a smithy,
   a counter and a shelf a shop, a counter, a table and chairs a tavern, an altar and pews a chapel. Nothing is added for you: only what you place counts.
   The room gets the kind, the name and the standing spots the village's jobs expect (see life2/town.ts), and the job is offered to whoever is free. */

const FN_DEFS: { fn: string; name: string; need: Record<string, number>; what: string }[] = [
  { fn: 'workshop', name: 'The Workshop', need: { bench: 1, shelf: 1 }, what: 'walls, beds and furniture made from wood' },
  { fn: 'church', name: 'The Chapel', need: { altar: 1, pew: 2 }, what: 'a place to pray, wed and bury' },
  { fn: 'tavern', name: 'The Tavern', need: { counter: 1, table: 1, chair: 2 }, what: 'somewhere to meet and drink' },
  { fn: 'bakery', name: 'The Bakery', need: { oven: 1, counter: 1 }, what: 'bread from the grain' },
  { fn: 'smithy', name: 'The Smithy', need: { forge: 1, anvil: 1 }, what: 'tools and mending' },
  { fn: 'shop', name: 'The Taberna', need: { counter: 1, shelf: 1 }, what: 'a shop' },
];
const FN_JOB: Record<string, string> = { bakery: 'Baker', smithy: 'Smith', shop: 'Shopkeeper', workshop: 'Carpenter' };

function fnProps(r: any) { const o: Record<string, any[]> = {}; for (const p of town.props || []) if (!p.fixed && r.cells.has(p.x + p.y * W)) (o[p.kind] = o[p.kind] || []).push(p); return o; }
function fnStand(pr: any, r: any, taken: Set<number>) {
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const x = pr.x + dx, y = pr.y + dy, k = x + y * W; if (!r.cells.has(k) || taken.has(k) || lfPropAt(x, y) || !walkable(x, y)) continue; taken.add(k); return { x, y, face: { dx: -dx, dy: -dy } }; }
  return null;
}
function fnFreeCell(r: any, taken: Set<number>, near?: { x: number; y: number }) {
  const c = [...r.cells].map(k => ({ x: k % W, y: (k / W) | 0, k })).filter(q => !taken.has(q.k) && !lfPropAt(q.x, q.y) && walkable(q.x, q.y));
  const ref = near || { x: r.doorX, y: r.doorY }; c.sort((a, b) => Math.hypot(a.x - ref.x, a.y - ref.y) - Math.hypot(b.x - ref.x, b.y - ref.y)); const q = c[0]; if (!q) return null; taken.add(q.k); return { x: q.x, y: q.y, face: { dx: 0, dy: 1 } };
}
/** where people stand and sit, worked out from where you put the furniture */
function fnSpots(r: any, fn: string) {
  const P = fnProps(r), taken = new Set<number>(), sp: any = {}; r.seats = []; r.pews = [];
  const first = (k: string) => (P[k] || [])[0];
  if (fn === 'bakery') { sp.oven = first('oven') && fnStand(first('oven'), r, taken); sp.front = first('counter') && fnStand(first('counter'), r, taken); }
  else if (fn === 'smithy') { sp.work = first('anvil') && fnStand(first('anvil'), r, taken); sp.front = (first('forge') && fnStand(first('forge'), r, taken)) || fnFreeCell(r, taken); }
  else if (fn === 'shop') { sp.counter = first('counter') && fnStand(first('counter'), r, taken); sp.front = (first('counter') && fnStand(first('counter'), r, taken)) || fnFreeCell(r, taken); if (first('loom')) { sp.loom = fnStand(first('loom'), r, taken); sp.loomFront = fnFreeCell(r, taken, first('loom')); } }
  else if (fn === 'workshop') { sp.work = first('bench') && fnStand(first('bench'), r, taken); sp.front = (first('shelf') && fnStand(first('shelf'), r, taken)) || fnFreeCell(r, taken); }
  else if (fn === 'tavern') {
    sp.bar = first('counter') && fnStand(first('counter'), r, taken); sp.barFront = (first('counter') && fnStand(first('counter'), r, taken)) || fnFreeCell(r, taken); sp.stage = fnFreeCell(r, taken);
    for (const c of P.chair || []) { const t = (P.table || []).find(q => Math.abs(q.x - c.x) + Math.abs(q.y - c.y) === 1); r.seats.push({ x: c.x, y: c.y, sit: true, face: t ? { dx: t.x - c.x, dy: t.y - c.y } : { dx: 0, dy: 1 }, prop: c }); }
  } else if (fn === 'church') {
    sp.altar = first('altar') && fnStand(first('altar'), r, taken);
    for (const c of P.pew || []) r.pews.push({ x: c.x, y: c.y, sit: true, pew: true, face: { dx: 0, dy: -1 }, prop: c });
  }
  for (const k of Object.keys(sp)) if (!sp[k]) delete sp[k];
  r.spots = sp;
}
function fnMatch(r: any) { const P = fnProps(r); for (const d of FN_DEFS) if (Object.keys(d.need).every(k => (P[k] || []).length >= d.need[k])) return d; return null; }
function fnConvert(r: any, d: any) {
  if (r.hut) { for (const b of r.beds || []) { const o = b.owner; if (o && o.bed === b) { o.bed = { owner: null }; o.homeRoom = null; o.homeless = true; } b.owner = null; } r.beds = []; r.hut = false; }
  r.fn = d.fn; r.kind = d.fn; r.name = d.name; r.hearth = { none: true }; r.pantry = r.pantry || {}; r.noWindows = true; fnSpots(r, d.fn);
  if (d.fn === 'church') town.church = r; if (d.fn === 'tavern') town.tavern = r;
  chron(`${d.name} is ready: ${d.what}.`, 'build');
  const pl = game.player; if (pl && pl.player) playerSay(pl, d.name.replace('The ', 'The ') + ' is ready.');
  if (d.fn === 'church' && typeof ensurePriest === 'function') ensurePriest();
  if (FN_JOB[d.fn] && typeof lf2AssignJobs === 'function') lf2AssignJobs(false);
}
function fnRevert(r: any) {
  const was = r.name; if (town.church === r) town.church = null; if (town.tavern === r) town.tavern = null;
  r.fn = null; r.kind = 'room'; r.name = 'Room'; r.spots = {}; r.seats = []; r.pews = []; r.hearth = null;
  for (const n of npcs) if (n.job && LF2_JOBS[n.job] && LF2_JOBS[n.job].room && !lf2Room(LF2_JOBS[n.job].room)) { n.job = null; }
  chron(`${was} is no longer what it was: its furniture has been moved.`, 'build');
}
/** look at every room you built: does what is in it make it something? */
function fnScan() {
  if (!town || !rooms) return;
  for (const r of rooms) {
    if (r.dead || !r.free || !r.cells) continue;
    const d = fnMatch(r);
    if (d && r.fn !== d.fn) { if (r.fn) fnRevert(r); fnConvert(r, d); }
    else if (d) fnSpots(r, d.fn);
    else if (r.fn) fnRevert(r);
  }
}
LF2.hourly.push(() => fnScan());
