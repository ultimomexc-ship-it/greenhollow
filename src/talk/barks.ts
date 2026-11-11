/* Barks: the one-line, unprompted speech that makes a place sound lived in (docs/talk-engine.md, section 11). Stall keepers call out to people passing by:
   what is new, what is cheap, what is fresh. They are acts like any other (`keeper_call`, and a passer-by's `call_reply` now and then), said in bubbles toward the person they are
   calling to, and they come from the stall's real stock and prices. */

for (const id of ['keeper_call', 'call_reply']) ACTS[id] = { kind: 'trade', stage: 'topic', reply: true, when: () => true, apply: () => {}, replies: [] };

/** what a keeper has to call about right now: { item (goods id), price (unit), call: 'new' | 'cheap' | 'plain', shop } or null */
function keeperCallFor(K: any): any {
  if (K.stall) {
    const m = K.stall, goods = Object.keys(m.sells).filter(g => (m.stock[g] || 0) >= 2 && !(g.startsWith('seed_') && !farmSeedRange().includes(g.slice(5)))); if (!goods.length) return null;
    const fresh = goods.filter(g => m.newStock && m.newStock[g] && game.time - m.newStock[g] < 2 * 1440);
    const cheap = goods.filter(g => sellPrice(m, g) < (GOODS as any)[g].base);
    const g = fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : cheap.length && Math.random() < 0.6 ? cheap[Math.floor(Math.random() * cheap.length)] : goods[Math.floor(Math.random() * goods.length)];
    return { item: g, price: sellPrice(m, g), call: fresh.includes(g) ? 'new' : cheap.includes(g) ? 'cheap' : 'plain', shop: m.def.noun };
  }
  const r = K.room, st = lf2Stock(r); const g = Object.keys(LF2_SELL[r.kind] || {}).find(x => (st[x] || 0) >= 3); if (!g) return null;
  return { item: g, price: lf2Price(r, g, K.n), call: 'plain', shop: r.kind === 'bakery' ? 'bakery' : r.name };
}
function keeperCalls() {
  if (!town || !TALK.running || !TALK.on.trade || !game.player) return;
  const keepers: any[] = merchants.filter((m: any) => m.n && !m.n.dead).map((m: any) => ({ n: m.n, stall: m }));
  if (typeof lf2Room === 'function') for (const k of ['bakery']) { const r = lf2Room(k); const s = r && lf2Server(r); if (s) keepers.push({ n: s, room: r }); }
  for (const K of keepers) {
    const n = K.n; if ((n.callNext || 0) > game.time) continue; n.callNext = game.time + 25 + Math.random() * 40;
    if (n.pose === 'sleep' || (n.talkUntil || 0) > game.time || (K.stall && !K.stall.serving)) continue;
    const near = npcs.filter((o: any) => o !== n && !o.dead && !o.player && o.age >= 10 && o.pose !== 'sleep' && !(o.talkUntil > game.time) && !o.shop && lvlOf(o.ty) === lvlOf(n.ty) && lfDist(o, n) >= 2 && lfDist(o, n) <= 8);
    if (!near.length) continue; const passer = near[Math.floor(Math.random() * near.length)];
    const call = keeperCallFor(K); if (!call) continue;
    const name = WORLD.has('item', call.item) ? WORLD.name('item', call.item) : String(call.item), x = { item: name, price: call.price, call: call.call, shop: call.shop };
    const c: any = { a: n, b: passer, done: {}, turns: [{ by: n.id, act: 'keeper_call', x }], stage: 'topic', t0: game.time };
    if (Math.random() < 0.4) c.turns.push({ by: passer.id, act: 'call_reply', x });
    faceTo(n, passer); talkFinish(c, n, passer, talkListened(n, passer));
  }
}
LF2.tickers.push(keeperCalls);
