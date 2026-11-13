/* The first morning, round 3 (docs/tutorial-round3.md): telling the player what to do, an arrow that follows the work, rewards you can see,
   a shop panel and a build bar that point at the button to press. Patches on tutorial2.ts and tutorial2-play.ts. */

/* ---------------- popups: a card for everything you get ---------------- */
const T2POP: any = { q: [], cur: null, until: 0 };
function tut2Popup(icon: string, title: string, sub?: string) {
  T2POP.q.push({ icon, title, sub: sub || '' }); if (typeof sndPick === 'function') try { sndPick(); } catch (e) {}
}
function tut2PopTick() {
  if (typeof document === 'undefined') return; const now = performance.now(), d = tut2Dom('tutpop', 'tutpop'); if (!d) return;
  if (T2POP.cur && now < T2POP.until) return;
  T2POP.cur = T2POP.q.shift() || null; if (!T2POP.cur) { d.hidden = true; return; }
  T2POP.until = now + 2600; const c = T2POP.cur; d.hidden = false; d.classList.remove('in'); void d.offsetWidth; d.classList.add('in');
  d.innerHTML = `<div class="tpic">${c.icon}</div><div><b>${esc(c.title)}</b>${c.sub ? `<span>${esc(c.sub)}</span>` : ''}</div>`;
}
const t2Icon = (k: string) => (typeof YARD_ITEMS !== 'undefined' && YARD_ITEMS.some((q: any) => q.kind === k)) ? itBuildIcon(k, 40) : ['hammer', 'axe', 'hoe', 'rod'].includes(k) ? itIcon(k, 40) : `<span class="spdot">${esc((GOODS[k] && GOODS[k].name || k).replace(/^seed_/, '')[0].toUpperCase())}</span>`;
// a new tool, seed handed over, things bought: a card each
// @ts-expect-error -- deliberate patch
const _t2Tool = itGiveTool; itGiveTool = function (n, kind) { const r = _t2Tool(n, kind); if (n && n.player && town && town.scenario === 'hamlet') tut2Popup(t2Icon(kind), 'New tool: ' + kind, kind === 'hoe' ? 'Walk into a plot and it is worked.' : kind === 'hammer' ? 'In build mode it takes things down.' : ''); return r; };
// @ts-expect-error -- deliberate patch
const _t2Stack = itGiveStack; itGiveStack = function (n, key, q) { const r = _t2Stack(n, key, q); if (n && n.player && q > 1 && town && town.scenario === 'hamlet') tut2Popup(t2Icon(key), `+${q} ${GOODS[key] ? GOODS[key].name : key}`, 'On your hotbar. Walk into a ploughed plot to sow one.'); return r; };
// @ts-expect-error -- deliberate patch
const _t2Buy = shopBuy; shopBuy = function (e, q) {
  const before = e.qty, coin = game.player.coin; _t2Buy(e, q); const got = before != null ? before - (e.qty || 0) : Math.round((coin - game.player.coin) / Math.max(1, e.price));
  if (got > 0 && !['hammer', 'axe', 'hoe', 'rod'].includes(e.item)) tut2Popup(t2Icon(e.item), `+${got} ${shopName(e.item).toLowerCase()}${got > 1 && !/s$/.test(e.item) ? 's' : ''}`, LF_NOUN[e.item] ? 'In your build kit (B).' : '');
  if (got > 0) addPop(game.player.x * TS + TS / 2, game.player.y * TS - 8, `-${got * e.price} coin`, '#e8b04a');
};
// @ts-expect-error -- deliberate patch
const _t2Sell = shopSell; shopSell = function (e, q) {
  const coin = game.player.coin; _t2Sell(e, q); const got = Math.round(game.player.coin - coin);
  if (got > 0) { addPop(game.player.x * TS + TS / 2, game.player.y * TS - 8, `+${got} coin`, '#f4d36a'); tut2Popup('<span class="spdot coin">¢</span>', `+${got} coin`, `${Math.floor(game.player.coin)} coin in your purse.`); }
};
// every harvest of yours rises from the plot; the first one ever has a card of its own
// @ts-expect-error -- deliberate patch
const _t2Harv2 = itHarvest; itHarvest = function (n, c) {
  const h = _t2Harv2(n, c);
  if (n && n.player && h && c) { addPop(c.x * TS + TS / 2, c.y * TS, `+${h.q} ${h.what}`, '#b9e29a'); if (!town.firstHarvest) { town.firstHarvest = true; tut2Popup(t2Icon(c.seed || 'turnip'), 'Your first harvest', 'Turnips. Paullus buys them.'); } }
  return h;
};
// rent coming in: a number over your head and a card
// @ts-expect-error -- deliberate patch
const _t2Rent = rentCollect; rentCollect = function () {
  const R = town && town.rent, t0 = R ? R.total : 0; const r = _t2Rent(); const R2 = town && town.rent, P = game.player;
  if (R2 && P && R2.total > t0) { addPop(P.x * TS + TS / 2, P.y * TS - 8, `+${R2.total - t0} rent`, '#f4d36a'); tut2Popup('<span class="spdot coin">¢</span>', `Rent: +${R2.total - t0} coin`, `${R2.today} of ${R2.due} due this morning.`); }
  return r;
};

/* ---------------- the controls card, until you have walked and walked into something ---------------- */
function tut2Keys() {
  const d = tut2Dom('tutkeys', 'tutkeys'); if (!d) return; const T2 = town && town.tut2, P = game.player;
  let show = false;
  if (T2 && !T2.done && P) { if (T2.walk0 == null) T2.walk0 = P.walked || 0; if (!T2.keysOk && T2.scene >= 1 && (P.walked || 0) - T2.walk0 >= 2 && (T2.scene > 1 || T2.step > 2)) T2.keysOk = true; show = !T2.keysOk && T2.scene >= 1; }
  if (d.hidden === !show) return; d.hidden = !show;
  d.innerHTML = '<b>WASD</b> or the <b>arrow keys</b> to move &nbsp;·&nbsp; walk <b>into</b> things to use them &nbsp;·&nbsp; walk into a person to talk';
}

/* ---------------- the arrow follows the work in order ---------------- */
/** the order a player works a set: the patch bottom-left first in a snake, a fence ring round from the corner nearest you */
function tut2Order(name: string): any[] {
  const T2 = town.tut2, tiles = tut2Tiles(name); if (!tiles.length) return tiles;
  const xs = tiles.map(t => t.x), ys = tiles.map(t => t.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (name === 'patch' || name === 'jfield') { const rows: any[] = []; for (let y = y1, k = 0; y >= y0; y--, k++) { const r = tiles.filter(t => t.y === y).sort((a, b) => a.x - b.x); rows.push(...(k % 2 ? r.reverse() : r)); } return rows; }
  if (name === 'yard') {   // round the ring, clockwise from the top-left corner, starting at the corner nearest you when you began
    const ring: any[] = []; for (let x = x0; x <= x1; x++) ring.push({ x, y: y0 }); for (let y = y0 + 1; y <= y1; y++) ring.push({ x: x1, y }); for (let x = x1 - 1; x >= x0; x--) ring.push({ x, y: y1 }); for (let y = y1 - 1; y > y0; y--) ring.push({ x: x0, y });
    if (T2.ringStart == null) { const P = game.player, cs = [0, (x1 - x0), (x1 - x0) + (y1 - y0), 2 * (x1 - x0) + (y1 - y0)]; T2.ringStart = cs.sort((a, b) => Math.hypot(ring[a].x - P.tx, ring[a].y - P.ty) - Math.hypot(ring[b].x - P.tx, ring[b].y - P.ty))[0]; }
    return ring.slice(T2.ringStart).concat(ring.slice(0, T2.ringStart));
  }
  return tiles;
}
// @ts-expect-error -- deliberate patch
const _t2Arrow = tut2ArrowAt; tut2ArrowAt = function () {
  const ui = town.tut2.ui, a = ui.arrow; if (!a || typeof a.to !== 'string' || tut2Who(a.to) || !a.done) return _t2Arrow();
  const P = game.player, done = TUT2_DONE[a.done], order = tut2Order(a.to), todo = order.filter((t: any) => !done(t.x, t.y)); if (!todo.length || !P) return null;
  const f = P.face || { dx: 0, dy: 1 }, front = todo.find((t: any) => t.x === P.tx + f.dx && t.y === P.ty + f.dy);   // (the one in front of you, if it needs doing)
  return front || todo[0];
};
/** an arrow at the edge of the screen when the target is off it */
function tut2EdgeArrow(c: any, now: number) {
  if (!tut2Active()) return; const a = tut2ArrowAt(); if (!a) return;
  const s = toScreen(a.x * TS + TS / 2, a.y * TS + TS / 2), m = 34, w = cam.cw, h = cam.ch;
  if (s.x >= m && s.y >= m && s.x <= w - m && s.y <= h - m) return;
  const cx = w / 2, cy = h / 2, dx = s.x - cx, dy = s.y - cy, k = Math.min((w / 2 - m) / Math.max(1e-6, Math.abs(dx)), (h / 2 - m) / Math.max(1e-6, Math.abs(dy)));
  const x = cx + dx * k, y = cy + dy * k, an = Math.atan2(dy, dx), pu = 1 + 0.12 * Math.sin(now / 200);
  c.save(); c.translate(x, y); c.rotate(an); c.scale(pu, pu); c.fillStyle = '#f4c542'; c.strokeStyle = 'rgba(30,20,0,.85)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(16, 0); c.lineTo(-8, -12); c.lineTo(-3, 0); c.lineTo(-8, 12); c.closePath(); c.fill(); c.stroke(); c.restore();
}
// @ts-expect-error -- deliberate patch
const _t2Bub = drawBubbles; drawBubbles = function (c, now) { _t2Bub(c, now); try { tut2EdgeArrow(c, now); } catch (e) {} };

/* ---------------- the shop panel and the build bar point at the button to press ---------------- */
/** the tutorial's purchase or sale is done (then the panel may close) */
function shopTutDone(): boolean {
  if (!tut2Active() || !town.tut2.stock) return true; const s = town.tut2.stock, P = game.player;
  if ((s.sell || []).length) return !(s.sell || []).some((e: any) => (P.inv[e.item] || 0) > 0);
  if ((s.buy || []).length) return (s.buy || []).every((e: any) => e.qty === 0);
  return true;
}
// @ts-expect-error -- deliberate patch
const _t2Close = shopClose; shopClose = function () { if (SHOP.open && !shopTutDone()) { tut2Flash(town.tut2.ui.strip || 'Finish here first.'); return; } return _t2Close(); };
// @ts-expect-error -- deliberate patch
const _t2SDraw = shopDraw; shopDraw = function () {
  _t2SDraw(); if (!tut2Active() || !SHOP.open) return; const d = document.getElementById('shoppanel'); if (!d) return;
  const x = d.querySelector('[data-spx]') as any;
  if (!shopTutDone()) { if (x) x.style.visibility = 'hidden'; const b = d.querySelector('.sptile .spbtns button:last-child:not([disabled])') || d.querySelector('.sptile .spbtns button:not([disabled])'); if (b) b.classList.add('tutglow'); }
  else if (x) x.classList.add('tutglow');
};
/** which build slot the step wants pressed next */
function tut2GlowSlot(): number {
  const T2 = town.tut2, P = game.player, sl = T2.slots || []; if (!sl.length) return -1;
  if (sl[0] === 'destroy') { const g = T2.at.gate, p = lfPropAt(g.x, g.y); if (p && p.kind === 'fence') return P.build && P.build.sel === 1 ? -1 : 0; return 1; }
  return 0;
}
// @ts-expect-error -- deliberate patch
const _t2Bar2 = itBuildBarHTML; itBuildBarHTML = function (n, face) {
  let h = _t2Bar2(n, face); if (!tut2Active()) return h;
  const g = tut2GlowSlot(); if (g >= 0) h = h.replace(`class="hbslot${g === 0 && (town.tut2.slots || [])[0] === 'destroy' ? '' : ' item'}" data-bslot="${g}"`, `class="hbslot${g === 0 && (town.tut2.slots || [])[0] === 'destroy' ? '' : ' item'} tutglow" data-bslot="${g}"`);
  if (/^Press B to let/.test(town.tut2.ui.strip || '')) h = h.replace('class="hbbadge"', 'class="hbbadge tutglow"');
  return h;
};
/* Junia, when you go to her while the bed waits */
// @ts-expect-error -- deliberate patch
const _t2Bump2 = tut2Bump; tut2Bump = function (o) { const T2 = town.tut2; if (T2 && T2.scene === 5 && o === tut2Who('junia') && !TUT2_DONE.bed(T2.at.jbed.x, T2.at.jbed.y)) return itBuildOn(game.player) ? 'On the marked place, I think. Then 1.' : "I think you press B. Don't ask me how I know."; return _t2Bump2(o); };

/* ---------------- the strip is big when it is about B, and the HUD pieces tick ---------------- */
// @ts-expect-error -- deliberate patch
const _t2Hud2 = tut2Hud; tut2Hud = function () {
  _t2Hud2(); if (typeof document === 'undefined' || !town) return; tut2PopTick(); tut2Keys();
  const s = document.getElementById('tutstrip'); if (s) s.classList.toggle('big', tut2Active() && /^Press B/.test(s.textContent || ''));
  const P = game.player; if (tut2Active() && P && P.build) { const sig = tut2GlowSlot() + '|' + (town.tut2.ui.strip || ''); if (sig !== (tut2Hud as any).sig) { (tut2Hud as any).sig = sig; itSync(true); } }
};
