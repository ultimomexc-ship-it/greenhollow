/* ---- people: the paper dolls ---- */
function gaSpec(n, now) {
  const L = n.look || assignLook(n), sp = n._sp || (n._sp = {}), dress = dressFor(n);
  sp.id = n.id; sp.role = n.role; sp.age = n.age; sp.female = !!n.female; sp.skin = n.skin; sp.hair = n.hair; sp.hs = L.hs; sp.beard = L.beard; sp.shirt = n.shirt; sp.pat = L.pat; sp.acc = L.acc; sp.pants = L.pants;
  sp.hat = n.hat; sp.hatCol = n.hatCol; sp.hatOn = !!L.hatOn; sp.robe = !!n.robe; sp.apron = !!n.apron; sp.face = n.face || { dx: 0, dy: 1 };
  sp.moving = !!n.moving; sp.pose = n.moving ? 'walk' : (n.pose === 'sit' || n.pose === 'kneel' || n.pose === 'work') ? n.pose : 'stand';
  sp.tool = n.pose === 'work' ? n.tool : null; sp.hold = n.hold || null; sp.dress = dress; sp.mourning = !!(n.mourning && !n.moving); sp.wave = !!(n.waveUntil > game.time && n.pose !== 'sleep'); sp.inv = n.inv; sp.status = n.status;
  return sp;
}
function drawPerson(c, n, now, px, py) {
  const sp = gaSpec(n, now); c.save();
  try { ART.drawDoll(c, sp, px, py, 1, now / 1000); } catch (e) { if (!GA.warned) { GA.warned = 1; console.error('doll', e && e.message); } }
  c.restore();
  if (n.status === 'Playing the fiddle' && !n.moving) drawFiddle(c, n, now, px, py);
}
function drawSleeper(c, n, px, py, now) {
  const r = grid[n.ty] && roomAt[n.ty][n.tx] >= 0 ? rooms[roomAt[n.ty][n.tx]] : null;
  if (r && grid[n.ty][n.tx] === T.BED) { const sp = gaSpec(n, now); ART.drawSleeper(c, sp, n.tx * TS, n.ty * TS, 1, now / 1000, r.side === 'b', ART.BLK[(ART.h32(n.tx, n.ty, 60, 60) * 5) | 0]); return; }
  const b = Math.sin(now / 900) * 0.4;                             // asleep outdoors or in a tent: a bedroll
  if (grid[n.ty] && grid[n.ty][n.tx] !== T.TENT) { c.fillStyle = '#6a5a44'; c.fillRect(px + 3, py + 15, 18, 5); }
  c.fillStyle = n.skin; c.beginPath(); c.arc(px + 6, py + 12, 4.3, 0, 6.3); c.fill(); c.fillStyle = n.hair; c.fillRect(px + 2, py + 7.4, 8.5, 2.6);
  c.fillStyle = BLANKETS[(hash(n.bed.x || n.id, n.bed.y || 3, 60) * 5) | 0]; c.fillRect(px + 9, py + 6 + b, 12, 13 - b);
}
function drawCarry() {}

/* ---- the tide over the flats: painted water with a real shoreline, clearer where it is shallow, deeper further out ---- */
function gaNearFlats() {
  const a = GA.nearFlat = new Uint8Array(W * H); if (!town.hgt) return;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (town.hgt[y * W + x] >= 0) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy < H) a[yy * W + xx] = 1; }
}
function gaTide(c, now, L) {
  const nf = GA.nearFlat; if (!nf) return;
  const v = gaView(), fi = gaFi(now), hg = town.hgt;
  const dep = (i, j) => { if (i < 0 || j < 0 || i >= W || j >= H) return 99; const h = hg[j * W + i]; return h >= 0 ? L - h : (gaK(i, j) === 'water' ? 99 : -99); };
  for (let y = v.y0; y < v.y1; y++) for (let x = v.x0; x < v.x1; x++) {
    if (!nf[y * W + x] || roomAt[y][x] >= 0) continue;
    const d = [dep(x - 1, y - 1), dep(x, y - 1), dep(x + 1, y - 1), dep(x - 1, y), dep(x, y), dep(x + 1, y), dep(x - 1, y + 1), dep(x, y + 1), dep(x + 1, y + 1)], w = d.map(q => q > 0);
    const m = (w[0] && w[1] && w[3] && w[4] ? 1 : 0) | (w[1] && w[2] && w[4] && w[5] ? 2 : 0) | (w[4] && w[5] && w[7] && w[8] ? 4 : 0) | (w[3] && w[4] && w[6] && w[7] ? 8 : 0);
    if (!m) continue;
    const X = x * TS, Y = y * TS, own = hg[y * W + x] >= 0, dd = d[4];
    if (!own && m !== 15 && gaK(x, y) !== 'water') continue;
    c.globalAlpha = own ? Math.min(0.96, 0.5 + dd / 9) : 1;
    c.drawImage(m === 15 ? ART.water(own || !GA.shal[y * W + x] ? 'shallow' : 'shallow', fi) : ART.overlay('shallow', m, fi), X, Y, TS, TS);
    c.globalAlpha = 1;
  }
}

/* ---------- sizing and camera ---------- */
let waterList = [];
let waterDirty = false;
function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cam.dpr = dpr; cam.cw = canvas.clientWidth || 800;
  const want = document.body.classList.contains('fs') ? window.innerHeight : Math.round(Math.max(300, Math.min(window.innerHeight * 0.74, 760, cam.cw * H / W + 4)));
  if (Math.abs(canvas.clientHeight - want) > 1) canvas.style.height = want + 'px';
  cam.ch = canvas.clientHeight || want;
  canvas.width = Math.round(cam.cw * dpr); canvas.height = Math.round(cam.ch * dpr);
  cam.fit = Math.min(cam.cw / (W * TS), cam.ch / (H * TS));
  clampCam();
}
const camMin = () => cam.fit * 0.85, camMax = () => 3.2;
function clampCam() {
  cam.z = Math.max(camMin(), Math.min(camMax(), cam.z));
  const vw = cam.cw / cam.z, vh = cam.ch / cam.z, mw = W * TS, mh = H * TS;
  cam.x = vw >= mw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, cam.x));
  cam.y = vh >= mh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, cam.y));
}
function fitCam() { cam.z = cam.fit; cam.x = 0; cam.y = 0; clampCam(); }
function zoomAt(f, sx, sy) { // sx, sy are css px inside the canvas
  const wx = cam.x + sx / cam.z, wy = cam.y + sy / cam.z;
  cam.z = Math.max(camMin(), Math.min(camMax(), cam.z * f));
  cam.x = wx - sx / cam.z; cam.y = wy - sy / cam.z; clampCam();
}
function centerOn(wx, wy, smooth?) {
  const tx = wx * TS + TS / 2 - cam.cw / cam.z / 2, ty = wy * TS + TS / 2 - cam.ch / cam.z / 2;
  if (smooth) { cam.x += (tx - cam.x) * smooth; cam.y += (ty - cam.y) * smooth; } else { cam.x = tx; cam.y = ty; }
  clampCam();
}
const toScreen = (wx, wy) => ({ x: (wx - cam.x) * cam.z, y: (wy - cam.y) * cam.z });
function resize() { sizeCanvas(); }

/* ---------- daylight ---------- */
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
function daylight(h) { return h < 12 ? smooth(5, 7.2, h) : 1 - smooth(18, 20.3, h); }

function drawFiddle(c, n, now, px, py) {
  const cx = px + TS / 2, cy = py + 12, saw = Math.sin(now / 160) * 3;
  c.save(); c.translate(cx + 3, cy); c.rotate(-0.5); fillR(c, -2.5, -3, 5, 7, '#8a4a22'); fillR(c, -1, -9, 2, 6, '#3a2414'); c.restore();
  c.strokeStyle = '#e8e0cc'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 6 + saw, cy - 4); c.lineTo(cx + 7 + saw, cy + 2); c.stroke();
  for (let i = 0; i < 3; i++) { const t = (now / 1400 + i / 3) % 1, x = cx + 4 + Math.sin(t * 6 + i) * 6 + i * 4, y = py - t * 30; c.globalAlpha = 1 - t; c.fillStyle = '#fff6c8'; c.font = 'bold 12px sans-serif'; c.fillText(i % 2 ? '♫' : '♪', x, y); }
  c.globalAlpha = 1;
}

/* ---------- main draw ---------- */
const mid = (x, y) => ({ x: x * TS + TS / 2, y: y * TS + TS / 2 });
function drawLabels(c) {
  c.font = '600 9.5px "IBM Plex Sans", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (cam.z < cam.fit * 1.25) return;
  for (const m of town.markets) { const x = m.x * TS + TS / 2, y = (m.y - (m === town.markets[0] ? -5.3 : 0.2)) * TS; c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(m.name.toUpperCase(), x + .6, y + .6); c.fillStyle = 'rgba(255,236,170,.95)'; c.fillText(m.name.toUpperCase(), x, y); }
  const label = (txt, x, y, col) => { c.save(); c.font = 'italic 600 13px "IBM Plex Sans", system-ui, sans-serif'; c.fillStyle = 'rgba(0,0,0,.45)'; c.fillText(txt, x + .8, y + .8); c.fillStyle = col; c.fillText(txt, x, y); c.restore(); };
  { const rg = town.region; if (rg && rg.found && rg.ent) label(rg.name.toUpperCase(), (rg.ent.x - 4) * TS, (rg.ent.y - 2) * TS, 'rgba(220,235,200,.85)'); }
  for (const r of rooms) {
    if (r.dead) continue;
    c.fillStyle = 'rgba(0,0,0,.45)'; c.fillText(r.name, (r.x + r.w / 2) * TS + 0.6, (r.side === 'b' ? r.y : r.y + r.h - 1) * TS + 12.6);
    c.fillStyle = 'rgba(255,248,226,.9)'; c.fillText(r.name, (r.x + r.w / 2) * TS, (r.side === 'b' ? r.y : r.y + r.h - 1) * TS + 12);
  }
}
function drawFx(c, now) {
  // water glints
  c.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 14; i++) {
    const wt = waterList[(i * 7 + Math.floor(now / 900 + i)) % Math.max(1, waterList.length)] || { x: 0, y: 0 }, gx = wt.x, gy = wt.y;
    if (grid[gy] && grid[gy][gx] === T.WATER) c.fillRect(gx * TS + 5 + Math.sin(now / 500 + i) * 3, gy * TS + 6 + (i % 3) * 5, 6, 1.2);
  }
}

function render(now, dtSec, hourOfDay) {
  const c = ctx;
  const Z = cam.z * cam.dpr;
  const ft = game.player || view.selected;
  const tdy = typeof talkUI !== 'undefined' && talkUI.o ? talkUI.dy || 0 : 0;
  if ((cam.follow || tdy) && ft) centerOn(ft.x, ft.y + tdy, Math.min(1, dtSec * 6)); else clampCam();
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0b0e0f'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.setTransform(Z, 0, 0, Z, -cam.x * Z, -cam.y * Z);
  c.imageSmoothingEnabled = true; GA.hour = hourOfDay;
  flushDirty(); drawGround(c, now);
  drawCrops(c, now);
  drawDoors(c, dtSec);
  if (typeof drawTide === 'function') drawTide(c, now);

  drawNodes(c, now); drawSites(c, now); drawEventsFx(c, now); drawWorkFx(c, now); stepWild(now); drawWild(c, now); if (typeof stepSea === 'function') { stepSea(now); drawSea(c, now); }
  drawLabels(c);

  // people, the forest sprites, the statue... and any tall tile standing in front of them: all in order of who is
  // nearer the bottom of the screen, so whoever is behind a tree, a tent or a statue goes behind it
  { const items = [], near = new Set<number>(), mark = (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y); for (let yy = y0; yy <= y0 + 2; yy++) for (let xx = x0 - 1; xx <= x0 + 2; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W) near.add(yy * W + xx); };
    for (const n of npcs) { if (n.inShip) continue; const sl = n.pose === 'sleep' && !n.moving; items.push({ k: n.y - (sl ? 0.45 : 0), f: () => { const px = n.x * TS, py = n.y * TS; if (sl) drawSleeper(c, n, px, py, now); else drawPerson(c, n, now, px, py); } }); mark(n.x, n.y); }
    for (const prov of YSORT) { const L = prov(c, now) || []; for (const it of L) { items.push(it); if (it.mob) mark(it.x, it.k); } }
    if (cam.z >= 0.6) { const busy = new Set(); for (const w of workTargets()) if (w.kind === 'tree') busy.add(w.y * W + w.x);
      for (const key of near) { const x = key % W, y = (key / W) | 0, t = grid[y][x]; if (!TALL.has(t) || busy.has(key)) continue; items.push({ k: y - 0.02, f: () => drawTallTile(c, x, y, t) }); } }
    items.sort((a, b) => a.k - b.k); for (const it of items) it.f(); }
  // routes
  const showRoute = n => n.moving && n.path.length;
  c.fillStyle = '#ffd36a';
  for (const n of npcs) {
    if (n === game.player || !(view.showRoutes || n === view.selected) || !showRoute(n)) continue;
    c.globalAlpha = n === view.selected ? 0.95 : 0.5;
    for (const p of n.path) { const m = mid(p.x, p.y); c.beginPath(); c.arc(m.x, m.y, 2, 0, 6.3); c.fill(); }
    const g = n.spot ? mid(n.spot.x, n.spot.y) : null;
    if (g) { c.strokeStyle = '#ffd36a'; c.lineWidth = 1.5; c.beginPath(); c.arc(g.x, g.y, 6, 0, 6.3); c.stroke(); }
    c.globalAlpha = 1;
  }

  // night overlay
  const d = daylight(hourOfDay), night = 1 - d, warmth = 0;
  for (const rm of rooms) { if (rm.dead) continue; const occupied = npcs.some(n => n.pose !== 'sleep' && n.x > rm.x && n.x < rm.x + rm.w - 1 && n.y > rm.y && n.y < rm.y + rm.h - 1); const tavernOpen = rm.kind === 'tavern' && hourOfDay >= 17 && hourOfDay < 23.5; rm.lit += ((occupied || tavernOpen ? 1 : 0) - rm.lit) * Math.min(1, dtSec * 3); }
  if (STYLE.light) drawLighting(c, hourOfDay, now);
  if (!STYLE.light && night > 0.01) {
    const r = Math.round(14 + warmth * 160), g = Math.round(20 + warmth * 60), b = Math.round(58 - warmth * 20);
    dctx.setTransform(DK, 0, 0, DK, 0, 0);
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, W * TS, H * TS);
    dctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.66, night * 0.64 + warmth * 0.1)})`;
    dctx.fillRect(0, 0, W * TS, H * TS);
    dctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, rad, a) => {
      const gr = dctx.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = gr; dctx.beginPath(); dctx.arc(x, y, rad, 0, 6.3); dctx.fill();
    };
    for (const l of lamps) { const m = mid(l.x, l.y); hole(m.x, m.y, TS * 5.2, 0.95); }
    for (const dr of doors) { const m = mid(dr.x, dr.y); hole(m.x, m.y + (rooms[dr.room].side === 'b' ? TS * 0.8 : -TS * 0.8), TS * 2.6, 0.7); }
    const fn = town.funeral; if (fn && fn.slot && game.time > fn.at - 20 && !fn.done) hole((fn.slot.x + .5) * TS, (fn.slot.y + .5) * TS, TS * 3.2, 0.6);
    for (const rm of rooms) {
      if (rm.dead) continue;
      if (rm.lit < 0.02) continue;
      dctx.save(); dctx.beginPath(); dctx.rect((rm.x + 1) * TS, (rm.y + 1) * TS, (rm.w - 2) * TS, (rm.h - 2) * TS); dctx.clip();
      hole((rm.x + rm.w / 2) * TS, (rm.y + rm.h / 2) * TS, Math.hypot(rm.w, rm.h) * TS * 0.62, rm.lit * 0.95);
      dctx.restore();
    }
    dctx.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = true; c.drawImage(darkCanvas, 0, 0, W * TS, H * TS);
    // warm glows
    c.globalCompositeOperation = 'lighter';
    const glow = (x, y, rad, a) => {
      const gr = c.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(255,170,70,${a * night})`); gr.addColorStop(1, 'rgba(255,170,70,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, rad, 0, 6.3); c.fill();
    };
    for (const l of lamps) { const m = mid(l.x, l.y); glow(m.x, m.y - 6, TS * 2.6, 0.32); }
    for (const rm of rooms) {
      if (rm.dead || rm.lit < 0.05) continue;
      for (const wx of [rm.x, rm.x + rm.w - 1]) {
        const wy = (rm.y + rm.h / 2) * TS;
        c.fillStyle = `rgba(255,205,110,${0.8 * rm.lit * night})`; c.fillRect(wx * TS + 7, wy - 6, 10, 12);
        glow(wx * TS + 12, wy, TS * 1.5, 0.3 * rm.lit);
      }
    }
    c.globalCompositeOperation = 'source-over';
  }

  // screen-space overlays: stays readable at any zoom
  c.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0); c.imageSmoothingEnabled = true;
  drawFeast(c, now); drawCeremonyFire(c, now); drawOverlay(c, now); drawTalkMarks(c, now); drawSiteTags(c); drawActivityBars(c); drawPlayerFx(c, now); drawBubbles(c, now); lfDrawThoughts(c, now);
}

function npcAt(wx, wy) {
  let best = null, bd = Math.max(0.85, 14 / (cam.z * TS));
  for (const n of npcs) { const d = Math.hypot(n.x + 0.5 - wx, n.y + 0.55 - wy); if (d < bd) { bd = d; best = n; } }
  return best;
}

const GOODCOL = { stone: '#9aa0a6', fish: '#a9c2d6', grain: '#e3c05a', wood: '#8a5a30', herbs: '#7fc04a', bread: '#d9a15a' };
const pops = [];
function addPop(wx, wy, text, col) { pops.push({ wx, wy, text, col, t0: performance.now() }); if (pops.length > 40) pops.shift(); }

/* ---------- speech bubbles and tags (screen space) ---------- */
const bubbles = [];
function wrapText(c, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function drawOverlay(c, now) {
  const vw = cam.cw, vh = cam.ch, k = cam.z * 0.8; if (k < 0.35) return;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // sleeping z's, music, serving marks
  for (const n of npcs) {
    const s = toScreen(n.x * TS + TS / 2, n.y * TS);
    if (s.x < -30 || s.y < -30 || s.x > vw + 30 || s.y > vh + 30) continue;
    if (!n.player && !canSee(n.x, n.y)) continue; // nothing shows from people you cannot see
    if (n.pose === 'sleep' && !n.moving) {
      c.font = 'bold ' + 9 * k + 'px "IBM Plex Mono", monospace'; c.fillStyle = '#cfe0ff';
      for (let i = 0; i < 2; i++) { const p = ((now / 1600 + i * 0.5) % 1); c.globalAlpha = 1 - p; c.fillText('z', s.x + (5 + p * 7 + i * 3) * k, s.y + (4 - p * 12) * k); }
      c.globalAlpha = 1;
    } else if (n.pose === 'work' && n.tool === 'lute') {
      c.font = 'bold ' + 11 * k + 'px "IBM Plex Sans", sans-serif'; c.fillStyle = '#ffe9a0';
      const p = (now / 1200) % 1; c.globalAlpha = 1 - p; c.fillText('♪', s.x + (8 + Math.sin(p * 6) * 3) * k, s.y + (-2 - p * 12) * k); c.globalAlpha = 1;
    }
    if (n.shop && n.shop.serving && cam.z > 0.7) { c.fillStyle = 'rgba(120,190,90,.95)'; c.beginPath(); c.arc(s.x + 9 * k, s.y - 2 * k, 3.2 * k, 0, 6.3); c.fill(); c.fillStyle = '#1e3a12'; c.font = 'bold ' + 5 * k + 'px sans-serif'; c.fillText('✓', s.x + 9 * k, s.y - 1.8 * k); }
  }
  // coin pop-ups
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i], a = (now - p.t0) / 1500; if (a > 1) { pops.splice(i, 1); continue; }
    const s = toScreen(p.wx, p.wy); c.globalAlpha = 1 - a * a; c.font = '600 ' + 11 * k + 'px "IBM Plex Mono", monospace';
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(p.text, s.x + 1, s.y - 16 * k - a * 22 * k + 1); c.fillStyle = p.col; c.fillText(p.text, s.x, s.y - 16 * k - a * 22 * k); c.globalAlpha = 1;
  }

}

function drawEventsFx(c, now) {
  drawRemains(c); drawDrops(c);
  drawYard(c, now);
  const fn = town.funeral;
  if (fn && fn.slot && !fn.done && game.time > fn.at - 20) {
    const px = fn.slot.x * TS, py = fn.slot.y * TS;
    fillR(c, px + 3, py + 5, 18, 15, '#2b2019'); fillR(c, px + 5, py + 7, 14, 10, '#6a4a2c'); fillR(c, px + 5, py + 7, 14, 2, '#8a6538');
    const fl = 0.6 + 0.4 * Math.sin(now / 130); fillR(c, px + 1, py + 8, 2, 6, '#e8e0cc'); circ(c, px + 2, py + 6.5, 1.6 + fl, '#ffb347'); fillR(c, px + 21, py + 8, 2, 6, '#e8e0cc'); circ(c, px + 22, py + 6.5, 1.6 + fl, '#ffb347');
  }
  const w = town.wedding;
  if (w && !w.done && game.time > w.at - 30) {
    // the arch stands right behind the priest, framing the vows
    const pr = (w.place && w.place.priest) || { x: town.cx, y: town.cy };
    const px = pr.x * TS + TS / 2 - 2, py = (pr.y + 1) * TS - 34;
    fillR(c, px - 17, py + 6, 3, 24, '#e8e0cc'); fillR(c, px + 17, py + 6, 3, 24, '#e8e0cc');
    c.strokeStyle = '#e8e0cc'; c.lineWidth = 3; c.beginPath(); c.arc(px + 2, py + 8, 18, Math.PI, 0); c.stroke();
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; circ(c, px + 2 + Math.cos(a) * 18, py + 8 + Math.sin(a) * 18, 2.6, ['#e58aa5', '#f4c95d', '#f4f1e8'][i % 3]); }
    if (game.time >= w.at) for (let i = 0; i < 6; i++) { const p = ((now / 1500 + i / 6) % 1); c.globalAlpha = 1 - p; circ(c, px + (hash(i, 3, 5) - .5) * 70, py + 30 - p * 40, 2, ['#e58aa5', '#f4c95d', '#fff'][i % 3]); c.globalAlpha = 1; }
  }
}

/* a translucent pie that fills on the thing being worked */
// what is left of the old pie: a row of small pips that fill one by one, above whatever is being worked
function drawPie(c, tx, ty, f, col) {
  const p = toScreen((tx + 0.5) * TS, ty * TS), k = cam.z;
  if (p.x < -30 || p.x > cam.cw + 30 || p.y < -30 || p.y > cam.ch + 30) return null;
  const N = 5, sz = 2.6 * k, gap = 1.6 * k, w = N * sz + (N - 1) * gap, x0 = p.x - w / 2, y0 = p.y - 2 * k, filled = Math.floor(f * N + 0.0001);
  c.save();
  for (let i = 0; i < N; i++) { const x = x0 + i * (sz + gap); c.fillStyle = 'rgba(14,18,20,.45)'; c.fillRect(x - 0.6, y0 - 0.6, sz + 1.2, sz + 1.2); if (i < filled) { c.fillStyle = col.replace(/[\d.]+\)$/, '1)'); c.fillRect(x, y0, sz, sz); } }
  c.restore(); return { x: p.x, y: y0, r: sz };
}
// the job is finished: a green tick pops up where the work was, so you know to let go
function drawDoneTick(c, tx, ty, now) {
  const p = toScreen((tx + 0.5) * TS, (ty + 0.5) * TS), k = cam.z, r = 5.2 * k;
  if (p.x < -30 || p.x > cam.cw + 30 || p.y < -30 || p.y > cam.ch + 30) return null;
  c.save();
  c.fillStyle = 'rgba(14,18,20,.45)'; c.beginPath(); c.arc(p.x, p.y, r + 1.2 * k, 0, 6.2832); c.fill();
  c.fillStyle = 'rgba(110,210,125,.95)'; c.beginPath(); c.arc(p.x, p.y, r, 0, 6.2832); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 1.5 * k; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(p.x - 2.4 * k, p.y + 0.2 * k); c.lineTo(p.x - 0.6 * k, p.y + 2 * k); c.lineTo(p.x + 2.6 * k, p.y - 1.8 * k); c.stroke();
  c.restore(); return { x: p.x, y: p.y, r };
}
function drawPlayerFx(c, now) {
  const n = game.player; if (!n) return; const p = n.player; if (!p) return;
  const d = playerAim(n, p), z = cam.z;
  const s = toScreen(n.x * TS + TS / 2, n.y * TS);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  let y = s.y - 30 * z - 6 * z;
  if (p.act && p.act.min > 3.5 || (p.act && !p.act.auto)) {
    const a = p.act, f = Math.min(1, a.t / a.min);
    const tgx = a.auto || a.sleep ? n.tx : n.tx + n.face.dx, tgy = a.auto || a.sleep ? n.ty : n.ty + n.face.dy;
    const onWork = /^(tree|rock|node|fish|crop|eat|table|wall|throw)/.test(a.key || '');
    const pie = onWork ? null : drawPie(c, tgx, tgy, f, a.done ? 'rgba(127,220,138,.75)' : 'rgba(127,208,255,.7)');
    if (pie) y = Math.min(pie.y - pie.r - 12, s.y - 20 * z - 8);
    const fs = 6.2 * z; if (fs >= 4.5) { c.font = '500 ' + fs + 'px "IBM Plex Sans", sans-serif'; const tw = c.measureText(a.text).width + fs * 1.4, th = fs * 1.55;
    c.fillStyle = 'rgba(14,18,20,.55)'; c.beginPath(); if (c.roundRect) c.roundRect(s.x - tw / 2, y - th / 2, tw, th, th / 2); else c.rect(s.x - tw / 2, y - th / 2, tw, th); c.fill(); c.fillStyle = 'rgba(242,236,218,.92)'; c.fillText(a.text, s.x, y + 0.5); y -= th + 3; }
  }
  const age = clk() - p.msgAt;
  if (p.msg && age >= 0 && age < 45) {
    const f2 = 6.5 * z; if (f2 >= 4.5) { c.globalAlpha = Math.min(1, (45 - age) / 15); c.font = '600 ' + f2 + 'px "IBM Plex Sans", sans-serif'; const yy = y - age * 0.15 * z;
    c.lineWidth = f2 * 0.35; c.strokeStyle = 'rgba(14,18,20,.7)'; c.lineJoin = 'round'; c.strokeText(p.msg, s.x, yy); c.fillStyle = '#ffe9a8'; c.fillText(p.msg, s.x, yy); c.globalAlpha = 1; }
  }
}

function drawSiteTags(c) {
  return;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '600 10.5px "IBM Plex Sans", sans-serif';
  for (const s of town.sites) {
    if (s.kind === 'demolish' || s.kind === 'field' || s.kind === 'graveyard') continue;
    const nm = { house: 'House', church: 'Chapel', tavern: 'Tavern', market: 'Village green', road: 'Path' }[s.kind] || 'Site';
    const need = siteNeedText(s), pct = Math.round(100 * siteFrac(s));
    const line = need ? 'Needs ' + need : pct + '% built';
    const rt = s.kind === 'road' ? s.route[Math.min(s.laid || 0, s.route.length - 1)] : null; if (rt && cam.z < cam.fit * 1.2) continue; const sc = rt ? toScreen((rt.x + .5) * TS, rt.y * TS) : toScreen((s.x + s.w / 2) * TS, s.y * TS); if (sc.x < -120 || sc.x > cam.cw + 120 || sc.y < -40 || sc.y > cam.ch + 80) continue;
    const t1 = nm + ' · ' + line, tw = c.measureText(t1).width + 14, x = sc.x, y = Math.max(14, sc.y - 12);
    c.fillStyle = 'rgba(14,18,20,.9)'; c.fillRect(x - tw / 2, y - 10, tw, 20);
    c.fillStyle = '#2f3a3f'; c.fillRect(x - tw / 2 + 4, y + 5, tw - 8, 3);
    c.fillStyle = need ? '#e0a93f' : '#7fae5f'; c.fillRect(x - tw / 2 + 4, y + 5, (tw - 8) * siteFrac(s), 3);
    c.fillStyle = need ? '#ffe0a0' : '#e8e4d8'; c.fillText(t1, x, y - 2);
  }
}

function drawTalkMarks(c, now) {
  const p = game.player; if (!p || typeof talkMarks !== 'function') return;
  const marks = talkMarks(p);
  const k = Math.min(1.6, Math.max(0.45, cam.z * 0.8)), bob = Math.sin(now / 300) * 1.5 * k;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const n of npcs) { const m = marks.get(n.id); if (!m || n.dead || n.inShip || n.pose === 'sleep' || (typeof talkUI !== 'undefined' && talkUI.o === n) || !canSee(n.x, n.y)) continue;
    const L = n.look || assignLook(n), sy = (n.scale || 1) * (n.age >= 16 ? L.h : 1);
    const s = toScreen(n.x * TS + TS / 2, n.y * TS + 22 - 21 * sy - 3);
    if (s.x < -30 || s.y < -30 || s.x > cam.cw + 30 || s.y > cam.ch + 40) continue;
    const fs = 17 * k, y = s.y - fs * 0.5 + bob;
    c.font = '900 ' + fs + 'px Georgia, "Times New Roman", serif'; c.lineJoin = 'round';
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(s.x, s.y + 1.5 * k, 3.2 * k, 1.1 * k, 0, 0, 6.3); c.fill();
    c.lineWidth = 3.2 * k; c.strokeStyle = 'rgba(40,28,6,.9)'; c.strokeText(m, s.x, y);
    c.fillStyle = m === '!' ? '#ffb347' : '#ffd34d'; c.fillText(m, s.x, y); }
}
function dressFor(n) {
  const w = town.wedding, f = town.funeral, t = game.time;
  if (w && !w.done && t >= w.at - 60 && t < w.end + 30 && (n === w.a || n === w.b)) return n.female ? 'bride' : 'groom';
  if (f && !f.done && t >= f.at - 50 && t < f.end && n.mourning === f.rec.id) return 'mourn';
  return null;
}
function drawCeremonyFire(c, now) {
  // no fire at a wedding: just a ring of scattered petals where the couple stand
  const w = town.wedding; if (!w || w.done || (w.place && w.place.church) || game.time < w.at - 40 || game.time >= w.end) return;
  const f = { x: town.cx, y: town.cy + 1 }, s = toScreen(f.x * TS + TS / 2, f.y * TS + TS / 2), k = cam.z;
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; circ(c, s.x + Math.cos(a) * 26 * k, s.y + 6 * k + Math.sin(a) * 12 * k, 1.6 * k, ['#e88aa0', '#f4d36a', '#ffffff', '#9ad08a'][i % 4]); }
}
function drawActivityBars(c) {
  if (cam.z < cam.fit * 1.2) return;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '600 9.5px "IBM Plex Sans", sans-serif';
  for (const n of npcs) {
    if (n.player || n.infant || n.dead || n.moving || !n.plan) continue;
    const s = n.plan[n.si]; if (!s || s.k !== 'wait' || !n.stepStarted || s.nopie || !(s.onEnd || s.act === 'work' || s.act === 'eat') || s.min > 120 || s.act === 'sleep') continue;
    const f = Math.max(0, Math.min(1, 1 - (n.until - game.time) / s.min)), sc = toScreen(n.x * TS + TS / 2, n.y * TS);
    if (sc.x < -40 || sc.x > cam.cw + 40 || sc.y < -20 || sc.y > cam.ch + 40) continue;
    const w = 26, x = sc.x - w / 2, y = sc.y - 7 * cam.z - 12 + 4;
    const own = s.act === 'eat' || !n.face || !(n.face.dx || n.face.dy);
    if ((s.act === 'work' && ['axe', 'hammer', 'pick', 'fish', 'hoe'].includes(s.tool)) || s.hold === 'plate' || s.slot) continue;
    drawPie(c, own ? n.tx : n.tx + n.face.dx, own ? n.ty : n.ty + n.face.dy, f, s.act === 'eat' ? 'rgba(224,169,63,.75)' : 'rgba(127,208,255,.7)');
  }
}

/* speech bubbles go on top of every other label */
function drawBubbles(c, now) {
  const vw = cam.cw, vh = cam.ch;
  c.textBaseline = 'middle';
  // speech bubbles: sized with the world; too far away to read means not drawn
  const kb = Math.min(1.6, cam.z * 0.8), showB = kb >= 0.45;
  c.font = '500 ' + 10.5 * kb + 'px "IBM Plex Sans", system-ui, sans-serif'; c.textAlign = 'left';
  for (let i = bubbles.length - 1; i >= 0; i--) if (now > bubbles[i].until) bubbles.splice(i, 1);
  for (const b of bubbles) {
    if (!showB || now < b.from || (typeof talkUI !== 'undefined' && talkUI.o)) continue;
    const n = b.n; if (n.inShip || (!n.player && !canSee(n.x, n.y))) continue; const s = toScreen(n.x * TS + TS / 2, n.y * TS - 6 - 8 * (n.scale || 1));
    if (s.x < -80 || s.y < -40 || s.x > vw + 80 || s.y > vh + 40) continue;
    const lines = wrapText(c, b.text, 132 * kb).slice(0, 4), lh = 12.5 * kb;
    const w = Math.max.apply(null, lines.map(l => c.measureText(l).width)) + 12 * kb, h = lines.length * lh + 8 * kb;
    const bx = Math.max(2, Math.min(vw - w - 2, s.x - w / 2)), by = Math.max(2, s.y - h - 5);
    c.globalAlpha = Math.max(0, Math.min(1, (b.until - now) / 350, (now - b.from) / 120));
    c.fillStyle = 'rgba(250,246,232,.97)'; c.strokeStyle = 'rgba(20,20,20,.55)'; c.lineWidth = 1;
    c.beginPath(); if (c.roundRect) c.roundRect(bx, by, w, h, 5); else c.rect(bx, by, w, h); c.fill(); c.stroke();
    const tx = Math.max(bx + 6, Math.min(bx + w - 6, s.x));
    c.beginPath(); c.moveTo(tx - 4, by + h); c.lineTo(s.x, s.y); c.lineTo(tx + 4, by + h); c.closePath(); c.fill();
    c.fillStyle = '#1b1b1b'; lines.forEach((l, q) => c.fillText(l, bx + 6 * kb, by + 10 * kb + q * lh));
    c.globalAlpha = 1;
  }
  c.textAlign = 'center';
}

