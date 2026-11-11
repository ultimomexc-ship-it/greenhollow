/* Gifts (docs/talk-engine.md, phase 7): the player gives something to the villager they are talking to. What is welcome depends on what the villager needs (food when hungry, flowers always a little),
   a gift after a deed is an amends (it clears the grudge, `m.forgiven`), and somebody who cannot stand you refuses it. Everybody gives: a villager gives what they can spare (never the last three, and no food when hungry themselves), at most once in twelve hours, to those who need it or whom they like or wronged. */

const giftName = (k: string) => (GOODS[k] && GOODS[k].name) || (WORLD.has('item', k) ? WORLD.name('item', k) : k);
/** what the player could give this person: the thing they would like most from the bag */
function giftChoose(p: any, o: any): string | null {
  let best: string | null = null, bs = 0; const keep = p.player ? 0 : 3;   // (a villager gives only what they can spare, and no food when they are hungry themselves)
  for (const k of Object.keys(p.inv || {})) {
    const q = p.inv[k]; if (!(q > keep) || !GOODS[k] || /^seed_/.test(k) || (!p.player && GOODS[k].sat && (p.hunger || 0) > 50)) continue;
    const s = (GOODS[k].base || 1) + (GOODS[k].sat && (o.hunger || 0) > 55 ? 4 : 0) + (k === 'flowers' ? 3 : 0); if (s > bs) { bs = s; best = k; }
  }
  return best;
}
ACTS.offer_gift = { kind: 'gift', stage: 'topic', preview: (c: any, sp: any, li: any) => { const k = giftChoose(sp, li); return { item: k ? giftName(k) : '' }; },
  when: (c: any, sp: any, li: any) => !c.done.offer_gift && !li.infant && li.age >= 3 && (sp.player || game.time - (sp.giftT || -1e9) > 720) && !!giftChoose(sp, li),
  w: (c: any, sp: any, li: any) => { if (sp.player) return 0.5; const k = giftChoose(sp, li), hungry = k && GOODS[k].sat && (li.hunger || 0) > 60, a = sp.aff[li.id] || 0; return 0.15 + (hungry && a > -10 ? 1.5 : 0) + (a > 30 ? 0.5 : 0) + (sp.know && sp.know[li.id] > 20 ? 0.1 : 0) + ((sp.tmem || []).some((m: any) => m.kind === 'did' && m.ev != null && !m.forgiven && (lf2Ev().find((q: any) => q.id === m.ev) || {}).target === li.id && (a < 0 || Math.random() < 0.3)) ? 1.2 : 0); },
  apply: (c: any, sp: any, li: any) => {
    c.done.offer_gift = 1; sp.giftT = game.time; const k = giftChoose(sp, li); if (!k) { c.giftResult = 'refused'; return; } c.lifeItem = giftName(k);
    const bad = (li.tmem || []).filter((m: any) => m.ev != null && !m.forgiven && ['saw', 'felt', 'told', 'overheard'].includes(m.kind) && game.time - m.t < 1440 * 8 && (() => { const ev = lf2Ev().find((q: any) => q.id === m.ev); return !!ev && ev.actor === sp.id && (ev.tags || []).some((t: string) => DEED_TAGS.includes(t)); })()), grievance = bad.length > 0;
    if ((li.aff[sp.id] || 0) < -45) { c.giftResult = 'refused'; return; }
    sp.inv[k]--; li.inv = li.inv || {}; li.inv[k] = (li.inv[k] || 0) + 1;
    const value = (GOODS[k].base || 1), wanted = (GOODS[k].sat && (li.hunger || 0) > 55) || k === 'flowers';
    lfAff(li, sp, 0.35 * (2 + value * 0.8 + (wanted ? 3 : 0) + (grievance ? value * 0.8 + 4 : 0)), 'gave me ' + c.lifeItem);
    for (const m of bad) m.forgiven = true;
    for (const m of sp.tmem || []) if (m.kind === 'did' && m.ev != null) { const ev = lf2Ev().find((q: any) => q.id === m.ev); if (ev && ev.target === li.id) m.forgiven = true; }   // (what I did to them is made up for)
    if (typeof reqDone === 'function') for (const q of li.reqs || []) if (q.kind === 'item' && q.item === k && q.state !== 'done' && q.state !== 'failed') reqDone(li, sp, 'item', 'gave me what I needed');
    c.giftResult = grievance ? 'amends' : wanted ? 'wanted' : 'plain';
    lfEmit('gift', { actor: sp, target: li, sev: 1, tags: ['kindness', 'generous'], chron: false, text: `${sp.first} gave ${li.first} ${c.lifeItem}` });
  }, replies: ['gift_thanks', 'gift_delight', 'gift_amends', 'gift_refuse'] };
const giftReply = (id: string, res: string) => { ACTS[id] = { kind: 'gift', stage: 'topic', reply: true, when: (c: any) => c.giftResult === res, w: () => 1, apply: () => {}, replies: [] }; };
giftReply('gift_thanks', 'plain'); giftReply('gift_delight', 'wanted'); giftReply('gift_amends', 'amends'); giftReply('gift_refuse', 'refused');

lx('offer_gift', 'plain', 'I brought you {item}.'); lx('offer_gift', 'plain', 'Here. {item}, for you.'); lx('offer_gift', 'plain', 'I thought you could use {item}.');
lx('gift_thanks', 'plain', 'Thank you. That\'s kind.'); lx('gift_thanks', 'plain', 'Oh. Thank you.');
lx('gift_delight', 'plain', 'Just what I needed. Thank you.'); lx('gift_delight', 'plain', 'How did you know? Thank you.');
lx('gift_amends', 'plain', 'You think {item} makes up for it? ... Well. It helps.'); lx('gift_amends', 'plain', 'That doesn\'t undo it. But I appreciate it.');
lx('gift_refuse', 'plain', 'Keep it. I want nothing from you.'); lx('gift_refuse', 'plain', 'No. Take it away.');
lxi('offer_gift', 'I have {item}. I thought of you, which surprised me.'); lxi('offer_gift', 'This is {item}. It is not much. It is what I had.');
lxi('gift_thanks', 'Thank you. I will find a place for it.'); lxi('gift_thanks', 'Thank you. I did not expect that today.');
lxi('gift_delight', 'I was about to go and look for that. Thank you.'); lxi('gift_delight', 'That is exactly right. I do not know how you knew.');
lxi('gift_amends', 'It does not undo it. It does help. I am noting that it helps.'); lxi('gift_amends', 'That is {item}. I accept it. I will stop being angry on Thursday.');
lxi('gift_refuse', 'No. I would rather not owe you anything.'); lxi('gift_refuse', 'I do not want that. Please take it back.');
