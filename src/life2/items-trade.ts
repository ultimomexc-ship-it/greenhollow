/* ================= life2 / items-trade: items in the economy =================
   Tools are real things for everyone. Each working villager owns the tool for their work (an axe, a hammer, a hoe, a rod); it wears as they work
   (n.toolQ is its wear, 0-100, kept in step with the item), and a worn-out one is replaced at the smith or the Taberna: the old one is thrown away and a
   new one bought. The player's tools wear with every tree, rock, furrow, harvest and catch, and break when worn out.
   Iron: breaking a rock now and then turns up iron ore (the player keeps it and can sell it to the smith; a stonecutter takes it to the smithy). The
   smith turns ore straight into tools. The caravan still brings the smithy a little iron each day, so the village never runs dry (a safety valve).
   Seeds: barley (the staple), turnips (quick) and beans; each grows at its own pace and gives its own food, and a harvest gives a seed or two back.
   The Taberna sells seed; the player has a garden plot by home that the farmers leave alone.
   Lockpicks: a lockpick in hand opens a house that is barred for the night (it may snap; somebody inside may hear). The smith sells them, quietly, to friends.
   The sawmill: a Miller saws logs into planks (2 logs -> 3 planks). Planks are sold there, and count as timber on a building site.                     */
Object.assign(GOODS, { copper: { base: 5, name: 'copper ore' }, gold: { base: 14, name: 'gold nuggets' }, turnip: { base: 2, sat: 30, name: 'turnips' }, beans: { base: 2, sat: 28, name: 'beans' }, potato: { base: 2, sat: 32, name: 'potatoes' }, cabbage: { base: 2, sat: 26, name: 'cabbages' }, tomato: { base: 2, sat: 22, name: 'tomatoes' }, corn: { base: 2, sat: 30, name: 'corn' }, pumpkin: { base: 3, sat: 34, name: 'pumpkins' }, strawberries: { base: 3, sat: 20, name: 'strawberries' }, carrot: { base: 2, sat: 26, name: 'carrots' }, seeds: { base: 2, name: 'seed' }, planks: { base: 3, name: 'planks' } });
FOODS.push('turnip', 'beans', 'potato', 'cabbage', 'tomato', 'corn', 'pumpkin', 'strawberries', 'carrot');
Object.assign(GICON, { copper: 'copper ore', gold: 'gold', turnip: 'turnips', beans: 'beans', potato: 'potatoes', cabbage: 'cabbages', tomato: 'tomatoes', corn: 'corn', pumpkin: 'pumpkins', strawberries: 'strawberries', carrot: 'carrots', planks: 'planks', iron: 'iron ore', stone: 'stone' });
Object.assign(LF2_BLD, { mill: 'The Sawmill' }); (BUILDING as any).mill = 1;
Object.assign(LF2_SELL, { mill: { planks: 10 } }); (LF2_SELL.shop as any).seeds = 8;
Object.assign(LF2_JOBS, { Miller: { name: 'Miller', room: 'mill', spot: 'saw', tool: 'axe', text: 'Sawing logs into planks', recipe: { in: { wood: 2 }, out: { planks: 3 }, min: 50 }, fetch: { wood: 6 }, fit: ['early bird', 'brave'] } });
LF2_JOBORDER.push('Miller');

/* ---------------- tools for everyone ---------------- */
/** the tool a villager's work needs (null: their hands) */
const IT_JOB_TOOL: any = { Woodcutter: 'axe', Stonecutter: 'hammer', Farmer: 'hoe', Fisher: 'rod', Builder: 'hammer', Smith: 'hammer', Labourer: 'hammer', Miller: 'axe' };
const itWorkTool = n => IT_JOB_TOOL[n.job] || IT_JOB_TOOL[n.cur] || (n.role === 'Worker' ? 'hoe' : null);
/** the villager's own work tool (made when first needed, at their current wear) */
function itNpcTool(n) {
  if (!n || n.dead || n.player || n.age < 16) return null; itEnsure(n);
  let it: any = n.items.find(i => i.work); const kind = itWorkTool(n); if (!kind) return it || null;
  if (!it) { it = itNew(kind, n) as any; it.work = true; it.wear = (n.toolQ == null ? 100 : n.toolQ) / 100; n.items.push(it); }
  return it;
}
/** a new tool bought: the worn one is thrown away */
function itNpcNewTool(n) { itEnsure(n); n.items = n.items.filter(i => !i.work); const it: any = itNew(itWorkTool(n) || 'hoe', n); it.work = true; n.items.push(it); n.toolQ = 100; return it; }
/* keep each villager's tool and their wear number in step (the wear itself is worked out in life2/town.ts) */
LF2.tickers.push(() => { if ((town.itT || 0) > game.time) return; town.itT = game.time + 30;
  for (const n of npcs) { if (n.dead || n.player || n.age < 16 || n.toolQ == null) continue; const it = itNpcTool(n); if (it) it.wear = Math.max(0, Math.min(1, n.toolQ / 100)); } });

/** the player's tool wears a little with each use, and breaks when it is worn out */
const IT_WEAR: any = { axe: 0.03, hammer: 0.025, hoe: 0.015, rod: 0.02 };
/** the tool that was just used (picked for you) wears, and breaks when worn out */
function itWearTool(n, kind: string) {
  const it = (n.items || []).filter(i => i.kind === kind).sort((a, b) => b.wear - a.wear)[0]; if (!it || !IT_WEAR[kind]) return; it.wear = Math.max(0, it.wear - IT_WEAR[kind]);
  if (it.wear <= 0) { n.items = n.items.filter(i => i !== it); playerSay(n, `Your ${itName(kind).toLowerCase()} broke. The smith sells new ones.`); }
  else if (it.wear < 0.15 && !it.warned) { it.warned = true; playerSay(n, `Your ${itName(kind).toLowerCase()} is nearly worn through.`); }
}
function itWearHeld(n) {
  const h = itHeld(n); if (!h.item || !IT_WEAR[h.kind]) return; h.item.wear = Math.max(0, h.item.wear - IT_WEAR[h.kind]);
  if (h.item.wear <= 0) { n.items = n.items.filter(i => i !== h.item); const i = n.belt.indexOf(h.ref); if (i > 0) n.belt[i] = null; n.sel = 0; playerSay(n, `Your ${itName(h.kind).toLowerCase()} broke. The smith sells new ones.`); }
  else if (h.item.wear < 0.15 && !h.item.warned) { h.item.warned = true; playerSay(n, `Your ${itName(h.kind).toLowerCase()} is nearly worn through.`); }
}

/* ---------------- iron from rocks ---------------- */
const IT_ORE = 0.18;
/** breaking a rock: now and then there is iron ore in it (for the player: into your pack; for a stonecutter: straight to the smithy) */
function itRockOre(n) {
  if (Math.random() >= IT_ORE) return false;
  if (n.player) { n.inv.iron = (n.inv.iron || 0) + 1; return true; }
  const sm = lf2Room('smithy'); if (sm) { lf2Stock(sm).iron = (lf2Stock(sm).iron || 0) + 1; sm.till = Math.max(0, (sm.till || 0) - 2); n.coin = (n.coin || 0) + 2; } return true;
}

/* ---------------- seeds ---------------- */
const IT_SEEDS: any = {
  barley: { grow: 1, yield: 'grain', q: 3, word: 'barley' }, turnip: { grow: 0.55, yield: 'turnip', q: 3, word: 'turnips', col: '#b58ac4' }, bean: { grow: 0.8, yield: 'beans', q: 3, word: 'beans', col: '#8fb07a' },
  // the rest of the crops (after the harvest moon list): each has its own plant, grown through four stages
  potato: { grow: 0.9, yield: 'potato', q: 3, word: 'potatoes', col: '#c49a62' }, cabbage: { grow: 1.1, yield: 'cabbage', q: 2, word: 'cabbages', col: '#9bd08a' }, tomato: { grow: 0.95, yield: 'tomato', q: 4, word: 'tomatoes', col: '#e23a2c' },
  corn: { grow: 1.25, yield: 'corn', q: 3, word: 'corn', col: '#f2d04a' }, pumpkin: { grow: 1.4, yield: 'pumpkin', q: 2, word: 'pumpkins', col: '#e8832a' }, strawberry: { grow: 0.7, yield: 'strawberries', q: 4, word: 'strawberries', col: '#e0283a' }, carrot: { grow: 0.65, yield: 'carrot', q: 3, word: 'carrots', col: '#f08a1c' },
  // flowers: nobody eats them, they are for decorating the island. They bloom and stay in bloom for FLOWER_LIFE days, then wither and want planting again
  lavender: { grow: 0.6, flower: true, word: 'lavender', col: '#8a5ad0' }, poppy: { grow: 0.5, flower: true, word: 'poppies', col: '#e8281c' }, daisy: { grow: 0.4, flower: true, word: 'daisies', col: '#fffaf0' }, marigold: { grow: 0.5, flower: true, word: 'marigolds', col: '#f08a14' }, rose: { grow: 0.9, flower: true, word: 'roses', col: '#d82a52' },
};
const FLOWER_LIFE = 40 * 1440;
for (const sd of Object.keys(IT_SEEDS)) if (!IT_STACKS['seed_' + sd]) IT_STACKS['seed_' + sd] = { name: IT_SEEDS[sd].word.charAt(0).toUpperCase() + IT_SEEDS[sd].word.slice(1) + ' seed', seed: sd, col: IT_SEEDS[sd].col || '#c9a96a' };
const itIsFlower = c => !!(c.seed && IT_SEEDS[c.seed] && IT_SEEDS[c.seed].flower);
/** a flower that has bloomed for its whole life: withered, to be cleared and planted again */
const itWilted = c => itIsFlower(c) && !!c.st && game.time - c.t0 > itGrow(c) + FLOWER_LIFE;
const itGrow = c => GROW * ((IT_SEEDS[c.seed] || IT_SEEDS.barley).grow);
/** harvesting a plot: the food it gives, and (for the player) a seed or two back */
function itHarvest(n, c) {
  town.tut = town.tut || { harvests: 0 }; town.tut.harvests++;
  const S = IT_SEEDS[c.seed] || IT_SEEDS.barley, Y = S.flower ? 'flowers' : S.yield, Q = S.flower ? 4 : S.q; n.inv[Y] = (n.inv[Y] || 0) + Q; c.st = 0;
  LIFE.emit('harvested', n, { item: Y, qty: Q, crop: c.seed || 'barley' });
  if (!n.player && town.farmEcon && farmSeedCount(n) < 12) n.inv['seed_' + (c.seed || 'barley')] = (n.inv['seed_' + (c.seed || 'barley')] || 0) + 1;   // (a farmer keeps seed back from every harvest)
  if (n.player) sndPick();
  let back = 0; if (n.player) { back = 1 + (Math.random() < 0.5 ? 1 : 0); itGiveStack(n, 'seed_' + (c.seed || 'barley'), back); }
  c.seed = null; return { q: S.q, what: GOODS[S.yield] ? GOODS[S.yield].name : S.yield, back };
}
/** the farmers leave alone the player's garden and anything the player sowed */
const itFarmersPlot = c => !c.garden && (!c.seed || c.seed === 'barley' || !c.byPlayer);

/* ---------------- the player's garden by home ---------------- */
function itGarden(n) {
  if (!n || !n.homeRoom || town.crops.some(c => c.garden === n.id)) return;
  const r = n.homeRoom, cand: number[][] = [], free = (x, y) => x > 2 && y > 2 && x < W - 3 && y < H - 3 && (grid[y][x] === T.GRASS || grid[y][x] === T.SAND) && roomAt[y][x] < 0 && !(town.siteAt && town.siteAt[y * W + x]) && !lfPropAt(x, y) && !town.crops.some(c => c.x === x && c.y === y);
  for (let d = 1; d < 8 && !cand.length; d++) for (let y = r.y - d - 1; y <= r.y + r.h + d; y++) for (let x = r.x - d - 2; x <= r.x + r.w + d; x++) {
    let ok = true; for (let j = 0; j < 2 && ok; j++) for (let i = 0; i < 3; i++) if (!free(x + i, y + j)) { ok = false; break; } if (ok) { cand.push([x, y]); }
  }
  if (!cand.length) return; const [gx, gy] = cand[0], f = 'garden' + n.id;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { setT(gx + i, gy + j, T.CROP); town.crops.push({ x: gx + i, y: gy + j, f, pl: 0, st: 0, t0: 0, garden: n.id }); }
  markDirty(gx, gy, 3, 2); if (typeof refreshReach === 'function') refreshReach(); n.gardenAt = { x: gx, y: gy };
}

/* ---------------- what the player can buy and sell at a counter ---------------- */
/** the menu lines for one good (null: the ordinary line) */
function itOffers(n, r, g, menu): any[] | null {
  if (!n.belt) return null; const s = lf2Stock(r), k = lf2Server(r);
  const sell = (label, price, give, stockKey, say?) => [`${label}: ${(s[stockKey] || 0) > 0 ? price + LF2_COIN : 'sold out'}`, () => {
    if (!((s[stockKey] || 0) > 0)) return { say: 'We\'re out of those. Come back tomorrow.', opts: menu() };
    if (n.coin < price) return { say: `That's ${price} denarii, and you have ${Math.floor(n.coin)}.`, opts: menu() };
    n.coin -= price; r.till = (r.till || 0) + price; s[stockKey]--; give(); return { say: say || anyOf(['There you are.', 'Look after it.', 'Pleasure doing business.']), opts: menu() }; }];
  if (g === 'tools') return ['axe', 'hammer', 'hoe', 'rod'].map(t => sell(itName(t), lf2Price(r, 'tools', n) + (t === 'rod' ? -4 : 0), () => itGiveTool(n, t), 'tools', t === 'rod' ? 'A good rod. Mind the line.' : null));
  if (g === 'seeds') return Object.keys(IT_SEEDS).map(sd => sell(`${cvCap(IT_SEEDS[sd].word)} seed, a handful of 4`, lf2Price(r, 'seeds', n), () => itGiveStack(n, 'seed_' + sd, 4), 'seeds', sd === 'turnip' ? 'Turnips come up quick. Don\'t let the goats see.' : null));
  return null;
}
/** extra lines at a counter: selling iron to the smith, and lockpicks under the counter for friends */
function itExtras(n, r, menu): any[] {
  if (!n.belt || r.kind !== 'smithy') return []; const s = lf2Stock(r), k = lf2Server(r), out: any[] = [];
  const ore = n.inv.iron || 0, pay = Math.max(2, Math.round((GOODS as any).iron.base * 0.8));
  if (ore > 0) out.push([`Sell iron ore: ${pay}${LF2_COIN} each (you have ${ore})`, () => { n.inv.iron--; n.coin += pay; s.iron = (s.iron || 0) + 1; r.till = Math.max(0, (r.till || 0) - pay); return { say: anyOf(['Good ore, that. I can use it.', 'Iron! Where did you find this? Never mind. Thank you.']), opts: menu() }; }]);
  if (k && (k.aff[n.id] || 0) >= 25) out.push([`Lockpicks, quietly: 8${LF2_COIN} for two`, () => {
    if ((s.iron || 0) < 1) return { say: 'No iron to spare for those just now.', opts: menu() }; if (n.coin < 8) return { say: 'Eight denarii. You haven\'t got it.', opts: menu() };
    n.coin -= 8; r.till = (r.till || 0) + 8; s.iron--; itGiveStack(n, 'lockpick', 2); return { say: anyOf(['You didn\'t get these from me.', 'For your own door, I\'m sure. Keep them out of sight.']), opts: menu() }; }]);
  return out;
}

/* ---------------- picking a lock ---------------- */
/** with a lockpick in hand, a house barred for the night can be opened. The pick may snap; somebody inside may hear. */
function itPickLock(n, r) {
  const left = (n.bag.lockpick || 0); if (left <= 0) { playerSay(n, 'You have no lockpicks left.'); return; }
  const inside = npcs.filter(q => !q.dead && lf2InRoom(q, r)); let heard = null;
  for (const q of inside) if (Math.random() < (q.pose === 'sleep' ? (lf2Has(q, 'anxious') ? 0.25 : 0.06) : 0.5)) heard = q;
  if (Math.random() < 0.3) { n.bag.lockpick = left - 1; playerSay(n, 'Snap. The lockpick broke in the lock.' + (left - 1 > 0 ? '' : ' That was the last one.')); return; }
  if (heard) { if (heard.pose === 'sleep') { heard.pose = 'stand'; abortPlan(heard); } lfShout(heard, anyOf(['Who\'s there?!', 'I hear you! Get away from my door!', 'Thieves! Wake up, everyone!']));
    lfEmit('breakin', { actor: n, target: heard, sev: 2, loud: true, tags: ['trespass', 'crime'], text: `${n.first} tried to break into ${r.name} in the night` }); return; }
  if (Math.random() < 0.35) { playerSay(n, 'It won\'t give. Try again.'); return; }
  r.unbarred = dayN() + ':' + n.id; playerSay(n, 'Click. The bar lifts.');
  lfEmit('breakin', { actor: n, target: lf2RoomHead(r), sev: 2, aware: false, tags: ['trespass', 'crime'], chron: false, text: `${n.first} picked the lock of ${r.name} in the night` });
}
LF2.pre.unshift({ player(n, p, fx, fy) {
  if (!n.belt || !LF2.on('nightlocks') || !lf2Night() || !grid[fy] || grid[fy][fx] !== T.DOOR) return null;
  const r = lf2DoorRoom(fx, fy); if (!r || r.kind !== 'house' || r === n.homeRoom || r.unbarred === dayN() + ':' + n.id || lf2InRoom(n, r)) return null;
  if (itHeld(n).kind !== 'lockpick') { const s = itSlotFor(n, 'lockpick'); return { msg: `${r.name} is barred for the night.` + (s ? ` (A lockpick would open it: ${s}.)` : '') }; }
  return { key: 'lockpick' + r.id, min: 8, text: 'Picking the lock', tool: 'pick', run(nn) { itPickLock(nn, r); } };
} });

/* ---------------- once a day: the shops restock what is not made in the village ---------------- */
LF2.hourly.push(h => { if (h !== 21) return;
  // the sawmill takes on a miller once the village is eating well (and gives them back to the fields when food is short: see lf2Payday)
  const mill = lf2Room('mill'), fd = typeof foodDaysNow === 'function' ? foodDaysNow() : 3;
  const spare = npcs.filter(n => !n.dead && !n.player && n.role === 'Worker' && n.age >= 18 && n.age < 60 && !LF2_JOBS[n.job] && !n.shop && !((n.lf2NoTrade || 0) > game.time));
  if (mill && fd >= 0.45 && spare.length >= 4 && !npcs.some(n => !n.dead && n.job === 'Miller')) { const c = spare.sort((a, b) => (lf2Has(b, 'early bird') + lf2Has(b, 'brave')) - (lf2Has(a, 'early bird') + lf2Has(a, 'brave')))[0]; if (c) lf2SetJob(c, 'Miller', false); }
  const sh = lf2Room('shop'); if (sh) { const s = lf2Stock(sh); if ((s.seeds || 0) < 8) s.seeds = (s.seeds || 0) + 3; } });

/** the miller fells their own logs (one or two trees), carries them to the sawmill and stacks them by the saw */
function itMillerLogs(n, r) {
  if (typeof woodPlan !== 'function') return null; const a = woodPlan(n); if (!a) return null; const b = handsMax(n) > 1 ? woodPlan(n) : null;
  return a.concat(b || [], [goS(lf2Spot(r, 'front') || lf2Spot(r, 'saw'), 'Carrying logs to the sawmill'), waitS(1, 'stand', 'Stacking the logs by the saw', { nopie: true, onEnd(nn) { const q = nn.inv.wood || 0; if (q > 0) { const s = lf2Stock(r); s.wood = (s.wood || 0) + q; nn.inv.wood = 0; } } })]);
}
