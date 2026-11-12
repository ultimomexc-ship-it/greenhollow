/* The Hamlet: the minimum game (docs/minimum-game.md). Building and farming only, with a trader, a family and you. Everything else is switched off as modules
   (a recipe plus the rules in modules.ts: no bladder, no tool wear, no births or ageing, no death from hunger, no mushrooms). Nothing is deleted: each switch is an add-on for later. */

const HAMLET_SEEDS = ['barley', 'turnip', 'cabbage', 'poppy'];
/** the one trader: sells four seeds (the building items come in the next step) and buys every crop */
const HAMLET_TRADER_DEF: any = { buys: {} as any, sells: {} as any, open: [6, 19], tool: 'wipe', noun: 'trading stall' };
for (const k of HAMLET_SEEDS) HAMLET_TRADER_DEF.sells['seed_' + k] = IT_SEEDS[k] && IT_SEEDS[k].flower ? 14 : 30;
for (const g of Object.keys(GROCER_DEF.buys)) { HAMLET_TRADER_DEF.buys[g] = GROCER_DEF.buys[g] * 3; if (g !== 'flowers') HAMLET_TRADER_DEF.sells[g] = GROCER_DEF.buys[g] * 3; }   // (one stall for the whole island: three times the greengrocer's room)   // (he sells food too: a household whose fields fall short buys it back)
/** what the trader sells for the building kit, in coin each (the harness tunes these) */
const HAMLET_PRICES: Record<string, number> = { fence: 1, gate: 3, field: 2, bwall: 4, bwindow: 6, bdoor: 6, bed: 10 };
const HAMLET_BUILD = ['bwall', 'bwindow', 'bdoor', 'bed', 'fence', 'gate', 'field'];
const HAMLET_RECIPE = ['job.Farmer', 'sys.economy', 'sys.couples', 'sys.romance', 'sys.gossip', 'sys.smalllife', 'event.wedding'];
const HAMLET_OFF = ['bladder', 'wear', 'births', 'ageing', 'starving', 'mushrooms'];

function hamletStart() {
  town.scenario = 'hamlet'; town.farmEcon = true; town.farmDay0 = Math.floor(game.time / 1440); town.eco.exported = town.eco.exported || 0;
  const R = rng(town.seed + 6262), adults = npcs.filter(n => canControl(n) && n.age >= 20 && n.age <= 45);
  const P = adults.find(n => !n.female && n.age <= 36) || adults[0], TR = adults.find(n => n !== P && n.age >= 28) || adults.find(n => n !== P);
  if (!P || !TR) throw new Error('no settlers for the hamlet');
  npcs = [P, TR]; town.byId = new Map([[P.id, P], [TR.id, TR]]); town.founders = 2; town.hamletPlayer = P.id; town.tippingId = P.id;
  for (const k of [P, TR]) { for (const f of Object.keys(k.fam || {})) k.fam[f] = Array.isArray(k.fam[f]) ? [] : null; k.rel = {}; k.know = {}; k.aff = {}; k.homeRoom = null; k.bed = { owner: null }; k.seat = null; k.homeless = true; k.inv = k.inv || {}; }
  town.kit = {}; town.tents = []; clearTentTiles(); town.crops = []; town.fields = 0; town.chron = []; town.dead = [];
  // the family who landed just before you: a couple and a child, with no bed and a little money
  const sn = pick(R, SURNAMES), a: any = newPerson(R, 'Child', ri(R, 24, 32), town.used, { female: false, surname: sn }), b: any = newPerson(R, 'Child', ri(R, 22, 30), town.used, { female: true, surname: sn });
  setSpouse(a, b);
  const c: any = newPerson(R, 'Child', 7, town.used, { mother: b, father: a, surname: sn }); linkKin(b, a, c);
  for (const n of [a, b, c]) {
    n.adult = n.age >= 16; n.infant = false; n.age = ageNow(n); updateLook(n); n.rand = rng(town.seed + n.id * 977); n.jit = 0; n.bornHere = false;
    n.homeRoom = null; n.bed = { owner: null }; n.seat = null; n.homeless = true; routine(R, n); town.byId.set(n.id, n); initNpcSim(n); if (n.adult) setRole(n, 'Worker'); n.inv = n.inv || {};
    n.back = pick(R, VIS_ORD) + ', ' + pick(R, VIS_ARR); npcs.push(n);
  }
  for (const x of npcs) for (const y of npcs) if (x !== y && !x.know[y.id]) { x.know[y.id] = 4; x.aff[y.id] = 8; }
  fam2(a, c, 'parent', 'child'); fam2(b, c, 'parent', 'child'); town.hamletFamily = [a.id, b.id, c.id];
  // the world is a recipe: farming and building, couples and romance, all the talk; the rules of the world that the add-ons will bring back are off
  MODS.only(HAMLET_RECIPE.concat(Object.keys(MODS.defs).filter(k => k.startsWith('talk.')))); for (const r of HAMLET_OFF) MODS.set('rule.' + r, false); MODS.sync();
  // the trading stall by the camp, kept by the trader
  const mk: any = { id: town.markets.length + 1, x: town.cx + 3, y: town.cy + 4, name: 'The Trading Stall', stalls: [], plaza: town.markets[0].plaza.slice() }; town.markets.push(mk);   // (the stall stands on the camp ground: people gather on the same tiles)
  const sy = town.cy + 3, sx = town.cx + 2; setT(sx, sy, T.STALL); setT(sx + 1, sy, T.STALL);
  const st: any = { x: sx, y: sy + 1, face: { dx: 0, dy: -1 }, front: { x: sx, y: sy + 2 }, tiles: [{ x: sx, y: sy }, { x: sx + 1, y: sy }], owner: null, market: mk }; town.stalls.push(st); mk.stalls.push(st);
  setRole(TR, 'Trader', mk); const m = TR.shop;
  if (m) { m.def = HAMLET_TRADER_DEF; m.buys = HAMLET_TRADER_DEF.buys; m.sells = HAMLET_TRADER_DEF.sells; m.stock = {}; m.newStock = {}; m.n.coin = 60; farmRestock(); m.newStock = {}; m.stock.grain = 30; }
  // coin, beds and places
  P.coin = 60; a.coin = 12; b.coin = 8; c.coin = 0; a.inv.grain = 6; b.inv.grain = 6; a.inv.seed_barley = 4; b.inv.seed_turnip = 3; TR.coin = Math.max(TR.coin, 60);
  const taken = new Set<number>(); taken.add(st.front.y * W + st.front.x); taken.add(st.y * W + st.x);
  const spot = (x0: number, y0: number) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = x0 + dx, y = y0 + dy; if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || !walkable(x, y) || lfPropAt(x, y) || taken.has(y * W + x) || grid[y][x] === T.STALL) continue; taken.add(y * W + x); return { x, y }; } return { x: x0, y: y0 }; };
  const bedFor = (n: any, x0: number, y0: number) => { const p = spot(x0, y0), pr: any = lfAddProp('bed', p.x, p.y); pr.v = Math.floor(R() * 5); pr.rot = 0; pr.owner = n; n.bed = pr; return pr; };
  const put = (n: any, x0: number, y0: number) => { const p = spot(x0, y0); abortPlan(n); n.tx = n.x = p.x; n.ty = n.y = p.y; n.path = []; n.moving = false; n.pose = 'stand'; n.face = { dx: 0, dy: 1 }; };
  const cx = town.cx, cy = town.cy; if (!town.props) lfInitProps();
  bedFor(P, cx - 5, cy + 3); put(P, cx - 4, cy + 3);
  // the trader's own yard: a ring of fence with a gate, his bed inside (he pays no rent; it shows what a yard is)
  { const okT = (x: number, y: number) => x > 4 && y > 4 && x < W - 5 && y < (town.h0 || H) - 5 && (grid[y][x] === T.GRASS || grid[y][x] === T.PATH) && walkable(x, y) && !lfPropAt(x, y) && !taken.has(y * W + x) && !(town.nodeMap && town.nodeMap.has(y * W + x));
    let at: any = null;
    for (let r = 7; r < 22 && !at; r++) for (let k = 0; k < 40 && !at; k++) { const an = k / 40 * 6.283, x0 = Math.round(cx + Math.cos(an) * r * 1.2), y0 = Math.round(cy + Math.sin(an) * r); let ok = true; for (let j = -1; j <= 5 && ok; j++) for (let i = -1; i <= 6 && ok; i++) if (!okT(x0 + i, y0 + j)) ok = false; if (ok) at = { x: x0, y: y0 }; }
    if (at) { const gx = at.x + (at.x > cx ? 0 : 5), gy = at.y + 2;
      for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) if (i === 0 || j === 0 || i === 5 || j === 4) { const f: any = lfAddProp(at.x + i === gx && at.y + j === gy ? 'gate' : 'fence', at.x + i, at.y + j); f.rot = 0; taken.add((at.y + j) * W + at.x + i); }
      bedFor(TR, at.x + 2, at.y + 2); } else bedFor(TR, cx + 6, cy + 4); }
  put(TR, st.front.x, st.front.y);
  put(a, cx, cy + 1); put(b, cx + 1, cy + 1); put(c, cx, cy + 2);
  town.lfPV = (town.lfPV || 0) + 1; rebuildOcc(); refreshReach(); yardScan(true); yardHousing();
  chron('You came ashore with a little money and a bed. A trader keeps a stall by the camp, and a family landed just before you with nowhere to sleep. Build them a yard and they will pay to live in it.', 'note');
}

/* ---- stalls as upgrades (step 7): the seed stall and the carpenter's stall, built by you once the island has earned them, kept by a villager ---- */
const HAMLET_STALLS = ['stallseed', 'stallcarp'];
HAMLET_PRICES.stallseed = 20; HAMLET_PRICES.stallcarp = 30;
const HAMLET_UNLOCK: Record<string, string> = { stallseed: 'seedstall', stallcarp: 'carpenter' };
/** the seed stall: every food seed and every flower, 20% below the trader */
const HAMLET_SEEDSTALL_DEF: any = { buys: {}, sells: Object.assign({}, SEED_DEF.sells), open: [6.5, 17], tool: 'wipe', noun: 'seed stall', disc: 0.8, range: FARM_SEED_ORDER };
/** the carpenter's stall: the building kit, 25% below the trader (`matDisc`: the later discount for bringing wood or stone: nothing uses it yet) */
const HAMLET_CARP_DEF: any = { buys: {}, sells: {}, open: [7, 17], tool: 'wipe', noun: 'carpenter', disc: 0.75, kit: true, matDisc: null };
/** what the build menu and the trader's kit list offer now: the seven, and the stalls that are unlocked */
const hamletBuildKinds = (): string[] => HAMLET_BUILD.concat(HAMLET_STALLS.filter(k => hamletUnlocked(HAMLET_UNLOCK[k])));
const hamletUnlocked = (key: string): boolean => !!(town && town.unlock && town.unlock[key]);
/** the progression step calls this (a test can too): the stall becomes buildable */
function hamletUnlock(key: string) {
  if (!town.unlock) town.unlock = {}; if (town.unlock[key]) return; town.unlock[key] = true;
  const k = Object.keys(HAMLET_UNLOCK).find(q => HAMLET_UNLOCK[q] === key), pl = game.player;
  if (k) { chron(`The ${LF_NOUN[k]} can be built now. The trader sells it (${HAMLET_PRICES[k]} coin).`, 'note'); if (pl && pl.player) playerSay(pl, `The ${LF_NOUN[k]} is on the build menu (I) and at the trader's, for ${HAMLET_PRICES[k]} coin.`); }
}
/** every stall the Hamlet has keeps its goods up and some change in its till at six */
function hamletRestock() {
  if (!yardOn()) return;
  for (const m of merchants) {
    if (![HAMLET_TRADER_DEF, HAMLET_SEEDSTALL_DEF].includes(m.def)) { if (m.def === HAMLET_CARP_DEF && m.n.coin < 25) m.n.coin += 25; continue; }
    for (const g of Object.keys(m.sells)) { if (g.startsWith('seed_') && !(m.def.range || HAMLET_SEEDS).includes(g.slice(5))) continue; const cap0 = m.sells[g], was = m.stock[g] || 0; if (was >= cap0 * 0.9) continue; m.stock[g] = Math.round(cap0 * (0.8 + Math.random() * 0.2)); m.n.coin -= Math.min(Math.max(0, m.n.coin), Math.round((m.stock[g] - was) * GOODS[g].base * 0.4)); }
    if (m.n.coin < 25) m.n.coin += 25;
  }
}
LF2.hourly.push((h: number) => { if (h === 6) hamletRestock(); });
/** who keeps a new stall: an adult who is not the player or already a keeper, from a household with another adult if there is one */
function hamletKeeper(): any {
  const pl = yardPlayer(), ad = npcs.filter((n: any) => !n.dead && n !== pl && !n.shop && n.age >= 18 && n.age < 65 && n.role === 'Worker');
  const score = (n: any) => { const y = yardOfN(n); return (y ? yardPeople(y).filter((o: any) => o.age >= 16).length : 0) * 2 - (n.moveBed ? 5 : 0) + (n.homeless ? -1 : 0); };
  return ad.sort((a: any, b: any) => score(b) - score(a) || a.id - b.id)[0] || null;
}
/** the four tiles a stall needs in front of you: the counter (two wide), the keeper's place and the customers' place */
function bldPlaceStall(n: any, kind: string) {
  if (!kitHas(kind)) { kitOut(n, kind); return null; }
  const f = lf2Front(n), sx = f.x, sy = f.y, need = [[sx, sy], [sx + 1, sy], [sx, sy + 1], [sx, sy + 2], [sx + 1, sy + 1], [sx + 1, sy + 2]];
  for (const [x, y] of need) { const g = grid[y] && grid[y][x]; if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || (g !== T.GRASS && g !== T.PATH) || roomAt[y][x] >= 0 || lfPropAt(x, y) || tileOwner.get(y * W + x) || (town.nodeMap && town.nodeMap.has(y * W + x)) || (x === n.tx && y === n.ty) || (typeof yardAtXY === 'function' && yardAtXY(x, y))) { playerSay(n, 'A stall needs a clear patch of ground, three tiles deep and two wide, outside any yard.'); return null; } }
  const keeper = hamletKeeper(); if (!keeper) { playerSay(n, 'Nobody is free to keep a stall.'); return null; }
  const mk: any = { id: town.markets.length + 1, x: sx, y: sy + 1, name: kind === 'stallseed' ? 'The Seed Stall' : 'The Carpenter', stalls: [], plaza: [] }; town.markets.push(mk);
  setT(sx, sy, T.STALL); setT(sx + 1, sy, T.STALL); markDirty(sx - 1, sy - 1, 4, 5);
  const st: any = { x: sx, y: sy + 1, face: { dx: 0, dy: -1 }, front: { x: sx, y: sy + 2 }, tiles: [{ x: sx, y: sy }, { x: sx + 1, y: sy }], owner: null, market: mk, built: kind }; town.stalls.push(st); mk.stalls.push(st);
  kitTake(kind); setRole(keeper, 'Trader', mk); const m = keeper.shop;
  if (!m) { setT(sx, sy, T.GRASS); setT(sx + 1, sy, T.GRASS); town.stalls = town.stalls.filter((q: any) => q !== st); town.markets = town.markets.filter((q: any) => q !== mk); kitGive(kind); playerSay(n, 'The stall could not be set up.'); return null; }
  const D = kind === 'stallseed' ? HAMLET_SEEDSTALL_DEF : HAMLET_CARP_DEF; m.def = D; m.buys = D.buys; m.sells = D.sells; m.stock = {}; m.newStock = {}; m.n.coin = 40; if (kind === 'stallseed') hamletRestock();
  town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; refreshReach(); sndPlace(); yardHousing();
  chron(`${nameOf(keeper)} opened ${kind === 'stallseed' ? 'a seed stall' : 'the carpenter\'s stall'}.`, 'build'); LIFE.emit('stall_opened', keeper, { place: D.noun });
  playerSay(n, `${keeper.first} will keep the ${D.noun}.`); return st;
}
/** the hammer takes a stall you built down (the keeper goes back to ordinary work, the stall comes back to your kit) */
function bldDeleteStall(x: number, y: number): boolean {
  const st = (town.stalls || []).find((q: any) => q.built && (q.tiles || []).some((t: any) => t.x === x && t.y === y)); if (!st) return false;
  const k = st.built, o = st.owner; if (o) { dropMerchant(o); o.cur = null; o.curUntil = 0; setRole(o, 'Worker'); o.job = 'Farmer'; if (typeof abortPlan === 'function') abortPlan(o); }
  for (const t of st.tiles) { setT(t.x, t.y, T.GRASS); markDirty(t.x, t.y, 1, 1); } town.stalls = town.stalls.filter((q: any) => q !== st); if (st.market) town.markets = town.markets.filter((q: any) => q !== st.market);
  kitGive(k); town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; refreshReach(); return true;
}
/** the carter calls at the trader's every six hours and takes what is over 40% of his room, at half price, so the stall keeps buying (the farming village's carter came once a day and left 70%: on one stall for a whole island that stopped the money) */
function hamletCarter() {
  if (!yardOn()) return; const m = merchants.find((q: any) => q.def === HAMLET_TRADER_DEF); if (!m) return;
  for (const g of Object.keys(m.buys)) { const over = (m.stock[g] || 0) - Math.floor(m.buys[g] * 0.4); if (over < 2) continue; m.stock[g] -= over; m.n.coin += Math.round(over * GOODS[g].base * 0.5); town.eco.exported = (town.eco.exported || 0) + over; }
}
LF2.hourly.push((h: number) => { if (h % 6 === 0) hamletCarter(); });
