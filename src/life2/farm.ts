/* The farming economy (docs/world-modules.md): seeds and cut flowers are goods, a seed seller and a greengrocer keep stalls, farmers buy seed with real money, keep some back from every
   harvest, and sell what they grow. It is switched on by `town.farmEcon` (the Ready Farming Village sets it); everywhere else farming behaves as before. */

const FARM_SEED_PRICE: any = { barley: 1, turnip: 2, bean: 2, carrot: 2, potato: 2, cabbage: 3, tomato: 3, corn: 3, strawberry: 4, pumpkin: 4, daisy: 2, marigold: 2, poppy: 2, lavender: 3, rose: 5 };
for (const k of Object.keys(IT_SEEDS)) (GOODS as any)['seed_' + k] = { base: FARM_SEED_PRICE[k] || 3, name: k + ' seeds', seed: k };
(GOODS as any).flowers = { base: 3, name: 'flowers' };
const FARM_YIELDS: string[] = Object.keys(IT_SEEDS).filter(k => !IT_SEEDS[k].flower && IT_SEEDS[k].yield && IT_SEEDS[k].yield !== 'grain').map(k => IT_SEEDS[k].yield);
for (const g of FARM_YIELDS) { if (!SELLABLE.includes(g)) SELLABLE.push(g); if ((GOODS as any)[g] && (GOODS as any)[g].sat && !FOODS.includes(g)) FOODS.push(g); }
if (!SELLABLE.includes('flowers')) SELLABLE.push('flowers');

/** the order in which the seed seller comes to stock things: new kinds turn up every two days (and the island talks about it) */
const FARM_SEED_ORDER = ['barley', 'turnip', 'bean', 'carrot', 'potato', 'cabbage', 'daisy', 'tomato', 'corn', 'marigold', 'pumpkin', 'strawberry', 'poppy', 'lavender', 'rose'];
const farmSeedRange = (): string[] => { if (town && town.scenario === 'hamlet') return HAMLET_SEEDS; const d = Math.floor(game.time / 1440) - (town.farmDay0 || 0); return FARM_SEED_ORDER.slice(0, Math.min(FARM_SEED_ORDER.length, 4 + Math.floor(d / 2) + (d >= 1 ? 1 : 0))); };

const SEED_DEF: any = { buys: {}, sells: {} as any, open: [6.5, 17], tool: 'wipe', noun: 'seed stall' };
for (const k of FARM_SEED_ORDER) SEED_DEF.sells['seed_' + k] = IT_SEEDS[k] && IT_SEEDS[k].flower ? 14 : 30;
const GROCER_DEF: any = { buys: { grain: 30, flowers: 24 } as any, sells: { grain: 30, flowers: 24 } as any, open: [7, 18.5], tool: 'wipe', noun: 'greengrocer' };
for (const g of FARM_YIELDS) { GROCER_DEF.buys[g] = 24; GROCER_DEF.sells[g] = 24; }
const farmSeller = () => merchants.find((m: any) => m.def === SEED_DEF) || merchants.find((m: any) => m.def === HAMLET_TRADER_DEF);   // (the Hamlet's one trader sells the seed and buys the crops)
const farmGrocer = () => merchants.find((m: any) => m.def === GROCER_DEF) || merchants.find((m: any) => m.def === HAMLET_TRADER_DEF);

/** a farmer's seeds in hand, by kind */
const farmSeedsOf = (n: any): [string, number][] => Object.keys(n.inv || {}).filter(g => g.startsWith('seed_') && n.inv[g] > 0).map(g => [g.slice(5), n.inv[g]] as [string, number]);
const farmSeedCount = (n: any) => farmSeedsOf(n).reduce((s, [, q]) => s + q, 0);

/** what a farmer plants next from what they hold: their favourite if they have it, otherwise whatever there is */
function farmSeedPick(n: any): string | null {
  const have = farmSeedsOf(n); if (!have.length) return null;
  const want = farmSeed(n); const hit = have.find(([k]) => k === want); if (hit) return hit[0];
  return have.sort((a, b) => b[1] - a[1])[0][0];
}
/** the steps to buy the seed a day's sowing needs: walk to the seed stall, buy what is wanted and affordable. Empty when they have enough (or the stall is closed or out). */
function farmSeedBuy(n: any, need: number): any[] {
  const m = farmSeller(); if (!m || !isOpen(m)) return [];
  const short = need - farmSeedCount(n); if (short <= 0) return [];
  return [goS(m.front, 'Walking to the seed stall'), waitS(2, 'stand', 'Buying seed', { nopie: true, onEnd(nn: any) {
    const stocked = farmSeedRange().filter(k => (m.stock['seed_' + k] || 0) > 0); if (!stocked.length) { if (!nn.player) { LIFE.emit('out_of_stock', nn, { item: 'seed_barley', place: m.def.noun }); talkService(nn, m.n, { mode: 'buy', item: 'seed_barley', qty: 1, result: 'none', shop: m.def.noun }); } return; }
    // notice what is new on the stall since they last looked
    for (const g of Object.keys(m.newStock || {})) { const seen = (nn.seenStock || (nn.seenStock = {})); if ((seen[g] || 0) < m.newStock[g]) { seen[g] = m.newStock[g]; LIFE.emit('new_in_stock', nn, { item: g, place: m.def.noun }); } }
    let left = short; const got: any = {}, paid: any = {}; let poor = false;
    for (let i = 0; i < short * 2 && left > 0; i++) {   // a mix like they would sow: favourites first, barley as the staple
      const k = (farmSeed(nn) as string); const pick = stocked.includes(k) ? k : stocked[(nn.id + i) % stocked.length], g = 'seed_' + pick;
      if (!(m.stock[g] >= 1)) continue; const p = sellPrice(m, g); if (nn.coin < p) { LIFE.emit('could_not_afford', nn, { item: g, place: m.def.noun }); poor = true; break; }
      pay(nn, m.n, p); m.stock[g]--; m.sales++; m.revenue += p; nn.inv[g] = (nn.inv[g] || 0) + 1; logTrade(nn, m.n, g, 1, p, 'buy'); left--; got[g] = (got[g] || 0) + 1; paid[g] = (paid[g] || 0) + p;
    }
    const top = Object.keys(got).sort((x, y) => got[y] - got[x])[0];   // (the exchange at the stall is about the main thing they bought, or about why they could not)
    if (top) talkService(nn, m.n, { mode: 'buy', item: top, qty: got[top], price: paid[top], result: 'ok', shop: m.def.noun, newItem: !!(m.newStock && m.newStock[top] && game.time - m.newStock[top] < 3 * 1440) });
    else if (poor) talkService(nn, m.n, { mode: 'buy', item: 'seed_' + stocked[0], qty: 1, price: Math.round(sellPrice(m, 'seed_' + stocked[0])), result: 'poor', shop: m.def.noun });
  } })];
}
/** sowing from what they hold: returns the seed kind, or null when they have none (the plot stays as it is) */
function farmSow(n: any): string | null { const k = farmSeedPick(n); if (!k) return null; n.inv['seed_' + k]--; return k; }

/* ---- the seed stall's day: new stock comes in, new kinds turn up, prices settle ---- */
function farmRestock() {
  if (!town || !town.farmEcon) return; const m = farmSeller(); if (!m) return; const range = farmSeedRange(), t = game.time;
  for (const k of range) {
    const g = 'seed_' + k, cap0 = m.sells[g], first = m.stock[g] == null, was = m.stock[g] || 0; if (was >= cap0 * 0.9) continue;
    m.stock[g] = Math.round(cap0 * (0.8 + Math.random() * 0.2)); (m.newStock || (m.newStock = {}));
    if (first || was < 1) { m.newStock[g] = t; if (m.n && !m.n.dead) LIFE.emit('new_in_stock', m.n, { item: g, place: m.def.noun }); }   // (the one who keeps the stall notices first; customers notice when they come)
    m.n.coin -= Math.min(Math.max(0, m.n.coin), Math.round((m.stock[g] - was) * GOODS[g].base * 0.4));   // (what the seed cost them at the wholesaler)
  }
  const gr = farmGrocer();
  if (gr) for (const g of Object.keys(gr.buys)) { const keep = gr.buys[g] * 0.7, over = (gr.stock[g] || 0) - keep; if (over >= 3) { const q = Math.floor(over / 2); gr.stock[g] -= q; gr.n.coin += Math.round(q * GOODS[g].base * 0.5); town.eco.exported += q; } }   // (the carter takes what the town cannot use at half price, so the grocer can pay the farmers)
  for (const x of [m, gr]) if (x && x.n.coin < 25) x.n.coin += 25;   // (a float from the wholesaler, so no stall is ever without change)
  for (const x of [m, gr]) if (x) {   // the keeper notices when a price has moved since yesterday
    const prev = x.pp || (x.pp = {}); let said = 0;
    for (const g of Object.keys(x.sells)) { if (!((x.stock[g] || 0) >= 1)) continue; const p = sellPrice(x, g); if (prev[g] != null && said < 2 && p !== prev[g]) { LIFE.emit(p > prev[g] ? 'price_up' : 'price_down', x.n, { item: g, place: x.def.noun }); said++; } prev[g] = p; }
  }
}
LF2.hourly.push((h: number) => { if (h === 6) farmRestock(); });

/* ---- ordinary households buy flowers for the house now and then: the stall sells them, and it is something to talk about ---- */
function farmFlowerBuyers() {
  if (!town || !town.farmEcon) return; const gr = farmGrocer(); if (!gr || !isOpen(gr) || !((gr.stock.flowers || 0) >= 1)) return;
  const adults = npcs.filter(n => !n.dead && !n.player && n.age >= 16 && !n.shop && n.coin >= 6 && Math.random() < 0.05); const b = adults[0]; if (!b) return;
  const p = sellPrice(gr, 'flowers'); if (b.coin < p) return; pay(b, gr.n, p); gr.stock.flowers--; gr.sales++; gr.revenue += p; logTrade(b, gr.n, 'flowers', 1, p, 'buy');
}
LF2.hourly.push(() => farmFlowerBuyers());

/* ---- the Ready Farming Village: a world with only what farming needs (docs/world-modules.md) ---- */
const FARM_RECIPE_BASE = ['job.Farmer', 'job.Baker', 'sys.economy', 'sys.couples', 'sys.cooking', 'sys.smalllife'];
function farmStart() {
  town.farmEcon = true; town.farmDay0 = Math.floor(game.time / 1440); town.eco.exported = town.eco.exported || 0;
  prebuildVillage({ farm: true }); housingTick(); refreshReach();
  MODS.only(FARM_RECIPE_BASE.concat(Object.keys(MODS.defs).filter(k => k.startsWith('talk.')))); MODS.sync();   // (everything else is switched off for this island)
  farmSetup();
}
function farmSetup() {
  const R = rng(town.seed + 5151), mk = town.markets[0];
  for (const n of npcs.slice()) { if (n.role === 'Trader' || n.shop) { if (n.shop) dropMerchant(n); setRole(n, 'Worker'); n.job = 'Farmer'; } }   // (the village the generator made has its own traders: here there are only the two stalls below)
  merchants = [];
  const adults = npcs.filter(n => !n.dead && !n.player && n.role === 'Worker' && n.age >= 18 && n.age < 58 && !n.shop);
  const pick = (k: number) => adults.splice(Math.floor(R() * adults.length), 1)[0];
  const sellerP = pick(0), grocerP = pick(1);
  if (grocerP) { setRole(grocerP, 'Trader', mk); const m = grocerP.shop; if (m) { m.def = GROCER_DEF; m.buys = GROCER_DEF.buys; m.sells = GROCER_DEF.sells; m.stock = {}; for (const g of Object.keys(GROCER_DEF.buys)) m.stock[g] = Math.floor(GROCER_DEF.buys[g] * (0.1 + R() * 0.2)); m.n.coin = 90; } }
  if (sellerP) { setRole(sellerP, 'Trader', mk); const m = sellerP.shop; if (m) { m.def = SEED_DEF; m.buys = SEED_DEF.buys; m.sells = SEED_DEF.sells; m.stock = {}; m.newStock = {}; m.n.coin = 40; farmRestock(); m.newStock = {}; } }
  // a bakery: grain to bread, a counter in the village
  { let ok: any = null; for (const [w, h] of [[7, 7], [7, 6]]) { for (const o of [{}, { tight: true }, { clear: true }, { tight: true, clear: true }]) { ok = lfBuild('bakery', w, h, Object.assign({}, o)); if (ok) break; } if (ok) break; }
    const bk = lf2Room('bakery'); if (bk) { Object.assign(lf2Stock(bk), { grain: 6, bread: 8 }); lf2AssignJobs(true); } }
  // farmers start with a little seed and a little money
  for (const n of npcs) { if (n.dead || n.shop || n.age < 14) continue; n.coin = 22 + Math.floor(R() * 20); n.inv = n.inv || {}; if (n.role === 'Worker') { n.inv.seed_barley = 5; n.inv.seed_turnip = 2; n.inv.seed_bean = 2; } }
}

/* ---- the player at a stall in the farming economy: buy seed, sell what you grew, buy flowers or vegetables; real money ---- */
function farmShopDialog(m: any) {
  const n = game.player; if (!n || !m) return;
  const money = () => Math.floor(n.coin) + ' denarii';
  const buy = (g: string, q: number) => () => {
    const p = sellPrice(m, g); let got = 0;
    while (got < q && (m.stock[g] || 0) >= 1 && n.coin >= p) { pay(n, m.n, p); m.stock[g]--; m.sales++; m.revenue += p; got++; if (g.startsWith('seed_')) itGiveStack(n, g, 1); else n.inv[g] = (n.inv[g] || 0) + 1; }
    if (got) logTrade(n, m.n, g, got, got * p, 'buy');
    const d = { item: WORLD.has('item', g) ? WORLD.name('item', g) : GOODS[g].name, qty: got || q, price: got ? got * p : p, shop: m.def.noun };
    return { say: got ? `${m.n.first}: ${serviceSay('quote_price', m.n, n, d)} ${serviceSay('thank_shop', m.n, n, d)} (You have ${money()} left.)` : `${m.n.first}: ${serviceSay(n.coin < p ? 'quote_price' : 'no_stock', m.n, n, d)}${n.coin < p ? ' (You have ' + money() + '.)' : ''}`, opts: menu() };
  };
  const sell = (g: string) => () => {
    const q = n.inv[g] || 0, p0 = buyPrice(m, g); let got = 0, tot = 0;
    while (got < q) { const p = buyPrice(m, g); if (p <= 0 || m.n.coin < p) break; pay(m.n, n, p); m.stock[g] = (m.stock[g] || 0) + 1; n.inv[g]--; tot += p; got++; }
    if (got) logTrade(m.n, n, g, got, tot, 'sell');
    const d = { item: GOODS[g].name, qty: got || q, price: tot, shop: m.def.noun };
    return { say: got ? `${m.n.first}: ${serviceSay('bid_price', m.n, n, d)} ${serviceSay('thank_shop', m.n, n, d)} (You have ${money()}.)` : `${m.n.first}: ${serviceSay('no_demand', m.n, n, d)}`, opts: menu() };
  };
  const menu = (): any[] => {
    const o: any[] = [];
    for (const g of Object.keys(m.sells)) { if (!((m.stock[g] || 0) >= 1)) continue; const p = sellPrice(m, g); if (g.startsWith('seed_')) { if (!farmSeedRange().includes(g.slice(5))) continue; o.push([`Buy a ${GOODS[g].name.replace(/s$/, '')} (${p})`, buy(g, 1)]); if (n.coin >= p * 5 && m.stock[g] >= 5) o.push([`Buy 5 ${GOODS[g].name} (${p * 5})`, buy(g, 5)]); } else o.push([`Buy ${GOODS[g].name} (${p})`, buy(g, 1)]); }
    for (const g of Object.keys(m.buys)) { const q = n.inv[g] || 0; if (q < 1) continue; const p = buyPrice(m, g); if (p > 0) o.push([`Sell your ${q} ${GOODS[g].name} (${p} each)`, sell(g)]); }
    o.push(['Leave', () => null]); return o;
  };
  lf2Dialog(m.n, `${m.n.first}: ${serviceSay('shop_greet_back', m.n, n, { item: '', qty: 1, shop: m.def.noun })} (You have ${money()}.)`, menu());
}
