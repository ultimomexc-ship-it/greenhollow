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
const _t2Tool = itGiveTool; itGiveTool = function (n, kind) { const r = _t2Tool(n, kind); if (n && n.player) itemCard(kind); return r; };
// @ts-expect-error -- deliberate patch
const _t2Stack = itGiveStack; itGiveStack = function (n, key, q) { const r = _t2Stack(n, key, q); if (n && n.player && q > 0) itemCard(key, q); return r; };
// @ts-expect-error -- deliberate patch
const _t2Buy = shopBuy; shopBuy = function (e, q) {
  const before = e.qty, coin = game.player.coin; _t2Buy(e, q); const got = before != null ? before - (e.qty || 0) : Math.round((coin - game.player.coin) / Math.max(1, e.price));
  if (got > 0 && !['hammer', 'axe', 'hoe', 'rod'].includes(e.item) && !e.item.startsWith('seed_')) { if (!itemCard(e.item, got)) tut2Popup(t2Icon(e.item), `+${got} ${shopName(e.item).toLowerCase()}`, LF_NOUN[e.item] ? 'In your build kit (B).' : ''); }
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
  const sd = (c && c.seed) || 'barley', h = _t2Harv2(n, c);
  if (n && n.player && h && c) { addPop(c.x * TS + TS / 2, c.y * TS, `+${h.q} ${h.what}`, '#b9e29a'); itemCard(IT_SEEDS[sd] ? IT_SEEDS[sd].yield : 'turnip'); }
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
const _t2Bub = drawBubbles; drawBubbles = function (c, now) {
  // while an item card is open, every bubble is held: its clock is pushed on by each frame the card is up, so nothing expires behind it
  const last = (drawBubbles as any).last || now; (drawBubbles as any).last = now;
  if (typeof ITEMCARD !== 'undefined' && ITEMCARD.open) { const dt = now - last; if (dt > 0 && dt < 1000) { for (const b of bubbles) { b.from += dt; b.until += dt; } if (typeof TUT2 !== 'undefined') TUT2.bubbleEnd += dt; } }
  _t2Bub(c, now); try { tut2EdgeArrow(c, now); } catch (e) {}
};

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
  SHOP.ki = null; shopKeyMark();
};
/** which build slot the step wants pressed next */
function tut2GlowSlot(): number {
  const T2 = town.tut2, P = game.player, sl = T2.slots || []; if (!sl.length) return -1;
  if (T2.ui && T2.ui.lesson && sl.includes('push')) return P.build && P.build.sel === 0 ? -1 : sl.indexOf('push');
  if (sl[0] === 'destroy') { const g = T2.at.gate, p = lfPropAt(g.x, g.y); if (p && p.kind === 'fence') return P.build && P.build.sel === 1 ? -1 : sl.indexOf('destroy'); return sl.indexOf('gate'); }
  if (sl[0] === 'push') return -1;
  return 0;
}
// @ts-expect-error -- deliberate patch
const _t2Bar2 = itBuildBarHTML; itBuildBarHTML = function (n, face) {
  let h = _t2Bar2(n, face); if (!tut2Active()) return h;
  const g = tut2GlowSlot(); if (g >= 0) h = h.replace(new RegExp('class="(hbslot[^"]*)" data-bslot="' + g + '"'), 'class="$1 tutglow" data-bslot="' + g + '"');
  if (/^Press B to let/.test(town.tut2.ui.strip || '')) h = h.replace('class="hbbadge"', 'class="hbbadge tutglow"');
  return h;
};
/* Junia, when you bump her while she sleeps */
// @ts-expect-error -- deliberate patch
const _t2Bump2 = tut2Bump; tut2Bump = function (o) { const T2 = town.tut2; if (T2 && o === tut2Who('junia') && o.pose === 'sleep') return 'Mm. Five more minutes.'; return _t2Bump2(o); };

/* ---------------- the strip is big when it is about B, and the HUD pieces tick ---------------- */
// @ts-expect-error -- deliberate patch
const _t2Hud2 = tut2Hud; tut2Hud = function () {
  _t2Hud2(); if (typeof document === 'undefined' || !town) return; tut2PopTick(); tut2Keys();
  const s = document.getElementById('tutstrip'); if (s) s.classList.toggle('big', tut2Active() && /^Press B/.test(s.textContent || ''));
  document.body.classList.toggle('tut2-seedglow', !!(tut2Active() && town.tut2.seedLesson));
  { const T2 = town.tut2, P = game.player;   // (the hammer step: the hammer is put in your hand when you come into build mode; you only learn to pick the gate)
    if (tut2Active() && T2.autoHammer && P && itBuildOn(P) && P.build.sel !== 1) { const g = T2.at.gate, pr = lfPropAt(g.x, g.y); if (pr && pr.kind === 'fence') { P.build.sel = 1; if (P.player) { P.player.act = null; P.player.lock = false; } itSync(true); } } }
  const P = game.player; if (tut2Active() && P && P.build) { const sig = tut2GlowSlot() + '|' + (town.tut2.ui.strip || ''); if (sig !== (tut2Hud as any).sig) { (tut2Hud as any).sig = sig; itSync(true); } }
};

/* ---------------- item cards: the first time you get a thing, a card with its picture and what it is for ----------------
   Once per kind of thing on an island (`town.itemSeen`), in the Hamlet; read it and close it (the button, Enter, Space or Esc). The game waits while it is open.
   Later gains of the same thing are a short toast or a number over your head. */
const ITEM_INFO: Record<string, [string, string]> = {
  hoe: ['Hoe', 'Walk into a plot and the hoe does the rest: raw ground is ploughed, ploughed ground is sown with the seed you hold, a ripe crop is pulled. Hold the direction to work along a row; you stop at the edge of the field.'],
  hammer: ['Hammer', 'For build mode (B). Walk into a fence, a wall, a door or anything you placed and it comes down. What you take down goes back into your build kit, so nothing is wasted.'],
  axe: ['Axe', 'Walk into a tree to fell it. The wood goes in your bag.'],
  rod: ['Fishing rod', 'Walk into the water\'s edge to fish.'],
  bed: ['Bed', 'Put it down in build mode (B). Whoever sleeps in it lives where it stands: a bed inside a fenced yard makes that yard their home.'],
  fence: ['Fence', 'Laid in build mode. Facing a fence, press its key again and the next goes on the end of the line. A closed ring of fence with a gate is a yard: a home, and land of its own. A closed ring stands like a wall.'],
  gate: ['Gate', 'Put a gate in a ring of fence and the ring becomes a yard. Anybody can walk through a gate; nobody walks through a fence.'],
  field: ['Field tile', 'Ploughed ground, ready to sow. Fields go inside a fenced yard, never on open ground. Whoever lives in the yard farms it.'],
  bwall: ['Wall block', 'Walls with a door, closed all round, make a room. A bed under a roof pays more rent.'],
  bwindow: ['Window', 'A wall block with glass. A window in a room adds to the rent.'],
  bdoor: ['Door', 'Every room needs one, and a way out to open ground.'],
  turnip: ['Turnips', 'Your first harvest. Paullus buys turnips at the stall: selling crops is how the island earns its coin.'],
  egg: ['Eggs', 'A hen inside a fenced yard lays one a day, on a free patch of grass. Walk over it to pick it up. Paullus buys eggs.'],
  grain: ['Barley', 'Grain. The staple: people eat it, and Paullus buys what is left over.']
};
function itemInfo(key: string): [string, string] | null {
  if (ITEM_INFO[key]) return ITEM_INFO[key];
  if (key.startsWith('seed_') && typeof IT_SEEDS !== 'undefined') { const sd = key.slice(5), S = IT_SEEDS[sd]; if (!S) return null; const nm = (GOODS[key] && GOODS[key].name) || sd + ' seed';
    return [nm[0].toUpperCase() + nm.slice(1), `One seed sows one ploughed plot. ${S.flower ? 'A flower: it blooms for weeks and pays a little rent where it grows near a bed.' : 'It grows into ' + ((GOODS[S.yield] && GOODS[S.yield].name) || S.yield) + ', to eat or to sell.'} Seeds sit on your hotbar (1-0); the one you hold is the one you sow.`]; }
  if (GOODS[key]) { const nm = GOODS[key].name; return [nm[0].toUpperCase() + nm.slice(1), 'In your bag (I). Paullus buys it at the stall.']; }
  return null;
}
const ITEMCARD: any = { open: false, q: [] };
/** show the card for a thing the first time it is had; true when a card is (or will be) shown */
function itemCard(key: string, qty?: number): boolean {
  if (!town || town.scenario !== 'hamlet' || typeof document === 'undefined' || (window as any).GH_NOCARDS) return false;
  const seen = town.itemSeen = town.itemSeen || {}; if (seen[key]) return false; const info = itemInfo(key); if (!info) return false;
  seen[key] = true; ITEMCARD.q.push({ key, qty: qty || 1, title: info[0], text: info[1] }); if (!ITEMCARD.open) itemCardNext(); return true;
}
function itemCardNext() {
  const d = tut2Dom('itemcard', 'itemcard'), v = tut2Dom('cardveil', 'cardveil'); if (!d) return; const c = ITEMCARD.q.shift();
  if (!c) { ITEMCARD.open = false; d.hidden = true; if (v) v.hidden = true; itemCardThaw(); return; }
  if (!ITEMCARD.open) ITEMCARD.since = performance.now(); if (v) v.hidden = false;
  ITEMCARD.open = true; d.hidden = false; if (typeof sndPick === 'function') try { sndPick(); } catch (e) {}
  d.innerHTML = `<div class="icpic">${t2Icon(c.key).replace(/width="\d+"/, 'width="72"').replace(/height="\d+"/, 'height="72"')}</div><div class="icbody"><div class="icnew">New${c.qty > 1 ? ' · ' + c.qty : ''}</div><b>${esc(c.title)}</b><p>${esc(c.text)}</p><button type="button" class="btn primary tutglow" data-icok="1">Got it</button></div>`;
  const b = d.querySelector('[data-icok]'); if (b) b.addEventListener('click', itemCardNext);
}
if (typeof window !== 'undefined') window.addEventListener('keydown', (e: any) => { if (!ITEMCARD.open) return; if (['Enter', ' ', 'Escape', 'd', 'D', 'a', 'A', 'e', 'E'].includes(e.key) || e.code === 'Space') { if (!e.repeat) itemCardNext(); } e.preventDefault(); e.stopImmediatePropagation(); }, true);

/** a card is a full freeze: when it closes, every bubble and the tutorial's own timers carry on from where they stopped */
function itemCardThaw() {
  const gap = performance.now() - (ITEMCARD.since || performance.now()); ITEMCARD.since = 0; if (gap <= 0) return;
}
/* the tutorial is never saved: a new island is saved once the first morning is over */
// @ts-expect-error -- deliberate patch
const _t2Save = isleSave; isleSave = function () { if (tut2Active()) return Promise.resolve(); return _t2Save.apply(this, arguments as any); };
