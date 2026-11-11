/* Shop talk: a customer and a keeper at a stall (docs/talk-engine.md). A purchase or a sale is a short exchange of acts, said in bubbles like any other talk,
   and it is the same exchange the player has when they step up to a stall (`farmShopDialog` uses the same lines). Kind `trade` (switch `TALK.on.trade`).
   buy:  greet - greet back - ask for - quote - pay - thank - (new stock remark) - farewell;   no stock: ... no_stock - shrug;   too poor: ... quote - cant_afford - make_do
   sell: greet - greet back - offer goods - bid - accept - thank;                           refused:    ... offer goods - no_demand */

for (const id of ['shop_greet', 'shop_greet_back', 'ask_item', 'quote_price', 'pay_ok', 'thank_shop', 'cant_afford', 'make_do', 'no_stock', 'shrug_off', 'offer_goods', 'bid_price', 'accept_deal', 'no_demand', 'new_stock_remark', 'farewell_shop'])
  ACTS[id] = { kind: 'trade', stage: 'topic', reply: true, when: () => true, apply: () => {}, replies: [] };

/** the lines of a shop encounter as a list of [by 'c' (customer) | 'k' (keeper), act] */
function serviceScript(mode: string, result: string, newItem: boolean): [string, string][] {
  const open: [string, string][] = [['c', 'shop_greet'], ['k', 'shop_greet_back']];
  if (mode === 'buy') {
    if (result === 'ok') return open.concat([['c', 'ask_item'], ['k', 'quote_price'], ['c', 'pay_ok'], ['k', 'thank_shop']], newItem ? [['k', 'new_stock_remark']] : [], [['c', 'farewell_shop']]);
    if (result === 'none') return open.concat([['c', 'ask_item'], ['k', 'no_stock'], ['c', 'shrug_off']]);
    return open.concat([['c', 'ask_item'], ['k', 'quote_price'], ['c', 'cant_afford'], ['k', 'make_do']]);
  }
  if (result === 'ok') return open.concat([['c', 'offer_goods'], ['k', 'bid_price'], ['c', 'accept_deal'], ['k', 'thank_shop']]);
  return open.concat([['c', 'offer_goods'], ['k', 'no_demand']]);
}
/** d: { mode: 'buy' | 'sell', item: goods id, qty, price: total, result: 'ok' | 'none' | 'poor' | 'refused', newItem?: true } */
function talkService(cust: any, keeper: any, d: any) {
  if (!TALK.on.trade || !cust || !keeper || cust === keeper) return;
  const name = WORLD.has('item', d.item) ? WORLD.name('item', d.item) : (REG.has('seed', String(d.item).replace(/^seed_/, '')) && String(d.item).startsWith('seed_') ? (GOODS[d.item] || {}).name : String(d.item));
  const c: any = { a: cust, b: keeper, done: {}, turns: [], stage: 'topic', t0: game.time };
  const x = { item: name, qty: d.qty || 1, price: d.price, shop: d.shop || '' };
  for (const [who, act] of serviceScript(d.mode, d.result, !!d.newItem)) c.turns.push({ by: who === 'c' ? cust.id : keeper.id, act, x });
  talkFinish(c, cust, keeper, talkListened(cust, keeper));
}
/** one line, for a menu or a box: the keeper's or the customer's, in the current voice */
function serviceSay(act: string, speaker: any, other: any, d: any): string { return lxSay(act, speaker, other, { item: d.item, qty: d.qty, price: d.price, shop: d.shop || '' }); }

/* ---- prices: what things cost, passed on in conversation (people learn what others paid) ---- */
const PRICE_ITEMS = () => Object.keys(GOODS).filter(g => (GOODS as any)[g].base);
ACTS.ask_price = { kind: 'trade', stage: 'topic', preview: (c: any) => ({ pitem: WORLD.has('item', c.priceItem) ? WORLD.name('item', c.priceItem) : (GOODS as any)[c.priceItem].name }), when: (c: any, sp: any, li: any) => {
    if (c.done.ask_price) return false; const items = PRICE_ITEMS().filter(g => LIFE.lastPrice(li, g) != null && LIFE.lastPrice(sp, g) == null); if (!items.length) return false;
    c.priceItem = items[Math.floor(Math.random() * items.length)]; return true; }, w: () => 0.7, apply: (c: any) => { c.done.ask_price = 1; c.priceName = WORLD.has('item', c.priceItem) ? WORLD.name('item', c.priceItem) : (GOODS as any)[c.priceItem].name; }, replies: ['tell_price'] };
ACTS.tell_price = { kind: 'trade', stage: 'topic', reply: true, preview: (c: any, sp: any) => ({ price: LIFE.lastPrice(sp, c.priceItem) }), when: (c: any, sp: any) => !!c.priceItem && LIFE.lastPrice(sp, c.priceItem) != null, apply: (c: any, sp: any, li: any) => { c.priceUnit = LIFE.lastPrice(sp, c.priceItem); TM.add(li, { kind: 'price', item: c.priceItem, unit: c.priceUnit, from: sp.id, conf: 0.8, imp: 0.15 }); }, replies: ['react_price'] };
ACTS.react_price = { kind: 'trade', stage: 'topic', reply: true, when: () => true, apply: () => {}, replies: [] };
