/* The first morning, part two: what the player sees and may do while the tutorial runs (the strip, the arrow, the marks, the hidden HUD and
   the locks), the shop panel (every Hamlet stall, the tutorial's own stock while it runs), and scenes 2 to 8 (docs/tutorial-script.md). */

/* ---------------- what is shown: the strip, the fade and the hidden HUD (DOM), the arrow and the marks (on the map) ---------------- */
function tut2Dom(id: string, cls: string): any {
  let d = document.getElementById(id); if (d) return d;
  const stage = document.querySelector('.stage'); if (!stage) return null;
  d = document.createElement('div'); d.id = id; d.className = cls; stage.appendChild(d); return d;
}
let tut2HudSig = '';
function tut2Hud() {
  if (typeof document === 'undefined' || !town) return;
  const on = tut2Active(), T2 = town.tut2, ui = on ? T2.ui : null, show = (on && T2.show) || {};
  const flash = ui && ui.flash && performance.now() < ui.flash.until ? ui.flash.text : null, strip = on ? (flash || ui.strip) : null;
  const sig = [on, strip, !!flash, show.tools, show.slots, ui && ui.fade].join('|'); if (sig === tut2HudSig) return; tut2HudSig = sig;
  const b = document.body.classList; b.toggle('tut2', on); b.toggle('tut2-notools', on && !show.tools); b.toggle('tut2-noslots', on && !show.slots);
  const s = tut2Dom('tutstrip', 'tutstrip'); if (s) { s.hidden = !strip; s.textContent = strip || ''; s.classList.toggle('flash', !!flash); }
  const f = tut2Dom('tutfade', 'tutfade'); if (f) f.style.opacity = String(on ? ui.fade || 0 : 0);
}
/** a set of tiles by name, as the scenes name them */
function tut2Tiles(name: any): any[] { if (!name) return []; if (Array.isArray(name)) return name; const v = town.tut2.at[name]; return Array.isArray(v) ? v : v ? [v] : []; }
const tut2Crop = (x: number, y: number) => town.crops.find((c: any) => c.x === x && c.y === y) || null;
/** is this tile finished, for what the step asks */
const TUT2_DONE: Record<string, (x: number, y: number) => boolean> = {
  ploughed: (x, y) => { const c = tut2Crop(x, y); return !!c && c.pl >= 1; },
  sown: (x, y) => { const c = tut2Crop(x, y); return !!c && !!c.st; },
  pulled: (x, y) => { const c = tut2Crop(x, y); return !c || !c.st; },
  fence: (x, y) => { const p = lfPropAt(x, y); return !!p && (p.kind === 'fence' || p.kind === 'gate'); },
  gate: (x, y) => { const p = lfPropAt(x, y); return !!p && p.kind === 'gate'; },
  bed: (x, y) => { const p = lfPropAt(x, y); return !!p && p.kind === 'bed'; },
  field: (x, y) => !!tut2Crop(x, y),
  gone: (x, y) => { const p = lfPropAt(x, y); return !p || p.kind === 'gate'; }
};
const tut2AllDone = (name: string, done: string) => tut2Tiles(name).every(t => TUT2_DONE[done](t.x, t.y));
function tut2ArrowAt(): any {
  const ui = town.tut2.ui, a = ui.arrow; if (!a) return null;
  if (typeof a.to === 'string' && tut2Who(a.to)) { const n = tut2Who(a.to); return { x: n.x, y: n.y, person: true }; }
  const tiles = tut2Tiles(a.to); const todo = a.done ? tiles.filter(t => !TUT2_DONE[a.done](t.x, t.y)) : tiles; const P = game.player; if (!todo.length || !P) return null;
  return todo.slice().sort((p, q) => Math.abs(p.x - P.tx) + Math.abs(p.y - P.ty) - (Math.abs(q.x - P.tx) + Math.abs(q.y - P.ty)))[0];
}
/** the marks and the arrow, drawn on the map (called from render after the guides) */
function drawTut2(c: any, now: number) {
  if (!tut2Active()) return; const ui = town.tut2.ui, pulse = 0.55 + 0.25 * Math.sin(now / 380);
  for (const m of ui.marks || []) for (const t of tut2Tiles(m.tiles)) {
    const ok = m.done ? TUT2_DONE[m.done](t.x, t.y) : false, px = t.x * TS, py = t.y * TS; c.save();
    c.globalAlpha = (m.faint ? 0.3 : 1) * (ok ? 0.5 : pulse); c.lineWidth = 2; c.setLineDash([5, 4]);
    c.strokeStyle = ok ? '#8bd05f' : m.color || '#e0a93b'; c.fillStyle = ok ? 'rgba(139,208,95,.22)' : m.color ? 'rgba(240,120,60,.2)' : 'rgba(224,169,59,.16)';
    c.fillRect(px + 2, py + 2, TS - 4, TS - 4); c.strokeRect(px + 2, py + 2, TS - 4, TS - 4);
    if (m.ghost && !ok) { c.globalAlpha = 0.45 * pulse; gaDraw(c, 'bed_head_up_5', px, py, now, 0); }
    c.restore();
  }
  const a = tut2ArrowAt(); if (!a) return;
  const bob = Math.sin(now / 260) * 4, big = ui.arrow && ui.arrow.big ? 1.5 : 1, x = a.x * TS + TS / 2, y = a.y * TS - (a.person ? 20 : 4) + bob;
  c.save(); c.fillStyle = '#f4c542'; c.strokeStyle = 'rgba(30,20,0,.8)'; c.lineWidth = 2; c.beginPath();
  c.moveTo(x, y); c.lineTo(x - 8 * big, y - 11 * big); c.lineTo(x - 3 * big, y - 11 * big); c.lineTo(x - 3 * big, y - 20 * big); c.lineTo(x + 3 * big, y - 20 * big); c.lineTo(x + 3 * big, y - 11 * big); c.lineTo(x + 8 * big, y - 11 * big); c.closePath(); c.fill(); c.stroke(); c.restore();
}
function tut2Flash(text: string) { if (!tut2Active()) return; town.tut2.ui.flash = { text, until: performance.now() + 1400 }; }

/* ---------------- the locks ---------------- */
const tut2Lock = (k: string): boolean => tut2Active() && !(town.tut2.locks || {})[k];   // (true = locked: everything starts locked)
// @ts-expect-error -- deliberate patch
const _t2Toggle = itBuildToggle; itBuildToggle = function (n, on) {
  const b = itBuildState(n), want = on == null ? !b.on : on;
  if (want && !b.on && tut2Lock('build')) return;   // (B does nothing until the tutorial lets it)
  return _t2Toggle(n, on);
};
// @ts-expect-error -- deliberate patch
const _t2Bag = itBag; itBag = function (open) { if (open && tut2Active()) return; return _t2Bag(open); };
// @ts-expect-error -- deliberate patch
const _t2Leave = yardLeaveCheck; yardLeaveCheck = function (n) { if (tut2Active()) return false; return _t2Leave(n); };
// @ts-expect-error -- deliberate patch
const _t2Push = lf2PushLine; lf2PushLine = function (n, x, y, dx, dy) { if (tut2Lock('push')) return null; return _t2Push(n, x, y, dx, dy); };
// @ts-expect-error -- deliberate patch
const _t2Fits = itFits; itFits = function (n, need) { if (need === 'hammer' && tut2Active() && !itBuildOn(n)) return false; return _t2Fits(n, need); };
/** in the tutorial the build bar holds only what the step allows (`town.tut2.slots`): 1, 2 ... in that order */
// @ts-expect-error -- deliberate patch
const _t2Select = itBuildSelect; itBuildSelect = function (n, i) {
  if (!tut2Active()) return _t2Select(n, i);
  const k = (town.tut2.slots || [])[i], b = itBuildState(n); if (!k) return;
  if (k === 'destroy') { b.sel = b.sel === 1 ? 0 : 1; const p = n.player; if (p) { p.act = null; p.lock = false; } itSync(true); return; }
  b.sel = 0; tut2Place(n, k);
};
// @ts-expect-error -- deliberate patch
const _t2Bar = itBuildBarHTML; itBuildBarHTML = function (n, face) {
  if (!tut2Active()) return _t2Bar(n, face); const b = itBuildState(n);
  const slots = (town.tut2.slots || []).map((k: string, i: number) => k === 'destroy'
    ? `<button type="button" class="hbslot${b.sel === 1 ? ' on' : ''}" data-bslot="${i}" title="Destroy"><em>${i + 1}</em><svg width="30" height="30" viewBox="0 0 38 38" aria-hidden="true">${IT_SVG.hammer}</svg><span class="hbcap">Destroy</span></button>`
    : `<button type="button" class="hbslot item" data-bslot="${i}" title="${esc(itBuildName(k))}"><em>${i + 1}</em>${itBuildIcon(k)}<u>${kitLabel(k)}</u><span class="hbcap">${esc(itBuildName(k))}</span></button>`).join('');
  return `<div class="hbbadge" title="Build mode (B)"><b>BUILD</b><span>B to leave</span></div><div class="hbslots">${slots}</div><div class="hbface">${face || ''}</div>`;
};
/** put one thing down in front of you, only on a marked tile */
function tut2Place(n: any, kind: string) {
  const T2 = town.tut2, f = lf2Front(n), ok = tut2Tiles(T2.only).some(t => t.x === f.x && t.y === f.y);
  if (!ok || lfPropAt(f.x, f.y) || (kind === 'field' && tut2Crop(f.x, f.y))) { tut2Flash(T2.onlyMsg || 'On the marked squares.'); return; }
  if (!kitHas(kind)) { kitOut(n, kind); return; }
  if (kind === 'field') { bldPlaceField(n); itSync(true); return; }
  const p: any = lfAddProp(kind, f.x, f.y); p.v = 5; p.rot = 0; bldQueue(p); kitTake(kind); sndPlace(); itSync(true);
}
/** the player's bumps the tutorial answers itself: the stall (the panel, always open in the Hamlet), the hammer on the wrong thing, bed before night */
LF2.pre.unshift({ player(n: any, p: any, fx: number, fy: number) {
  if (!town || town.scenario !== 'hamlet') return null;
  const T2 = town.tut2;
  if (grid[fy][fx] === T.STALL && !itBuildOn(n)) {
    const m = (town.stalls || []).map((s: any) => s.tiles && s.tiles.some((t: any) => t.x === fx && t.y === fy) && (s.owner && s.owner.shop || merchants.find((q: any) => q.post && Math.abs(q.post.x - fx) + Math.abs(q.post.y - fy) <= 1))).find(Boolean) || stallTrade(n, fx, fy);
    const tr = merchants.find((q: any) => q.def === HAMLET_TRADER_DEF), mm = m || tr;
    if (mm && (mm.def === HAMLET_TRADER_DEF || mm.serving || tut2Active())) return { key: 'tstall' + mm.n.id, min: 0.4, text: 'At the ' + mm.def.noun, tool: null, run() { shopOpen(mm); } };
    return null;
  }
  if (!T2 || T2.done) return null;
  const pr = lfPropAt(fx, fy);
  if (itBuildOn(n) && n.build.sel === 1) { const h = T2.hammerAt; if (!(h && h.x === fx && h.y === fy && pr)) { if (pr || grid[fy][fx] === T.WALL || grid[fy][fx] === T.DOOR) { tut2Flash('Only the marked fence, for now.'); return { msg: 'Thunk.' }; } } }
  if (pr && pr.kind === 'bed' && pr.owner === n && !T2.bedOk) return { msg: "Not yet. It's morning." };
  return null;
} });

/* ---------------- the shop panel ---------------- */
const SHOP: any = { open: false, m: null, tab: 'buy', line: '' };
const shopName = (g: string): string => LF_NOUN[g] ? LF_NOUN[g][0].toUpperCase() + LF_NOUN[g].slice(1) : g === 'hammer' ? 'Hammer' : GOODS[g] ? GOODS[g].name[0].toUpperCase() + GOODS[g].name.slice(1) : g;
const shopKitPrice = (m: any, k: string) => Math.max(1, Math.round((HAMLET_PRICES[k] || 1) * (m.def.disc || 1)));
/** what the panel offers: the tutorial's stock while it runs, else the stall's own */
function shopStock(m: any): any {
  const P = game.player;
  if (tut2Active() && town.tut2.stock) { const s = town.tut2.stock; return { buy: s.buy || [], sell: (s.sell || []).filter((e: any) => (P.inv[e.item] || 0) > 0), line: s.line || '' }; }
  const buy: any[] = [], sell: any[] = [];
  if (m.def === HAMLET_TRADER_DEF || m.def.kit) for (const k of (m.def.kit ? HAMLET_BUILD : hamletBuildKinds())) buy.push({ item: k, price: shopKitPrice(m, k), kit: true });
  for (const g of Object.keys(m.sells || {})) { if (!((m.stock[g] || 0) >= 1)) continue; if (g.startsWith('seed_') && !((m.def.range as string[]) || farmSeedRange()).includes(g.slice(5))) continue; buy.push({ item: g, price: sellPrice(m, g), qty: Math.floor(m.stock[g]) }); }
  for (const g of Object.keys(m.buys || {})) { const q = P.inv[g] || 0; if (q >= 1) sell.push({ item: g, price: buyPrice(m, g) }); }
  return { buy, sell, line: serviceSay('shop_greet_back', m.n, P, { item: '', qty: 1, shop: m.def.noun }) };
}
function shopOpen(m: any) {
  if (!m) return; const P = game.player;
  if (town.tut2 && town.tut2.done && !town.tut2.parting && m.def === HAMLET_TRADER_DEF) { town.tut2.parting = true; tut2Say(m.n, "That's the lot from me for now.", P); setTimeout(() => tut2Say(m.n, "Come and see me if you need anything. I'm always here. I never did get the hang of sleeping.", P), 2600); }
  const st = shopStock(m); SHOP.open = true; SHOP.m = m; SHOP.tab = st.sell.length && !st.buy.length ? 'sell' : 'buy'; SHOP.note = ''; shopDraw();
}
function shopClose() { SHOP.open = false; SHOP.m = null; const d = document.getElementById('shoppanel'); if (d) d.hidden = true; }
function shopBuy(e: any, q: number) {
  const m = SHOP.m, P = game.player; let got = 0;
  while (got < q && P.coin >= e.price && (e.qty == null || e.qty > 0)) {
    pay(P, m.n, e.price); got++; if (e.qty != null) e.qty--;
    if (e.item === 'hammer' || e.item === 'axe' || e.item === 'hoe' || e.item === 'rod') itGiveTool(P, e.item);
    else if (e.kit || LF_NOUN[e.item] && !GOODS[e.item]) { town.kit[e.item] = (town.kit[e.item] || 0) + 1; }
    else if (e.item.startsWith('seed_')) { itGiveStack(P, e.item, 1); if (m.stock[e.item] != null) m.stock[e.item]--; }
    else { P.inv[e.item] = (P.inv[e.item] || 0) + 1; if (m.stock[e.item] != null) m.stock[e.item]--; }
  }
  if (got && GOODS[e.item]) logTrade(P, m.n, e.item, got, got * e.price, 'buy');
  SHOP.note = got ? `Bought ${got} ${got > 1 ? shopName(e.item).toLowerCase() + (/s$/.test(e.item) ? '' : 's') : shopName(e.item).toLowerCase()} for ${got * e.price}.` : P.coin < e.price ? 'Not enough coin.' : 'None left.';
  if (got) sndPlace(); itSync(true); shopDraw();
}
function shopSell(e: any, q: number) {
  const m = SHOP.m, P = game.player; let got = 0, tot = 0;
  while (got < q && (P.inv[e.item] || 0) >= 1) { const p = tut2Active() ? e.price : buyPrice(m, e.item); if (p <= 0 || m.n.coin < p) break; pay(m.n, P, p); P.inv[e.item]--; m.stock[e.item] = (m.stock[e.item] || 0) + 1; tot += p; got++; }
  if (got) { logTrade(m.n, P, e.item, got, tot, 'sell'); sndPick(); }
  SHOP.note = got ? `Sold ${got} for ${tot}.` : 'He will not take any more.'; shopDraw();
}
function shopDraw() {
  const d = tut2Dom('shoppanel', 'shoppanel'); if (!d) return; const m = SHOP.m, P = game.player; if (!SHOP.open || !m) { d.hidden = true; return; }
  const st = shopStock(m), list = SHOP.tab === 'buy' ? st.buy : st.sell; d.hidden = false;
  const icon = (g: string) => (YARD_ITEMS.some((q: any) => q.kind === g) ? itBuildIcon(g, 30) : ['hammer', 'axe', 'hoe', 'rod'].includes(g) ? itIcon(g, 30) : `<span class="spdot">${esc((GOODS[g] && GOODS[g].name || g).replace(/^seed_/, '')[0].toUpperCase())}</span>`);
  const tiles = list.map((e: any, i: number) => {
    const n = SHOP.tab === 'buy' ? (e.qty != null ? Math.min(e.qty, Math.floor(P.coin / e.price)) : Math.floor(P.coin / e.price)) : (P.inv[e.item] || 0);
    const left = SHOP.tab === 'buy' ? (e.qty != null ? `${e.qty} left` : '') : `you have ${P.inv[e.item] || 0}`;
    const v = SHOP.tab === 'buy' ? 'Buy' : 'Sell', all = SHOP.tab === 'buy' && e.qty != null ? e.qty : n;
    return `<div class="sptile"><div class="spic">${icon(e.item)}</div><b>${esc(shopName(e.item))}</b><span class="dim">${e.price} each${left ? ' · ' + left : ''}</span>`
      + `<div class="spbtns"><button type="button" class="btn" data-sp="${i}" data-q="1" ${n < 1 ? 'disabled' : ''}>${v} 1</button>${all > 1 ? `<button type="button" class="btn primary" data-sp="${i}" data-q="${all}" ${n < 1 ? 'disabled' : ''}>${v} all ${all}</button>` : ''}</div></div>`;
  }).join('') || `<div class="dim spempty">${SHOP.tab === 'buy' ? 'Nothing for you yet.' : 'Nothing to sell.'}</div>`;
  d.innerHTML = `<div class="sphead"><b>${esc(m.def === HAMLET_TRADER_DEF ? 'The Trading Stall' : (m.def.noun[0].toUpperCase() + m.def.noun.slice(1)))}</b><span>${esc(m.n.first)}: ${esc(st.line)}</span><em>${Math.floor(P.coin)} coin</em><button type="button" class="btn spx" data-spx="1" aria-label="Close">✕</button></div>`
    + `<div class="seg sptabs"><button type="button" data-spt="buy" aria-pressed="${SHOP.tab === 'buy'}">Buy</button><button type="button" data-spt="sell" aria-pressed="${SHOP.tab === 'sell'}">Sell</button></div>`
    + `<div class="spgrid">${tiles}</div><div class="spnote">${esc(SHOP.note || '')}</div>`;
  d.querySelectorAll('[data-sp]').forEach((b: any) => b.addEventListener('click', () => { const e = list[+b.dataset.sp]; if (SHOP.tab === 'buy') shopBuy(e, +b.dataset.q); else shopSell(e, +b.dataset.q); }));
  d.querySelectorAll('[data-spt]').forEach((b: any) => b.addEventListener('click', () => { SHOP.tab = b.dataset.spt; SHOP.note = ''; shopDraw(); }));
  const x = d.querySelector('[data-spx]'); if (x) x.addEventListener('click', shopClose);
}
if (typeof window !== 'undefined') window.addEventListener('keydown', (e: any) => {
  if (!SHOP.open) return;
  if (e.key === 'Escape') { shopClose(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (e.key === 'Tab') { SHOP.tab = SHOP.tab === 'buy' ? 'sell' : 'buy'; shopDraw(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (e.key === 'Enter') { const st = shopStock(SHOP.m), l = SHOP.tab === 'buy' ? st.buy : st.sell; if (l[0]) { const q = e.shiftKey ? 999 : 1; if (SHOP.tab === 'buy') shopBuy(l[0], q); else shopSell(l[0], q); } e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (/^Arrow|^[wasdbi0-9 ]$/i.test(e.key)) { e.stopImmediatePropagation(); }   // (keys do not walk you away while the panel is open)
}, true);
/* the Hamlet's player uses the panel at every stall; the old conversational menu stays for the other islands */
// @ts-expect-error -- deliberate patch
const _t2Farm = farmShopDialog; farmShopDialog = function (m) { if (town && town.scenario === 'hamlet') { shopOpen(m); return; } return _t2Farm(m); };
/* tutorial patches on the game: one turnip per patch plot and no seed back; Junia's first rent is handed over at your door */
// @ts-expect-error -- deliberate patch
const _t2Harvest = itHarvest; itHarvest = function (n, c) {
  if (c && c.f === 'tut') { n.inv.turnip = (n.inv.turnip || 0) + 1; c.st = 0; c.seed = null; LIFE.emit('harvested', n, { item: 'turnip', qty: 1, crop: 'turnip' }); if (n.player) sndPick(); return { q: 1, what: 'turnips', back: 0 }; }
  return _t2Harvest(n, c);
};

/* ---------------- scenes 2 to 8 ---------------- */
const T2W = { x: 0 };   // (keeps a reference so the build keeps the helpers below)
const tset = (fn: (T2: any) => void): any => ({ do: 'set', fn });
const tstrip = (text?: string): any => ({ do: 'strip', text: text || null });
const tarrow = (to?: any, done?: string): any => ({ do: 'arrow', to: to || null, done });
const tmark = (tiles?: any, done?: string, extra?: any): any => Object.assign({ do: 'mark', tiles: tiles || null, done }, extra || {});
const twait = (until: (T2: any) => boolean, extra?: any): any => Object.assign({ do: 'wait', until }, extra || {});
const tpause = (s: number): any => ({ do: 'wait', until: () => TUT2.t >= s });
const tlock = (locks: any, slots?: string[], only?: string, onlyMsg?: string): any => tset(T2 => { T2.locks = Object.assign({}, locks); T2.slots = slots || []; T2.only = only || null; T2.onlyMsg = onlyMsg || null; });
const tstock = (buy: any[], sell: any[], line: string): any => tset(T2 => { T2.stock = { buy, sell, line }; });
const shopIsOpen = () => SHOP.open;
const buildOn = () => itBuildOn(game.player);
const nearestTo = (tiles: any[]) => { const P = game.player; return tiles.slice().sort((p, q) => (q.y - p.y) * 100 + Math.abs(p.x - P.tx) - Math.abs(q.x - P.tx))[0]; };   // (the bottom row first, then the nearest along it)
/** a free tile beside a tile, for the bot to stand on (the side nearest the player) */
function tut2Beside(t: any): any { const P = game.player; const c = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy })).filter(q => walkable(q.x, q.y) && !lfPropAt(q.x, q.y) && !(tileOwner.get(q.y * W + q.x) && tileOwner.get(q.y * W + q.x) !== P)); return c[0] || null; }   // (below first, then left, right, above: a fixed order so the bot does not dither)
/** the bot: work every tile of a set that is not done yet (stand beside it, walk into it) */
const botWork = (name: string, done: string) => (T2: any) => { const k = TUT2.bw; if (k && k.done === done && !TUT2_DONE[done](k.into.x, k.into.y)) return k; const todo = tut2Tiles(name).filter(t => !TUT2_DONE[done](t.x, t.y)); if (!todo.length) return null; const t = nearestTo(todo); TUT2.bw = { stand: tut2Beside(t), into: t, done }; return TUT2.bw; };   // (keeps one target until it is done)
const botStall = (T2: any) => ({ stand: T2.at.front, into: T2.at.keep });
/** the bot: put something on every square of Junia's ring, standing outside it (so it never walks into what it has put down) */
const botRing = (done: string, key: string) => (T2: any) => {
  if (!buildOn()) return { key: 'b' };
  const ring = tut2Tiles('yard'), o = T2.at.o, M = TUT2_MAP.yard, x0 = o.x + M.x, y0 = o.y + M.y, x1 = x0 + M.w - 1, y1 = y0 + M.h - 1;
  const t = ring.find(q => !TUT2_DONE[done](q.x, q.y)); if (!t) return null;
  const st = t.x === x0 ? { x: t.x - 1, y: t.y } : t.x === x1 ? { x: t.x + 1, y: t.y } : t.y === y0 ? { x: t.x, y: t.y - 1 } : { x: t.x, y: t.y + 1 };
  return { stand: st, faceTo: t, key };
};
/** the inside tiles of Junia's ring, and the ten round its edge in order */
function tut2YardInner(T2: any): any[] { const o = T2.at.o, M = TUT2_MAP.yard, r: any[] = []; for (let j = 1; j < M.h - 1; j++) for (let i = 1; i < M.w - 1; i++) r.push({ x: o.x + M.x + i, y: o.y + M.y + j }); return r; }
function tut2Lap(T2: any): any[] { const o = T2.at.o, M = TUT2_MAP.yard, x0 = o.x + M.x + 1, y0 = o.y + M.y + 1, x1 = x0 + M.w - 3, y1 = y0 + M.h - 3, r: any[] = [];
  for (let x = x0; x <= x1; x++) r.push({ x, y: y0 }); for (let y = y0 + 1; y <= y1; y++) r.push({ x: x1, y }); for (let x = x1 - 1; x >= x0; x--) r.push({ x, y: y1 }); for (let y = y1 - 1; y > y0; y--) r.push({ x: x0, y }); return r; }
const below = (name: string) => (T2: any) => { const t = T2.at[name]; return { x: t.x, y: t.y + 1 }; };

TUT2_SCENES.push(
  // Scene 2: plough and sow, then dusk
  [
    tset(T2 => { T2.show = Object.assign({}, T2.show, { tools: true }); }),
    tstrip('Walk into each square to plough it.'), tarrow('patch', 'ploughed'), tmark('patch', 'ploughed'),
    twait(T2 => tut2Tiles('patch').some(t => TUT2_DONE.ploughed(t.x, t.y)), { bot: botWork('patch', 'ploughed') }),
    tsay('paullus', "That's it."),
    twait(() => tut2AllDone('patch', 'ploughed'), { bot: botWork('patch', 'ploughed'), nudge: { after: 40, fn: (T2: any) => { if (T2.ui.arrow) T2.ui.arrow.big = true; } } }),
    tsay('paullus', 'Good.'), tsay('paullus', 'Now it wants seed.'),
    { do: 'walk', who: 'paullus', to: () => tut2Beside(tut2Pos('you')) || tut2Pos('watch') }, { do: 'face', who: 'paullus', to: 'you' },
    tsay('paullus', 'Nine. Turnips. Quick, and forgiving.'),
    tset(T2 => { const P = game.player; itGiveStack(P, 'seed_turnip', 9); const i = P.belt.indexOf('s:seed_turnip'); if (i >= 0) P.sel = i; T2.show = Object.assign({}, T2.show, { slots: true }); itSync(true); }),
    { do: 'walk', who: 'paullus', to: 'watch', async: true },
    tstrip('Walk into each square to sow it.'), tarrow('patch', 'sown'), tmark('patch', 'sown'),
    twait(() => tut2AllDone('patch', 'sown'), { bot: botWork('patch', 'sown') }),
    { do: 'face', who: 'paullus', dir: { dx: 1, dy: 0 } },
    tstrip(), tarrow(), tmark(),
    { do: 'time', at: 19 * 60, over: 4 },
    tsay('paullus', "That's a day."), tsay('paullus', "Go to bed. They'll be up by morning."), tsay('paullus', "I don't sleep. Never got the hang of it. I'll stand here and keep an eye on them."),
    tset(T2 => { T2.bedOk = true; T2.at.myBed = [T2.at.bed]; }),
    tarrow('myBed'), tstrip('Walk into your bed to sleep.'),
    twait(() => !!(game.player.player && game.player.player.sleeping), { nudge: { after: 40, say: ['paullus', "The house. The bed's in it."] }, bot: (T2: any) => ({ stand: T2.at.start, into: T2.at.bed }) })
  ],
  // Scene 3: night and morning
  [
    tstrip(), tarrow(), tset(T2 => { T2.input = false; }),
    { do: 'think', text: "I should probably wonder how I got here. I'll do it tomorrow." },
    { do: 'fade', to: 1, over: 1.5 },
    tset(T2 => {
      const P = game.player, R = tut2Who('paullus'), at = T2.at;
      game.time = game.ft = (Math.floor(game.time / 1440) + 1) * 1440 + 6 * 60 + 30;
      for (const t of at.patch) { const c = tut2Crop(t.x, t.y); if (c) { c.pl = 1; c.st = 1; c.seed = 'turnip'; c.t0 = game.time - 30 * 1440; markDirty(t.x, t.y, 1, 1); } }
      P.player.sleeping = false; P.player.wakeAt = 0; P.tx = P.x = at.start.x; P.ty = P.y = at.start.y; P.pose = 'stand'; P.face = { dx: 0, dy: 1 }; P.path = []; P.moving = false;
      if (R) { R.tx = R.x = at.watch.x; R.ty = R.y = at.watch.y; R.face = { dx: 1, dy: 0 }; R.pose = 'stand'; }
      // Junia, on the shore since dawn
      const Rr = rng(town.seed + 4242), J: any = arrMake(Rr, 31, { female: true, surname: pick(Rr, SURNAMES) });
      if (J.first !== 'Junia') { town.used && town.used.add && town.used.add('Junia'); J.first = 'Junia'; }
      J.x = J.tx = at.shore.x; J.y = J.ty = at.shore.y; J.face = { dx: 0, dy: 1 }; J.pose = 'stand'; J.coin = 8; J.inv.seed_turnip = 6; J.inv.grain = 4; J.back = 'was ironing a shirt, and then there was sand'; J.tutHold = true; J.newcomer = null;
      npcs.push(J); town.byId.set(J.id, J); T2.who.junia = J.id;
      for (const o of npcs) if (o !== J) { J.know[o.id] = 1; o.know[J.id] = 1; J.aff[o.id] = 6; o.aff[J.id] = 6; }
      rebuildOcc(); refreshReach();
    }),
    tpause(3), { do: 'fade', to: 0, over: 1.5 }, tset(T2 => { T2.input = true; }),
    tstrip('Go and look at the turnips.'), tarrow('patch'),
    twait(T2 => tut2NextTo(game.player, T2.at.patch), { bot: (T2: any) => ({ stand: { x: T2.at.patch[6].x, y: T2.at.patch[6].y + 1 } }) }),
    { do: 'face', who: 'paullus', to: 'you' }, tsay('paullus', 'There. Told you.')
  ],
  // Scene 4: harvest and the first sale
  [
    tstrip('Walk into the turnips to pull them.'), tarrow('patch', 'pulled'), tmark('patch', 'pulled'),
    twait(() => tut2AllDone('patch', 'pulled'), { bot: botWork('patch', 'pulled') }),
    tmark(), tsay('paullus', 'Bring them to the stall.'),
    tset(T2 => { const R = tut2Who('paullus'); if (R) R.coin = Math.max(R.coin || 0, 200); }),
    { do: 'walk', who: 'paullus', to: 'keep', async: true },
    tarrow('front'), tstrip('Take the turnips to the stall.'),
    tstock([], [{ item: 'turnip', price: 3 }], "Turnips. I'll take them."),
    twait(shopIsOpen, { bot: botStall }),
    tstrip('Sell all 9.'),
    twait(() => !(game.player.inv.turnip > 0), { bot: () => ({ shop: { tab: 'sell', i: 0, all: true } }) }),
    tstrip('Close the panel.'),
    twait(() => !shopIsOpen(), { bot: () => ({ shop: { close: true } }) }),
    tstrip(), tarrow(), tstock([], [], ''),
    { do: 'walk', who: 'paullus', to: 'keep' }, { do: 'face', who: 'paullus', to: 'you' },
    tsay('paullus', "That's the whole trade."), tsay('paullus', 'Grow it. Sell it. Build with it.')
  ],
  // Scene 5: the bed and the secret
  [
    { do: 'face', who: 'paullus', to: 'junia' }, tarrow('junia'),
    tsay('paullus', 'Somebody came ashore in the night.'), tsay('paullus', 'Nobody does it on purpose.'), tarrow(),
    { do: 'face', who: 'paullus', to: 'you' }, tsay('paullus', 'Found this on the beach.'),
    tset(() => { town.kit.bed = (town.kit.bed || 0) + 1; }),
    tsay('paullus', 'You know what to do with it. Or you will.'),
    tset(T2 => { T2.ui.marks = [{ tiles: 'jbed', done: 'bed', ghost: true }, { tiles: 'yard', faint: true }]; }),
    tarrow('jbed', 'bed'), tlock({ build: true }, ['bed'], 'jbed', 'On the marked place.'), tstrip('Press B to build.'),
    twait(buildOn, { bot: (T2: any) => ({ stand: below('jbed')(T2), key: buildOn() ? null : 'b' }) }),
    { do: 'face', who: 'paullus', to: 'you' },
    tsay('paullus', 'There. The world holds its breath while you build.'), tsay('paullus', 'Nobody sees it. They only find the thing afterwards.'), tsay('paullus', "I did this for a long time. Now it's you. That stays between us."),
    tstrip('Face the marked place and press 1 to put the bed down.'),
    twait(T2 => TUT2_DONE.bed(T2.at.jbed.x, T2.at.jbed.y), { bot: (T2: any) => ({ stand: below('jbed')(T2), face: 'up', key: '1' }) }),
    tarrow(), tstrip('Press B to let the world go on.'),
    twait(() => !buildOn(), { bot: () => ({ key: 'b' }) }),
    tlock({}), tstrip(), tmark()
  ],
  // Scene 6: Junia comes up from the shore
  [
    { do: 'walk', who: 'junia', to: below('jbed') }, { do: 'face', who: 'junia', dir: { dx: 0, dy: -1 } },
    tsay('junia', "There's a bed here and nobody in it."), tsay('junia', "I'm going to assume it's mine."),
    tset(T2 => { const J = tut2Who('junia'), b = lfPropAt(T2.at.jbed.x, T2.at.jbed.y); if (J && b) { if (b.owner && b.owner !== J && b.owner.bed === b) b.owner.bed = { owner: null }; b.owner = J; b.v = 3; J.bed = b; J.homeless = false; J.tx = J.x = b.x; J.ty = J.y = b.y; J.pose = 'sleep'; J.status = 'Lying on the bed, awake'; town.lfPV = (town.lfPV || 0) + 1; } }),
    twait(T2 => { const J = tut2Who('junia'), P = game.player; return Math.abs(J.tx - P.tx) + Math.abs(J.ty - P.ty) <= 4 || TUT2.t > 20; }),
    tsay('junia', 'I was ironing a shirt, and then there was sand.'), tsay('junia', "I've decided not to think about it."),
    tsay('junia', "I'd sleep better with something round me. A fence, say."),
    tmark('yard', 'fence'),
    tstock([{ item: 'fence', qty: 18, price: 1 }], [], 'Eighteen fences. Take all of them.'),
    tstrip('The trader sells fence.'), tarrow('front')
  ],
  // Scene 7: the fence without a gate, and the hammer
  [
    twait(shopIsOpen, { bot: botStall }), tstrip('Buy all 18.'),
    twait(() => (town.kit.fence || 0) >= 18, { bot: () => ({ shop: { tab: 'buy', i: 0, all: true } }) }),
    twait(() => !shopIsOpen(), { bot: () => ({ shop: { close: true } }) }),
    tarrow('yard', 'fence'), tlock({ build: true }, ['fence'], 'yard'), tstrip('Press B. Put a fence on every marked square.'),
    twait(T2 => tut2AllDone('yard', 'fence'), { bot: botRing('fence', '1') }),
    tarrow(), tstrip('Press B to let the world go on.'),
    twait(() => !buildOn(), { bot: () => ({ key: 'b' }) }),
    tlock({}), tstrip(), tmark(),
    tset(T2 => { const J = tut2Who('junia'); if (J) J.pose = 'stand'; }),
    { do: 'walk', who: 'junia', to: below('jbed') }, { do: 'face', who: 'junia', dir: { dx: 0, dy: 1 } },
    tsay('junia', 'Somebody has put a fence round my bed.'), tsay('junia', 'It is a very good fence.'),
    tset(T2 => { T2.lap = tut2Lap(T2); T2.lapI = 0; }),
    twait(T2 => { const J = tut2Who('junia'); if (!J) return true; if (J.moving) return false; if (T2.lapI >= T2.lap.length) return true; const t = T2.lap[T2.lapI++]; tut2Walk(J, t); return false; }),
    { do: 'walk', who: 'junia', to: below('jbed') }, { do: 'face', who: 'junia', to: 'you' },
    tsay('junia', 'I cannot find the way in. Or, I suppose, out.'),
    tset(T2 => { T2.ui.marks = [{ tiles: 'gate', done: 'gone', color: '#f0783c' }]; }),
    tstock([{ item: 'hammer', qty: 1, price: 4 }, { item: 'gate', qty: 1, price: 3 }], [], "A hammer and a gate. You'll want both."),
    tstrip('The trader has something new.'), tarrow('front'),
    twait(shopIsOpen, { bot: botStall }),
    twait(() => (game.player.items || []).some((i: any) => i.kind === 'hammer') && (town.kit.gate || 0) >= 1, { bot: () => ({ shop: { tab: 'buy', i: (game.player.items || []).some((i: any) => i.kind === 'hammer') ? 1 : 0 } }) }),
    twait(() => !shopIsOpen(), { bot: () => ({ shop: { close: true } }) }),
    tarrow('gate'), tset(T2 => { T2.hammerAt = T2.at.gate; }), tlock({ build: true }, ['destroy', 'gate'], 'gate'),
    tstrip('Press B. Knock out the marked fence with the hammer, then put the gate in the gap.'),
    twait(T2 => { const p = lfPropAt(T2.at.gate.x, T2.at.gate.y); return !p; }, { bot: (T2: any) => { if (!buildOn()) return { key: 'b' }; const st = { x: T2.at.gate.x - 1, y: T2.at.gate.y }; return game.player.build.sel === 1 ? { stand: st, into: T2.at.gate } : { stand: st, key: '1' }; } }),
    twait(T2 => TUT2_DONE.gate(T2.at.gate.x, T2.at.gate.y), { bot: (T2: any) => ({ stand: { x: T2.at.gate.x - 1, y: T2.at.gate.y }, faceTo: T2.at.gate, key: '2' }) }),
    tmark(), tset(T2 => { T2.hammerAt = null; }), tstrip('Press B to let the world go on.'),
    twait(() => !buildOn(), { bot: () => ({ key: 'b' }) }),
    tlock({}), tstrip(), tarrow(),
    tset(() => { yardScan(true); }),
    { do: 'walk', who: 'junia', to: (() => { const T2 = town.tut2; return { x: T2.at.gate.x - 1, y: T2.at.gate.y }; }) }, { do: 'face', who: 'junia', dir: { dx: 1, dy: 0 } },
    tsay('junia', 'A gate.'), tsay('junia', 'With a latch, even.'),
    { do: 'walk', who: 'junia', to: (() => { const T2 = town.tut2; return { x: T2.at.gate.x + 1, y: T2.at.gate.y }; }) },
    { do: 'walk', who: 'junia', to: (() => { const T2 = town.tut2; return { x: T2.at.gate.x - 1, y: T2.at.gate.y }; }) },
    { do: 'walk', who: 'junia', to: (() => { const T2 = town.tut2; return { x: T2.at.gate.x + 1, y: T2.at.gate.y }; }) }
  ],
  // Scene 8: her field, the end of the tutorial
  [
    { do: 'walk', who: 'junia', to: (() => tut2YardInner(town.tut2)[5]) }, { do: 'face', who: 'junia', dir: { dx: 0, dy: 1 } },
    tsay('junia', "It's a good yard."), tsay('junia', 'I could grow something in it. If there were somewhere to grow it.'),
    tmark('jfield', 'field'),
    tstock([{ item: 'field', qty: 6, price: 2 }], [], "Six. That'll feed one."),
    tstrip('The trader has field.'), tarrow('front'),
    twait(shopIsOpen, { bot: botStall }),
    twait(() => (town.kit.field || 0) >= 6, { bot: () => ({ shop: { tab: 'buy', i: 0, all: true } }) }),
    twait(() => !shopIsOpen(), { bot: () => ({ shop: { close: true } }) }),
    tarrow('jfield', 'field'), tlock({ build: true }, ['field'], 'jfield'), tstrip('Press B. Lay the field on the marked squares.'),
    twait(() => tut2AllDone('jfield', 'field'), { bot: (T2: any) => { if (!buildOn()) { const inn = tut2YardInner(T2)[0]; const P = game.player; return yardAtXY(P.tx, P.ty) ? { key: 'b' } : { stand: { x: inn.x, y: inn.y + 1 } }; } const todo = tut2Tiles('jfield').filter(t => !TUT2_DONE.field(t.x, t.y)); if (!todo.length) return null; const t = nearestTo(todo); return { stand: tut2Beside(t), faceTo: t, key: '1' }; } }),
    tstrip('Press B to let the world go on.'),
    twait(() => !buildOn(), { bot: () => ({ key: 'b' }) }),
    tlock({}), tstrip(), tarrow(), tmark(),
    { do: 'walk', who: 'junia', to: (() => { const t = town.tut2.at.jfield[0]; return { x: t.x - 1, y: t.y }; }) }, { do: 'face', who: 'junia', dir: { dx: 1, dy: 0 } },
    tsay('junia', 'Hm.'), tsay('junia', 'I have no idea why I have turnip seed.'),
    tset(T2 => { T2.sowI = 0; }),
    twait(T2 => {   // she sows her six tiles one after another, from the tile beside each
      const J = tut2Who('junia'); if (!J) return true; if (J.moving) return false;
      const f = T2.at.jfield; if (T2.sowI >= f.length) { J.pose = 'stand'; J.tool = null; return true; }
      const t = f[T2.sowI], st = { x: t.x, y: t.y - 1 <= T2.at.o.y + TUT2_MAP.yard.y ? t.y + 1 : t.y - 1 };
      const spot = walkable(t.x - 1, t.y) && !lfPropAt(t.x - 1, t.y) ? { x: t.x - 1, y: t.y } : st;
      if (J.tx !== t.x || J.ty !== t.y) { if (Math.abs(J.tx - t.x) + Math.abs(J.ty - t.y) !== 1) { tut2Walk(J, t); return false; } }
      J.face = { dx: Math.sign(t.x - J.tx), dy: Math.sign(t.y - J.ty) }; J.pose = 'work'; J.tool = 'hoe';
      if ((T2.sowT = (T2.sowT || 0) + 1) < 12) return false; T2.sowT = 0;
      const c = tut2Crop(t.x, t.y); if (c && !c.st) { c.st = 1; c.seed = 'turnip'; c.t0 = game.time; J.inv.seed_turnip = Math.max(0, (J.inv.seed_turnip || 0) - 1); markDirty(t.x, t.y, 1, 1); }
      T2.sowI++; void spot; return false;
    }),
    tset(T2 => tut2End(T2))
  ]
);
/** the end of the tutorial: the clock starts at noon, every lock and hidden thing goes, the people are their own again */
function tut2End(T2: any) {
  game.time = game.ft = Math.floor(game.time / 1440) * 1440 + 12 * 60;
  T2.done = true; T2.locks = {}; T2.slots = []; T2.stock = null; T2.ui = { strip: null, arrow: null, marks: [] }; T2.show = {};
  for (const n of npcs) { if (n.tutHold) { n.tutHold = false; n.plan = null; n.si = 0; n.stepStarted = false; if (n.pose === 'sleep') n.pose = 'stand'; } }
  T2.rentDay = Math.floor(game.time / 1440) + 1;
  yardScan(true); if (typeof yardHousing === 'function') yardHousing(); itSync(true); tut2Hud();
  chron('The clock started. Junia has a yard, a bed and six rows of turnips. Nobody saw who made any of it.', 'note');
  if (typeof isleSave === 'function') isleSave();
}
/** after the tutorial: Junia's first rent is handed over at your door, the next morning */
function tut2After() {
  const T2 = town && town.tut2; if (!T2 || !T2.done || T2.rent1 === 'done' || T2.rentDay == null) return;
  const J = tut2Who('junia'), P = game.player; if (!J || J.dead || !P) { T2.rent1 = 'done'; return; }
  const day = Math.floor(game.time / 1440), tod = game.time % 1440;
  if (!T2.rent1 && day >= T2.rentDay && tod >= 5 * 60 + 50) { T2.rent1 = 'walk'; J.tutRentSkip = true; J.tutHold = true; tut2Walk(J, T2.at.out); }
  if (T2.rent1 === 'walk') {
    if (!J.moving && (J.tx !== T2.at.out.x || J.ty !== T2.at.out.y)) tut2Walk(J, T2.at.out);
    const near = Math.abs(J.tx - P.tx) + Math.abs(J.ty - P.ty) <= 2;
    if ((near && !J.moving) || tod >= 9 * 60 || day > T2.rentDay) {
      T2.rent1 = 'done'; J.tutRentSkip = false; J.tutHold = false; J.plan = null; faceTo(J, P);
      tut2Say(J, 'For the yard. It seems fair.', P); setTimeout(() => tut2Say(J, "I don't know who to give it to, so I'm giving it to you.", P), 2400);
      const amt = Math.min(J.coin, rentOf(J).amt || 2); if (amt > 0) { pay(J, P, amt); const R = rentState(); R.today += amt; R.total += amt; J.rentLast = { t: game.time, amt, ok: true }; LIFE.emit('rent_paid', J, { price: amt }); }
      chron('Junia paid the first rent.', 'note');
    }
  }
}
