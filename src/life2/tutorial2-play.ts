/* The first morning, part two: what the player sees and may do while the tutorial runs (the strip, the arrow, the marks, the hidden HUD and
   the locks), the shop panel (every Hamlet stall, the tutorial's own stock while it runs), and scenes 2 to 8 (docs/tutorial-script.md). */

/* ---------------- what is shown: the strip, the fade and the hidden HUD (DOM), the arrow and the marks (on the map) ---------------- */
function tut2Dom(id: string, cls: string): any {
  let d = document.getElementById(id); if (d) return d;
  const stage = document.querySelector('.stage'); if (!stage) return null;
  d = document.createElement('div'); d.id = id; d.className = cls; stage.appendChild(d); return d;
}
let tut2HudSig = '';
/** {k:gate} in a line becomes the number of the build slot that holds it now (the bar's order can change: a Push slot is added once pushing is known) */
const tut2Keys2 = (t: any) => typeof t === 'string' ? t.replace(/\{k:(\w+)\}/g, (_: string, k: string) => String(((town.tut2.slots || []).indexOf(k) + 1) || '?')) : t;
function tut2Hud() {
  if (typeof document === 'undefined' || !town) return;
  const on = tut2Active(), T2 = town.tut2, ui = on ? T2.ui : null, show = (on && T2.show) || {};
  const flash = ui && ui.flash && performance.now() < ui.flash.until ? ui.flash.text : null, strip = on ? tut2Keys2(flash || ui.strip) : null;
  const sig = [on, strip, !!flash, show.tools, show.slots, ui && ui.fade].join('|'); if (sig === tut2HudSig) return; tut2HudSig = sig;
  const b = document.body.classList; b.toggle('tut2', on); b.toggle('tut2-notools', on && !show.tools); b.toggle('tut2-noslots', on && !show.slots);
  const s = tut2Dom('tutstrip', 'tutstrip'); if (s) { const changed = s.textContent !== (strip || ''); s.hidden = !strip; s.textContent = strip || ''; s.classList.toggle('flash', !!flash); if (changed && strip && !flash) { s.classList.remove('jpop'); void s.offsetWidth; s.classList.add('jpop'); } }   // (a new instruction pops in)
  const f = tut2Dom('tutfade', 'tutfade'); if (f) f.style.opacity = String(on ? ui.fade || 0 : 0);
}
/** a set of tiles by name, as the scenes name them */
function tut2Tiles(name: any): any[] { if (!name) return []; if (typeof name === 'function') { const v = name(town.tut2); return Array.isArray(v) ? v : v ? [v] : []; } if (Array.isArray(name)) return name; const v = town.tut2.at[name]; return Array.isArray(v) ? v : v ? [v] : []; }
const tut2Crop = (x: number, y: number) => town.crops.find((c: any) => c.x === x && c.y === y) || null;
/** is this tile finished, for what the step asks */
const TUT2_DONE: Record<string, (x: number, y: number) => boolean> = {
  ploughed: (x, y) => { const c = tut2Crop(x, y); return !!c && c.pl >= 1; },
  sown: (x, y) => { const c = tut2Crop(x, y); return !!c && !!c.st; },
  pulled: (x, y) => { const c = tut2Crop(x, y); return !c || !c.st; },
  fence: (x, y) => { const p = lfPropAt(x, y); return !!p && (p.kind === 'fence' || p.kind === 'gate'); },
  gate: (x, y) => { const p = lfPropAt(x, y); return !!p && p.kind === 'gate'; },
  bed: (x, y) => { const p = lfPropAt(x, y); return !!p && p.kind === 'bed'; },
  rock: (x, y) => { const p = lfPropAt(x, y); return !!p && p.kind === 'rock'; },
  field: (x, y) => !!tut2Crop(x, y),
  gone: (x, y) => { const p = lfPropAt(x, y); return !p || p.kind === 'gate'; }
};
const tut2AllDone = (name: string, done: string) => tut2Tiles(name).every(t => TUT2_DONE[done](t.x, t.y));
function tut2ArrowAt(): any {
  const ui = town.tut2.ui, a = ui.arrow; if (!a) return null;
  if (typeof a.to === 'string' && tut2Who(a.to)) { const n = tut2Who(a.to); return { x: n.x, y: n.y, person: true }; }
  if (a.to === 'front') { const r = tut2Who('paullus'); if (r) return { x: r.x, y: r.y, person: true }; }   // (go to the stall: the arrow floats over the trader's head, not on his tile)
  const tiles = tut2Tiles(a.to); const todo = a.done ? tiles.filter(t => !TUT2_DONE[a.done](t.x, t.y)) : tiles; const P = game.player; if (!todo.length || !P) return null;
  return todo.slice().sort((p, q) => Math.abs(p.x - P.tx) + Math.abs(p.y - P.ty) - (Math.abs(q.x - P.tx) + Math.abs(q.y - P.ty)))[0];
}
/** the marks and the arrow, drawn on the map (called from render after the guides) */
function drawTut2(c: any, now: number) {
  if (!tut2Active()) return; const ui = town.tut2.ui, pulse = 0.55 + 0.25 * Math.sin(now / 380);
  tut2DrawGhost(c, now);
  for (const m of ui.marks || []) for (const t of tut2Tiles(m.tiles)) {
    const ok = m.done ? TUT2_DONE[m.done](t.x, t.y) : false, px = t.x * TS, py = t.y * TS; c.save();
    c.globalAlpha = (m.faint ? 0.3 : 1) * (ok ? 0.5 : pulse); c.lineWidth = 2; c.setLineDash([5, 4]);
    c.strokeStyle = ok ? '#8bd05f' : m.color || '#e0a93b'; c.fillStyle = ok ? 'rgba(139,208,95,.22)' : m.color ? 'rgba(240,120,60,.2)' : 'rgba(224,169,59,.16)';
    c.fillRect(px + 2, py + 2, TS - 4, TS - 4); c.strokeRect(px + 2, py + 2, TS - 4, TS - 4);
    if (m.ghost && !ok) { c.globalAlpha = 0.45 * pulse; gaDraw(c, 'bed_head_up_5', px, py, now, 0); }
    c.restore();
  }
  const a = tut2ArrowAt(); if (!a) return;
  const bob = Math.sin(now / 260) * 4, big = ui.arrow && ui.arrow.big ? 1.5 : 1, x = a.x * TS + TS / 2, y = a.y * TS - (a.person ? 18 : 4) + bob;
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
  const k = (town.tut2.slots || [])[i], b = itBuildState(n); if (!k) return; if (k !== 'push' && k !== 'destroy') b.lastKind = k;
  if (k === 'push') { b.sel = 0; const p = n.player; if (p) { p.act = null; p.lock = false; } itSync(true); return; }   // (the hand: walk into a thing to push it)
  if (k === 'destroy') { b.sel = b.sel === 1 ? 0 : 1; const p = n.player; if (p) { p.act = null; p.lock = false; } itSync(true); return; }
  b.sel = 0; if (k === 'fence' && town.tut2.fenceFree) {   // (fences go down the normal way: facing a fence, the next goes on the end of the row; but only on the marked squares)
    const at = bldPlaceSpot(n, 'fence'); if (!at) { tut2Flash('The row ends here. Stand where the shadow stands.'); return; }
    if (!tut2Tiles(town.tut2.only).some(t => t.x === at.x && t.y === at.y)) { tut2Flash('That side is done. Stand where the shadow stands.'); return; }
    if (bldPlaceFront(n, 'fence')) itSync(true); return; }
  tut2Place(n, k);
};
// @ts-expect-error -- deliberate patch
const _t2Bar = itBuildBarHTML; itBuildBarHTML = function (n, face) {
  if (!tut2Active()) return _t2Bar(n, face); const b = itBuildState(n);
  const slots = (town.tut2.slots || []).map((k: string, i: number) => k === 'push'
    ? `<button type="button" class="hbslot${b.sel === 0 ? ' on' : ''}" data-bslot="${i}" title="Push"><em>${i + 1}</em><svg width="30" height="30" viewBox="0 0 38 38" aria-hidden="true">${IT_SVG.push}</svg><span class="hbcap">Push</span></button>`
    : k === 'destroy'
    ? `<button type="button" class="hbslot${b.sel === 1 ? ' on' : ''}" data-bslot="${i}" title="Destroy"><em>${i + 1}</em><svg width="30" height="30" viewBox="0 0 38 38" aria-hidden="true">${IT_SVG.hammer}</svg><span class="hbcap">Destroy</span></button>`
    : `<button type="button" class="hbslot item" data-bslot="${i}" title="${esc(itBuildName(k))}"><em>${i + 1}</em>${itBuildIcon(k)}<u>${kitLabel(k)}</u><span class="hbcap">${esc(itBuildName(k))}</span></button>`).join('');
  return `<button type="button" class="hbbadge" data-bleave="1" title="Leave build mode (B)"><b>BUILD</b><span>B to leave</span></button><div class="hbslots">${slots}</div><div class="hbface">${face || ''}</div>`;
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
  if (grid[fy][fx] === T.STALL && !itBuildOn(n)) return {};   // (the counter is just a counter: you buy from the keeper, by walking into them)
  if (false) {
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
  shopKeyMark();
}
/** the panel's buttons in key order (tabs, then each tile's buttons, then close), and the marked one */
function shopKeyList(): any[] { const d = document.getElementById('shoppanel'); if (!d) return []; return [...d.querySelectorAll('button')].filter((b: any) => !b.disabled && b.offsetParent !== null && b.style.visibility !== 'hidden'); }
function shopKeyMark() { const L = shopKeyList(); if (!L.length) return; if (SHOP.ki == null || SHOP.ki >= L.length) { const g = L.findIndex((b: any) => b.classList.contains('tutglow')), f = L.findIndex((b: any) => b.dataset && b.dataset.sp != null); SHOP.ki = g >= 0 ? g : f >= 0 ? f : 0; } L.forEach((b: any, i: number) => b.classList.toggle('kf', i === SHOP.ki)); }
if (typeof window !== 'undefined') window.addEventListener('keydown', (e: any) => {
  if (!SHOP.open || (typeof ITEMCARD !== 'undefined' && ITEMCARD.open)) return;   // (an item card on top takes the keys first)
  // WASD: W and S move between the buttons, D (or Enter, Space) presses the one marked, A (or Esc) closes; Tab swaps Buy and Sell
  { const k = (e.key || '').toLowerCase(), L = shopKeyList();
    if (['w', 's', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) && L.length) { const i = SHOP.ki == null ? -1 : SHOP.ki; const dn = k === 's' || k === 'arrowdown' || k === 'arrowright'; SHOP.ki = i < 0 ? 0 : (i + (dn ? 1 : -1) + L.length) % L.length; shopKeyMark(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if ((k === 'd' || k === 'enter' || k === ' ') && !e.repeat) { const b = L[SHOP.ki == null ? 0 : SHOP.ki]; if (b) (b as any).click(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (k === 'a' && !e.repeat) { shopClose(); e.preventDefault(); e.stopImmediatePropagation(); return; } }
  if (e.key === 'Escape') { shopClose(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (e.key === 'Tab') { SHOP.tab = SHOP.tab === 'buy' ? 'sell' : 'buy'; shopDraw(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (e.key === 'Enter') { const st = shopStock(SHOP.m), l = SHOP.tab === 'buy' ? st.buy : st.sell; if (l[0]) { const q = e.shiftKey ? 999 : 1; if (SHOP.tab === 'buy') shopBuy(l[0], q); else shopSell(l[0], q); } e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (/^Arrow|^[wasdbi0-9 ]$/i.test(e.key)) { e.stopImmediatePropagation(); }   // (keys do not walk you away while the panel is open)
}, true);
/* the Hamlet's player uses the panel at every stall; the old conversational menu stays for the other islands */
// @ts-expect-error -- deliberate patch
const _t2Farm = farmShopDialog; farmShopDialog = function (m) { if (town && town.scenario === 'hamlet' && !(window as any).GH_OLDSHOP) { shopOpen(m); return; } return _t2Farm(m); };   // (GH_OLDSHOP: the older Hamlet tests drive the conversational menu)
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
const tlock = (locks: any, slots?: string[], only?: string, onlyMsg?: string): any => tset(T2 => { T2.locks = Object.assign({}, locks, T2.pushTaught ? { push: true } : {}); T2.baseSlots = slots || []; T2.slots = slots || []; T2.only = only || null; T2.onlyMsg = onlyMsg || null; });
const tstock = (buy: any[], sell: any[], line: string): any => tset(T2 => { T2.stock = { buy, sell, line }; });
const shopIsOpen = () => SHOP.open;
const buildOn = () => itBuildOn(game.player);
const nearestTo = (tiles: any[]) => { const P = game.player; return tiles.slice().sort((p, q) => (q.y - p.y) * 100 + Math.abs(p.x - P.tx) - Math.abs(q.x - P.tx))[0]; };   // (the bottom row first, then the nearest along it)
/** a free tile beside a tile, for the bot to stand on (the side nearest the player) */
function tut2Beside(t: any): any { const P = game.player; const c = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy })).filter(q => walkable(q.x, q.y) && !lfPropAt(q.x, q.y) && !(tileOwner.get(q.y * W + q.x) && tileOwner.get(q.y * W + q.x) !== P)); return c[0] || null; }   // (below first, then left, right, above: a fixed order so the bot does not dither)
/** the bot: work every tile of a set that is not done yet (stand beside it, walk into it) */
const botWork = (name: string, done: string) => (T2: any) => { const k = TUT2.bw; if (k && k.done === done && !TUT2_DONE[done](k.into.x, k.into.y)) return k; const todo = tut2Tiles(name).filter(t => !TUT2_DONE[done](t.x, t.y)); if (!todo.length) return null; const t = nearestTo(todo); TUT2.bw = { stand: tut2Beside(t), into: t, done }; return TUT2.bw; };   // (keeps one target until it is done)
const botStall = (T2: any) => ({ stand: T2.at.front, into: T2.at.keep });
/** Junia's ring as four rows, each built from one spot outside it by pressing again and again (the first fence in front, every next one on the end
   of the row): the top from its west end looking east, the east side from above its corner looking south, the bottom from its east end looking
   west, the west side from below its corner looking north. The shadow stands at the first row that is not finished. */
function tut2FenceRows(T2: any): any[] {
  const o = T2.at.o, M = TUT2_MAP.yard, x0 = o.x + M.x, y0 = o.y + M.y, x1 = x0 + M.w - 1, y1 = y0 + M.h - 1, run = (n: number, f: (i: number) => any) => Array.from({ length: n }, (_, i) => f(i));
  return [
    { at: { x: x0 - 1, y: y0 }, face: { dx: 1, dy: 0 }, tiles: run(x1 - x0 + 1, i => ({ x: x0 + i, y: y0 })) },
    { at: { x: x1, y: y0 - 1 }, face: { dx: 0, dy: 1 }, tiles: run(y1 - y0, i => ({ x: x1, y: y0 + 1 + i })) },
    { at: { x: x1 + 1, y: y1 }, face: { dx: -1, dy: 0 }, tiles: run(x1 - x0, i => ({ x: x1 - 1 - i, y: y1 })) },
    { at: { x: x0, y: y1 + 1 }, face: { dx: 0, dy: -1 }, tiles: run(y1 - y0 - 1, i => ({ x: x0, y: y1 - 1 - i })) }];
}
const tut2FenceRow = (T2: any) => tut2FenceRows(T2).find(r => r.tiles.some((t: any) => !TUT2_DONE.fence(t.x, t.y))) || null;
/** the bot builds the ring the way the shadow shows: from each row's spot, pressing 1 until the row is done */
const botRows = (T2: any) => { if (!buildOn()) return { key: 'b' }; const r = tut2FenceRow(T2); if (!r) return null; return { stand: r.at, faceTo: { x: r.at.x + r.face.dx, y: r.at.y + r.face.dy }, key: '1' }; };
/** where to stand: a greyed-out shadow of you on that tile, facing the right way (T2.ui.ghost: { at, face }, or 'fenceRow' for the next row of the ring); it is hidden while you stand there facing that way */
function tut2DrawGhost(c: any, now: number) {
  const T2 = town.tut2, g0 = T2 && T2.ui && T2.ui.ghost, P = game.player; if (!g0 || !P) return;
  const g = g0 === 'fenceRow' ? tut2FenceRow(T2) : typeof g0 === 'function' ? g0(T2) : g0; if (!g || !g.at) return;
  if (P.tx === g.at.x && P.ty === g.at.y && P.face && P.face.dx === g.face.dx && P.face.dy === g.face.dy) return;
  const sp = Object.assign({}, gaSpec(P, now), { face: g.face, pose: 'stand', moving: false, tool: null, hold: null, wave: false });
  c.save(); c.globalAlpha = 0.42 + 0.12 * Math.sin(now / 380); try { c.filter = 'grayscale(1) brightness(1.25)'; } catch (e) { /* (no canvas filters: just faded) */ }
  try { ART.drawDoll(c, sp, g.at.x * TS, g.at.y * TS, 1, 0); } catch (e) { /* (never let the shadow stop the frame) */ }
  c.restore();
}
/** the inside tiles of Junia's ring, and the ten round its edge in order */
function tut2YardInner(T2: any): any[] { const o = T2.at.o, M = TUT2_MAP.yard, r: any[] = []; for (let j = 1; j < M.h - 1; j++) for (let i = 1; i < M.w - 1; i++) r.push({ x: o.x + M.x + i, y: o.y + M.y + j }); return r; }
function tut2Lap(T2: any): any[] { const o = T2.at.o, M = TUT2_MAP.yard, x0 = o.x + M.x + 1, y0 = o.y + M.y + 1, x1 = x0 + M.w - 3, y1 = y0 + M.h - 3, r: any[] = [];
  for (let x = x0; x <= x1; x++) r.push({ x, y: y0 }); for (let y = y0 + 1; y <= y1; y++) r.push({ x: x1, y }); for (let x = x1 - 1; x >= x0; x--) r.push({ x, y: y1 }); for (let y = y1 - 1; y > y0; y--) r.push({ x: x0, y }); return r; }
/* ---- pushing Junia: she washes up in the night, asleep in her own bed, on the customer's square in front of Paullus's stall. A grove of three
   trees stands nearby with one side open and a rock two tiles off. You push her bed into the grove and the rock into its opening (the shop opens and
   pays better for it); later she goes back to sleep there and you push her, bed and all, out of the grove (a swap: it cannot go back) and into her
   fenced ring through the gap left for her, then close it. Every push is checked when the grove is laid out (`tut2BoxPlan`, a small Sokoban solver
   for one thing at a time), and the same solver tells the shadow (`T2.ui.ghost`) and the bot where to stand next, so it never fails. ---- */
const TUT2_DIRS = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
/** can a loose thing stand here (for planning a push) */
function tut2BoxFree(x: number, y: number, extra?: Set<number>): boolean {
  if (!grid[y] || grid[y][x] == null || (extra && extra.has(y * W + x))) return false;
  const g = grid[y][x], who = tileOwner.get(y * W + x); if (!walkable(x, y) || g === T.WATER || g === T.CROP || roomAt[y][x] >= 0 || lfPropAt(x, y) || (who && who !== game.player)) return false;   // (you step out of the way as you push)
  return !(typeof pushFireAt === 'function' && pushFireAt(x, y));
}
/** can the player walk here (for planning) */
function tut2WalkFree(x: number, y: number, extra?: Set<number>): boolean {
  if (!grid[y] || grid[y][x] == null || (extra && extra.has(y * W + x))) return false;
  if (!walkable(x, y)) return false; const p = lfPropAt(x, y); if (p && p.kind !== 'gate' && p.kind !== 'bed') return false;
  const o = tileOwner.get(y * W + x); return !o || o === game.player || o.pose === 'sleep';
}
/** a plan for pushing one thing from `box` to the goal (a tile, or a test), the player starting at `pl`: the pushes in order [{ x, y, dx, dy }] (where the
    thing is before each push and which way it goes), or null. `extra` are tiles to treat as blocked (things not placed yet) */
function tut2BoxPlan(box: any, pl: any, goal: any, extra?: Set<number>, ignore?: any): any[] | null {
  const isGoal = typeof goal === 'function' ? goal : (x: number, y: number) => x === goal.x && y === goal.y;
  const gx = typeof goal === 'function' ? box.x : goal.x, gy = typeof goal === 'function' ? box.y : goal.y, M = 8;
  const x0 = Math.min(box.x, gx, pl.x) - M, x1 = Math.max(box.x, gx, pl.x) + M, y0 = Math.min(box.y, gy, pl.y) - M, y1 = Math.max(box.y, gy, pl.y) + M;
  const inR = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const ig = (x: number, y: number) => !!ignore && ignore.x === x && ignore.y === y;   // (the thing being planned, where it stands now, does not block itself)
  const walk = (x: number, y: number) => inR(x, y) && (ig(x, y) || tut2WalkFree(x, y, extra)), canBox = (x: number, y: number) => inR(x, y) && (ig(x, y) || tut2BoxFree(x, y, extra));
  const reach = (bx: number, by: number, px: number, py: number) => { const seen = new Set<number>([py * W + px]), q = [[px, py]]; let mn = py * W + px;
    for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; for (const d of TUT2_DIRS) { const nx = x + d.dx, ny = y + d.dy, k = ny * W + nx; if (seen.has(k) || (nx === bx && ny === by) || !walk(nx, ny)) continue; seen.add(k); if (k < mn) mn = k; q.push([nx, ny]); } }
    return { seen, mn }; };
  if (isGoal(box.x, box.y)) return [];
  const r0 = reach(box.x, box.y, pl.x, pl.y), start = { bx: box.x, by: box.y, px: pl.x, py: pl.y, path: [] as any[] }, vis = new Set<string>([box.x + ',' + box.y + ',' + r0.mn]);
  const q: any[] = [start];
  for (let h = 0; h < q.length && h < 6000; h++) {
    const s0 = q[h], r = reach(s0.bx, s0.by, s0.px, s0.py);
    for (const d of TUT2_DIRS) {
      const sx = s0.bx - d.dx, sy = s0.by - d.dy, nx = s0.bx + d.dx, ny = s0.by + d.dy;
      if (!r.seen.has(sy * W + sx) || !canBox(nx, ny)) continue;
      const path = s0.path.concat([{ x: s0.bx, y: s0.by, dx: d.dx, dy: d.dy }]);
      if (isGoal(nx, ny)) return path;
      const r2 = reach(nx, ny, s0.bx, s0.by), key = nx + ',' + ny + ',' + r2.mn; if (vis.has(key)) continue; vis.add(key);
      q.push({ bx: nx, by: ny, px: s0.bx, py: s0.by, path });
    }
  }
  return null;
}
/** the next push of a plan as a shadow and a bot hint: where to stand, which way to face, what to walk into */
function tut2NextPush(box: any, goal: any, extra?: Set<number>): any {
  if (!box) return null; const P = game.player; const cur = P.moving && P.path && P.path.length ? P.path[P.path.length - 1] : { x: P.tx, y: P.ty };
  const key = box.x + ',' + box.y + ':' + cur.x + ',' + cur.y + ':' + (typeof goal === 'function' ? 'f' : goal.x + ',' + goal.y) + ':' + (town.lfPV || 0);
  const C = TUT2_PLAN; if (C.key !== key) { C.key = key; C.plan = tut2BoxPlan(box, cur, goal, extra, box); }
  const p = C.plan; if (!p || !p.length) return null; const s = p[0];
  return { stand: { x: s.x - s.dx, y: s.y - s.dy }, face: { dx: s.dx, dy: s.dy }, into: { x: s.x, y: s.y } };
}
const TUT2_PLAN: any = { key: '', plan: null };
const tut2JBed = (): any => { const J = tut2Who('junia'); return J && J.bed && J.bed.x != null ? J.bed : null; };
const tut2NookRock = (): any => (town.props || []).find((p: any) => p.kind === 'rock' && p.tutRock) || null;
const tut2InRing = (x: number, y: number) => { const T2 = town.tut2, o = T2.at.o, M = TUT2_MAP.yard; return x > o.x + M.x && x < o.x + M.x + M.w - 1 && y > o.y + M.y && y < o.y + M.y + M.h - 1; };
/** the grove: three trees round a free tile (N) with one side open (O), a rock two tiles along from the opening, near the stall. Every push the story needs
    is planned before anything is placed; the first place where all of them work is used. Junia's bed is put on the customer's square, with her asleep in it. */
function tut2NookLayout(T2: any, J: any): boolean {
  const at = T2.at, F = at.front, o = at.o, B = TUT2_MAP.box; T2.nookOK = false;
  const inBox = (x: number, y: number) => x >= o.x + B.x0 - 1 && x <= o.x + B.x1 + 1 && y >= o.y + B.y0 - 1 && y <= o.y + B.y1 + 1;
  const near = (x: number, y: number) => (Math.abs(x - at.keep.x) <= 1 && Math.abs(y - at.keep.y) <= 1) || (x === F.x && y === F.y) || (typeof pushFireAt === 'function' && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => pushFireAt(x + i, y + j)));
  const free = (x: number, y: number) => !!grid[y] && [T.GRASS, T.PATH, T.SAND].includes(grid[y][x]) && walkable(x, y) && !lfPropAt(x, y) && !tileOwner.get(y * W + x) && roomAt[y][x] < 0 && !(town.nodeMap && town.nodeMap.has(y * W + x)) && !inBox(x, y) && !near(x, y);
  const ringBlock = new Set<number>(); for (const t of at.yardFence.concat(at.own)) ringBlock.add(t.y * W + t.x);
  const cands: any[] = [];
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const N = { x: F.x + i, y: F.y + j }, dist = Math.abs(i) + Math.abs(j); if (dist < 3 || !free(N.x, N.y)) continue;
    for (const d of TUT2_DIRS) for (const e of [{ dx: d.dy, dy: d.dx }, { dx: -d.dy, dy: -d.dx }]) {
      const O = { x: N.x + d.dx, y: N.y + d.dy }, trees = [{ x: N.x - d.dx, y: N.y - d.dy }, { x: N.x + e.dx, y: N.y + e.dy }, { x: N.x - e.dx, y: N.y - e.dy }];
      const need = [O, { x: O.x + d.dx, y: O.y + d.dy }, { x: O.x + e.dx, y: O.y + e.dy }, { x: O.x + 2 * e.dx, y: O.y + 2 * e.dy }, { x: O.x + 3 * e.dx, y: O.y + 3 * e.dy }, { x: O.x - e.dx, y: O.y - e.dy }].concat(trees);
      if (need.every(t => free(t.x, t.y))) cands.push({ N, O, d, e, trees, R: { x: O.x + 2 * e.dx, y: O.y + 2 * e.dy }, s: dist + Math.hypot(N.x - at.gap.x, N.y - at.gap.y) * 0.4 });
    } }
  cands.sort((a, b) => a.s - b.s);
  const k = (t: any) => t.y * W + t.x, plStart = [{ x: F.x - 1, y: F.y }, { x: F.x + 1, y: F.y }, { x: F.x, y: F.y + 1 }].find(t => tut2WalkFree(t.x, t.y)) || { x: F.x, y: F.y + 1 };
  for (const c of cands.slice(0, 60)) {
    const trees = new Set<number>(c.trees.map(k));
    // 1: the bed from the shop into the grove, the rock lying where it will be
    const p1 = tut2BoxPlan(F, plStart, c.N, new Set([...trees, k(c.R)])); if (!p1) continue;
    // 2: the rock into the opening, the bed in the grove
    const p2 = tut2BoxPlan(c.R, { x: c.O.x + c.d.dx, y: c.O.y + c.d.dy }, c.O, new Set([...trees, k(c.N)])); if (!p2) continue;
    // 3: later the bed comes out (a swap at the opening) and goes through the gap into her ring; the rock lies one tile aside, the ring stands but for the gap
    const rock3 = { x: c.O.x + c.e.dx, y: c.O.y + c.e.dy }, p3 = tut2BoxPlan(c.O, c.N, at.jbed, new Set([...trees, k(rock3), ...ringBlock])); if (!p3) continue;
    // all of it works: plant the trees, lay the rock, put Junia's bed in front of the shop with her asleep in it
    for (const t of c.trees) { setT(t.x, t.y, T.TREE); markDirty(t.x, t.y, 1, 1); }
    const rk: any = lfAddProp('rock', c.R.x, c.R.y); rk.v = 2; rk.tutRock = true;
    const bed: any = lfAddProp('bed', F.x, F.y); bed.v = 3; bed.rot = 0; bed.owner = J; bed.rider = J; J.bed = bed; J.homeless = false;
    J.tx = J.x = F.x; J.ty = J.y = F.y; J.pose = 'sleep'; J.face = { dx: 0, dy: 1 }; J.status = 'Asleep in her bed, in front of the stall';
    at.nook = c.N; at.nookO = c.O; at.nookD = c.d; at.nookE = c.e; at.rock0 = c.R; at.rockAside = rock3; at.trees = c.trees;
    town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; town.treeCache = null; T2.nookOK = true;
    return true;
  }
  // (no room for the grove: she still washes up, just beside the stall; the puzzle steps pass straight through)
  J.x = J.tx = at.shore.x; J.y = J.ty = at.shore.y; J.pose = 'stand';
  return false;
}
/** the shadow for the next push of Junia's bed to a place, or of the rock */
const tut2BedGhost = (goal: any) => (T2: any) => { const b = tut2JBed(); const g = typeof goal === 'function' ? goal(T2) : typeof goal === 'string' ? T2.at[goal] : goal; const q = b && g ? tut2NextPush(b, g) : null; return q ? { at: q.stand, face: q.face } : null; };
const tut2BedBot = (goal: any) => (T2: any) => { const b = tut2JBed(); const g = typeof goal === 'function' ? goal(T2) : typeof goal === 'string' ? T2.at[goal] : goal; const q = b && g ? tut2NextPush(b, g) : null; return q ? { stand: q.stand, into: q.into } : null; };
const tut2RockGoal = (T2: any) => { const b = tut2JBed(), n = T2.at.nook; return b && b.x === n.x && b.y === n.y ? T2.at.nookO : T2.at.rock0; };   // (into the opening once she is in; back where it was if it got there first)
const tut2RockGhost = (T2: any) => { const r = tut2NookRock(); const q = r ? tut2NextPush(r, tut2RockGoal(T2)) : null; return q ? { at: q.stand, face: q.face } : null; };
const tut2RockBot = (T2: any) => { const r = tut2NookRock(); const q = r ? tut2NextPush(r, tut2RockGoal(T2)) : null; return q ? { stand: q.stand, into: q.into } : null; };
/** the puzzle's own shadow: the bed into the grove first; if the rock blocks the opening first, the rock out of the way */
const tut2PuzzleGhost = (T2: any) => { const b = tut2JBed(), n = T2.at.nook, inN = b && b.x === n.x && b.y === n.y; if (inN) return tut2RockGhost(T2); return tut2BedGhost(n)(T2) || tut2RockGhost(T2); };
const tut2PuzzleBot = (T2: any) => { const b = tut2JBed(), n = T2.at.nook, inN = b && b.x === n.x && b.y === n.y; if (inN) return tut2RockBot(T2); return tut2BedBot(n)(T2) || tut2RockBot(T2); };
const tut2BedAt = (t: any) => { const b = tut2JBed(); return !!b && !!t && b.x === t.x && b.y === t.y; };
const tut2RockAt = (t: any) => { const r = tut2NookRock(); return !!r && !!t && r.x === t.x && r.y === t.y; };
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
    tset(() => { game.player.noSeed = false; }),   // (the seed is in your hand already: no lesson in pressing 1)
    tstrip('Walk into each square to sow it.'), tarrow('patch', 'sown'), tmark('patch', 'sown'),
    twait(() => tut2AllDone('patch', 'sown'), { bot: botWork('patch', 'sown') }),
    tset(T2 => { T2.bedOk = true; T2.at.myBed = [T2.at.bed]; }),   // (the bed is yours to use the moment the seed is in)
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
      rebuildOcc(); tut2NookLayout(T2, J); rebuildOcc(); refreshReach();
    }),
    tpause(3), { do: 'fade', to: 0, over: 1.5 }, tset(T2 => { T2.input = true; }),
    tstrip('Go and look at the turnips.'), tarrow('patch'),
    twait(T2 => tut2NextTo(game.player, T2.at.patch), { bot: (T2: any) => ({ stand: { x: T2.at.patch[6].x, y: T2.at.patch[6].y + 1 } }) }),
    { do: 'face', who: 'paullus', to: 'you' }, tsay('paullus', 'There. Told you.')
  ],
  // Scene 4: harvest, and a woman asleep in front of the shop
  [
    tstrip('Walk into the turnips to pull them.'), tarrow('patch', 'pulled'), tmark('patch', 'pulled'),
    twait(() => tut2AllDone('patch', 'pulled'), { bot: botWork('patch', 'pulled') }),
    tmark(), tsay('paullus', 'Bring them to the stall.'),
    tset(T2 => { const R = tut2Who('paullus'); if (R) R.coin = Math.max(R.coin || 0, 200); }),
    { do: 'walk', who: 'paullus', to: 'keep', async: true },
    tarrow('front'), tstrip('Take the turnips to the stall.'),
    twait(T2 => { const P = game.player, f = T2.at.front; return Math.abs(P.tx - f.x) + Math.abs(P.ty - f.y) <= 3; }, { bot: (T2: any) => ({ stand: tut2Beside(T2.at.front) || T2.at.front }) }),
    tstrip(), tarrow()
  ],
  // Scene 5: the puzzle: her bed into the grove, the rock in its opening; then the sale, at a better price
  [
    { do: 'walk', who: 'paullus', to: 'keep' }, { do: 'face', who: 'paullus', to: 'front' }, tarrow('front'),
    tsay('paullus', "There's a woman asleep in my shop."), tsay('paullus', "I don't like to wake people. Nobody does it well."),
    { do: 'face', who: 'paullus', to: 'you' }, tsay('paullus', "I can't sell you anything with her there. It wouldn't be right."),
    tarrow('nook'), tsay('paullus', 'Those trees. She would sleep well in among them.'),
    tset(T2 => { T2.pushTaught = true; T2.ui.marks = T2.nookOK ? [{ tiles: 'nook', done: 'bed', ghost: true }, { tiles: 'nookO', done: 'rock', color: '#f0b43c' }] : []; }),
    tlock({ build: true, push: true }, ['push']), tstrip('Press B to build.'),
    twait(T2 => buildOn() || !T2.nookOK, { nudge: { after: 25, say: ['paullus', 'B. The world stops for it.'] }, bot: (T2: any) => ({ key: buildOn() ? null : 'b' }) }),
    tsay('paullus', 'There. The world holds its breath while you build.'), tsay('paullus', 'Nobody sees it. They only find the thing afterwards.'),
    tset(T2 => { T2.ui.ghost = tut2PuzzleGhost; }), tarrow(() => tut2JBed()),
    tstrip('Stand where the shadow stands and walk into her bed. Push it into the gap between the three trees.'),
    twait(T2 => !T2.nookOK || tut2BedAt(T2.at.nook), { bot: tut2PuzzleBot }),
    tsay('paullus', 'In she goes.'),
    tarrow(() => tut2NookRock()), tstrip('Now the rock. Push it into the opening, so she stays put.'),
    twait(T2 => !T2.nookOK || (tut2BedAt(T2.at.nook) && tut2RockAt(T2.at.nookO)), { bot: tut2PuzzleBot }),
    tset(T2 => { T2.ui.ghost = null; T2.ui.marks = []; }), tarrow(),
    tsay('paullus', 'Tidy.'), tsay('paullus', "She'll sleep well in there."),
    tstrip('Press B to let the world go on.'),
    twait(() => !buildOn(), { bot: () => ({ key: 'b' }) }),
    tlock({}), tstrip(),
    { do: 'face', who: 'paullus', to: 'you' }, tsay('paullus', 'Now. Turnips.'),
    tarrow('front'), tstrip('Sell the turnips to Paullus.'),
    tstock([], [{ item: 'turnip', price: 5 }], "Five each. For the help. Don't tell anyone."),
    twait(shopIsOpen, { bot: botStall }),
    tstrip('Sell all 9.'),
    twait(() => !(game.player.inv.turnip > 0), { bot: () => ({ shop: { tab: 'sell', i: 0, all: true } }) }),
    tstrip('Close the panel.'),
    twait(() => !shopIsOpen(), { bot: () => ({ shop: { close: true } }) }),
    tstrip(), tarrow(), tstock([], [], ''),
    { do: 'face', who: 'paullus', to: 'you' },
    tsay('paullus', "That's the whole trade."), tsay('paullus', 'Grow it. Sell it. Build with it.')
  ],
  // Scene 6: Junia wakes up in the grove; the rock aside; she wishes for a place of her own with a fence round it
  [
    tset(T2 => { const J = tut2Who('junia'); if (J) { J.pose = 'stand'; J.status = 'Awake, among three trees'; const b = J.bed; if (b) b.rider = null; } }),
    { do: 'face', who: 'junia', to: 'you' },
    tsay('junia', 'I went to sleep in my own bed.'), tsay('junia', 'I woke up in my own bed.'),
    tsay('junia', 'There are trees on three sides of it now.'), tsay('junia', 'And a rock.'),
    { do: 'face', who: 'paullus', to: 'you' }, tsay('paullus', "She can't get out. That one's yours."),
    tset(T2 => { T2.ui.ghost = T2.nookOK ? { at: { x: T2.at.nookO.x - T2.at.nookE.dx, y: T2.at.nookO.y - T2.at.nookE.dy }, face: T2.at.nookE } : null; T2.ui.marks = T2.nookOK ? [{ tiles: 'rockAside', done: 'rock', color: '#f0b43c' }] : []; }),
    tarrow(() => tut2NookRock()), tlock({ build: true, push: true }, ['push']),
    tstrip('Press B and push the rock aside, so she can get out.'),
    twait(T2 => !T2.nookOK || !tut2RockAt(T2.at.nookO), { bot: (T2: any) => { if (!buildOn()) return { key: 'b' }; const at = T2.at; return { stand: { x: at.nookO.x - at.nookE.dx, y: at.nookO.y - at.nookE.dy }, into: at.nookO }; } }),
    tset(T2 => { T2.ui.ghost = null; T2.ui.marks = []; }), tarrow(),
    tstrip('Press B to let the world go on.'),
    twait(() => !buildOn(), { bot: () => ({ key: 'b' }) }),
    tlock({}), tstrip(),
    { do: 'walk', who: 'junia', to: () => tut2Beside(tut2Pos('you')) || tut2Pos('front') }, { do: 'face', who: 'junia', to: 'you' },
    tsay('junia', 'I was ironing a shirt, and then there was sand.'), tsay('junia', "I've decided not to think about it."),
    tsay('junia', 'Is there anywhere to live, on this island?'), tsay('junia', "I'd like a place of my own. With a fence round it, say."),
    tmark('yardFence', 'fence'), tset(T2 => { T2.ui.marks = T2.ui.marks.concat([{ tiles: 'gap', color: '#f0b43c' }]); }),
    tstock([{ item: 'fence', qty: 18, price: 1 }], [], 'Eighteen fences. Take all of them.'),
    tstrip('The trader sells fence.'), tarrow('front')
  ],
  // Scene 7: the fence with a gap; she goes back to sleep; her bed through the gap, the gap closed; the fence without a gate, and the hammer
  [
    twait(shopIsOpen, { bot: botStall }), tstrip('Buy all 18.'),
    twait(() => (town.kit.fence || 0) >= 18, { bot: () => ({ shop: { tab: 'buy', i: 0, all: true } }) }),
    twait(() => !shopIsOpen(), { bot: () => ({ shop: { close: true } }) }),
    tarrow('yardFence', 'fence'), tlock({ build: true, push: true }, ['fence', 'push'], 'yardFence'), tset(T2 => { T2.fenceFree = true; T2.gapOpen = true; T2.ui.ghost = 'fenceRow'; }),
    tstrip('Press B. Stand where the shadow stands, face the same way, and press 1 again and again: each fence goes on the end of the row. Leave the yellow square open.'),
    twait(T2 => tut2AllDone('yardFence', 'fence'), { bot: botRows }),
    tset(T2 => { T2.fenceFree = false; T2.ui.ghost = null; }),
    tarrow(), tstrip('Press B to let the world go on.'),
    twait(() => !buildOn(), { bot: () => ({ key: 'b' }) }),
    tlock({}), tstrip(), tmark(),
    // she is tired: back to her bed in the grove, asleep
    { do: 'face', who: 'junia', to: 'you' }, tsay('junia', "It's been a long morning."), tsay('junia', "I'm going back to sleep. It might reset."),
    { do: 'walk', who: 'junia', to: 'nook' },
    tset(T2 => { const J = tut2Who('junia'), b = J && J.bed; if (J && b && b.x != null) { J.tx = J.x = b.x; J.ty = J.y = b.y; J.pose = 'sleep'; J.status = 'Asleep again, hoping it resets'; b.rider = J; rebuildOcc(); } }),
    { do: 'face', who: 'paullus', to: 'you' }, tsay('paullus', "She'll want to wake up inside it."),
    tset(T2 => { T2.ui.marks = [{ tiles: 'jbed', done: 'bed', ghost: true }, { tiles: 'gap', color: '#f0b43c' }]; T2.ui.ghost = T2.nookOK ? { at: T2.at.nookO, face: { dx: -T2.at.nookD.dx, dy: -T2.at.nookD.dy } } : null; }),
    tarrow(() => tut2JBed()), tlock({ build: true, push: true }, ['push']),
    tstrip('Press B. Walk into her bed from the opening: it cannot go back, so you swap places with it.'),
    twait(T2 => !T2.nookOK || !tut2BedAt(T2.at.nook), { bot: (T2: any) => { if (!buildOn()) return { key: 'b' }; return { stand: T2.at.nookO, into: T2.at.nook }; } }),
    tset(T2 => { T2.ui.ghost = tut2BedGhost('jbed'); }),
    tstrip('Now push her bed into her yard, through the gap.'),
    twait(T2 => !T2.nookOK || tut2BedAt(T2.at.jbed), { bot: tut2BedBot('jbed') }),
    tset(T2 => { const o = T2.at.o, M = TUT2_MAP.yard; T2.gapOpen = false; T2.fenceFree = true; T2.ui.marks = [{ tiles: 'gap', done: 'fence' }]; T2.ui.ghost = { at: { x: o.x + M.x, y: o.y + M.y + M.h }, face: { dx: 0, dy: -1 } }; }),
    tarrow('gap', 'fence'), tlock({ build: true, push: true }, ['fence', 'push'], 'gap'),
    tstrip('Close the gap: stand where the shadow stands and press 1. The fence goes on the end of the row.'),
    twait(T2 => TUT2_DONE.fence(T2.at.gap.x, T2.at.gap.y), { bot: (T2: any) => { const o = T2.at.o, M = TUT2_MAP.yard, st = { x: o.x + M.x, y: o.y + M.y + M.h }; return { stand: st, faceTo: { x: st.x, y: st.y - 1 }, key: '1' }; } }),
    tset(T2 => { T2.fenceFree = false; T2.ui.ghost = null; }),
    tarrow(), tstrip('Press B to let the world go on.'),
    twait(() => !buildOn(), { bot: () => ({ key: 'b' }) }),
    tlock({}), tstrip(), tmark(),
    tsay('junia', 'It didn\'t reset.'),
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
    tarrow('gate'), tset(T2 => { T2.hammerAt = T2.at.gate; T2.autoHammer = true; }), tlock({ build: true }, ['destroy', 'gate'], 'gate'),
    tstrip('Press B. The hammer is in your hand: walk into the marked fence to knock it out. Then press {k:gate} to put the gate in the gap.'),
    twait(T2 => { const p = lfPropAt(T2.at.gate.x, T2.at.gate.y); return !p; }, { bot: (T2: any) => { if (!buildOn()) return { key: 'b' }; const st = { x: T2.at.gate.x - 1, y: T2.at.gate.y }; return game.player.build.sel === 1 ? { stand: st, into: T2.at.gate } : { stand: st, key: '1', pressOnly: true }; } }),
    twait(T2 => TUT2_DONE.gate(T2.at.gate.x, T2.at.gate.y), { bot: (T2: any) => ({ stand: { x: T2.at.gate.x - 1, y: T2.at.gate.y }, faceTo: T2.at.gate, key: String((T2.slots || []).indexOf('gate') + 1) }) }),
    tmark(), tset(T2 => { T2.hammerAt = null; T2.autoHammer = false; }), tstrip('Press B to let the world go on.'),
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
    tstrip('A field tile is ploughed ground, ready to sow. The trader sells them.'), tarrow('front'),
    twait(shopIsOpen, { bot: botStall }),
    twait(() => (town.kit.field || 0) >= 6, { bot: () => ({ shop: { tab: 'buy', i: 0, all: true } }) }),
    twait(() => !shopIsOpen(), { bot: () => ({ shop: { close: true } }) }),
    tarrow('jfield', 'field'), tlock({ build: true }, ['field'], 'jfield'), tstrip('Press B. Face a marked square and press 1 to lay a field tile. Six of them.'),
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
  if (typeof TUTBOT !== 'undefined' && TUTBOT.on) { TUTBOT.on = false; if (game.player && game.player.player) game.player.player.keys = {}; }   // (the bot hands the island back to you)
  T2.done = true; T2.locks = {}; T2.slots = []; T2.stock = null; T2.ui = { strip: null, arrow: null, marks: [] }; T2.show = {};
  for (const n of npcs) { if (n.tutHold) { n.tutHold = false; n.plan = null; n.si = 0; n.stepStarted = false; if (n.pose === 'sleep') n.pose = 'stand'; } }
  T2.rentDay = Math.floor(game.time / 1440) + 1; { const R = rentState(); R.day = Math.floor(game.time / 1440); }   // (no rent the day the clock starts: Junia brings the first one tomorrow)
  if (typeof progState === 'function') { const P2 = progState(); P2.step = 1; P2.done = {}; P2.sold = 0; }   // (the turnips you sold in the tutorial do not count for the progression)
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

/* ---------------- the progression after the tutorial (prompt 8) ----------------
   The five steps were written for an island that starts with a family of three. After the first morning there is you, Paullus and Junia in her
   fenced yard, so the first two steps follow on from there: a roof over Junia's bed (rent goes up), then her first harvest sold. Steps 3 to 5
   (five households and the seed stall, everyone under a roof and the carpenter, the island thriving) are as they were. */
// @ts-expect-error -- deliberate patch
const _t2Prog = progStep; progStep = function (n) {
  if (!town || !town.tut2) return _t2Prog(n);
  const J = tut2Who('junia'), P = progState();
  if (n === 1) { const roof = !!(J && !J.dead && yardHasBed(J) && rentHome(J).roof);
    return { n, title: "Walls round Junia's bed", say: 'Somebody put a fence round me. A roof would be the next thing, I suppose.', how: "Wall Junia's bed in: wall blocks all round it inside her yard, and a door. The trader sells them. Under a roof she pays more rent.", rows: [["Junia's bed under a roof", roof ? 1 : 0, 1]], who: J ? [J] : [], met: roof }; }
  if (n === 2) return { n, title: 'The first harvest sold', say: 'The turnips are coming up. Somebody will have to sell them.', how: 'Junia harvests her field and takes what she can spare to the trader. You can sell yours too.', rows: [['Crops sold to the trader', Math.min(1, P.sold), 1]], who: J ? [J] : [], met: P.sold > 0 };
  return _t2Prog(n);
};
LF2.tickers.push(() => { if (town && town.tut2) tut2After(); });   // (the first rent runs with the sim, not only with the frame loop)

/* ---------------- pushing, taught the first time it is needed (a fence out of place, or you shut in) ---------------- */
/** fences and gates standing where no fence belongs (not on your own ring or Junia's) */
function tut2Strays(): any[] {
  const T2 = town.tut2; if (!T2) return []; const ok = new Set(T2.at.own.concat(T2.at.yard).map((t: any) => t.y * W + t.x));
  return town.props.filter((p: any) => (p.kind === 'fence' || p.kind === 'gate') && !ok.has(p.y * W + p.x));
}
/** you are inside Junia's ring and it is closed all round */
function tut2ShutIn(): boolean {
  const T2 = town.tut2, P = game.player; if (!T2 || !P) return false;
  return tut2YardInner(T2).some(t => t.x === P.tx && t.y === P.ty) && tut2AllDone('yard', 'fence');
}
function tut2PushWatch() {
  const T2 = town.tut2; if (!T2 || T2.done || !T2.fenceWatch) return;
  const strays = tut2Strays(), shut = tut2ShutIn() && !TUT2_DONE.gate(T2.at.gate.x, T2.at.gate.y), R = tut2Who('paullus'), P = game.player;
  if ((strays.length || shut) && !T2.pushTaught) {
    T2.pushTaught = true; T2.locks = Object.assign({}, T2.locks, { push: true });
    tut2Say(R, shut ? 'You can shove them, you know. Press B and walk into one.' : "That one's wandered. Walk into it in build mode and it goes where you push it.", P);
  } else if (shut && !T2.shutSaid && T2.pushTaught) { T2.shutSaid = true; tut2Say(R, 'Shove one. They move.', P); }
  if (T2.pushTaught && T2.slots && !T2.slots.includes('push') && (T2.slots.length || itBuildOn(P))) T2.slots = T2.slots.concat(['push']);   // (a Push slot on the bar once pushing is known)
  const pk = (T2.slots || []).indexOf('push') + 1, B = P && P.build;
  if ((strays.length || shut) && B && B.on && B.sel !== 0 && !T2.lessonSel) { T2.lessonSel = true; B.sel = 0; itSync(true); }   // (the lesson puts the hand in push for you, once)
  if (!strays.length && !shut) T2.lessonSel = false;
  const how = !(B && B.on) ? 'Press B, then walk into it.' : B.sel !== 0 ? `Press ${pk} for Push, then walk into it.` : 'Walk into it to push it.';
  T2.ui.lesson = strays.length ? 'Push the stray fence onto a mark. ' + how : shut ? 'Shut in. Push a fence out of the way. ' + how : null;
}
// @ts-expect-error -- deliberate patch
const _t2Hud = tut2Hud; tut2Hud = function () { if (town && town.tut2) { tut2PushWatch(); const ui = town.tut2.ui; if (ui && ui.lesson && !(ui.flash && performance.now() < ui.flash.until)) ui.flash = { text: ui.lesson, until: performance.now() + 200 }; } return _t2Hud(); };
// @ts-expect-error -- deliberate patch
const _t2Draw = drawTut2; drawTut2 = function (c, now) {
  _t2Draw(c, now); if (!tut2Active() || !town.tut2.fenceWatch) return;
  for (const p of tut2Strays()) { c.save(); c.globalAlpha = 0.6 + 0.3 * Math.sin(now / 200); c.strokeStyle = '#f0783c'; c.lineWidth = 3; c.strokeRect(p.x * TS + 1, p.y * TS + 1, TS - 2, TS - 2); c.restore(); }
};
