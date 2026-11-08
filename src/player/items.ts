/* ================= player / items: what you carry, and what is in your hand =================
   Explicit actions: the thing in your hand decides what walking into something does, and nothing is picked for you.
     HAND (belt slot 1) has three modes, switched with Q: TALK (people: talk; sellers: buy), PUSH (barrels, crates, stools and people are pushed
     along; a person against a wall swaps places with you), SEARCH (barrels and crates are searched). The hand also gathers berries and herbs,
     throws materials onto building sites, and does the everyday things (beds, tents, the food barrel).
     AXE fells trees · HAMMER breaks rocks and puts up walls · HOE ploughs and harvests · ROD fishes · SEEDS sow a ploughed plot.
   With the wrong thing in hand, you walk on over anything walkable (a field) and are told what to hold for anything solid (a tree).
   The model: goods (wood, grain, fish ...) stay counts in n.inv; tools are single things with an owner and wear (n.items); lockpicks and seeds are
   stacks in n.bag; the belt (n.belt, 9 slots) holds references: 'hand', 'i<item id>' or 's:<stack key>'. n.sel is the slot in hand, n.mode the hand mode.
   Villagers will own real tools the same way (next step); for testing, whoever you steer starts with the whole kit (IT.kit = 'test').            */
const IT: any = { kit: 'test' };
/** for now the villager you steer is never troubled by hunger, a full bladder or tiredness (no forced bedtime either: you can still choose to sleep in a bed) */
const PLAYER_NEEDS = false;
LF2.tickers.push(() => { const n = game.player; if (!n || PLAYER_NEEDS) return; n.hunger = Math.min(n.hunger, 20); n.bladder = Math.min(n.bladder || 0, 15); n.energy = Math.max(n.energy == null ? 100 : n.energy, 90); n.starving = 0; });
const IT_TOOLS: any = { axe: { name: 'Axe', verb: 'fell trees' }, hammer: { name: 'Hammer', verb: 'break rocks, build walls' }, hoe: { name: 'Hoe', verb: 'plough and harvest' }, rod: { name: 'Fishing rod', verb: 'fish' } };
const IT_STACKS: any = { lockpick: { name: 'Lockpick', verb: 'pick a lock (they snap)' }, seed_barley: { name: 'Barley seed', seed: 'barley', col: '#c9a96a' }, seed_turnip: { name: 'Turnip seed', seed: 'turnip', col: '#b58ac4' }, seed_bean: { name: 'Bean seed', seed: 'bean', col: '#8fb07a' } };
const IT_MODES = ['talk', 'push', 'search'], IT_MODE_NAME: any = { talk: 'Talk', push: 'Push', search: 'Search' };

/* ---------------- the model ---------------- */
function itEnsure(n, steering?: boolean) {
  if (!n) return; if (!n.items) n.items = []; if (!n.bag) n.bag = {};
  if (steering && !n.belt) { n.belt = ['hand', null, null, null, null, null, null, null, null]; n.sel = 0; n.mode = 'talk'; if (IT.kit === 'test') itKit(n); }
}
function itNew(kind: string, owner) { town.itemSeq = (town.itemSeq || 0) + 1; return { id: town.itemSeq, kind, wear: 1, owner: owner ? owner.id : null }; }
function itBeltAdd(n, ref: string) { if (!n.belt || n.belt.includes(ref)) return; const i = n.belt.indexOf(null); if (i > 0) n.belt[i] = ref; }
function itGiveTool(n, kind: string) { itEnsure(n); const it = itNew(kind, n); n.items.push(it); itBeltAdd(n, 'i' + it.id); return it; }
function itGiveStack(n, key: string, q: number) { itEnsure(n); n.bag[key] = (n.bag[key] || 0) + q; itBeltAdd(n, 's:' + key); }
/** the testing kit: every tool, lockpicks, each kind of seed, some coins */
function itKit(n) { if (typeof itGarden === 'function') itGarden(n); for (const k of ['axe', 'hammer', 'hoe', 'rod']) if (!n.items.some(i => i.kind === k)) itGiveTool(n, k); itGiveStack(n, 'lockpick', 5); itGiveStack(n, 'seed_barley', 20); itGiveStack(n, 'seed_turnip', 12); itGiveStack(n, 'seed_bean', 12); n.coin = (n.coin || 0) + 100; }
const itById = (n, id) => (n.items || []).find(i => i.id === id) || null;
/** what is in your hand: { ref, kind ('hand', a tool kind or a stack key), item, count } */
function itHeld(n): any {
  const ref = n && n.belt ? n.belt[n.sel || 0] : 'hand';
  if (!ref || ref === 'hand') return { ref: 'hand', kind: 'hand' };
  if (ref[0] === 'i') { const it = itById(n, +ref.slice(1)); return it ? { ref, kind: it.kind, item: it } : { ref: 'hand', kind: 'hand' }; }
  const k = ref.slice(2); return { ref, kind: k, count: (n.bag && n.bag[k]) || 0 };
}
const itMode = n => (n && n.mode) || 'talk';
const itHand = (n, mode?: string) => itHeld(n).kind === 'hand' && (!mode || itMode(n) === mode);
const itTalking = n => !n || !n.belt || itHand(n, 'talk');   // (villagers and an unsteered body always talk)

/* ---------------- which action needs what in your hand ---------------- */
function itNeedOf(key: string): string | null {
  if (/^tree/.test(key)) return 'axe'; if (/^rock/.test(key) || /^wall/.test(key)) return 'hammer'; if (/^fish/.test(key)) return 'rod';
  if (/^crop.*[ph]$/.test(key)) return 'hoe'; if (/^crop.*s$/.test(key)) return 'seed';
  if (/^(node|throw)/.test(key)) return 'hand'; if (/^lockpick/.test(key)) return 'lockpick'; if (/^search/.test(key)) return 'search'; if (/^(talk|stall|trade)/.test(key)) return 'talk';
  return null;
}
function itFits(n, need: string | null) {
  if (!need || !n.belt) return true; const h = itHeld(n);
  if (need === 'hand') return h.kind === 'hand'; if (IT_MODES.includes(need)) return h.kind === 'hand' && itMode(n) === need;
  if (need === 'seed') return !!(IT_STACKS[h.kind] && IT_STACKS[h.kind].seed && h.count > 0);
  return h.kind === need;
}
/** the belt slot (1-9) holding something that fits, or 0 */
function itSlotFor(n, need: string) { if (!n.belt) return 0; for (let i = 0; i < 9; i++) { const ref = n.belt[i]; if (!ref) continue; if (IT_MODES.includes(need) || need === 'hand') { if (ref === 'hand') return i + 1; continue; }
  if (need === 'seed') { if (ref.startsWith('s:seed_') && (n.bag[ref.slice(2)] || 0) > 0) return i + 1; continue; } if (ref === 's:' + need && (n.bag[need] || 0) > 0) return i + 1; if (ref[0] === 'i') { const it = itById(n, +ref.slice(1)); if (it && it.kind === need) return i + 1; } } return 0; }
const IT_NEED_NAME: any = { axe: 'the axe', hammer: 'the hammer', hoe: 'the hoe', rod: 'the fishing rod', seed: 'some seed', hand: 'an empty hand' };
/** what to do to get the right thing in hand, in a few words */
function itWant(n, need: string, verb?: string) {
  if (IT_MODES.includes(need)) { const s = itSlotFor(n, 'hand') || 1, onHand = itHeld(n).kind === 'hand', same = itMode(n) === need; return (verb ? verb + ': ' : '') + (onHand ? 'press Q for ' + IT_MODE_NAME[need] : same ? 'press ' + s + ' (hand)' : 'press ' + s + ', then Q for ' + IT_MODE_NAME[need]) + '.'; }
  const s = itSlotFor(n, need); return (verb ? verb + ': ' : '') + (s ? 'hold ' + IT_NEED_NAME[need] + ' (' + s + ').' : 'you have no ' + (IT_NEED_NAME[need] || need).replace(/^(the|some|an) /, '') + '.');
}
/** the gate: an action goes ahead only with the right thing in hand. Walkable ground lets you walk on; something solid tells you what to hold. */
function itGate(n, tg, walkOn: boolean) {
  if (!tg || !tg.key || !n.belt) return tg; const need = itNeedOf(tg.key);
  if (itFits(n, need)) {
    if (need === 'seed') { const h = itHeld(n), m = tg.key.match(/^crop(\d+),(\d+)s$/), c = m && cropAt(+m[1], +m[2]), run0 = tg.run, seed = IT_STACKS[h.kind].seed;
      return Object.assign({}, tg, { key: tg.key + ':' + seed, text: 'Sowing ' + seed, run(nn) { const was = c && c.st; run0(nn); if (c && c.st && !was) { c.seed = seed; nn.bag[h.kind] = Math.max(0, (nn.bag[h.kind] || 0) - 1); } } }); }
    if (IT_WEAR[need] && tg.run) { const run0 = tg.run; return Object.assign({}, tg, { run(nn) { run0(nn); itWearHeld(nn); } }); }   // tools wear as they are used (life2/items-trade.ts)
    return tg;
  }
  const what = (tg.key.match(/^(tree|rock|fish|wall|search|trade|stall)/) || [])[1], name: any = { tree: 'Tree', rock: 'Rock', fish: 'Water', wall: 'Wall', search: 'Search', trade: 'Counter', stall: 'Counter' };
  return walkOn ? null : { msg: (what ? name[what] + ': ' : '') + itWant(n, need) };
}

/* ---------------- what the thing in front of you is, and what the next bump will do ---------------- */
function itFacing(n): { what: string; verb: string; need: string | null } | null {
  const { x, y } = lf2Front(n); if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const o = lf2Occ(x, y, n), pr = lfPropAt(x, y), g = grid[y][x], c = cropAt(x, y), mode = itMode(n), hand = itHeld(n).kind === 'hand';
  if (o) return o.pose === 'sleep' ? { what: o.first, verb: 'asleep', need: null } : hand && mode === 'push' ? { what: o.first, verb: 'Push past', need: 'push' } : { what: o.first, verb: 'Talk', need: 'talk' };
  if (pr && pr.dispense) { const yi = YARD_ITEMS.find(q => q.kind === pr.dispense); return { what: (yi ? yi.name : 'Stand') + ' stand', verb: 'Take one (free)', need: 'talk' }; }
  if (pr && pr.kind === 'rock' && itHeld(n).kind === 'hammer') return { what: 'Loose rock', verb: 'Break', need: 'hammer' };
  if (pr && !pr.fixed && pr.kind !== 'rock' && itHeld(n).kind === 'hammer') return { what: cvCap(LF_NOUN[pr.kind]), verb: 'Smash', need: 'hammer' };
  if ((g === T.TABLE || g === T.BARREL || g === T.BED || g === T.SEAT) && itHeld(n).kind === 'hammer' && typeof pushFurniture === 'function' && pushFurniture(x, y)) return { what: cvCap(LF_NOUN[g === T.TABLE ? 'table' : g === T.BARREL ? 'barrel' : g === T.BED ? 'bed' : 'chair']), verb: 'Smash', need: 'hammer' };
  if (pr) { const nm = cvCap(LF_NOUN[pr.kind]); return hand && mode === 'search' ? { what: nm, verb: 'Search', need: 'search' } : { what: nm, verb: 'Push', need: 'push' }; }
  if (g === T.DOOR && typeof lf2DoorRoom === 'function' && LF2.on('nightlocks') && lf2Night()) { const r = lf2DoorRoom(x, y); if (r && r.kind === 'house' && r !== n.homeRoom && r.unbarred !== dayN() + ':' + n.id && !lf2InRoom(n, r)) return { what: r.name + ', barred', verb: 'Pick the lock', need: 'lockpick' }; }
  if (hand && mode === 'push' && typeof pushFurniture === 'function') { const fu = pushFurniture(x, y); if (fu) return { what: cvCap(fu.type === 'seat' ? 'chair' : fu.type), verb: 'Push', need: 'push' }; }
  if (g === T.ROCK && hand && mode === 'push') return { what: 'Rock', verb: 'Push', need: 'push' };
  if (bldHammerWall(x, y, itHeld(n).kind === 'hammer')) return { what: g === T.DOOR ? 'Door' : 'Wall block', verb: 'Break', need: 'hammer' };
  if (g === T.TREE) return { what: 'Tree', verb: 'Fell', need: 'axe' }; if (g === T.ROCK) return { what: 'Rock', verb: 'Break', need: 'hammer' };
  if (g === T.WATER) return { what: 'Water', verb: 'Fish', need: 'rod' };
  if (c) { const st = c.st ? cropStage(c) : 0; return !c.pl ? { what: 'Field', verb: 'Plough', need: 'hoe' } : c.st && st === 4 ? { what: 'Ripe ' + (c.seed || 'wheat'), verb: 'Harvest', need: 'hoe' } : c.st ? { what: cvCap(c.seed || 'wheat'), verb: 'growing', need: null } : { what: 'Ploughed field', verb: 'Sow', need: 'seed' }; }
  const nd = town.nodes && town.nodes.find(q => q.x === x && q.y === y && q.amt >= 1); if (nd) return { what: nd.kind === 'berry' ? 'Berries' : 'Herbs', verb: 'Gather', need: 'hand' };
  return null;
}

/* ---------------- keys: Q hand mode, 1-9 the belt, B the bag ---------------- */
function itSelect(n, i: number) { if (!n.belt || i < 0 || i > 8 || !n.belt[i]) return; n.sel = i; const p = n.player; if (p) { p.act = null; p.lock = false; p.skip = null; p.grace = null; } itSync(true); }
function itCycleMode(n) { if (!n.belt) return; if ((n.sel || 0) !== 0) n.sel = 0; else n.mode = IT_MODES[(IT_MODES.indexOf(itMode(n)) + 1) % IT_MODES.length]; const p = n.player; if (p) { p.act = null; p.lock = false; p.skip = null; p.grace = null; } itSync(true); }
window.addEventListener('keydown', e => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const n = game.player; if (!n || !n.player || (typeof talkUI !== 'undefined' && talkUI.o)) return;
  const k = (e.key || '').toLowerCase();
  if (k === 'q') { itCycleMode(n); e.preventDefault(); } else if (/^[1-9]$/.test(k)) { itSelect(n, +k - 1); e.preventDefault(); } else if (k === 'b') { itBag(!itBagOpen()); e.preventDefault(); } else if (k === 'escape' && itBagOpen()) { itBag(false); e.preventDefault(); }
});

/* ---------------- the hotbar and the bag ---------------- */
const IT_SVG: any = {
  talk: '<path d="M5 6h24a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H15l-7 6v-6H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 13h16M9 18h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  push: '<path d="M10 28V13a2 2 0 0 1 4 0v7M14 11V6a2 2 0 0 1 4 0v8M18 8a2 2 0 0 1 4 0v8M22 12a2 2 0 0 1 4 0v10c0 5-4 8-8 8h-3c-3 0-5-2-6-4l-3-6a2 2 0 0 1 3-2l2 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  search: '<circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M21 21l9 9" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
  axe: '<path d="M9 33L27 9" stroke="#9c6b3b" stroke-width="4" stroke-linecap="round"/><path d="M22 6c6-2 11 1 12 6-4-1-8 0-11 3z" fill="#aeb8c4" stroke="#2b2433" stroke-width="1.6"/>',
  hoe: '<path d="M8 34L26 8" stroke="#9c6b3b" stroke-width="4" stroke-linecap="round"/><path d="M22 10l10 4-3 6" fill="none" stroke="#aeb8c4" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
  hammer: '<path d="M8 34L24 12" stroke="#9c6b3b" stroke-width="4" stroke-linecap="round"/><rect x="17" y="5" width="16" height="10" rx="2" transform="rotate(35 25 10)" fill="#aeb8c4" stroke="#2b2433" stroke-width="1.6"/>',
  rod: '<path d="M6 34L30 6" stroke="#9c6b3b" stroke-width="3" stroke-linecap="round"/><path d="M30 6c3 8 3 16 0 22" fill="none" stroke="#dfe6ee" stroke-width="1"/><circle cx="30" cy="29" r="2.2" fill="#d04040"/>',
  lockpick: '<circle cx="12" cy="26" r="5" fill="none" stroke="#c8a24a" stroke-width="2.6"/><path d="M16 22L31 7M26 12l4 4M22 16l3 3" stroke="#c8a24a" stroke-width="2.6" stroke-linecap="round"/>',
  seed: c => `<path d="M11 12h16l3 20H8z" fill="${c}" stroke="#2b2433" stroke-width="2"/><path d="M11 12c2-5 14-5 16 0" fill="none" stroke="#2b2433" stroke-width="2"/><circle cx="19" cy="23" r="4" fill="#ffffff55"/>`,
};
const itIcon = (k: string, s = 30) => { const st = IT_STACKS[k], body = k === 'hand' ? IT_SVG.push : st && st.seed ? IT_SVG.seed(st.col) : IT_SVG[k] || ''; return `<svg width="${s}" height="${s}" viewBox="0 0 38 38" aria-hidden="true">${body}</svg>`; };
const itName = (k: string) => k === 'hand' ? 'Hand' : (IT_TOOLS[k] || IT_STACKS[k] || { name: k }).name;
function itSlotHTML(n, i: number, cls = 'hbslot') {
  const ref = n.belt[i]; let body = '', count = '', wear = '', title = 'Empty';
  if (ref === 'hand') { body = itIcon('hand'); title = 'Hand: ' + IT_MODE_NAME[itMode(n)]; }
  else if (ref && ref[0] === 'i') { const it = itById(n, +ref.slice(1)); if (it) { body = itIcon(it.kind); title = itName(it.kind); wear = `<i class="hbwear"><b style="width:${Math.round(it.wear * 100)}%"></b></i>`; } }
  else if (ref) { const k = ref.slice(2); body = itIcon(k); count = '<u>' + (n.bag[k] || 0) + '</u>'; title = itName(k); }
  return `<button type="button" class="${cls}${(n.sel || 0) === i ? ' on' : ''}" data-slot="${i}" title="${esc(title)}"><em>${i + 1}</em>${body}${count}${wear}</button>`;
}
let itSig = '';
function itSync(force?: boolean) {
  const hb = document.getElementById('hotbar'); if (!hb) return; const n = game.player;
  if (!n || !n.belt) { if (!hb.hidden) { hb.hidden = true; itSig = ''; } itBag(false); return; }
  const f = !(typeof talkUI !== 'undefined' && talkUI.o) && !(n.player && n.player.sleeping) ? itFacing(n) : null, ok = f && itFits(n, f.need);
  const face = !f ? '' : f.need === null ? `<b>${esc(f.what)}</b> · ${esc(f.verb)}` : ok ? `<b>${esc(f.what)}</b> → <b class="ok">${esc(f.verb)}</b>` : `<b>${esc(f.what)}</b> → ${esc(itWant(n, f.need, f.verb))}`;
  const sig = [n.sel, itMode(n), JSON.stringify(n.belt), JSON.stringify(n.bag), (n.items || []).map(i => i.id + ':' + i.wear.toFixed(2)).join(','), face].join('|');
  const hud = document.getElementById('hud'); hb.style.bottom = ((hud && !hud.hidden ? hud.offsetHeight : 0) + 16) + 'px';
  if (!force && sig === itSig && !hb.hidden) return; itSig = sig; hb.hidden = false;
  const mode = itMode(n), onHand = (n.sel || 0) === 0;
  hb.innerHTML = `<div class="hbmodes" title="Hand modes (Q)">${IT_MODES.map(m => `<button type="button" class="hbmode${onHand && mode === m ? ' on' : ''}" data-mode="${m}"><svg width="22" height="22" viewBox="0 0 34 34" aria-hidden="true">${IT_SVG[m]}</svg><span>${IT_MODE_NAME[m]}</span></button>`).join('')}</div>`
    + `<div class="hbslots">${n.belt.map((_, i) => itSlotHTML(n, i)).join('')}</div><div class="hbface">${face || '<span class="dim">Q hand mode · 1-9 belt · B bag</span>'}</div>`;
  if (itBagOpen()) itBagDraw();
}
function itBagOpen() { const b = document.getElementById('bagbox'); return !!(b && !b.hidden); }
function itBag(open: boolean) { const b = document.getElementById('bagbox'); if (!b) return; if (open && !(game.player && game.player.belt)) open = false; b.hidden = !open; if (open) itBagDraw(); }
function itBagDraw() {
  const b = document.getElementById('bagbox'), n = game.player; if (!b || !n || !n.belt) return;
  const goods = Object.entries<number>(n.inv || {}).filter(([g, q]) => q > 0).map(([g, q]) => `<div class="bgcell"><span class="bgname">${esc((GOODS[g] && GOODS[g].name) || GICON[g] || g)}</span><u>${q}</u></div>`);
  const stacks = Object.entries<number>(n.bag || {}).filter(([k, q]) => q > 0).map(([k, q]) => `<button type="button" class="bgcell${n.belt.includes('s:' + k) ? ' worn' : ''}" data-add="s:${k}">${itIcon(k, 28)}<span class="bgname">${esc(itName(k))}</span><u>${q}</u></button>`);
  const tools = (n.items || []).map(it => `<button type="button" class="bgcell${n.belt.includes('i' + it.id) ? ' worn' : ''}" data-add="i${it.id}">${itIcon(it.kind, 28)}<span class="bgname">${esc(itName(it.kind))}</span><i class="hbwear"><b style="width:${Math.round(it.wear * 100)}%"></b></i></button>`);
  const cells = [...tools, ...stacks, ...goods]; while (cells.length < 24) cells.push('<div class="bgcell empty"></div>');
  b.innerHTML = `<div class="bgwrap"><div class="bghead"><b>${esc(nameOf(n))} · Bag</b><span class="coin">${Math.floor(n.coin || 0)} denarii</span><button type="button" class="bgx" data-close="1" title="Close (B)">×</button></div>`
    + `<div class="bglab">Belt · 1-9 · click a slot to take it off</div><div class="bgbelt">${n.belt.map((_, i) => itSlotHTML(n, i, 'hbslot big')).join('')}</div>`
    + `<div class="bglab">Bag · click a tool or a stack to put it on the belt</div><div class="bggrid">${cells.join('')}</div></div>`;
}
(function () {
  const stage = canvas.parentNode; if (!stage) return;
  const css = document.createElement('style');
  css.textContent = '.hotbar{position:absolute;left:50%;transform:translateX(-50%);bottom:70px;display:flex;align-items:stretch;gap:10px;background:rgba(18,22,26,.9);border:1px solid #3a3226;border-radius:10px;padding:6px 8px;z-index:4;max-width:calc(100% - 20px)}.hotbar[hidden]{display:none}'
    + '.hbmodes,.hbslots{display:flex;gap:4px}.hbmode{width:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:#191d22;border:2px solid #3a3226;border-radius:7px;color:#9a927c;font-size:10px;padding:3px 0;cursor:pointer}'
    + '.hbmode.on{border-color:#e0a93b;background:#2a2314;color:#f3d796;box-shadow:0 0 10px #e0a93b44}.hbslot{position:relative;width:44px;height:44px;background:#171b20;border:2px solid #3a3226;border-radius:6px;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;color:#9a927c}'
    + '.hbslot.on{border-color:#e0a93b;background:#2a2314}.hbslot em{position:absolute;top:0;left:3px;font-size:9px;color:#6f6857;font-style:normal}.hbslot u{position:absolute;right:3px;bottom:0;font-size:10px;color:#f3d796;text-decoration:none}'
    + '.hbwear{position:absolute;left:4px;right:4px;bottom:3px;height:3px;background:#3a3226;border-radius:2px;overflow:hidden}.hbwear b{display:block;height:100%;background:#7fbf5a}'
    + '.hbface{align-self:center;min-width:170px;max-width:260px;font-size:12px;color:#d9d2c0;line-height:1.3}.hbface b{color:#f3d796}.hbface b.ok{color:#a8e07a}.hbface .dim{color:#7d7666;font-size:11px}'
    + '.bagbox{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,8,10,.6);z-index:6}.bagbox[hidden]{display:none}.bgwrap{background:#14181c;border:2px solid #3a3226;border-radius:12px;padding:14px 16px;max-width:96%;max-height:92%;overflow:auto;color:#d9d2c0}'
    + '.bghead{display:flex;align-items:center;gap:14px;margin-bottom:8px}.bghead b{color:#f3d796;letter-spacing:.06em}.bghead .coin{color:#e0a93b;margin-left:auto}.bgx{background:none;border:1px solid #3a3226;color:#d9d2c0;border-radius:6px;width:28px;height:28px;font-size:16px;cursor:pointer}'
    + '.bglab{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8d8570;margin:10px 0 6px}.bgbelt{display:flex;gap:5px;flex-wrap:wrap}.hbslot.big{width:54px;height:54px}'
    + '.bggrid{display:grid;grid-template-columns:repeat(6,78px);gap:5px}.bgcell{position:relative;height:64px;background:#101317;border:2px solid #2c2820;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#d9d2c0;padding:0;cursor:default}'
    + 'button.bgcell{cursor:pointer}.bgcell.worn{border-color:#5a4a2a}.bgcell.empty{opacity:.5}.bgname{font-size:9.5px;color:#a8a08c;margin-top:2px}.bgcell u{position:absolute;right:5px;top:3px;font-size:11px;color:#f3d796;text-decoration:none}'
    + '@media (max-width:700px){.hbmode{width:42px}.hbslot{width:34px;height:34px}.hbslot svg{width:22px;height:22px}.hbface{display:none}.bggrid{grid-template-columns:repeat(4,70px)}}';
  document.head.appendChild(css);
  const hb = document.createElement('div'); hb.id = 'hotbar'; hb.className = 'hotbar'; hb.hidden = true; stage.appendChild(hb);
  const bb = document.createElement('div'); bb.id = 'bagbox'; bb.className = 'bagbox'; bb.hidden = true; stage.appendChild(bb);
  const keep = e => { e.preventDefault(); canvas.focus({ preventScroll: true }); };
  hb.addEventListener('pointerdown', (e: any) => { const n = game.player; if (!n) return; const m = e.target.closest('[data-mode]'), s = e.target.closest('[data-slot]');
    if (m) { n.sel = 0; n.mode = m.dataset.mode; itSync(true); keep(e); } else if (s) { itSelect(n, +s.dataset.slot); keep(e); } });
  bb.addEventListener('click', (e: any) => { const n = game.player; if (!n || !n.belt) return; const c = e.target.closest('[data-close]'), a = e.target.closest('[data-add]'), s = e.target.closest('[data-slot]');
    if (c) { itBag(false); canvas.focus({ preventScroll: true }); return; }
    if (a) { const ref = a.dataset.add, i = n.belt.indexOf(ref); if (i < 0) itBeltAdd(n, ref); itBagDraw(); itSync(true); return; }
    if (s) { const i = +s.dataset.slot; if (i > 0 && n.belt[i]) { n.belt[i] = null; if (n.sel === i) n.sel = 0; itBagDraw(); itSync(true); } } });
  bb.addEventListener('pointerdown', (e: any) => { if (e.target === bb) { itBag(false); canvas.focus({ preventScroll: true }); } });
  setInterval(() => itSync(false), 200);
})();
