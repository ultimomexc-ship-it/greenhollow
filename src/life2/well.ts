/* The wishing well (docs/wishing-well.md, step 1). In the build town the households stop paying rent: whenever they earn (sales, wages), a share of it is owed to the
   well, more the happier they are, and every so often they walk over and drop it in. The well keeps the coin for the town and you take it out to build with; nobody
   sees that, so nobody minds. People still tell you what they need when you talk to them: the well is only where the money is kept and counted.
   `town.wish` = { x, y (top left of its 3 x 3 tiles, `T.WELL`), coin, given, taken, log: [{ t, id, amt }] }. Art: `wishwell` in art/painters.ts, drawn standing up (YSORT). */

const WELL: any = { minShare: 0.08, share0: 0.15, share1: 0.5, owe: 2, keep: 10, spare: 0.5, hour: 8 };
const wellOn = (): boolean => !!(typeof town !== 'undefined' && town && town.wish && typeof yardOn === 'function' && yardOn());
const wellAt = (x: number, y: number): boolean => { const w = town && town.wish; return !!w && x >= w.x && x < w.x + 3 && y >= w.y && y < w.y + 3; };
/** how much of what they earn somebody puts in the well: a little when miserable, half when delighted */
function wellShare(n: any): number { const m = n.mood == null ? 60 : n.mood; return m < 30 ? WELL.minShare : WELL.share0 + (WELL.share1 - WELL.share0) * Math.min(1, (m - 30) / 60); }
/** put the well down near (cx, cy): a clear 3 x 3 patch with a tile of open ground round it, cleared of trees, rocks and bushes; the ring round it is paved */
function wellPlace(cx: number, cy: number, taken?: Set<number>): any {
  const ok = (x: number, y: number) => x >= 3 && y >= 3 && x < W - 3 && y < (town.h0 || H) - 3 && [T.GRASS, T.PATH, T.SAND, T.TREE, T.ROCK].includes(grid[y][x]) && roomAt[y][x] < 0 && !lfPropAt(x, y) && !(taken && taken.has(y * W + x))
    && !(town.markets || []).some((m: any) => (m.plaza || []).some((p: any) => p.x === x && p.y === y)) && !(town.stalls || []).some((s: any) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 2) && !tileOwner.get(y * W + x);
  for (let r = 3; r < 30; r++) for (let k = 0; k < 24; k++) {
    const a = k / 24 * 6.283, x0 = Math.round(cx + Math.cos(a) * r) - 1, y0 = Math.round(cy + Math.sin(a) * r) - 1; let fine = true;
    for (let j = -1; j <= 3 && fine; j++) for (let i = -1; i <= 3; i++) if (!ok(x0 + i, y0 + j)) { fine = false; break; }
    if (!fine) continue;
    for (let j = -1; j <= 3; j++) for (let i = -1; i <= 3; i++) { const x = x0 + i, y = y0 + j, key = y * W + x; if (taken) taken.add(key);
      if (town.nodeMap && town.nodeMap.has(key)) { const nd = town.nodeMap.get(key); town.nodes = town.nodes.filter((q: any) => q !== nd); town.nodeMap.delete(key); }
      setT(x, y, i >= 0 && i < 3 && j >= 0 && j < 3 ? T.WELL : T.PATH); }
    markDirty(x0 - 1, y0 - 1, 5, 5); town.gridV = (town.gridV || 0) + 1;
    town.wish = { x: x0, y: y0, coin: 0, given: 0, taken: 0, log: [] };
    if (typeof refreshReach === 'function') refreshReach();
    return town.wish;
  }
  return null;
}
/** where somebody stands to drop coin in: an open tile beside the well, the nearest to them */
function wellSpot(n: any): any {
  const w = town.wish; if (!w) return null; const c: any[] = [];
  for (let j = -1; j <= 3; j++) for (let i = -1; i <= 3; i++) { if (i >= 0 && i < 3 && j >= 0 && j < 3) continue; if ((i === -1 || i === 3) && (j === -1 || j === 3)) continue; const x = w.x + i, y = w.y + j; if (walkable(x, y) && !lfPropAt(x, y)) c.push({ x, y }); }
  c.sort((a, b) => Math.hypot(a.x - n.tx, a.y - n.ty) - Math.hypot(b.x - n.tx, b.y - n.ty));
  return c[0] || null;
}
/** drop what is owed into the well */
function wellGive(n: any): number {
  const w = town.wish; if (!w) return 0; const amt = Math.max(0, Math.min(Math.floor(n.wellOwe || 0), Math.floor(n.coin || 0))); if (!amt) return 0;
  n.coin -= amt; n.wellOwe = (n.wellOwe || 0) - amt; w.coin += amt; w.given += amt;
  w.log.unshift({ t: game.time, id: n.id, amt }); if (w.log.length > 30) w.log.length = 30;
  LIFE.emit('well_gave', n, { price: amt });
  if (typeof faceTo === 'function') faceTo(n, { x: w.x + 1, y: w.y + 1, tx: w.x + 1, ty: w.y + 1 });
  if (typeof jBurst === 'function' && game.player && lfDist(n, game.player) < 14) jBurst((w.x + 1.5) * TS, (w.y + 1.4) * TS, 10, 'sparks', ['#fff3a0', '#9ff6ff', '#f4c542']);
  if (SHOP.well) wellDraw();
  return amt;
}
/** take coin out of the well (the player: nobody sees it) */
function wellTake(q: number): number {
  const w = town.wish, P = game.player; if (!w || !P) return 0; const got = Math.max(0, Math.min(q, w.coin)); if (!got) return 0;
  w.coin -= got; w.taken += got; P.coin += got;
  if (typeof jsCoins === 'function') jsCoins(got);
  if (typeof jFly === 'function') for (let i = 0; i < Math.min(12, got); i++) jFly(P.x * TS + TS / 2 + (Math.random() - 0.5) * 60, P.y * TS - 10 - Math.random() * 30, 'coin', '#f4c542', i * 45);
  return got;
}
// what people earn: every payment a grown-up of a household receives (a sale, a stall's takings, a wage) owes the well a share of it
// @ts-expect-error -- deliberate patch
const _wellPay = pay; pay = function (from: any, to: any, amt: number) {
  _wellPay(from, to, amt);
  if (wellOn() && to && from && to !== from && !to.player && !to.dead && to.age >= 16 && !rentTrader(to) && amt > 0) to.wellOwe = (to.wellOwe || 0) + amt * wellShare(to);
};
// spare cash: each morning a grown-up with more than a few coins to hand means to drop part of the rest in (the same share as of earnings, times WELL.spare)
LF2.hourly.push((h: number) => {
  if (!wellOn() || h !== WELL.hour) return;
  for (const n of npcs) { if (n.dead || n.player || n.age < 16 || rentTrader(n)) continue; const spare = Math.floor(n.coin || 0) - WELL.keep; if (spare > 0) n.wellOwe = (n.wellOwe || 0) + spare * wellShare(n) * WELL.spare; }
});
/** the errand: somebody with a few coins owed walks to the well by day and drops them in */
function wellErrand(n: any) {
  if (!wellOn() || n.player || n.age < 16 || rentTrader(n) || (n.wellErr || 0) > game.time) return null;
  const hr = (game.time / 60) % 24; if (Math.floor(n.wellOwe || 0) < WELL.owe || n.coin < 1 || hr < 7 || hr > 19) return null;
  n.wellErr = game.time + 240;
  return [goS(wellSpot, 'Walking to the wishing well'), waitS(2, 'stand', 'Dropping coins in the well', { nopie: true, onEnd(nn: any) { wellGive(nn); } })];
}
LF2.dec.push(wellErrand);

// no rent where there is a well: the well takes its place
// @ts-expect-error -- deliberate patch
const _wellRent = rentCollect; rentCollect = function () { if (wellOn()) return; return _wellRent(); };
// @ts-expect-error -- deliberate patch
const _wellErr = rentErrand; rentErrand = function (n: any) { if (wellOn()) return null; return _wellErr(n); };
LF2.dec.splice(LF2.dec.indexOf(_wellErr), 1, (n: any) => rentErrand(n));
// @ts-expect-error -- deliberate patch
const _wellHUD = rentHUD; rentHUD = function () {
  if (!wellOn()) return _wellHUD(); const P = yardPlayer(); if (!P) return '';
  return `<span class="rentchip" title="Households put a share of what they earn in the wishing well; walk into the well to take it out.">${Math.floor(P.coin)} coin · well ${Math.floor(town.wish.coin)}</span>`;
};
// @ts-expect-error -- deliberate patch
const _wellCard = rentCardRow; rentCardRow = function (n: any) {
  const out = _wellCard(n); if (!wellOn() || n.player || n.age < 16 || rentTrader(n)) return out;
  const gave = (town.wish.log || []).filter((e: any) => e.id === n.id).reduce((s: number, e: any) => s + e.amt, 0);
  return out.replace(/<div class="vcrow"><span class="dim">Rent<\/span>.*?<\/div>/, `<div class="vcrow"><span class="dim">The well</span> ${esc(`gives ${Math.round(wellShare(n) * 100)}% of what they earn${gave ? ` · gave ${gave} lately` : ''} · has ${Math.floor(n.coin)} coin`)}</div>`);
};

/* ---- the well panel (the shop panel's frame and keys: W/S, D or Enter, A or Esc) ---- */
function wellOpen() { SHOP.open = true; SHOP.well = true; SHOP.m = null; SHOP.ki = null; SHOP.note = ''; wellDraw(); }
function wellDraw() {
  const d = tut2Dom('shoppanel', 'shoppanel'); if (!d) return; const w = town.wish, P = game.player; if (!SHOP.open || !SHOP.well || !w) { d.hidden = true; return; }
  d.hidden = false;
  const ago = (t: number) => { const m = Math.max(0, game.time - t); return m < 60 ? 'just now' : m < 1440 ? Math.floor(m / 60) + ' h ago' : Math.floor(m / 1440) + ' d ago'; };
  const log = (w.log || []).slice(0, 8).map((e: any) => { const n = byId(e.id); return `<li>${esc(n ? n.first + ' ' + (n.surname || '') : 'Somebody')} <span class="dim">dropped in ${e.amt} · ${ago(e.t)}</span></li>`; }).join('') || '<li class="dim">Nobody has dropped anything in yet.</li>';
  const ten = Math.min(10, w.coin);
  d.innerHTML = `<div class="sphead"><b>The Wishing Well</b><span>What the households drop in is kept here for the town.</span><em>${Math.floor(P.coin)} coin</em><button type="button" class="btn spx" data-spx="1" aria-label="Close">✕</button></div>`
    + `<div class="wlbig"><span class="wlcoin"></span><b>${Math.floor(w.coin)}</b> coin in the well</div>`
    + `<div class="spbtns wlbtns"><button type="button" class="btn" data-wt="${ten}" ${ten < 1 ? 'disabled' : ''}>Take ${ten || 10}</button><button type="button" class="btn primary" data-wt="${w.coin}" ${w.coin < 1 ? 'disabled' : ''}>Take all ${Math.floor(w.coin)}</button></div>`
    + `<div class="wlstats dim">Dropped in so far: ${w.given} · taken out: ${w.taken}</div><ul class="wllog">${log}</ul>`
    + `<div class="spnote">${esc(SHOP.note || 'People still tell you what they need when you talk to them.')}</div>`;
  d.querySelectorAll('[data-wt]').forEach((b: any) => b.addEventListener('click', () => { const got = wellTake(+b.dataset.wt); SHOP.note = got ? `You took ${got} coin. Nobody saw.` : 'The well is empty.'; wellDraw(); }));
  const x = d.querySelector('[data-spx]'); if (x) x.addEventListener('click', shopClose);
  shopKeyMark();
}
// @ts-expect-error -- deliberate patch
const _wellShopDraw = shopDraw; shopDraw = function () { if (SHOP.well) return wellDraw(); return _wellShopDraw(); };
// @ts-expect-error -- deliberate patch
const _wellShopClose = shopClose; shopClose = function () { SHOP.well = false; return _wellShopClose(); };

/* ---- drawn standing up, in depth order with people: whoever is behind it goes behind its roof ---- */
YSORT.push(function (c: any, now: number) {
  const w = town && town.wish; if (!w) return []; const v = gaView(); if (w.x + 3 < v.x0 - 1 || w.x > v.x1 + 1 || w.y + 3 < v.y0 - 2 || w.y - 2 > v.y1) return [];
  return [{ k: w.y + 2.9, f: () => { const it = (ART.BYID as any).wishwell; if (!it) return; c.drawImage(ART.frameOf(it, gaFrame(it, now, w.x + w.y)), w.x * TS, (w.y - 1) * TS, 3 * TS, 4 * TS); } }];
});
