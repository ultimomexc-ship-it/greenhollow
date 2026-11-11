/* ================= Islands: autosave, several saved islands, new islands ================= (design in NOTES.md "Islands")
   The whole game is a graph of plain data (`game`, `town`, `npcs`, `rooms` ...), so a save is that graph written out with shared references kept (a bed record belongs to a room and to its owner),
   Maps, Sets and typed arrays encoded, functions left out (villagers' plans and the player's current action are closures: they are dropped and re-decided on load).
   Saves live in IndexedDB, one record per island (a small `meta` row for the list, a `data` row for the world). A save made by older code loads as far as it can: missing fields fall back to defaults;
   one that cannot be loaded can be deleted from the list. `window.GH_NOSAVE` (set by the tests) turns it all off. */
const SAVE_VERSION = 1;
const SAVE_SKIP = new Set(['plan', 'act', 'events', 'follow', 'slide', 'talkUI', 'run', 'onEnd', 'spot']);   // keys whose values are closures or transient

/* ---------- the graph encoder: shared references, Maps, Sets, typed arrays ---------- */
function ghB64(bytes: Uint8Array) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as any); return btoa(s); }
function ghUnB64(t: string) { const s = atob(t), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
const GH_TYPED: any = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array };
function ghEncode(root: any): string {
  const refs = new Map<any, number>(), stack: any[] = [root];
  const kids = (o: any): any[] => o instanceof Map ? [...o.keys(), ...o.values()] : o instanceof Set ? [...o] : Array.isArray(o) ? o : Object.keys(o).filter(k => !SAVE_SKIP.has(k)).map(k => o[k]);
  const walkable = (v: any) => v && typeof v === 'object' && !(v instanceof Node) && !ArrayBuffer.isView(v);
  while (stack.length) { const o = stack.pop(); if (!walkable(o)) continue; const c = refs.get(o); refs.set(o, (c || 0) + 1); if (c) continue; for (const v of kids(o)) stack.push(v); }
  const ids = new Map<any, number>(); let nid = 0;
  const enc = (v: any): any => {
    if (v === null) return null; const t = typeof v;
    if (t === 'number') return Number.isFinite(v) ? v : null; if (t === 'string' || t === 'boolean') return v; if (t === 'function' || t === 'undefined' || t === 'symbol') return undefined;
    if (v instanceof Node) return undefined;
    if (ArrayBuffer.isView(v)) { const name = (v as any).constructor.name; if (!GH_TYPED[name]) return undefined; const u8 = new Uint8Array((v as any).buffer, (v as any).byteOffset, (v as any).byteLength); return { $t: name, b: ghB64(u8) }; }
    if (ids.has(v)) return { $r: ids.get(v) };
    const shared = (refs.get(v) || 0) > 1, id = shared ? nid++ : -1; if (shared) ids.set(v, id);
    const tag = (o: any) => { if (shared) o.$id = id; return o; };
    if (v instanceof Map) return tag({ $m: [...v.entries()].map(([k, x]) => [enc(k), enc(x)]) });
    if (v instanceof Set) return tag({ $s: [...v].map(enc) });
    if (Array.isArray(v)) {
      if (v.length >= 16 && v.every(x => Number.isInteger(x) && x >= -32768 && x <= 32767)) return tag({ $i: ghB64(new Uint8Array(new Int16Array(v).buffer)) });   // (long runs of small integers: the grid, room indexes)
      return tag({ $a: v.map(x => { const e = enc(x); return e === undefined ? null : e; }) });
    }
    const o: any = {}; for (const k of Object.keys(v)) { if (SAVE_SKIP.has(k)) continue; const e = enc(v[k]); if (e !== undefined) o[k] = e; } return tag({ $o: o });
  };
  return JSON.stringify(enc(root));
}
function ghDecode(text: string): any {
  const byId = new Map<number, any>();
  const dec = (e: any): any => {
    if (e === null || typeof e !== 'object') return e;
    if (e.$r !== undefined) return byId.get(e.$r);
    if (e.$t) { const b = ghUnB64(e.b); return new GH_TYPED[e.$t](b.buffer, b.byteOffset, b.byteLength / GH_TYPED[e.$t].BYTES_PER_ELEMENT); }
    let out: any;
    if (e.$m) { out = new Map(); if (e.$id !== undefined) byId.set(e.$id, out); for (const [k, v] of e.$m) out.set(dec(k), dec(v)); return out; }
    if (e.$s) { out = new Set(); if (e.$id !== undefined) byId.set(e.$id, out); for (const v of e.$s) out.add(dec(v)); return out; }
    if (e.$i !== undefined) { const b = ghUnB64(e.$i); out = Array.from(new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2)); if (e.$id !== undefined) byId.set(e.$id, out); return out; }
    if (e.$a) { out = []; if (e.$id !== undefined) byId.set(e.$id, out); for (const v of e.$a) out.push(dec(v)); return out; }
    out = {}; if (e.$id !== undefined) byId.set(e.$id, out); for (const k of Object.keys(e.$o || {})) out[k] = dec(e.$o[k]); return out;
  };
  return dec(JSON.parse(text));
}

/* ---------- capture and restore the world ---------- */
function isleCapture() {
  return ghEncode({ v: SAVE_VERSION, game: Object.assign({}, game, { events: [] }), town, npcs, rooms, doors, lamps, grid, roomAt, merchants, plazaTiles, shoreTiles, W, H, NEXT_ID, sb: { count: SB.count, pair: SB.pair, presim: SB.presim } });
}
function isleRestore(text: string) {
  const o: any = ghDecode(text);
  W = o.W; H = o.H; sizeKey = 'L'; grid = o.grid; roomAt = o.roomAt; rooms = o.rooms; doors = o.doors; lamps = o.lamps; town = o.town; npcs = o.npcs; merchants = o.merchants || []; plazaTiles = o.plazaTiles || []; shoreTiles = o.shoreTiles || []; NEXT_ID = o.NEXT_ID || 1;
  for (const k of Object.keys(game)) delete game[k]; Object.assign(game, o.game, { events: [] });
  SB.count = (o.sb && o.sb.count) || {}; SB.pair = (o.sb && o.sb.pair) || new Map(); SB.presim = !!(o.sb && o.sb.presim);
  growLevels();   // (islands saved before the levels get them now)
  reach = new Uint8Array(W * H); tileOwner = new Map(); pairCool.clear();
  for (const n of npcs) { n.plan = null; n.si = 0; n.stepStarted = false; n.moving = false; n.path = []; n.x = n.tx; n.y = n.ty; n.t = 0; n.slide = null; n.rand = rng(town.seed + n.id * 977); n.talkUntil = 0; if (n.pose !== 'sleep' && n.pose !== 'sit') n.pose = 'stand'; n.roaming = false; if (n.player) { n.player.keys = {}; n.player.act = null; n.player.lock = false; n.player.grace = null; n.player.skip = null; } }
  town.treeCache = null; town.stoneCache = null; town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; town.bldQ = []; for (const p of town.props || []) { p.follow = null; p.st = 0; } if (typeof clearTentTiles === 'function') clearTentTiles(); if (typeof clearOrphanOvens === 'function') clearOrphanOvens(); if (!town.shrooms && typeof shroomScatter === 'function') shroomScatter(); if (typeof kitStart === 'function') kitStart();
  rebuildOcc(); refreshReach(); refreshShore();
  return o;
}

/* ---------- IndexedDB: a list of islands ---------- */
const ISLE: any = { db: null, id: null, last: 0, busy: false };
const isleOK = () => !(window as any).GH_NOSAVE && typeof indexedDB !== 'undefined';
function isleOpenDB(): Promise<IDBDatabase> {
  if (ISLE.db) return Promise.resolve(ISLE.db);
  return new Promise((res, rej) => { const rq = indexedDB.open('greenhollow', 1); rq.onupgradeneeded = () => { const d = rq.result; d.createObjectStore('meta', { keyPath: 'id' }); d.createObjectStore('data', { keyPath: 'id' }); }; rq.onsuccess = () => { ISLE.db = rq.result; res(rq.result); }; rq.onerror = () => rej(rq.error); });
}
const isleReq = (rq: IDBRequest) => new Promise<any>((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
async function isleList(): Promise<any[]> { const d = await isleOpenDB(); const all = await isleReq(d.transaction('meta').objectStore('meta').getAll()); return all.sort((a: any, b: any) => b.savedAt - a.savedAt); }
async function isleDelete(id: string) { const d = await isleOpenDB(); const tx = d.transaction(['meta', 'data'], 'readwrite'); tx.objectStore('meta').delete(id); tx.objectStore('data').delete(id); await new Promise(r => { tx.oncomplete = r; tx.onerror = r; }); if (ISLE.id === id) ISLE.id = null; try { if (localStorage.getItem('gh.last') === id) localStorage.removeItem('gh.last'); } catch (e) {} }
/** give an island your own name (works for any saved island, not only the open one) */
async function isleRename(id: string, name: string) {
  const d = await isleOpenDB(), meta = await isleReq(d.transaction('meta').objectStore('meta').get(id)); if (!meta) return;
  meta.name = name || (id === ISLE.id && town ? town.name : meta.name); meta.named = !!name;
  const tx = d.transaction('meta', 'readwrite'); tx.objectStore('meta').put(meta); await new Promise(r => { tx.oncomplete = r; tx.onerror = r; });
  if (id === ISLE.id) { ISLE.label = name; isleLabel(); }
}
/** write the current island (it must have an id) */
async function isleSave() {
  if (!isleOK() || !ISLE.id || !town || ISLE.busy) return false; ISLE.busy = true;
  try {
    const json = isleCapture(), d = await isleOpenDB(), pl = game.player, meta = { id: ISLE.id, name: ISLE.label || town.name, named: !!ISLE.label, seed: town.seed, scenario: town.scenario || 'village', day: Math.floor(game.time / 1440) + 1, pop: npcs.filter(n => !n.dead).length, savedAt: Date.now(), version: SAVE_VERSION, created: ISLE.created || Date.now(), you: pl ? pl.first : '' };
    const tx = d.transaction(['meta', 'data'], 'readwrite'); tx.objectStore('data').put({ id: ISLE.id, json }); tx.objectStore('meta').put(meta);
    await new Promise((r, j) => { tx.oncomplete = r; tx.onerror = () => j(tx.error); }); ISLE.last = Date.now(); ISLE.err = ''; isleLabel(); return true;
  } catch (e) { console.warn('save failed', e); ISLE.err = String((e && e.message) || e); isleLabel(); return false; } finally { ISLE.busy = false; }
}
/** start a new island in a new slot */
function isleNew(seedText: string | undefined, scenario: string, label?: string) {
  newTown(seedText, scenario); ISLE.label = (label || '').trim().slice(0, 40); ISLE.id = 'i' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); ISLE.created = Date.now();
  try { localStorage.setItem('gh.last', ISLE.id); } catch (e) {} isleLabel(); isleSave();
}
/** continue a saved island; resolves false when it cannot be loaded */
async function isleLoad(id: string): Promise<boolean> {
  try {
    const d = await isleOpenDB(), rec = await isleReq(d.transaction('data').objectStore('data').get(id)), meta = await isleReq(d.transaction('meta').objectStore('meta').get(id)); if (!rec) return false;
    isleRestore(rec.json); ISLE.id = id; ISLE.created = meta && meta.created; ISLE.label = meta && meta.named ? meta.name : ''; ISLE.busy = false;
    try { localStorage.setItem('gh.last', id); } catch (e) {}
    // the screen: the same set-up as a new island
    bubbles.length = 0; pops.length = 0; tradeSeen = 0; chronSeen = 0; cardSig = ''; mktSig = ''; chronSig = ''; townSig = ''; hudSig = '';
    el('chat').innerHTML = ''; el('chatEmpty').hidden = false; (el('seed') as any).value = String(town.seed);
    view.hover = null; view.selected = null; cam.follow = false; el('zfol').setAttribute('aria-pressed', 'false');
    if (typeof TSIGHT !== 'undefined') { TSIGHT.geoKey = ''; TSIGHT.geo = null; }
    buildStatic(); sizeCanvas(); fitCam(); cam.z = Math.max(cam.fit, 1.15);
    const pn = game.player; game.player = null; if (pn) pn.player = null;
    if (pn) centerOn(pn.tx, pn.ty); else centerOn(town.cx, town.cy); clampCam();
    buildRoster(); buildTown(true); select(pn || npcs[0]); updateUI(true); updateMarket(true);
    el('legend').textContent = (town.scenario === 'blank' ? 'blank island' : town.scenario === 'farm' ? 'ready farming village' : 'ready village') + ' · ' + W + '×' + H;
    if (typeof MODS !== 'undefined') MODS.sync();
    if (pn && canControl(pn)) startPlaying(pn); isleLabel();
    return true;
  } catch (e) { console.error('load failed', e); return false; }
}
function isleLabel() {
  const e = document.getElementById('islandName'); if (!e) return;
  if (!town) { e.textContent = ''; return; }
  const d = new Date(ISLE.last || 0), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const st = !isleOK() ? ' · NOT SAVING (this browser blocks storage)' : !ISLE.id ? ' · not saved' : ISLE.err ? ' · SAVE FAILED' : ISLE.last ? ' · saved ' + hm : '';
  e.textContent = (ISLE.label || town.name) + ' · day ' + (Math.floor(game.time / 1440) + 1) + st; e.title = ISLE.err || 'Autosaved every 30 seconds and when you leave build mode. Click to save now.';
  e.style.cursor = 'pointer'; e.onclick = () => { isleSave(); };
}

/* ---------- the Islands panel ---------- */
function isleAgo(t: number) { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; }
async function isleShow(first?: boolean) {
  let box = document.getElementById('islands'); if (!box) { box = document.createElement('div'); box.id = 'islands'; box.className = 'bagbox'; (canvas.parentNode as any).appendChild(box); }
  box.hidden = false; box.innerHTML = '<div class="bgwrap isl"><div class="bghead"><b>Islands</b></div><p class="sub">Loading…</p></div>';
  let list: any[] = []; let err = ''; try { list = await isleList(); } catch (e) { err = 'Saving is not available in this browser, so islands cannot be kept.'; }
  const rows = list.map(m => {
    const nm = ISLE.renaming === m.id ? `<input class="islren" data-irentxt="${m.id}" value="${esc(m.name)}" maxlength="40" spellcheck="false"> <button type="button" class="btn primary" data-irenok="${m.id}">Save name</button>` : `<b>${esc(m.name)}</b> <button type="button" class="islpen" data-iren="${m.id}" title="Rename">rename</button>`;
    const btns = ISLE.confirmDel === m.id ? `<button type="button" class="btn danger" data-idelyes="${m.id}">Yes, delete</button><button type="button" class="btn" data-idelno="1">Keep</button>`
      : `<button type="button" class="btn primary" data-icont="${m.id}">${m.id === ISLE.id ? 'Resume' : 'Continue'}</button><button type="button" class="btn" data-iexp="${m.id}" title="Download this island as a file (to send it for a look)">Export</button><button type="button" class="btn" data-idel="${m.id}">Delete</button>`;
    return `<div class="islrow"><div>${nm} <span class="dim">${m.scenario === 'blank' ? 'blank island' : m.scenario === 'farm' ? 'ready farming village' : 'ready village'}</span><br><span class="dim">day ${m.day} · ${m.pop} ${m.pop === 1 ? 'person' : 'people'}${m.you ? ' · you: ' + esc(m.you) : ''} · ${isleAgo(m.savedAt)}</span></div><div class="islbtns">${btns}</div></div>`;
  }).join('');
  box.innerHTML = `<div class="bgwrap isl"><div class="bghead"><b>Islands</b>${ISLE.id || !first ? '<button type="button" class="bgx" data-iclose="1" title="Close">×</button>' : ''}</div>`
    + (err ? `<p class="sub">${esc(err)}</p>` : '')
    + (rows ? `<div class="bglab">Your islands · each one is saved automatically</div>${rows}` : '<p class="sub">No islands yet. Start one below.</p>')
    + `<div class="bglab">New island</div><div class="islnew"><label><input type="radio" name="isc" value="blank" checked> <b>Blank island</b> <span class="dim">you alone, an empty island: build it up</span></label><label><input type="radio" name="isc" value="village"> <b>Ready village</b> <span class="dim">a built village with people (for trying things)</span></label><label><input type="radio" name="isc" value="farm"> <b>Ready farming village</b> <span class="dim">only what farming needs: fields, a seed seller, a greengrocer (for testing the farm economy)</span></label>`
    + `<div class="islseed"><label>Name <input id="islname" type="text" autocomplete="off" spellcheck="false" maxlength="40" placeholder="your island's name"></label></div><div class="islseed"><label>Seed <input id="islseed" type="text" autocomplete="off" spellcheck="false" placeholder="random"></label><button type="button" class="btn primary" data-inew="1">Start</button></div></div></div>`;
}
function isleHide() { const b = document.getElementById('islands'); if (b) b.hidden = true; canvas.focus({ preventScroll: true }); }
document.addEventListener('click', async (e: any) => {
  const t = e.target; if (!t || !t.closest) return;
  const c = t.closest('[data-icont]'), d = t.closest('[data-idel]'), n = t.closest('[data-inew]'), x = t.closest('[data-iclose]');
  if (x) { isleHide(); return; }
  if (c) { const id = c.dataset.icont; if (id === ISLE.id) { isleHide(); return; } c.disabled = true; if (ISLE.id) await isleSave(); const ok = await isleLoad(id); if (ok) isleHide(); else { alert('This island could not be loaded. It may be from an older version: you can delete it.'); isleShow(); } return; }
  { const ex = t.closest('[data-iexp]'); if (ex) { try { const db = await isleOpenDB(), rec = await isleReq(db.transaction('data').objectStore('data').get(ex.dataset.iexp)); if (rec) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rec.json], { type: 'application/json' })); a.download = 'greenhollow-island-' + ex.dataset.iexp + '.json'; document.body.appendChild(a); a.click(); a.remove(); } } catch (err) { alert('Could not export: ' + err); } return; } }
  if (d) { ISLE.confirmDel = d.dataset.idel; isleShow(!ISLE.id); return; }
  if (t.closest('[data-idelno]')) { ISLE.confirmDel = null; isleShow(!ISLE.id); return; }
  { const y = t.closest('[data-idelyes]'); if (y) { ISLE.confirmDel = null; await isleDelete(y.dataset.idelyes); isleShow(!ISLE.id); return; } }
  { const r = t.closest('[data-iren]'); if (r) { ISLE.renaming = r.dataset.iren; await isleShow(!ISLE.id); const inp: any = document.querySelector('[data-irentxt]'); if (inp) { inp.focus(); inp.select(); } return; } }
  { const k = t.closest('[data-irenok]'); if (k) { const id = k.dataset.irenok, inp: any = document.querySelector('[data-irentxt]'), nm = ((inp && inp.value) || '').trim().slice(0, 40); await isleRename(id, nm); ISLE.renaming = null; isleShow(!ISLE.id); return; } }
  if (n) { const sc = (document.querySelector('input[name="isc"]:checked') as any).value, sd = (document.getElementById('islseed') as any).value; if (ISLE.id) await isleSave(); isleNew(sd.trim() || undefined, sc, ((document.getElementById('islname') as any) || { value: '' }).value); isleHide(); return; }
  if (t.closest('#newTown')) { isleShow(); return; }
});
/** on page load: carry on with the island you left, or choose one */
async function isleBoot() {
  if (!isleOK()) { newTown(); return; }
  let last: string | null = null; try { last = localStorage.getItem('gh.last'); } catch (e) {}
  try { const list = await isleList(); if (last && list.some(m => m.id === last) && await isleLoad(last)) return; if (!list.length) { isleShow(true); return; } } catch (e) { newTown(); return; }
  isleShow(true);
}
/* autosave: every half minute of real time, when the tab is hidden, and when you leave build mode (player/build-mode.ts calls isleSave) */
setInterval(() => { if (isleOK() && ISLE.id && typeof skipping !== 'undefined' && !skipping && Date.now() - ISLE.last > 25000) isleSave(); }, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) isleSave(); });
window.addEventListener('pagehide', () => { isleSave(); });
