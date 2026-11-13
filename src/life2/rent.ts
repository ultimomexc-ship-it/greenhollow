/* Rent and contentment (the Hamlet, docs/minimum-game.md). Each adult pays the player each morning for the yard they live in, if they have the coin; what they pay
   depends on what you built for them. Unpaid rent is not a debt: it is simply not paid, and it weighs on them. Contentment is the mood they already have, moved by
   having a yard, a roof, a window and flowers; a hungry or miserable villager works slowly. Nobody dies of any of it. */

const RENT_HOUR = 6, RENT_FLOWER_R = 4;   // (the amounts are HAMLET_TUNE: rentBase, rentRoof, rentWindow, rentFlowers)
const RENT_BASE = 2, RENT_ROOF = 1, RENT_WINDOW = 1, RENT_FLOWERS = 1;   // (the starting values, for the tests and the tooltip)
const rentTrader = (n: any) => !!(n && ((n.shop && n.shop.def === HAMLET_TRADER_DEF) || n.tutRentSkip));   // (tutRentSkip: Junia's first rent is handed over in person, life2/tutorial2-play.ts)
/** what somebody's home is like: { yard, roof, window, flowers } (all false without a bed) */
function rentHome(n: any): any {
  const o: any = { yard: null, roof: false, window: false, flowers: false }; if (!yardOn() || !yardHasBed(n)) return o;
  const b = n.bed; o.yard = yardOfN(n);
  const ri = roomAt[b.y][b.x], r = ri >= 0 ? rooms[ri] : null;
  if (r && !r.dead) { o.roof = true; for (const k of (r.walls || [])) if ((town.win && town.win.has(k)) || (town.winS && town.winS.has(k))) { o.window = true; break; } }
  for (const c of town.crops || []) { if (!c.st || Math.max(Math.abs(c.x - b.x), Math.abs(c.y - b.y)) > RENT_FLOWER_R || !itIsFlower(c) || itWilted(c) || cropStage(c) < 4) continue; o.flowers = true; break; }
  return o;
}
/** the rent somebody owes each morning: { amt, parts: [[label, coin]] }; nothing for children, the trader, you, or anybody without a yard */
function rentOf(n: any): any {
  const none = { amt: 0, parts: [] as any[] }; if (!yardOn() || n.dead || n.age < 16 || n === yardPlayer() || n.player || rentTrader(n)) return none;
  const h = rentHome(n); if (!h.yard) return none;
  const T = HAMLET_TUNE, parts: any[] = [['a yard', T.rentBase]]; if (h.roof) parts.push(['a roof', T.rentRoof]); if (h.roof && h.window) parts.push(['a window', T.rentWindow]); if (h.flowers) parts.push(['flowers', T.rentFlowers]);
  return { amt: parts.reduce((s, p) => s + p[1], 0), parts };
}
const rentState = (): any => town.rent || (town.rent = { day: -1, today: 0, due: 0, total: 0 });
function rentCollect() {
  if (!yardOn()) return; const pl = yardPlayer(); if (!pl) return; const R = rentState(), day = Math.floor(game.time / 1440); if (R.day === day) return;
  R.day = day; R.today = 0; R.due = 0;
  for (const n of npcs) {
    if (n.dead || n === pl || n.age < 16 || rentTrader(n)) continue;
    const q = rentOf(n);
    if (!q.amt) { if (!yardOfN(n)) LIFE.emit('no_yard', n, {}); n.rentLast = null; continue; }
    R.due += q.amt;
    if (n.coin < q.amt) { const y = yardOfN(n); for (const o of yardPeople(y)) { if (o === n || o === pl || o.age < 16 || rentTrader(o)) continue; const t = Math.min(o.coin - (o.rentLast && o.rentLast.t === game.time ? 0 : rentOf(o).amt), q.amt - n.coin); if (t > 0) { o.coin -= t; n.coin += t; } if (n.coin >= q.amt) break; } }   // (the household's money: somebody at home covers it, once their own is safe)
    if (n.coin >= q.amt) { pay(n, pl, q.amt); R.today += q.amt; R.total += q.amt; n.rentLast = { t: game.time, amt: q.amt, ok: true }; LIFE.emit('rent_paid', n, { price: q.amt }); }
    else { n.rentLast = { t: game.time, amt: q.amt, ok: false }; lfMod(n, 'rent', 'could not pay the rent', -10, 1440); LIFE.emit('rent_unpaid', n, { price: q.amt }); }
  }
  if (pl.player && R.due) playerSay(pl, R.today >= R.due ? `Rent came in: ${R.today} coin.` : R.today ? `Rent came in: ${R.today} coin of ${R.due}. Not everybody could pay.` : 'No rent this morning. Nobody had it.');
}
/** contentment: what you built for them, kept fresh every hour (the mood itself is the old one: needs plus these) */
function rentContent() {
  if (!yardOn()) return; const pl = yardPlayer();
  for (const n of npcs) {
    if (n.dead || n.infant || n === pl || n.mods === undefined) continue;
    const h = rentHome(n), set = (id: string, on: boolean, text: string, v: number) => { if (on) lfMod(n, id, text, v, 1500); else if ((n.mods || []).some((m: any) => m.id === id)) n.mods = n.mods.filter((m: any) => m.id !== id); };
    set('yard', !h.yard, yardHasBed(n) ? 'has a bed but no yard' : 'has no bed and no yard', -12);
    set('roof', h.roof, 'sleeps under a roof', 6); set('window', h.roof && h.window, 'has a window', 3); set('flowers', h.flowers, 'flowers by the bed', 3);
  }
}
LF2.hourly.push((h: number) => { if (!yardOn()) return; rentContent(); if (h === RENT_HOUR) rentCollect(); });

/** the market errand: a household short of coin for the rent takes what the store can spare (more than two days of food) to the trader */
function rentErrand(n: any) {
  if (!yardOn() || n.player || n.age < 16 || n.shop || (n.rentErr || 0) > game.time) return null; const y = yardOfN(n); if (!y) return null;
  const due = rentOf(n).amt; if (!due || n.coin >= due * 2) return null;
  const hh = yardPeople(y).filter(o => !o.infant).length, st = y.store || {}, spare = foodCount(st) - hh * 6; if (spare < 3) { n.rentErr = game.time + 120; return null; }
  const g = FOODS.filter((f: string) => (st[f] || 0) > 0).sort((a: string, b: string) => (st[b] || 0) - (st[a] || 0))[0], m = g && findBuyer(n, g, true); if (!m) { n.rentErr = game.time + 90; return null; }
  const q = Math.min(st[g], spare, 12); n.rentErr = game.time + 240;
  return [goS(pantrySpot, 'Fetching food from the store to sell'), waitS(2, 'stand', 'Taking what the household can spare', { nopie: true, onEnd(nn: any) { const t = Math.min(q, st[g] || 0); st[g] -= t; nn.inv[g] = (nn.inv[g] || 0) + t; } }), ...sellStep(n, m, g, q)];
}
LF2.dec.push(rentErrand);

/** the line on the screen: your coin and this morning's rent */
function rentHUD(): string {
  const pl = yardPlayer(); if (!yardOn() || !pl) return ''; const R = rentState();
  let exp = 0; for (const n of npcs) exp += rentOf(n).amt;
  return `<span class="rentchip" title="Rent is paid each morning at six by every adult with a yard: ${HAMLET_TUNE.rentBase} coin, and more for a roof, a window and flowers near the bed.">${Math.floor(pl.coin)} coin · rent ${R.day >= 0 && R.due ? `today ${R.today}${R.today < R.due ? ' of ' + R.due : ''}` : `tomorrow ${exp}`}</span>`;
}
const rentSig = () => { if (!yardOn()) return ''; const pl = yardPlayer(), R = rentState(); let exp = 0; for (const n of npcs) exp += rentOf(n).amt; return Math.floor(pl ? pl.coin : 0) + ':' + R.today + ':' + R.due + ':' + exp; };
/** the villager card: what they pay and why, and what they think of where they live */
function rentCardRow(n: any): string {
  if (!yardOn() || n.dead) return ''; const pl = yardPlayer(), row = (a: string, b: string) => `<div class="vcrow"><span class="dim">${a}</span> ${esc(b)}</div>`;
  const h = rentHome(n), home = !yardHasBed(n) ? 'no bed: sleeping rough' : !h.yard ? 'a bed, but no yard' : yardName(h.yard).replace(/^./, (c: string) => c.toUpperCase()) + (h.roof ? ', under a roof' + (h.window ? ' with a window' : '') : ', in the open') + (h.flowers ? ', flowers nearby' : '');
  let out = row('Home', home);
  if (n !== pl && n.age >= 16 && !rentTrader(n)) { const q = rentOf(n), l = n.rentLast;
    out += row('Rent', q.amt ? `${q.amt} a day (${q.parts.map((p: any) => p[0] + ' ' + p[1]).join(', ')})` + (l ? (l.ok ? ' · paid this morning' : ' · could not pay this morning') : '') + ` · has ${Math.floor(n.coin)} coin` : 'none: no yard'); }
  const why = (n.mods || []).filter((m: any) => ['yard', 'roof', 'window', 'flowers', 'rent'].includes(m.id)).map((m: any) => m.text); if (why.length) out += row('About home', why.join(', '));
  return out;
}
