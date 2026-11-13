/* ================= work you can see: a notch in the tree, cracks in the stone ================= */
// how far through the current job someone is (0..1), or -1
function actFrac(n) {
  if (n.player) { const a = n.player.act; return a && a.min ? Math.min(1, a.t / a.min) : -1; }
  const s = n.plan && n.plan[n.si]; if (!s || s.k !== 'wait' || !n.stepStarted || !s.min) return -1;
  return Math.max(0, Math.min(1, 1 - (n.until - game.time) / s.min));
}
function workTargets() {
  const out = [], nodeAt = (x, y) => (town.nodes || []).find(d => d.x === x && d.y === y), cropAtR = (x, y) => (town.crops || []).find(c => c.x === x && c.y === y);
  for (const n of npcs) {
    if (n.dead || n.moving || !n.face) continue;
    let key = '', text = '', tool = '', f = -1;
    if (n.player) { const a = n.player.act; if (!a || a.done) continue; key = a.key || ''; text = a.text || ''; tool = a.tool || ''; f = Math.min(1, a.t / a.min); }
    else { const s = n.plan && n.plan[n.si]; if (!s || s.k !== 'wait' || !n.stepStarted || s.act !== 'work') continue; text = s.text || ''; tool = s.tool || ''; f = actFrac(n); }
    let fx = n.tx + n.face.dx, fy = n.ty + n.face.dy;
    // the player's job names its own tile: trust that over which way they happen to face
    if (n.player && /^(crop|node|tree|rock)/.test(key)) { const m = /(-?\d+),(-?\d+)[a-z]?$/.exec(key); if (m) { fx = +m[1]; fy = +m[2]; } }
    const g = grid[fy] && grid[fy][fx];
    const slot = n.player ? (n.player.act && n.player.act.slot) : (n.plan[n.si] && n.plan[n.si].slot);
    if (slot && !slot.built) { out.push({ x: slot.x, y: slot.y, f, n, kind: 'wall', mat: slot.mat }); continue; }
    if ((tool === 'axe' || /^tree/.test(key)) && g === T.TREE) out.push({ x: fx, y: fy, f, n, kind: 'tree' });
    else if ((tool === 'hammer' || /^rock/.test(key)) && g === T.ROCK) out.push({ x: fx, y: fy, f, n, kind: 'rock' });
    else if (tool === 'pick' || /^node/.test(key)) { const nd = nodeAt(fx, fy); if (nd) out.push({ x: nd.x, y: nd.y, f, n, kind: nd.kind === 'berry' ? 'berry' : 'herb' }); }
    else if (tool === 'fish') { if (g === T.WATER) out.push({ x: fx, y: fy, f, n, kind: 'fish' }); }
    else if (tool === 'hoe' || tool === 'sow') { const c = cropAtR(fx, fy); if (c) out.push({ x: c.x, y: c.y, f, n, kind: tool === 'sow' || /Sow/.test(text) ? 'sow' : /Plough/.test(text) ? 'plough' : 'harvest' }); }
  }
  return out;
}
const PIE_KINDS = new Set(['tree', 'rock', 'berry', 'herb', 'fish', 'plough', 'sow', 'harvest']);
function canopy(c, px, py, x, y, ox, oy) {
  if (STYLE.soft) { drawTreeSprite(c, px, py, x, y, ox, oy); return; }
  const o = hash(x, y, 7) * 2;
  gcirc(c, px + 8 + o + ox, py + 11 + oy, 7, '#2f5a2b'); gcirc(c, px + 16 - o + ox, py + 11 + oy, 7, '#33612e');
  gcirc(c, px + 12 + ox, py + 7 + oy, 8, '#3f7536'); if (!STYLE.soft) circ(c, px + 10 + ox, py + 5 + oy, 4, '#4e8441');
}
function crackPath(x, y) {
  const b = boulderShape(x, y), s = b.s, X = x * TS + b.cx, Y = y * TS + b.cy, pts = [[X - 1 * s, Y - 6.5 * s]];
  for (let i = 1; i <= 5; i++) pts.push([X + (hash(x, y, 70 + i) - 0.5) * 6 * s, Y - 6.5 * s + i * 2.6 * s]);
  const br = [[pts[2], [pts[2][0] + 4 * s, pts[2][1] - 1.5 * s], [pts[2][0] + 6.5 * s, pts[2][1] + 0.5 * s]], [pts[3], [pts[3][0] - 3.5 * s, pts[3][1] + 1 * s], [pts[3][0] - 6 * s, pts[3][1] - 0.5 * s]]];
  return { main: pts, br };
}
/** chips flying and a leaf or two falling from the tree being felled (no notch: the axe and the sway say enough) */
function chopMarks(c, w, now) {
  const swing = Math.max(0, Math.sin(now / 95)), px = w.x * TS, py = w.y * TS, side = w.n.tx < w.x ? -1 : w.n.tx > w.x ? 1 : -1;
  for (let i = 0; i < 3; i++) { const t = ((now / 700) + i / 3 + w.x * 0.13) % 1; c.globalAlpha = 1 - t; fillR(c, px + 12 + Math.sin(i * 2.1 + t * 4) * 6 + t * 3, py + 6 + t * 16, 1.6, 1.2, i % 2 ? '#4e8441' : '#6aa04a'); }
  if (swing > 0.85) { const ex = side < 0 ? px + 9 : px + 15; for (let i = 0; i < 2; i++) { c.globalAlpha = 0.9; fillR(c, ex + side * (2 + i * 2), py + 15 - i * 2, 1.2, 1.2, '#c9a878'); } }
  c.globalAlpha = 1;
}
function drawWorkFx(c, now) {
  c.imageSmoothingEnabled = true;
  const swing = Math.max(0, Math.sin(now / 95));
  for (const w of workTargets()) {
    const px = w.x * TS, py = w.y * TS, f = w.f, side = w.n.tx < w.x ? -1 : w.n.tx > w.x ? 1 : -1;
    if (w.kind === 'tree') {
      // the canopy shudders with each blow and leans as the cut deepens (close up the living tree in render/trees.ts sways instead and draws the marks over itself)
      if (typeof treesLive === 'function' && treesLive()) continue;
      const lean = f > 0.65 ? (f - 0.65) * 6 * -side : 0, sh = swing * (0.5 + f) * (Math.sin(now / 37) > 0 ? 1 : -1);
      if (!STYLE.soft) fillR(c, px + 10, py + 13, 4, 8, '#5a3c24');
      canopy(c, px, py, w.x, w.y, sh + lean, Math.abs(sh) * 0.3);
      chopMarks(c, w, now);
    } else if (w.kind === 'wall') {
      // the wall piece rises from the ground as it is put up, with a little dust at its foot
      const st = w.mat === 'stone', hgt = (TS - 2) * Math.max(0.08, f), top = py + TS - 1 - hgt;
      fillR(c, px + 1, top, TS - 2, hgt, st ? '#8d939a' : '#8a5a30');
      if (st) { for (let r = 0; r * 6 < hgt; r++) { const yy = py + TS - 1 - (r + 1) * 6; if (yy + 6 < top) continue; fillR(c, px + 1, Math.max(top, yy), TS - 2, 0.8, '#6f757b'); fillR(c, px + 1 + ((r % 2) ? 5 : 11), Math.max(top, yy), 0.8, Math.min(6, py + TS - 1 - Math.max(top, yy)), '#6f757b'); } }
      else { for (let k = 0; k < 4; k++) fillR(c, px + 1 + k * 5.5, top, 0.8, hgt, '#6a4422'); }
      fillR(c, px + 1, top, TS - 2, 2, st ? '#a8aeb4' : '#a0703a');
      if (swing > 0.6) for (let k = 0; k < 3; k++) circ(c, px + 4 + k * 8, py + TS - 2 - swing * 2, 1.4 + swing, 'rgba(210,195,160,.45)');
    } else if (w.kind === 'berry' || w.kind === 'herb') {
      // berries pop off the bush and fly to the picker's hand
      const hx = w.n.x * TS + 12, hy = w.n.y * TS + 12;
      for (let i = 0; i < 2; i++) { const t = ((now / 600) + i * 0.5) % 1, sx = px + 6 + hash(w.x, w.y, i + 20) * 12, sy = py + 9 + hash(w.x, w.y, i + 29) * 7;
        const x = sx + (hx - sx) * t, y = sy + (hy - sy) * t - Math.sin(t * Math.PI) * 7; circ(c, x, y, 1.6, w.kind === 'berry' ? '#c0304a' : '#b06ad0'); }
      if (Math.sin(now / 140) > 0.6) { circ(c, px + 12 + Math.sin(now / 50) * 1.2, py + 11, 5.5, 'rgba(62,130,64,.5)'); }
    } else if (w.kind === 'fish') {
      // a bobber, rings on the water, and a fish shadow circling closer
      const bx = px + 12, by = py + 12 + Math.sin(now / 300) * 0.8, r = (1 - f) * 10 + 2, a = now / 600;
      c.strokeStyle = 'rgba(230,240,250,.55)'; c.lineWidth = 0.8; for (let k = 0; k < 2; k++) { const q = ((now / 1400) + k / 2) % 1; c.globalAlpha = 1 - q; c.beginPath(); c.ellipse(bx, by + 1, 3 + q * 8, 1.4 + q * 3, 0, 0, 6.3); c.stroke(); } c.globalAlpha = 1;
      c.fillStyle = `rgba(20,40,60,${0.25 + f * 0.35})`; c.beginPath(); c.ellipse(bx + Math.cos(a) * r, by + 2 + Math.sin(a) * r * 0.5, 3.2, 1.4, a + Math.PI / 2, 0, 6.3); c.fill();
      const dip = f > 0.9 ? 1.5 : 0; circ(c, bx, by + dip, 1.8, '#f4f1e8'); fillR(c, bx - 1.8, by - 1.6 + dip, 3.6, 1.6, '#d04040');
      if (f > 0.9) for (let k = 0; k < 5; k++) circ(c, bx + Math.cos(k * 1.3) * 4, by - 1 - Math.abs(Math.sin(now / 80 + k)) * 3, 0.9, 'rgba(240,248,255,.85)');
    } else if (w.kind === 'plough') {
      // the turned earth spreads across the tile, furrow by furrow
      for (let r = 0; r < 3; r++) { const k = Math.max(0, Math.min(1, f * 3 - r)); if (k <= 0) break; fillR(c, px + 1, py + 2 + r * 7.5, (TS - 2) * k, 6.5, '#5e4128'); fillR(c, px + 1, py + 2 + r * 7.5, (TS - 2) * k, 1.4, '#7a5636'); }
    } else if (w.kind === 'sow') {
      // seeds go in one at a time
      const col = sowCol(w.n), q9 = f * 9, k = Math.floor(q9), seed = (x: number, y: number) => { circ(c, x + 0.3, y + 0.4, 1.25, 'rgba(30,16,8,.55)'); circ(c, x, y, 1.05, col); circ(c, x - 0.35, y - 0.35, 0.35, 'rgba(255,255,255,.6)'); };
      for (let q = 0; q < Math.min(9, k); q++) seed(px + CROP_COL[q % 3], py + CROP_ROW[Math.floor(q / 3)] - 0.6);   // (landed: in the furrows, where the plants will stand)
      if (k < 9) {   // the next one in the air, from the sower's hand in an arc
        const t = q9 - k, hx = w.n.x * TS + 12 + (w.n.face ? w.n.face.dx * 5 : 0), hy = w.n.y * TS + 9 + (w.n.face ? w.n.face.dy * 3 : 0), tx = px + CROP_COL[k % 3], ty = py + CROP_ROW[Math.floor(k / 3)] - 0.6;
        seed(hx + (tx - hx) * t, hy + (ty - hy) * t - Math.sin(t * Math.PI) * 7); }
    } else if (w.kind === 'harvest') {
      // (when it is done the plants come out one at a time, each leaving its hole and flying to the picker: pullStart / cropPulling in render/village.ts)
    } else {
      // cracks spread across the boulder, chips fly
      const cp = crackPath(w.x, w.y), segs = cp.main.length - 1, shown = f * (segs + 2);
      c.strokeStyle = '#2c2f33'; c.lineWidth = 1; c.lineCap = 'round'; c.beginPath(); c.moveTo(cp.main[0][0], cp.main[0][1]);
      for (let i = 1; i <= segs; i++) { const k = Math.min(1, shown - (i - 1)); if (k <= 0) break; const a = cp.main[i - 1], b = cp.main[i]; c.lineTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k); }
      c.stroke();
      cp.br.forEach((b, j) => { const k = Math.min(1, shown - segs - j * 0.5); if (k <= 0) return; c.beginPath(); c.moveTo(b[0][0], b[0][1]); c.lineTo(b[1][0], b[1][1]); if (k > 0.5) c.lineTo(b[1][0] + (b[2][0] - b[1][0]) * (k - 0.5) * 2, b[1][1] + (b[2][1] - b[1][1]) * (k - 0.5) * 2); c.stroke(); });
      if (swing > 0.7) for (let i = 0; i < 3; i++) { const t = (now / 260 + i * 0.33) % 1; c.globalAlpha = 1 - t; fillR(c, px + 12 + side * (3 + t * 7) + (i - 1) * 2, py + 12 - t * 6 + i, 1.5, 1.5, '#a9aeb2'); }
      c.globalAlpha = 1;
    }
  }
  // finished: the tree comes down, the boulder breaks apart
  const t0 = performance.now(), fx = town.fx || [];
  for (let i = fx.length - 1; i >= 0; i--) {
    const e = fx[i], age = t0 - e.rt, px = e.x * TS, py = e.y * TS;
    if (e.k === 'fall') {
      if (age > 1800) { fx.splice(i, 1); continue; }
      const a = Math.min(1, age / 650), ang = e.dir * (Math.PI / 2) * a * a, fade = age > 1100 ? 1 - (age - 1100) / 700 : 1;
      c.globalAlpha = Math.max(0, fade);
      c.save(); c.translate(px + 12, py + 20); c.rotate(ang); c.translate(-(px + 12), -(py + 20));
      if (!STYLE.soft) fillR(c, px + 10, py + 9, 4, 12, '#5a3c24'); canopy(c, px, py, e.x, e.y, 0, 0); c.restore();
      if (a >= 1 && age < 1100) { for (let k = 0; k < 6; k++) { const r = (age - 650) / 450; circ(c, px + 12 + e.dir * (8 + k * 3), py + 20 - r * 4 - (k % 2) * 2, 2 + r * 2, `rgba(210,190,150,${0.5 * (1 - r)})`); } }
      c.globalAlpha = 1;
      fillR(c, px + 10, py + 18, 4, 3, '#5a3c24'); fillR(c, px + 10, py + 18, 4, 1.2, '#d9b47a');
    } else {
      if (age > 1500) { fx.splice(i, 1); continue; }
      const b = boulderShape(e.x, e.y), s = b.s, X = px + b.cx, Y = py + b.cy, a = Math.min(1, age / 500), fade = age > 700 ? 1 - (age - 700) / 800 : 1;
      c.globalAlpha = Math.max(0, fade);
      for (const sd of [-1, 1]) { c.fillStyle = sd < 0 ? '#7d8286' : '#6a6f73'; c.beginPath(); c.ellipse(X + sd * (2 + a * 5) * s, Y + a * 2, 5 * s * (1 - a * 0.3), 6 * s * (1 - a * 0.3), sd * a * 0.6, 0, 6.3); c.fill(); }
      for (let k = 0; k < 7; k++) circ(c, X + (hash(e.x, e.y, 80 + k) - 0.5) * 18 * a, Y + 5 + (hash(e.x, e.y, 90 + k) - 0.5) * 6, 1.2, '#8a8f93');
      if (age < 600) { const r = age / 600; circ(c, X, Y, 6 + r * 10, `rgba(200,200,195,${0.35 * (1 - r)})`); }
      c.globalAlpha = 1;
    }
  }
}

function think(n, text, dn?) { game.events.push({ time: game.time, a: n, b: n, place: '', topic: 'life', quiet: true, self: true, lines: [{ who: n, text: '(' + text + ')' }] }); }
function glow(c, x, y, r, col) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
/** the colour of the seed somebody is sowing: the packet in your hand, or the farmer's own seed (barley when we cannot tell) */
function sowCol(n: any): string {
  const k = n && n.player && typeof itActiveSeed === 'function' ? itActiveSeed(n) : n && n.sowSeed ? 'seed_' + n.sowSeed : 'seed_barley';
  return (k && IT_STACKS[k] && IT_STACKS[k].col) || '#c9a96a';
}
