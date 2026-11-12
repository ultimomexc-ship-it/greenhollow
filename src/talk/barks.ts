/* Barks: the one-line, unprompted speech that makes a place sound lived in (docs/talk-engine.md, section 11). Stall keepers call out to people passing by:
   what is new, what is cheap, what is fresh. They are acts like any other (`keeper_call`, and a passer-by's `call_reply` now and then), said in bubbles toward the person they are
   calling to, and they come from the stall's real stock and prices. */

for (const id of ['keeper_call', 'call_reply'])
  ACTS[id] = { kind: 'trade', stage: 'topic', reply: true, when: () => true, apply: () => {}, replies: [] };

/** what a keeper has to call about right now: { item (goods id), price (unit), call: 'new' | 'cheap' | 'plain', shop } or null */
function keeperCallFor(K: any): any {
  if (K.stall) {
    const m = K.stall,
      goods = Object.keys(m.sells).filter(g => (m.stock[g] || 0) >= 2 && !(g.startsWith('seed_') && !farmSeedRange().includes(g.slice(5))));
    if (!goods.length) return null;
    const fresh = goods.filter(g => m.newStock && m.newStock[g] && game.time - m.newStock[g] < 2 * 1440);
    const cheap = goods.filter(g => sellPrice(m, g) < (GOODS as any)[g].base);
    const g = fresh.length
      ? fresh[Math.floor(Math.random() * fresh.length)]
      : cheap.length && Math.random() < 0.6
        ? cheap[Math.floor(Math.random() * cheap.length)]
        : goods[Math.floor(Math.random() * goods.length)];
    return { item: g, price: sellPrice(m, g), call: fresh.includes(g) ? 'new' : cheap.includes(g) ? 'cheap' : 'plain', shop: m.def.noun };
  }
  const r = K.room,
    st = lf2Stock(r);
  const g = Object.keys(LF2_SELL[r.kind] || {}).find(x => (st[x] || 0) >= 3);
  if (!g) return null;
  return { item: g, price: lf2Price(r, g, K.n), call: 'plain', shop: r.kind === 'bakery' ? 'bakery' : r.name };
}
function keeperCalls() {
  if (!town || !TALK.running || !TALK.on.trade || !game.player) return;
  const keepers: any[] = merchants.filter((m: any) => m.n && !m.n.dead).map((m: any) => ({ n: m.n, stall: m }));
  if (typeof lf2Room === 'function')
    for (const k of ['bakery']) {
      const r = lf2Room(k);
      const s = r && lf2Server(r);
      if (s) keepers.push({ n: s, room: r });
    }
  for (const K of keepers) {
    const n = K.n;
    if ((n.callNext || 0) > game.time) continue;
    n.callNext = game.time + 25 + Math.random() * 40;
    if (n.pose === 'sleep' || (n.talkUntil || 0) > game.time || (K.stall && !K.stall.serving)) continue;
    const near = npcs.filter(
      (o: any) =>
        o !== n &&
        !o.dead &&
        !o.player &&
        o.age >= 10 &&
        o.pose !== 'sleep' &&
        !(o.talkUntil > game.time) &&
        !o.shop &&
        lvlOf(o.ty) === lvlOf(n.ty) &&
        lfDist(o, n) >= 2 &&
        lfDist(o, n) <= 8
    );
    if (!near.length) continue;
    const passer = near[Math.floor(Math.random() * near.length)];
    const call = keeperCallFor(K);
    if (!call) continue;
    const name = WORLD.has('item', call.item) ? WORLD.name('item', call.item) : String(call.item),
      x = { item: name, price: call.price, call: call.call, shop: call.shop };
    const c: any = { a: n, b: passer, done: {}, turns: [{ by: n.id, act: 'keeper_call', x }], stage: 'topic', t0: game.time };
    if (Math.random() < 0.4) c.turns.push({ by: passer.id, act: 'call_reply', x });
    faceTo(n, passer);
    talkFinish(c, n, passer, talkListened(n, passer));
  }
}
LF2.tickers.push(keeperCalls);

/* ---- more barks: muttering at work, a word with someone passing, a parent calling a child in ---- */
ACTS.mutter = { kind: 'small', stage: 'topic', when: () => false, apply: () => {}, replies: [] };
ACTS.call_child = { kind: 'family', stage: 'topic', when: () => false, apply: () => {}, replies: [] };
const MUTTER_JOBS = ['Farmer', 'Baker', 'Smith', 'Merchant', 'Shopkeeper', 'Miller', 'Miner', 'Carpenter', 'Priest', 'Fisher', 'Worker'];
function moreBarks() {
  if (!town || !TALK.running || !game.player || game.time % 7 > 1.1) return; // (a few times an hour is plenty)
  const P = game.player,
    near = npcs.filter(
      (n: any) =>
        !n.dead &&
        !n.player &&
        !n.infant &&
        n.age >= 6 &&
        lvlOf(n.ty) === lvlOf(P.ty) &&
        lfDist(P, n) <= TALK.earshot &&
        n.pose !== 'sleep' &&
        !(n.talkUntil > game.time)
    );
  for (const n of near) {
    // muttering at work
    if (TALK.on.small && !n.moving && (n.mutterT || 0) < game.time && n.job && MUTTER_JOBS.includes(String(n.job))) {
      n.mutterT = game.time + 70 + Math.random() * 90;
      const s = n.plan && n.plan[n.si];
      if (
        s &&
        s.k === 'wait' &&
        /work|plough|sow|harvest|bak|knead|forge|hammer|sweep|stock|dig|saw|cut|tend|mend|weav|serving|stall/i.test(String(s.text || '')) &&
        Math.random() < 0.6
      ) {
        const c: any = {
          a: n,
          b: n,
          done: {},
          turns: [{ by: n.id, act: 'mutter', x: { how: String(n.job).toLowerCase() } }],
          stage: 'topic',
          t0: game.time
        };
        talkFinish(c, n, n, true);
      }
    }
    // a parent calls a child in at dusk
    if (TALK.on.family && game.time % 1440 > 17.5 * 60 && game.time % 1440 < 20 * 60 && (n.callT || 0) < game.time) {
      const k = (n.fam.kids || [])
        .map(byId)
        .find((q: any) => q && !q.dead && q.age < 10 && lvlOf(q.ty) === lvlOf(n.ty) && lfDist(n, q) >= 5 && lfDist(n, q) <= 16 && q.pose !== 'sleep');
      if (k) {
        n.callT = game.time + 90;
        const c: any = { a: n, b: k, done: {}, turns: [{ by: n.id, act: 'call_child', x: { aboutName: k.first } }], stage: 'topic', t0: game.time };
        c.turns[0].x.about = k.first;
        faceTo(n, k);
        talkFinish(c, n, k, true);
      }
    }
  }
}
LF2.tickers.push(moreBarks);
lx('mutter', 'plain', 'Where did I put that?', { how: 'farmer' });
lx('mutter', 'plain', "Rain tomorrow, or it won't be.", { how: 'farmer' });
lx('mutter', 'plain', 'Another row. And another after that.', { how: 'farmer' });
lx('mutter', 'plain', 'Not too brown. Not too pale.', { how: 'baker' });
lx('mutter', 'plain', 'Flour in everything. Flour in my ears.', { how: 'baker' });
lx('mutter', 'plain', 'Hot enough. Hot enough to argue with.', { how: 'smith' });
lx('mutter', 'plain', 'Again. A little harder.', { how: 'smith' });
lx('mutter', 'plain', 'Now where did that go.');
lx('mutter', 'plain', 'Nearly done. Nearly.');
lx('mutter', 'plain', 'Back to it, then.');
lx('call_child', 'plain', "{about}! Come in now, it's getting dark!");
lx('call_child', 'plain', '{about}! Time to come home!');
lxi('mutter', 'I put it down somewhere. I put it down on purpose.', { how: 'farmer' });
lxi('mutter', 'There will be rain, or there will not. I have decided to be ready for both.', { how: 'farmer' });
lxi('mutter', 'Another row. The rows are the same. I check.', { how: 'farmer' });
lxi('mutter', 'Not too brown. Not too pale. It is a narrow thing and I am calm about it.', { how: 'baker' });
lxi('mutter', 'There is flour in places I did not know I had.', { how: 'baker' });
lxi('mutter', 'Hot enough. It is always hot enough, and then it is hotter.', { how: 'smith' });
lxi('mutter', 'Where did that go. It was here. It was right here.');
lxi('mutter', 'Nearly done. I have said that since morning and it has not been false once.');
lxi('mutter', 'Back to it. The work does not know it is being watched.');
lxi('call_child', '{about}. Come in. It is getting dark and I would like you inside.');
lxi('call_child', '{about}. Home. The light is going and I count you every evening.');
