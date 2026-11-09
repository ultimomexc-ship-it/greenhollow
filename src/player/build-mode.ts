/* ================= Build mode (B): a hotbar for building; I opens the bag, where you drag items onto it =================
   In build mode the hand is always Push (no Talk or Search), slot 1 is the hammer (delete: blocks, walls, doors, loose things, furniture, and trees and rocks to clear land), slot 2 turns chairs and beds,
   and slots 3-9 are building items you choose in the bag (I): pressing one puts a single one of it on the free ground in front of you (free for now). The Builder's Yard in the square is gone. */
const BUILD_ICON: any = { bed: 'bed_head_up_1', chair: 'seat_down' };
const BUILD_DEFAULT = ['bwall', 'bwindow', 'bdoor', 'bed', 'chair', 'table', 'barrel'];
const BUILD_CAP = 400;   // loose things on the island before the palette says it is crowded
function itBuildState(n) { if (!n.build) n.build = { on: false, sel: 0, bar: BUILD_DEFAULT.slice(), prev: null }; return n.build; }
const itBuildOn = n => !!(n && n.build && n.build.on);
function itBuildToggle(n, on?: boolean) {
  const b = itBuildState(n); const want = on == null ? !b.on : on; if (want === b.on) return; const p = n.player;
  if (want) { b.prev = { sel: n.sel || 0, mode: n.mode }; b.on = true; b.sel = 0; n.sel = 0; if (typeof itBag === 'function') itBag(false); }
  else { b.on = false; b.sel = 0; if (b.prev) { n.sel = b.prev.sel; n.mode = b.prev.mode; } }
  if (p) { p.act = null; p.lock = false; p.skip = null; p.grace = null; } itSync(true);
}
/** 1 Push (the default), 2 Destroy (the hammer), 3 Turn; 4-9 and 0 put the item in them down in front of you */
function itBuildSelect(n, i: number) {
  const b = itBuildState(n); if (!b.on) return; const p = n.player;
  if (i <= 2) { b.sel = i === 0 ? 0 : b.sel === i ? 0 : i; if (p) { p.act = null; p.lock = false; p.skip = null; p.grace = null; } itSync(true); return; }
  const kind = b.bar[i - 3]; if (kind) bldPlaceFront(n, kind);
}
const itBuildName = (k: string) => { const it = YARD_ITEMS.find(q => q.kind === k); return it ? it.name : k; };
/** put one building item on the free ground nearest the tile in front of you */
function bldPlaceFront(n, kind: string) {
  if (town.props.length >= BUILD_CAP) { playerSay(n, 'The island is full of loose things. Smash some first.'); return null; }
  const f = lf2Front(n), cand: [number, number, number][] = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = f.x + dx, y = f.y + dy; if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) continue; cand.push([Math.abs(dx) + Math.abs(dy) * 1.01, x, y]); }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, x, y] of cand) {
    if (!walkable(x, y) || lfPropAt(x, y) || tileOwner.get(y * W + x) || (x === n.tx && y === n.ty) || town.siteAt[y * W + x]) continue; const g = grid[y][x]; if (g === T.DOOR || g === T.PLOT || g === T.TENT || g === T.PEW) continue;
    const p: any = lfAddProp(kind, x, y); p.v = Math.floor(Math.random() * 5); p.rot = 0; playerSay(n, 'A ' + (LF_NOUN[kind] || kind) + '.'); return p;
  }
  playerSay(n, 'No room here.'); return null;
}
/** turn a chair or a bed (loose, or standing in a room); returns false when there is nothing here that turns */
function bldRotate(x: number, y: number) {
  const pr = lfPropAt(x, y);
  if (pr && !pr.fixed && (pr.kind === 'chair' || pr.kind === 'bed')) { pr.rot = ((pr.rot || 0) + 1) & 3; town.lfPV = (town.lfPV || 0) + 1; return true; }
  const f = typeof pushFurniture === 'function' ? pushFurniture(x, y) : null;
  if (f && f.type === 'seat') { const o = f.o, c = o.face || { dx: 0, dy: 1 }; o.face = { dx: -c.dy, dy: c.dx }; markDirty(x, y, 1, 1); return true; }
  if (f && f.type === 'bed') { f.o.flip = !f.o.flip; markDirty(x, y, 1, 1); return true; }
  return false;
}
const itBuildCanRotate = (x: number, y: number) => { const pr = lfPropAt(x, y); if (pr && !pr.fixed && (pr.kind === 'chair' || pr.kind === 'bed')) return true; const f = typeof pushFurniture === 'function' ? pushFurniture(x, y) : null; return !!f && (f.type === 'seat' || f.type === 'bed'); };
/* ---- the build hotbar and the building section of the bag ---- */
const itBuildImg: any = {};
function itBuildIcon(kind: string, s = 34) {
  const id = BUILD_ICON[kind] || (YARD_ITEMS.find(q => q.kind === kind) || { art: '' }).art; if (!(id in itBuildImg)) { const it = ART.BYID[id]; let url = ''; try { if (it) url = (ART.frameOf(it, 0) as HTMLCanvasElement).toDataURL(); } catch (e) {} itBuildImg[id] = url; }
  return itBuildImg[id] ? `<img src="${itBuildImg[id]}" width="${s}" height="${s}" alt="" draggable="false">` : `<span class="bgname">${esc(itBuildName(kind))}</span>`;
}
const IT_ROTATE_SVG = '<path d="M28 18a10 10 0 1 1-4-8" fill="none" stroke="#a8e07a" stroke-width="3" stroke-linecap="round"/><path d="M26 4v8h-8" fill="none" stroke="#a8e07a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
function itBuildBarHTML(n, face: string) {
  const b = itBuildState(n);
  const tool = (i: number, svg: string, name: string, on: boolean) => `<button type="button" class="hbslot${on ? ' on' : ''}" data-bslot="${i}" title="${name}"><em>${i + 1}</em><svg width="30" height="30" viewBox="0 0 38 38" aria-hidden="true">${svg}</svg><span class="hbcap">${name}</span></button>`;
  const slots = b.bar.map((k, j) => `<button type="button" class="hbslot item" data-bslot="${j + 3}" title="${k ? esc(itBuildName(k)) : 'Empty: drag one here in the build menu (I)'}"><em>${(j + 4) % 10}</em>${k ? itBuildIcon(k) : ''}${k ? '<u>∞</u>' : ''}<span class="hbcap">${k ? esc(itBuildName(k)) : ''}</span></button>`).join('');
  return `<div class="hbbadge" title="Build mode (B)"><b>BUILD</b><span>B to leave</span></div><div class="hbslots">${tool(0, IT_SVG.push, 'Push', b.sel === 0)}${tool(1, IT_SVG.hammer, 'Destroy', b.sel === 1)}${tool(2, IT_ROTATE_SVG, 'Turn', b.sel === 2)}<i class="hbsep"></i>${slots}</div><div class="hbface">${face || '<span class="dim">Walk to push · 2 destroy · 3 turn · 4-0 put an item down · I menu</span>'}</div>`;
}
function itBuildBagHTML(n) {
  const b = itBuildState(n), sel = (n as any)._bpick || '';
  const items = YARD_ITEMS.map(it => `<button type="button" class="bgcell bi${sel === it.kind ? ' worn' : ''}" draggable="true" data-bkind="${it.kind}" title="Drag onto a build slot">${itBuildIcon(it.kind, 34)}<span class="bgname">${esc(it.name)}</span></button>`).join('');
  const slots = b.bar.map((k, j) => `<button type="button" class="hbslot big item" data-bdrop="${j}" title="Build slot ${(j + 4) % 10}"><em>${(j + 4) % 10}</em>${k ? itBuildIcon(k, 38) : ''}</button>`).join('');
  return `<div class="bglab">Build menu · drag an item onto a build slot (or click an item, then a slot)</div><div class="bgbuild">${items}</div><div class="bglab">Build hotbar · slots 4-0 (1 pushes, 2 destroys, 3 turns things) · click a slot while an item is picked to fill it, right-click to empty it</div><div class="bgbelt">${slots}</div>`;
}
function itBuildAssign(n, j: number, kind: string | null) { const b = itBuildState(n); if (j < 0 || j >= b.bar.length) return; b.bar[j] = kind; itBagDraw(); itSync(true); }
(function () {
  const bb = document.getElementById('bagbox'), hb = document.getElementById('hotbar'); if (!bb || !hb) return;
  const css = document.createElement('style');
  css.textContent = '.hbbadge{display:flex;flex-direction:column;justify-content:center;align-items:center;background:#1d2a14;border:2px solid #6aa83e;border-radius:7px;padding:2px 10px;color:#cfe9a8}.hbbadge b{letter-spacing:.14em;font-size:13px}.hbbadge span{font-size:9px;color:#8fb468}'
    + '.hbcap{position:absolute;left:0;right:0;bottom:-15px;text-align:center;font-size:9px;color:#8d8570;white-space:nowrap;overflow:hidden;pointer-events:none}.hbsep{width:8px}.hbslot.item img{image-rendering:auto}'
    + '.hotbar.build{border-color:#5a8a38;padding-bottom:20px}.hbtools{display:flex;gap:4px;align-items:center}.hbtool{position:relative;width:34px;height:44px;background:#171b20;border:2px solid #3a3226;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#9a927c}.hbtool.on{border-color:#a8e07a;background:#1d2a14;box-shadow:0 0 10px #a8e07a44}.hbtool.none{opacity:.35}.hbtool .hbwear{bottom:2px}.bgbuild{display:grid;grid-template-columns:repeat(7,74px);gap:5px}.bgcell.bi{height:62px;cursor:grab}.bgcell.bi:active{cursor:grabbing}.hbslot.item.drop{border-color:#6aa83e;background:#1d2a14}';
  document.head.appendChild(css);
  hb.addEventListener('pointerdown', (e: any) => { const n = game.player; if (!n || !itBuildOn(n)) return; const s = e.target.closest('[data-bslot]'); if (s) { itBuildSelect(n, +s.dataset.bslot); e.preventDefault(); canvas.focus({ preventScroll: true }); e.stopPropagation(); } }, true);
  bb.addEventListener('dragstart', (e: any) => { const c = e.target.closest('[data-bkind]'), r = e.target.closest('[data-bagref]'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.bkind); e.dataTransfer.effectAllowed = 'copy'; } else if (r) { e.dataTransfer.setData('text/plain', 'bag:' + r.dataset.bagref); e.dataTransfer.effectAllowed = 'copy'; } });
  bb.addEventListener('dragover', (e: any) => { if (e.target.closest('[data-bdrop]') || e.target.closest('.bgbelt [data-slot]')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  bb.addEventListener('drop', (e: any) => { const n = game.player, hs = e.target.closest('.bgbelt [data-slot]'); if (hs && n && n.belt) { const t = e.dataTransfer.getData('text/plain'); if (t.startsWith('bag:')) { e.preventDefault(); const ref = t.slice(4), i = +hs.dataset.slot; for (let q = 0; q < n.belt.length; q++) if (n.belt[q] === ref) n.belt[q] = null; n.belt[i] = ref; itBagDraw(); itSync(true); } return; } const d = e.target.closest('[data-bdrop]'); if (!d || !n) return; e.preventDefault(); const k = e.dataTransfer.getData('text/plain'); if (k) itBuildAssign(n, +d.dataset.bdrop, k); });
  bb.addEventListener('click', (e: any) => { const n = game.player; if (!n) return; const i = e.target.closest('[data-bkind]'), d = e.target.closest('[data-bdrop]'); if (i) { (n as any)._bpick = (n as any)._bpick === i.dataset.bkind ? '' : i.dataset.bkind; itBagDraw(); } else if (d && (n as any)._bpick) { itBuildAssign(n, +d.dataset.bdrop, (n as any)._bpick); } });
  bb.addEventListener('contextmenu', (e: any) => { const d = e.target.closest('[data-bdrop]'), n = game.player; if (d && n) { e.preventDefault(); itBuildAssign(n, +d.dataset.bdrop, null); } });
})();

/* ---- lamp posts, fires and tents: destroyed with the hammer, built from the menu ---- */
/** the fires: the settlers' campfire in the camp, and any you light */
function fireList(): any[] { if (!town.fires) town.fires = town.yard && !town.fireGone ? [{ x: town.cx, y: town.cy + 1, home: true }] : []; return town.fires; }
const allLamps = (): any[] => (lamps as any[]).concat((town.props || []).filter(p => p.kind === 'lamp'));
const allFires = (): any[] => fireList().concat((town.props || []).filter(p => p.kind === 'campfire'));
function bldGroundUnder(x: number, y: number) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid[y + dy] && grid[y + dy][x + dx] === T.PATH) return T.PATH; return T.GRASS; }
function bldDeleteLamp(x: number, y: number) { const i = lamps.findIndex(l => l.x === x && l.y === y); if (i >= 0) lamps.splice(i, 1); if (grid[y][x] === T.LAMP) setT(x, y, bldGroundUnder(x, y)); markDirty(x, y, 1, 1); town.gridV = (town.gridV || 0) + 1; if (typeof refreshReach === 'function') refreshReach(); return true; }
function bldDeleteTent(x: number, y: number) { const t = (town.tents || []).find(q => q.x === x && q.y === y); if (t) { town.tents = town.tents.filter(q => q !== t); if (t.owner) { t.owner.tent = null; } } if (grid[y][x] === T.TENT) setT(x, y, (t && t.under) || T.GRASS); markDirty(x, y, 1, 1); town.gridV = (town.gridV || 0) + 1; return true; }
function bldDeleteFire(f: any) { town.fires = fireList().filter(q => q !== f); if (f.home) town.fireGone = true; return true; }
