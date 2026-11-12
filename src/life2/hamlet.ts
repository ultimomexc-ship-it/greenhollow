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
  fam2(a, c, 'parent', 'child'); fam2(b, c, 'parent', 'child');
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
