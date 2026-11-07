/* ================= The tidal bay: the tide and the flats =================
   The sea rises and falls over the flats, a slow breath every six hours. Low tide opens sandbanks and islets. */

const TIDE_P = 360;                 // player-minutes from one low tide to the next
const TIDE_MID = 54;
const TIDE_AMP = 42;                // every low tide reaches 12, every high tide 96 (no more great ebb)
function tideRaw(t) { return TIDE_MID - TIDE_AMP * Math.cos(2 * Math.PI * t / TIDE_P); }
function tideLevel() { return town && town.coast ? tideRaw(clk()) : 0; }
function tideDepth(x, y) { const h = town.hgt[y * W + x]; return h < 0 ? 99 : tideLevel() - h; }
const onFlats = (x, y) => !!(town.hgt && town.hgt[y * W + x] >= 0);

/* ---------- drawing the sea over the flats ---------- */
const TIDE: any = { cv: null, bcv: null, t: 0, key: '' };
function drawTide(c, now) {
  if (!town.hgt || !town.coast) return;
  const x0 = Math.max(0, Math.floor(cam.x / TS) - 2), y0 = Math.max(0, Math.floor(cam.y / TS) - 2);
  const x1 = Math.min(W, Math.ceil((cam.x + cam.cw / cam.z) / TS) + 2), y1 = Math.min(H, Math.ceil((cam.y + cam.ch / cam.z) / TS) + 2);
  if (y1 <= y0) return;
  const rw = x1 - x0, rh = y1 - y0, L = tideLevel(), key = x0 + ',' + y0 + ',' + rw + ',' + rh + ',' + L.toFixed(1);
  if (!TIDE.cv) { TIDE.cv = document.createElement('canvas'); TIDE.bcv = document.createElement('canvas'); }
  if (false) {
    TIDE.key = key; TIDE.t = now; const cv = TIDE.cv; if (cv.width !== rw || cv.height !== rh) { cv.width = rw; cv.height = rh; }
    const cx = cv.getContext('2d'), img = cx.createImageData(rw, rh), d = img.data;
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const k = (y0 + y) * W + x0 + x, h = town.hgt[k], o = (y * rw + x) * 4;
      let dep = h >= 0 ? L - h : (grid[y0 + y][x0 + x] === T.WATER ? 40 : -99);
      if (dep > 0) { const s = Math.min(1, dep / 30); d[o] = 111 - 36 * s; d[o + 1] = 179 - 32 * s; d[o + 2] = 221 - 12 * s; d[o + 3] = Math.round(255 * Math.min(0.97, 0.55 + dep / 10)); }
      else if (dep > -6 && h >= 0) { d[o] = 120; d[o + 1] = 100; d[o + 2] = 62; d[o + 3] = Math.round(255 * 0.28 * (1 + dep / 6)); }   // wet sand where the water just was / is about to be
    }
    cx.putImageData(img, 0, 0);
    const b = TIDE.bcv, S = 4; if (b.width !== rw * S || b.height !== rh * S) { b.width = rw * S; b.height = rh * S; }
    const bx = b.getContext('2d'); bx.clearRect(0, 0, b.width, b.height); bx.imageSmoothingEnabled = true; bx.filter = 'blur(1.6px)'; bx.drawImage(cv, 0, 0, b.width, b.height); bx.filter = 'none';
    TIDE.x0 = x0; TIDE.y0 = y0; TIDE.rw = rw; TIDE.rh = rh;
  }
  const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true;
  gaTide(c, now, L);
  c.imageSmoothingEnabled = sm;
  // foam where the water meets the sand, and little wavelets on the shallows
  if (cam.z < 0.6) return;
  const t = now / 1000; c.lineCap = 'round';
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const h = town.hgt[y * W + x]; if (h < 0) continue; const dep = L - h; if (dep <= 0 || dep > 2.2) continue;
    const px = x * TS, py = y * TS, hs = hash(x, y, 71), ph = (t * 0.6 + hs) % 1;
    c.strokeStyle = `rgba(245,250,252,${0.55 * Math.sin(ph * Math.PI)})`; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(px + 3 + hs * 6, py + 8 + ph * 8); c.quadraticCurveTo(px + 12, py + 5 + ph * 8, px + 20 - hs * 4, py + 9 + ph * 8); c.stroke();
  }
}
const landOut = (x, y) => !!(town.islet && town.islet[y * W + x]);   // dry, but out on an islet
/* ---------- crabs, seals and a whale ---------- */
const SEA: any = { list: [], t: 0, whale: null };
function stepSea(now) {
  const n = game.player; if (!n || !town.coast || !inCoast(n.tx, n.ty)) { SEA.list.length = 0; SEA.whale = null; return; }
  const dt = Math.min(0.1, (now - (SEA.last || now)) / 1000); SEA.last = now;
  if (now - SEA.t > 900 && SEA.list.length < 8) { SEA.t = now;
    for (let t = 0; t < 15; t++) { const x = n.tx + Math.round((Math.random() - 0.5) * 26), y = n.ty + Math.round((Math.random() - 0.5) * 18); if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || !inCoast(x, y)) continue;
      if (onFlats(x, y) && tideDepth(x, y) < -1) { SEA.list.push({ kind: 'crab', x, y, tx: x, ty: y, born: now }); break; }
      if (landOut(x, y) && (grid[y][x] === T.SAND || grid[y][x] === T.ROCK) && Math.random() < 0.4) { SEA.list.push({ kind: 'seal', x, y, tx: x, ty: y, born: now, face: Math.random() < 0.5 ? -1 : 1 }); break; } } }
  for (let i = SEA.list.length - 1; i >= 0; i--) { const a = SEA.list[i], d = Math.hypot(a.x - n.tx, a.y - n.ty);
    if (d > 30 || now - a.born > 90000 || (a.kind === 'crab' && onFlats(Math.round(a.x), Math.round(a.y)) && tideDepth(Math.round(a.x), Math.round(a.y)) > 1)) { SEA.list.splice(i, 1); continue; }
    if (a.kind === 'crab') { if (d < 3) { a.tx = a.x + Math.sign(a.x - n.tx || 1) * 4; a.ty = a.y; } else if (Math.random() < 0.01) { a.tx = a.x + (Math.random() - 0.5) * 3; a.ty = a.y + (Math.random() - 0.5) * 1; }
      const dx = a.tx - a.x, dy = a.ty - a.y, dd = Math.hypot(dx, dy); if (dd > 0.05) { const s = Math.min(1, (d < 3 ? 3 : 0.6) * dt / dd); a.x += dx * s; a.y += dy * s; } } }
  // now and then a whale breathes, far out
  if (!SEA.whale && Math.random() < 0.0015) { for (let t = 0; t < 20; t++) { const x = n.tx + Math.round((Math.random() - 0.5) * 30), y = n.ty + 6 + Math.round(Math.random() * 12); if (y < H - 1 && x > 0 && x < W - 1 && grid[y][x] === T.WATER) { SEA.whale = { x, y, t0: now }; if (!town.coast.whaleSaid) { town.coast.whaleSaid = true; think(n, 'A WHALE! Out past the flats... it\'s enormous!'); } break; } } }
  if (SEA.whale && now - SEA.whale.t0 > 6000) SEA.whale = null;
}

/* ---------- the larder: no shop, no prices. Step up and take what you need ---------- */
function openShop(m) { const n = game.player; if (!n || !m) return; const took = [];
  for (const g of FOODS) { const q = Math.min(Math.max(0, 3 - (n.inv[g] || 0)), Math.floor(m.stock[g] || 0)); if (q > 0) { m.stock[g] -= q; n.inv[g] = (n.inv[g] || 0) + q; took.push(q + ' ' + GNAME(g)); } }
  playerSay(n, took.length ? 'Took ' + took.join(', ') + ' from the larder. Nobody minds: there is plenty.' : anyOf(['Your pockets are full enough. Leave some for the others.', 'Nothing here you need right now.']));
  updateHud(true); }
