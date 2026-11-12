/* Gifts (docs/talk-engine.md, phase 7): the player gives something to the villager they are talking to. What is welcome depends on what the villager needs (food when hungry, flowers always a little),
   a gift after a deed is an amends (it clears the grudge, `m.forgiven`), and somebody who cannot stand you refuses it. Everybody gives: a villager gives what they can spare (never the last three, and no food when hungry themselves), at most once in twelve hours, to those who need it or whom they like or wronged. */

const giftName = (k: string) => (GOODS[k] && GOODS[k].name) || (WORLD.has('item', k) ? WORLD.name('item', k) : k);
/* ---- tastes: everybody likes two things and dislikes one (fixed by who they are); others learn them by asking, by hints, by a gift going down well or badly ---- */
const giftPool = () =>
  Object.keys(GOODS)
    .filter(k => !/^seed_/.test(k) && !/wood|plank|iron|ore$|stone|timber|tool|lock|copper|gold|coal|brick|rope/i.test(k))
    .sort(); // (things a person might be pleased to be given)
function giftTastes(n: any): { like: string[]; dislike: string[] } {
  const pool = giftPool();
  if (!pool.length) return { like: [], dislike: [] };
  const h = Math.imul((n.id | 0) + 7, 2654435761) >>> 0;
  const a = pool[h % pool.length],
    b = pool[(h >>> 8) % pool.length],
    d = pool.filter(k => k !== a && k !== b)[(h >>> 16) % Math.max(1, pool.length - 2)];
  return { like: [...new Set([a, b])], dislike: d ? [d] : [] };
}
/** what sp knows of li's tastes (from what they were told, hinted, or saw go down well or badly) */
function giftKnown(sp: any, li: any): { like: string[]; dislike: string[] } {
  const out: any = { like: [], dislike: [] };
  for (const m of sp.tmem || []) if (m.kind === 'pref' && m.about === li.id) (m.like ? out.like : out.dislike).push(m.item);
  if (
    sp.fam &&
    (sp.fam.spouse === li.id || sp.fam.mother === li.id || sp.fam.father === li.id || (sp.fam.kids || []).includes(li.id)) &&
    !out.like.length
  )
    out.like.push(giftTastes(li).like[0]); // (family know)
  return out;
}
const giftLearn = (sp: any, li: any, item: string, like: boolean) => {
  if (!item) return;
  const k = giftKnown(sp, li);
  if ((like ? k.like : k.dislike).includes(item)) return;
  TM.add(sp, { kind: 'pref', about: li.id, item, like, conf: 1, imp: 0.3 });
};
/** what the player could give this person: the thing they would like most from the bag */
function giftChoose(p: any, o: any): string | null {
  let best: string | null = null,
    bs = 0;
  const keep = p.player ? 0 : 3; // (a villager gives only what they can spare, and no food when they are hungry themselves)
  for (const k of Object.keys(p.inv || {})) {
    const q = p.inv[k];
    if (!(q > keep) || !GOODS[k] || /^seed_/.test(k) || (!p.player && GOODS[k].sat && (p.hunger || 0) > 50)) continue;
    const kn = giftKnown(p, o);
    if (kn.dislike.includes(k)) continue;
    const s = (GOODS[k].base || 1) + (GOODS[k].sat && (o.hunger || 0) > 55 ? 4 : 0) + (k === 'flowers' ? 3 : 0) + (kn.like.includes(k) ? 9 : 0);
    if (s > bs) {
      bs = s;
      best = k;
    }
  }
  return best;
}
ACTS.offer_gift = {
  kind: 'gift',
  stage: 'topic',
  preview: (c: any, sp: any, li: any) => {
    const k = giftChoose(sp, li);
    return { item: k ? giftName(k) : '' };
  },
  when: (c: any, sp: any, li: any) =>
    !c.done.offer_gift && !li.infant && li.age >= 3 && (sp.player || game.time - (sp.giftT || -1e9) > 720) && !!giftChoose(sp, li),
  w: (c: any, sp: any, li: any) => {
    if (sp.player) return 0.5;
    const k = giftChoose(sp, li),
      hungry = k && GOODS[k].sat && (li.hunger || 0) > 60,
      a = sp.aff[li.id] || 0;
    return (
      0.15 +
      ((sp.owes || {})[li.id] ? 1.4 : 0) +
      (k && giftKnown(sp, li).like.includes(k) ? 0.8 : 0) +
      (hungry && a > -10 ? 1.5 : 0) +
      (a > 30 ? 0.5 : 0) +
      (sp.know && sp.know[li.id] > 20 ? 0.1 : 0) +
      ((sp.tmem || []).some(
        (m: any) => m.kind === 'did' && m.ev != null && !m.forgiven && (lf2EvById(m.ev) || {}).target === li.id && (a < 0 || Math.random() < 0.3)
      )
        ? 1.2
        : 0)
    );
  },
  apply: (c: any, sp: any, li: any) => {
    c.done.offer_gift = 1;
    sp.giftT = game.time;
    const k = giftChoose(sp, li);
    if (!k) {
      c.giftResult = 'refused';
      return;
    }
    c.lifeItem = giftName(k);
    const bad = (li.tmem || []).filter(
        (m: any) =>
          m.ev != null &&
          !m.forgiven &&
          ['saw', 'felt', 'told', 'overheard'].includes(m.kind) &&
          game.time - m.t < 1440 * 8 &&
          (() => {
            const ev = lf2EvById(m.ev);
            return !!ev && ev.actor === sp.id && (ev.tags || []).some((t: string) => DEED_TAGS.includes(t));
          })()
      ),
      grievance = bad.length > 0;
    if ((li.aff[sp.id] || 0) < -45) {
      c.giftResult = 'refused';
      return;
    }
    sp.inv[k]--;
    li.inv = li.inv || {};
    li.inv[k] = (li.inv[k] || 0) + 1;
    const value = GOODS[k].base || 1,
      wanted = (GOODS[k].sat && (li.hunger || 0) > 55) || k === 'flowers',
      ta = giftTastes(li),
      loved = ta.like.includes(k),
      hated = ta.dislike.includes(k),
      returning = !!(sp.owes && sp.owes[li.id]);
    lfAff(
      li,
      sp,
      0.35 * (2 + value * 0.8 + (wanted ? 3 : 0) + (loved ? 7 : 0) - (hated ? 9 : 0) + (grievance ? value * 0.8 + 4 : 0)),
      'gave me ' + c.lifeItem
    );
    if (loved) giftLearn(sp, li, k, true);
    else if (hated) giftLearn(sp, li, k, false);
    if (sp.owes) delete sp.owes[li.id];
    (li.owes || (li.owes = {}))[sp.id] = game.time;
    c.newsHow = returning ? 'return' : 'plain';
    for (const m of bad) m.forgiven = true;
    repDirty();
    for (const m of sp.tmem || [])
      if (m.kind === 'did' && m.ev != null) {
        const ev = lf2EvById(m.ev);
        if (ev && ev.target === li.id) m.forgiven = true;
        repDirty();
      } // (what I did to them is made up for)
    if (typeof reqDone === 'function')
      for (const q of li.reqs || [])
        if (q.kind === 'item' && q.item === k && q.state !== 'done' && q.state !== 'failed') reqDone(li, sp, 'item', 'gave me what I needed');
    c.giftResult = hated ? 'disliked' : grievance ? 'amends' : loved ? 'loved' : wanted ? 'wanted' : 'plain';
    lfEmit('gift', {
      actor: sp,
      target: li,
      sev: 1,
      tags: hated ? [] : ['kindness', 'generous'],
      chron: false
    });
  },
  replies: ['gift_thanks', 'gift_delight', 'gift_amends', 'gift_refuse', 'gift_loved', 'gift_disliked']
};
const giftReply = (id: string, res: string) => {
  ACTS[id] = { kind: 'gift', stage: 'topic', reply: true, when: (c: any) => c.giftResult === res, w: () => 1, apply: () => {}, replies: [] };
};
giftReply('gift_loved', 'loved');
giftReply('gift_disliked', 'disliked');
giftReply('gift_thanks', 'plain');
giftReply('gift_delight', 'wanted');
giftReply('gift_amends', 'amends');
giftReply('gift_refuse', 'refused');

/* ---- finding out what somebody likes ---- */
ACTS.ask_preference = {
  kind: 'gift',
  stage: 'topic',
  preview: () => ({}),
  w: (c: any, sp: any, li: any) => 0.3 + ((sp.aff[li.id] || 0) > 25 ? 0.4 : 0),
  when: (c: any, sp: any, li: any) =>
    !c.done.ask_preference &&
    !li.infant &&
    li.age >= 8 &&
    (sp.know[li.id] || 0) > 12 &&
    !giftKnown(sp, li).like.length &&
    game.time - ((sp.askPrefT || {})[li.id] || -1e9) > 2880,
  apply: (c: any, sp: any, li: any) => {
    c.done.ask_preference = 1;
    (sp.askPrefT || (sp.askPrefT = {}))[li.id] = game.time;
    const t = giftTastes(li),
      like = Math.random() < 0.8;
    c.prefItem = like ? t.like[Math.floor(Math.random() * t.like.length)] : t.dislike[0];
    c.prefLike = like && !!c.prefItem;
    if (!c.prefItem) {
      c.prefItem = t.like[0];
      c.prefLike = true;
    }
    c.lifeItem = giftName(c.prefItem);
    giftLearn(sp, li, c.prefItem, c.prefLike);
  },
  replies: ['tell_preference']
};
ACTS.tell_preference = {
  kind: 'gift',
  stage: 'topic',
  reply: true,
  preview: (c: any) => ({ item: c.prefItem ? giftName(c.prefItem) : '', how: c.prefLike ? 'like' : 'dislike' }),
  when: (c: any) => !!c.prefItem,
  w: () => 1,
  apply: (c: any) => {
    c.newsHow = c.prefLike ? 'like' : 'dislike';
  },
  replies: []
};
ACTS.hint_gift = {
  kind: 'gift',
  stage: 'topic',
  preview: (c: any, sp: any) => ({ item: giftName(giftTastes(sp).like[0]) }),
  w: (c: any, sp: any, li: any) => 0.5 + (sp.crush === li.id ? 1.2 : 0),
  when: (c: any, sp: any, li: any) =>
    !c.done.hint_gift &&
    !li.infant &&
    li.age >= 12 &&
    ((sp.aff[li.id] || 0) > 22 || sp.crush === li.id) &&
    !giftKnown(li, sp).like.length &&
    game.time - ((sp.hintT || {})[li.id] || -1e9) > 2880,
  apply: (c: any, sp: any, li: any) => {
    c.done.hint_gift = 1;
    (sp.hintT || (sp.hintT = {}))[li.id] = game.time;
    const k = giftTastes(sp).like[0];
    c.lifeItem = giftName(k);
    giftLearn(li, sp, k, true);
  },
  replies: ['hint_noted']
};
ACTS.hint_noted = { kind: 'gift', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
