/* ================= The Builder's Yard: loose building blocks for pushing (design: NOTES.md "Building") =================
   A row of sample stands on the edge of the square. Walking into one in Talk mode hands you one of the thing (free for now) and it
   appears on the delivery pad in front of the stands; from there it is an ordinary loose thing: push it, chain it, swap past it.
   Walls, windows and doors are blocks for building with (sealing them into rooms is the next phase); beds, chairs, tables and barrels are the usual furniture props. */
const YARD_ITEMS: { kind: string; stand: string; art: string; noun: string; name: string }[] = [
  { kind: 'bwall', stand: 'yd_wall', art: 'blk_wall', noun: 'wall block', name: 'Wall' },
  { kind: 'bwindow', stand: 'yd_window', art: 'blk_window', noun: 'window block', name: 'Window wall' },
  { kind: 'bdoor', stand: 'yd_door', art: 'blk_door', noun: 'door block', name: 'Door' },
  { kind: 'bed', stand: 'yd_bed', art: 'bed', noun: 'bed', name: 'Bed' },
  { kind: 'chair', stand: 'yd_chair', art: 'seat_down', noun: 'chair', name: 'Chair' },
  { kind: 'table', stand: 'yd_table', art: 'table_loose', noun: 'table', name: 'Table' },
  { kind: 'barrel', stand: 'yd_barrel', art: 'barrel_o', noun: 'barrel', name: 'Barrel' },
];
const YARD_CAP = 16;       // how many delivered things may stand about the pad before the yard says it is full
for (const it of YARD_ITEMS) { if (!LF_ART[it.kind]) LF_ART[it.kind] = it.art; if (!LF_NOUN[it.kind]) LF_NOUN[it.kind] = it.noun; }
LF_NOUN.dispenser = 'stand';

/** put the yard on the edge of the square: a row of stands, and a pad of free ground in front of them */
function lfPlaceYard() {
  const n = YARD_ITEMS.length, cx = town.cx, cy = town.cy;
  const free = (x, y) => x > 3 && y > 3 && x < W - 4 && y < H - 4 && (grid[y][x] === T.GRASS || grid[y][x] === T.PATH) && roomAt[y][x] < 0 && !lfNearDoor(x, y) && !town.siteAt[y * W + x] && !town.nodeMap.has(y * W + x) && !lfPropAt(x, y) && walkable(x, y);
  const ok = (x0, y0) => { for (let dy = 0; dy <= 3; dy++) for (let dx = 0; dx < n; dx++) if (!free(x0 + dx, y0 + dy)) return false; return true; };
  const cand: [number, number, number][] = [];
  for (let y = cy - 16; y <= cy + 16; y++) for (let x = cx - 20; x <= cx + 14; x++) { const mx = x + n / 2, my = y + 2, d = Math.hypot(mx - cx, (my - cy) * 1.4); if (d >= 6 && d <= 20) cand.push([d, x, y]); }
  cand.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  for (const [, x0, y0] of cand) if (ok(x0, y0)) {
    yardClear(x0, y0, n);
    YARD_ITEMS.forEach((it, i) => { const pr: any = lfAddProp('dispenser', x0 + i, y0); pr.fixed = true; pr.dispense = it.kind; pr.art = it.stand; });
    town.builder = { x0, y0, n, pad: { x: x0, y: y0 + 1, w: n, h: 3 }, cx: x0 + n / 2, cy: y0 + 2 }; return town.builder;
  }
  town.builder = null; return null;
}
/** room to build: trees, rocks and loose things round the yard (and a wide strip beyond the pad) are cleared away, so there is open ground on every side */
function yardClear(x0, y0, n) {
  const X0 = x0 - 6, X1 = x0 + n + 6, Y0 = y0 - 3, Y1 = y0 + 12; let changed = false;
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || roomAt[y][x] >= 0 || town.siteAt[y * W + x]) continue;
    const g = grid[y][x];
    if (g === T.TREE || g === T.ROCK) { setT(x, y, T.GRASS); changed = true; if (town.treeClaim) town.treeClaim.delete(y * W + x); }
    const p = lfPropAt(x, y); if (p && !p.fixed) { town.props = town.props.filter(q => q !== p); town.propAt.delete(y * W + x); town.pblock[y * W + x] = 0; }
  }
  if (changed) { town.treeDirty = true; town.stoneCache = null; markDirty(X0, Y0, X1 - X0 + 1, Y1 - Y0 + 1); }
}
/** the nearest free ground to the middle of the pad (spreading outwards), or null when the yard is full */
function yardSpot() {
  const b = town.builder; if (!b) return null;
  const near = (town.props || []).filter(p => p.yard && Math.abs(p.x - b.cx) <= b.n / 2 + 4 && Math.abs(p.y - b.cy) <= 7).length; if (near >= YARD_CAP) return null;
  const ok = (x, y) => x > 2 && y > 2 && x < W - 3 && y < H - 3 && walkable(x, y) && !lfPropAt(x, y) && !tileOwner.get(y * W + x) && (grid[y][x] === T.GRASS || grid[y][x] === T.PATH) && roomAt[y][x] < 0 && !town.siteAt[y * W + x] && !lfNearDoor(x, y);
  const pad = b.pad, order: [number, number][] = [];
  for (let y = pad.y; y < pad.y + pad.h; y++) for (let x = pad.x; x < pad.x + pad.w; x++) order.push([x, y]);
  order.sort((a, c) => Math.abs(a[0] - b.cx + 0.5) + Math.abs(a[1] - b.cy) * 1.5 - Math.abs(c[0] - b.cx + 0.5) - Math.abs(c[1] - b.cy) * 1.5);
  for (const [x, y] of order) if (ok(x, y)) return { x, y };
  for (let r = 1; r <= 4; r++) for (let y = pad.y + pad.h - 1 + r; y <= pad.y + pad.h - 1 + r; y++) for (let x = pad.x - r; x < pad.x + pad.w + r; x++) if (ok(x, y)) return { x, y };
  return null;
}
/** walking into a stand in Talk mode: one of the thing appears on the pad */
function yardTake(n, pr): any {
  const it = YARD_ITEMS.find(q => q.kind === pr.dispense); if (!it) return null;
  if (!itHand(n, 'talk')) return { msg: `${it.name} stand: press Q for Talk to take one.` };
  return { key: 'yard' + pr.id, min: 0.4, text: 'Taking a ' + it.noun, tool: null, run(nn) {
    const s = yardSpot(); if (!s) { playerSay(nn, 'The yard is full. Push some of it away first.'); return; }
    const np: any = lfAddProp(it.kind, s.x, s.y); np.v = Math.floor(Math.random() * 5); np.yard = true; np.by = nn.id;
    playerSay(nn, `A ${it.noun} is on the pad.`); } };
}
/** how the yard looks: a banner over the stands that can be seen from afar, and a gold arrow at the screen's edge when it is out of sight */
YSORT.push(function (c, now) {
  const b = town.builder; if (!b || !gaOnScreen(b.cx, b.y0, b.n + 2)) return [];
  return [{ k: b.y0 - 6, f: () => {   // the delivery pad: a gold hatched square on the ground, so nobody builds on it by mistake
    const p = b.pad, x = p.x * TS, y = p.y * TS, w = p.w * TS, h = p.h * TS;
    c.save(); c.fillStyle = 'rgba(232,192,74,.22)'; c.fillRect(x, y, w, h); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = 'rgba(232,192,74,.45)'; c.lineWidth = 2;
    for (let i = -h; i < w; i += 12) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + h, y); c.stroke(); } c.restore();
    c.strokeStyle = 'rgba(232,192,74,.95)'; c.lineWidth = 2; c.setLineDash([6, 4]); c.strokeRect(x + 1, y + 1, w - 2, h - 2); c.setLineDash([]);
    c.fillStyle = 'rgba(255,234,168,.8)'; c.font = 'bold 8px "IBM Plex Sans", sans-serif'; c.textAlign = 'center'; c.fillText('DELIVERY PAD · DO NOT BUILD HERE', x + w / 2, y + h - 3); c.textAlign = 'left';
  } }, { k: b.y0 - 1.2, f: () => {
    const x0 = b.x0 * TS, w = b.n * TS, y = (b.y0 - 1.55) * TS, sway = Math.sin(now / 700) * 1.2;
    c.fillStyle = '#5a3a1e'; c.fillRect(x0 + 2, y - 4, 3, TS * 1.9); c.fillRect(x0 + w - 5, y - 4, 3, TS * 1.9);
    c.fillStyle = '#c0432f'; c.beginPath(); c.moveTo(x0 + 5, y - 2); c.lineTo(x0 + w - 5, y - 2); c.lineTo(x0 + w - 5, y + 15 + sway); c.lineTo(x0 + w / 2, y + 11 + sway); c.lineTo(x0 + 5, y + 15 - sway); c.closePath(); c.fill();
    c.strokeStyle = '#e8c04a'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#ffeaa8'; c.font = 'bold 10px "IBM Plex Sans", sans-serif'; c.textAlign = 'center'; c.fillText("BUILDER'S YARD", x0 + w / 2, y + 8); c.textAlign = 'left';
  } }];
});
function yardArrow(c, now) {
  const b = town.builder, p = game.player; if (!b || !p || cam.z < 0.55) return;
  const s = toScreen((b.cx) * TS, (b.cy) * TS), m = 34, vw = cam.cw, vh = cam.ch || 400; if (s.x > m && s.y > m && s.x < vw - m && s.y < vh - m) return;
  const mx = vw / 2, my = vh / 2, dx = s.x - mx, dy = s.y - my, k = Math.min((vw / 2 - m) / Math.max(1e-6, Math.abs(dx)), (vh / 2 - m) / Math.max(1e-6, Math.abs(dy))), ax = mx + dx * k, ay = my + dy * k, ang = Math.atan2(dy, dx);
  const tiles = Math.round(Math.hypot(b.cx - p.tx, b.cy - p.ty)), pul = 1 + Math.sin(now / 300) * 0.08;
  c.save(); c.translate(ax, ay); c.scale(pul, pul); c.rotate(ang); c.fillStyle = '#e8c04a'; c.strokeStyle = '#5a3a1e'; c.lineWidth = 2; c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -10); c.lineTo(-3, 0); c.lineTo(-8, 10); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.font = 'bold 11px "IBM Plex Sans", sans-serif'; c.textAlign = 'center'; const tx = Math.min(vw - 60, Math.max(60, ax)), ty = Math.min(vh - 8, Math.max(24, ay + (ay < vh / 2 ? 24 : -16)));
  c.lineWidth = 3; c.strokeStyle = 'rgba(30,20,10,.85)'; c.strokeText("Builder's Yard · " + tiles, tx, ty); c.fillStyle = '#ffeaa8'; c.fillText("Builder's Yard · " + tiles, tx, ty); c.textAlign = 'left';
}
const _yardThoughts = lfDrawThoughts;
// @ts-expect-error -- deliberate patch: the yard's arrow is drawn with the other screen-space marks
lfDrawThoughts = function (c, now) { _yardThoughts(c, now); yardArrow(c, now); };
