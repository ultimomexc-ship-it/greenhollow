/* Reputation, suspicion and blame (docs/talk-engine.md, 3b.3). What people say about somebody is made of what each of them knows (`repTags`: from their own memories of events whose believed doer is that person),
   and the village's word is the sum (`repVillage`). A deed nobody saw is not nameless for long: each person who learns it guesses who (`repSuspect`: a grudge, a stranger, somebody who has done such things,
   now and then the real doer) or has no idea, so an innocent can be blamed for what somebody else did, the blame travels as news, and sticks to their name until it is cleared (they deny, the guilty confess, or somebody
   else is blamed in their place: `deed_blame`). Same for everybody; the player is just another suspect. */

const REP_KIND: any = { wall_removed: 'vandal', home_destroyed: 'vandal', building_down: 'vandal', bed_moved: 'meddler', caught_on_privy: 'meddler', theft: 'thief', pickpocket: 'thief', robbed: 'thief', breakin: 'thief', cheat: 'thief', gift: 'kind', help: 'kind', charity: 'kind', betrayal: 'gossip', shove: 'bully', brawl: 'bully' };
const REP_BAD = ['vandal', 'meddler', 'thief', 'gossip', 'bully'];
/** what `obs` believes about `subj`: tag -> weight (sum of confidences of what they believe subj did) */
function repTags(obs: any, subj: any): any {
  const out: any = {}; if (!obs.tmem) return out;
  for (const m of obs.tmem) {
    if (m.ev == null || m.kind === 'did' || m.forgiven || m.cleared) continue;
    const ev = lf2Ev().find((q: any) => q.id === m.ev); if (!ev) continue; const tag = REP_KIND[ev.kind]; if (!tag) continue;
    const who = m.ver && m.ver.who !== undefined ? m.ver.who : ev.actor; if (who !== subj.id) continue;
    out[tag] = (out[tag] || 0) + (m.conf || 0.5);
  }
  return out;
}
/** the village's word: tag -> number of people who hold it (at least a fair belief) */
function repVillage(subj: any): any {
  const out: any = {}; for (const o of npcs) { if (o.dead || o === subj || o.infant) continue; const t = repTags(o, subj); for (const k of Object.keys(t)) if (t[k] >= 0.45) out[k] = (out[k] || 0) + 1; }
  return out;
}
/** how sp sees li, one word, or undefined: the worst thing they believe, else 'kind' if they have seen it twice */
function repWord(sp: any, li: any): string | undefined {
  const t = repTags(sp, li), bad = REP_BAD.filter(k => t[k] >= 0.6).sort((a, b) => t[b] - t[a])[0]; if (bad) return bad; if (t.kind >= 1.5) return 'kind'; return undefined;
}
/** w guesses who did a deed nobody saw (or has no idea): { id, conf } or null */
function repSuspect(w: any, ev: any): any {
  const tag = REP_KIND[ev.kind], cands = npcs.filter((c: any) => !c.dead && !c.infant && c.age >= 12 && c !== w && c.id !== ev.target); if (!cands.length) return null;
  const ws = cands.map((c: any) => 0.25 + Math.max(0, -(w.aff[c.id] || 0)) / 40 + ((w.know[c.id] || 0) < 8 ? 0.4 : 0) + (tag ? (repTags(w, c)[tag] || 0) * 0.9 : 0) + (c.id === ev.actor ? 0.5 : 0));
  const none = 1.3, total = ws.reduce((a: number, b: number) => a + b, 0) + none; let r = Math.random() * total;
  for (let i = 0; i < cands.length; i++) { r -= ws[i]; if (r < 0) return { id: cands[i].id, conf: Math.min(0.75, 0.5 + 0.25 * Math.min(1, ws[i] / total * 3)) }; }
  return null;
}
const REP_WORDS: any = { vandal: 'knock things down', meddler: 'move things that are not yours', thief: 'take what is not yours', gossip: 'cannot keep a secret', bully: 'throw your weight about', kind: 'are good to people' };   // (said to the person: "people say you ...")

/* telling somebody what is said about them */
ACTS.tell_rep = { kind: 'person', stage: 'topic', preview: () => ({}), w: (c: any, sp: any, li: any) => 0.5 + Math.max(0, (sp.aff[li.id] || 0)) / 80,
  when: (c: any, sp: any, li: any) => { if (c.done.tell_rep || (sp.aff[li.id] || 0) < 10) return false; const v = repVillage(li), k = Object.keys(v).filter(t => v[t] >= 2 && REP_BAD.includes(t)).sort((a, b) => v[b] - v[a])[0]; if (!k) return false; c.repTag = k; c.repN = v[k]; return true; },
  apply: (c: any, sp: any, li: any) => { c.done.tell_rep = 1; c.aboutName = REP_WORDS[c.repTag]; c.lifeQty = c.repN; li.mood = Math.max(0, (li.mood == null ? 50 : li.mood) - 3); lfAff(li, sp, 1, 'was honest with me'); }, replies: ['rep_own', 'rep_deny'] };
ACTS.rep_own = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
ACTS.rep_deny = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
lx('tell_rep', 'plain', 'People are saying you {about}. {qty} of them, at least.'); lx('tell_rep', 'plain', 'You should know what\'s said about you. That you {about}.');
lx('rep_own', 'plain', 'I know. I haven\'t helped that.'); lx('rep_deny', 'plain', 'That isn\'t true. Somebody has got it wrong.'); lx('rep_deny', 'plain', 'People will say anything.');
lxi('tell_rep', 'It is said you {about}. {qty} people have said it to me. I counted.'); lxi('tell_rep', 'I think you should know that people say you {about}.');
lxi('rep_own', 'I know. I have not been helping.'); lxi('rep_deny', 'That is not true. It is the kind of thing that gets said.'); lxi('rep_deny', 'I did not. But I understand why it looks that way.');
/* greeting colours: how somebody greets a person they have a view of */
lx('greet_back', 'plain', 'Oh. It\'s you.', { rep: 'vandal' }); lx('greet_back', 'plain', 'Mind where you walk. Walls are precious.', { rep: 'vandal' }); lx('greet_back', 'plain', 'Hello. Please leave the walls alone.', { rep: 'vandal' });
lx('greet_back', 'plain', 'Hello. Keep your hands to yourself, will you.', { rep: 'meddler' }); lx('greet_back', 'plain', 'Hello. Don\'t move anything.', { rep: 'meddler' });
lx('greet_back', 'plain', 'Hello. I\'ve got my eye on my pockets.', { rep: 'thief' }); lx('greet_back', 'plain', 'Hello. Good to see you. Really.', { rep: 'kind' }); lx('greet_back', 'plain', 'Always a pleasure, {li}.', { rep: 'kind' });
lxi('greet_back', 'Ah. You. The one with the walls.', { rep: 'vandal' }); lxi('greet_back', 'Hello. I have been looking at our walls more closely lately.', { rep: 'vandal' });
lxi('greet_back', 'Hello. I have moved my valuables. They are in the same place as before, but I am looking at them.', { rep: 'meddler' }); lxi('greet_back', 'Hello. I am keeping my hands in my pockets. It is a habit I have formed.', { rep: 'thief' });
lxi('greet_back', 'Hello. It is good to see you. I mean that exactly.', { rep: 'kind' }); lxi('greet_back', 'Ah, {li}. Good. Today is better already.', { rep: 'kind' });
