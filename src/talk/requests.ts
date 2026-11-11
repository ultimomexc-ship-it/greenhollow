/* Requests, favours and feelings (docs/talk-engine.md, 3b.7 and the economy and feeling acts). A villager who really lacks something asks for it: food when hungry with none, a bed when homeless
   (`reqWant`). The same acts for everybody: `ask_favour` -> the other gives it at once (`favour_give`: the goods change hands), promises to try (`favour_promise`: an open thread that the player's journal
   lists and that expires after three days with a grudge) or says no. A thread is closed by the thing happening (goods given, a bed found: `reqTick`). The asker chases a promise (`chase_favour`).
   Feelings: `vent` (how I am, when it is bad) -> `console`, `praise` -> `thank_praise`: talking about it helps a little. */

const REQ_FOOD = ['fish', 'berries', 'grain'];
/** what this person really lacks and would ask for, or null */
function reqWant(n: any): any {
  if (n.dead || n.infant || n.age < 6) return null;
  const inv = n.inv || {};
  if ((n.hunger || 0) > 65 && !REQ_FOOD.some(k => (inv[k] || 0) > 0)) { const k = REQ_FOOD.filter(k => GOODS[k]).sort((a, b) => (GOODS[b].sat || 0) - (GOODS[a].sat || 0))[0]; return { kind: 'item', item: k }; }
  if (n.homeless && !n.player) return { kind: 'bed' };
  return null;
}
const reqOpen = (n: any, to: any, kind: string) => (n.reqs || []).find((r: any) => r.state !== 'done' && r.state !== 'failed' && r.to === to.id && r.kind === kind);
/** can this person hand over what is asked right now (never the last three; the player gives anything they have) */
/** the food this person could spare */
function reqFoodFrom(h: any): string | null { const keep = h.player ? 0 : 3; return REQ_FOOD.filter(k => GOODS[k] && ((h.inv && h.inv[k]) || 0) > keep).sort((a, b) => (h.inv[b] || 0) - (h.inv[a] || 0))[0] || null; }
function reqCanGive(h: any, req: any): boolean { return !!req && req.kind === 'item' && ((h.inv && h.inv[req.item]) || 0) > (h.player ? 0 : 3); }
function reqDone(asker: any, helper: any, kind: string, how: string) {
  const r = (asker.reqs || []).find((q: any) => q.state !== 'done' && q.state !== 'failed' && q.kind === kind); if (!r) return;
  r.state = 'done'; lfAff(asker, helper, 5, how);
  for (const m of helper.tmem || []) if (m.kind === 'request' && m.from === asker.id && m.req.kind === kind && m.state === 'open') m.state = 'done';
}
ACTS.ask_favour = { kind: 'economy', stage: 'topic', preview: () => ({}), w: (c: any, sp: any, li: any) => 2.5,
  when: (c: any, sp: any, li: any) => { if (c.done.ask_favour || sp.player || li.infant) return false; const w = reqWant(sp); if (!w) return false; if (w.kind === 'bed' && !li.player) return false;
    if (reqOpen(sp, li, w.kind) || game.time - ((sp.askT || {})[li.id] || -1e9) < 720) return false; return w.kind === 'bed' || li.player || !!reqFoodFrom(li); },
  apply: (c: any, sp: any, li: any) => { const w = reqWant(sp)!; if (w.kind === 'item' && !li.player) w.item = reqFoodFrom(li) || w.item; c.done.ask_favour = 1; c.req = w; c.reqAsker = sp; c.newsHow = w.kind; c.lifeItem = w.item ? giftName(w.item) : ''; (sp.askT || (sp.askT = {}))[li.id] = game.time; (sp.reqs || (sp.reqs = [])).push({ to: li.id, kind: w.kind, item: w.item, t: game.time, state: 'asked' }); },
  replies: ['favour_give', 'favour_promise', 'favour_no'] };
const favReply = (id: string, ok: (c: any, sp: any, li: any) => boolean, fx: (c: any, sp: any, li: any) => void, next: string[], w = 1) => { ACTS[id] = { kind: 'economy', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => !!c.req && ok(c, sp, li), w: () => w, apply: fx, replies: next }; };
// sp is the helper here, li the asker
favReply('favour_give', (c, sp) => reqCanGive(sp, c.req), (c, sp, li) => { const k = c.req.item; sp.inv[k]--; li.inv = li.inv || {}; li.inv[k] = (li.inv[k] || 0) + 1; reqDone(li, sp, 'item', 'helped me when I had nothing'); lfEmit('help', { actor: sp, target: li, sev: 1, tags: ['kindness', 'help'], chron: false, text: `${sp.first} helped ${li.first}` }); }, ['favour_thanks'], 3);
favReply('favour_promise', (c, sp) => !!sp.player, (c, sp, li) => { TM.add(sp, { kind: 'request', from: li.id, req: c.req, state: 'open', conf: 1, imp: 0.6 }); const r = (li.reqs || []).find((q: any) => q.state === 'asked' && q.to === sp.id); if (r) { r.state = 'promised'; r.tp = game.time; } }, ['favour_hopeful']);
favReply('favour_no', (c, sp) => !reqCanGive(sp, c.req) || !sp.player, (c, sp, li) => { const r = (li.reqs || []).find((q: any) => q.state === 'asked' && q.to === sp.id); if (r) r.state = 'failed'; lfAff(li, sp, -1.5, 'would not help'); }, [], 0.6);
favReply('favour_thanks', () => true, () => {}, []); favReply('favour_hopeful', () => true, () => {}, []);
ACTS.chase_favour = { kind: 'economy', stage: 'topic', preview: () => ({}), w: () => 3,
  when: (c: any, sp: any, li: any) => !c.done.chase_favour && !sp.player && !!(sp.reqs || []).find((r: any) => r.state === 'promised' && r.to === li.id && game.time - r.tp > 360 && game.time - (r.tc || 0) > 720),
  apply: (c: any, sp: any, li: any) => { const r = (sp.reqs || []).find((q: any) => q.state === 'promised' && q.to === li.id); r.tc = game.time; c.done.chase_favour = 1; c.req = { kind: r.kind, item: r.item }; c.newsHow = r.kind; c.lifeItem = r.item ? giftName(r.item) : ''; c.reqAsker = sp; }, replies: ['favour_give', 'favour_promise', 'favour_no'] };
/** hourly: homes found, promises that ran out */
LF2.hourly.push(() => {
  for (const n of npcs) for (const r of n.reqs || []) {
    if (r.state === 'done' || r.state === 'failed') continue; const h = lf2By(r.to);
    if (r.kind === 'bed' && !n.homeless && h) { r.state = 'done'; lfAff(n, h, 6, 'got me a bed'); for (const m of h.tmem || []) if (m.kind === 'request' && m.from === n.id && m.state === 'open') m.state = 'done'; }
    else if (r.state === 'promised' && game.time - r.tp > 1440 * 3 && h) { r.state = 'failed'; lfAff(n, h, -4, 'promised and did nothing'); for (const m of h.tmem || []) if (m.kind === 'request' && m.from === n.id && m.state === 'open') m.state = 'failed'; }
    else if (r.state === 'asked' && game.time - r.t > 1440) r.state = 'failed';
  }
});
/* ---- feelings ---- */
ACTS.vent = { kind: 'feeling', stage: 'topic', preview: (c: any, sp: any) => ({ state: talkState(sp) }), w: (c: any, sp: any, li: any) => 1.5 + Math.max(0, (sp.aff[li.id] || 0)) / 50,
  when: (c: any, sp: any, li: any) => !c.done.vent && ['hungry', 'tired', 'low'].includes(talkState(sp) as string) && ((sp.aff[li.id] || 0) > 8 || sp.player || (sp.know[li.id] || 0) > 25),
  apply: (c: any, sp: any, li: any) => { c.done.vent = 1; c.state = talkState(sp); sp.mood = Math.min(100, (sp.mood == null ? 50 : sp.mood) + 2); }, replies: ['console', 'shrug_off'] };
ACTS.console = { kind: 'feeling', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) > -10, w: () => 2, apply: (c: any, sp: any, li: any) => { li.mood = Math.min(100, (li.mood == null ? 50 : li.mood) + 3); lfAff(li, sp, 1.5, 'listened to me'); }, replies: [] };
ACTS.shrug_off = { kind: 'feeling', stage: 'topic', reply: true, when: () => true, w: () => 0.6, apply: (c: any, sp: any, li: any) => { lfAff(li, sp, -1, 'did not care'); }, replies: [] };
ACTS.praise = { kind: 'feeling', stage: 'topic', preview: () => ({}), w: () => 0.9, when: (c: any, sp: any, li: any) => !c.done.praise && (sp.aff[li.id] || 0) > 35 && !li.infant, apply: (c: any, sp: any, li: any) => { c.done.praise = 1; lfAff(li, sp, 1.5, 'was kind about me'); li.mood = Math.min(100, (li.mood == null ? 50 : li.mood) + 2); }, replies: ['thank_praise'] };
ACTS.thank_praise = { kind: 'feeling', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };

lx('ask_favour', 'plain', 'I have nothing to eat. Could you spare some {item}?', { how: 'item' }); lx('ask_favour', 'plain', 'I\'m starving. Do you have any {item}?', { how: 'item' });
lx('ask_favour', 'plain', 'I\'ve nowhere to sleep. Could you find me a bed?', { how: 'bed' }); lx('ask_favour', 'plain', 'I\'ve been sleeping rough. You build things. Could you build me a bed?', { how: 'bed' });
lx('chase_favour', 'plain', 'Did you manage to find that {item}?', { how: 'item' }); lx('chase_favour', 'plain', 'Have you thought about my bed?', { how: 'bed' });
lx('favour_give', 'plain', 'Of course. Here.'); lx('favour_give', 'plain', 'Here. Take it.'); lx('favour_promise', 'plain', 'I\'ll see what I can do.'); lx('favour_promise', 'plain', 'Give me a little time.');
lx('favour_no', 'plain', 'I can\'t help with that.'); lx('favour_no', 'plain', 'Sorry. I haven\'t got it to spare.'); lx('favour_thanks', 'plain', 'Thank you. I won\'t forget it.'); lx('favour_thanks', 'plain', 'Thank you. Truly.');
lx('favour_hopeful', 'plain', 'I\'d be grateful.'); lx('favour_hopeful', 'plain', 'Thank you. I\'ll be here.');
lx('vent', 'plain', 'I\'m starving, to be honest.', { state: 'hungry' }); lx('vent', 'plain', 'I\'m worn out. I could sleep standing.', { state: 'tired' }); lx('vent', 'plain', 'I\'ve been low lately. I don\'t know why.', { state: 'low' });
lx('console', 'plain', 'That sounds hard. I\'m sorry.'); lx('console', 'plain', 'It will pass. It usually does.'); lx('shrug_off', 'plain', 'Hm. Well.'); lx('shrug_off', 'plain', 'We all have days.');
lx('praise', 'plain', 'You\'re good company. I mean that.'); lx('praise', 'plain', 'I\'m glad you\'re here.'); lx('thank_praise', 'plain', 'That\'s kind of you.'); lx('thank_praise', 'plain', 'Thank you. I needed that.');
lxi('ask_favour', 'I have no food. I have had none since this morning. Could you spare {item}?', { how: 'item' }); lxi('ask_favour', 'I am hungry in a very exact way. Do you have any {item}?', { how: 'item' });
lxi('ask_favour', 'I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.', { how: 'bed' }); lxi('ask_favour', 'Would you build me a bed? I would use it for the usual things.', { how: 'bed' });
lxi('chase_favour', 'About the {item}. I am not pressing. I am mentioning it.', { how: 'item' }); lxi('chase_favour', 'I am still without a bed. I mention it only because it is true.', { how: 'bed' });
lxi('favour_give', 'Here. I had it. Now you do.'); lxi('favour_give', 'Take it. It was not doing anything.'); lxi('favour_promise', 'I will see what can be done. I make no claims.'); lxi('favour_promise', 'Give me a few days. I will keep it in mind.');
lxi('favour_no', 'No. I have exactly enough, which is the problem.'); lxi('favour_no', 'I cannot. I am sorry. I do mean it.'); lxi('favour_thanks', 'Thank you. I will remember this.'); lxi('favour_hopeful', 'Thank you. I will be here. Or nearby.');
lxi('vent', 'I am hungry, as it happens. It has been a while.', { state: 'hungry' }); lxi('vent', 'I am very tired. The tiredness has started to feel like a place.', { state: 'tired' }); lxi('vent', 'I have been low. It has no cause. That is what is wrong with it.', { state: 'low' });
lxi('console', 'That is hard. I am sorry. It is a small island and we are all here.'); lxi('console', 'It will pass. Not today, probably.'); lxi('shrug_off', 'Yes. Well. It is something.'); lxi('shrug_off', 'Everyone has days. Some have more of them.');
lxi('praise', 'You are good to have around. I do not say that to many people.'); lxi('praise', 'I am glad you ended up here. I mean it quite exactly.'); lxi('thank_praise', 'Thank you. I did not expect that.'); lxi('thank_praise', 'That is kind. I will think about it later.');
