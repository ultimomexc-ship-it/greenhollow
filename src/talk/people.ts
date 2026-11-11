/* People (docs/talk-engine.md, phase 6): what a villager thinks of the others, and why, and what they say about it. An opinion is `n.aff[id]` with the reasons that moved it (`n.why[id]`,
   written by `lfAff`). Acts: `ask_opinion` -> `give_opinion`, `gossip_person` -> agree / differ / no view, and `ask_family` -> `answer_family` (how somebody's own people are, from how they really are).
   What is heard is kept (`opinion` memories) and moves what the listener thinks a little, so how people feel about each other travels by talk. The player uses the same acts with their own feelings. */

/** the reasons behind an opinion: what moved it, strongest first. Generic ones are only used when nothing better exists */
function sbWhy(a: any, b: any, v: number, why?: string) {
  if (!why) return; const W = a.why || (a.why = {}), L = W[b.id] || (W[b.id] = []), e = L.find((x: any) => x.why === why);
  if (e) { e.v += v; e.t = game.time; } else L.push({ why, v, t: game.time });
  if (L.length > 6) { L.sort((x: any, y: any) => Math.abs(y.v) - Math.abs(x.v)); L.length = 6; }
}
const PEOPLE_GENERIC = ['chatted', 'talked with me'];
const PEOPLE_RELS: any = { spouse: 'my spouse', partner: 'my partner', parent: 'my parent', child: 'my child', sibling: 'my sibling' };
/** how fond a is of b, as a word the opinion lines are tagged with */
function peopleWord(a: any, b: any): string { const v = a.aff[b.id] || 0; return v >= 40 ? 'fond' : v >= 12 ? 'like' : v > -10 ? 'neutral' : v > -30 ? 'wary' : 'dislike'; }
/** one short sentence of why, in the speaker's words, or '' */
function peopleReason(a: any, b: any): string {
  const L = (a.why && a.why[b.id]) || [], sgn = Math.sign(a.aff[b.id] || 0);
  const rf = a.refl && a.refl[b.id]; if (rf && ((rf.w === 'good' && sgn >= 0) || (rf.w === 'unkind' && sgn <= 0)) && Math.random() < 0.6) return (b.female ? 'She' : 'He') + (rf.w === 'good' ? ' is always good to me.' : ' is never kind to me.');
  const best = L.filter((x: any) => !PEOPLE_GENERIC.includes(x.why) && (sgn === 0 || Math.sign(x.v) === sgn)).sort((x: any, y: any) => Math.abs(y.v) - Math.abs(x.v))[0];
  const f = a.fam || {}, g = b.fam || {}, rel = f.spouse === b.id ? 'spouse' : f.partner === b.id ? 'partner' : (f.kids || []).includes(b.id) ? 'child' : (f.mother === b.id || f.father === b.id) ? 'parent' : ((f.mother != null && f.mother === g.mother) || (f.father != null && f.father === g.father)) ? 'sibling' : a.rel && a.rel[b.id], gender = (b.female ? 'She' : 'He');
  if (best) {
    if (/^ev:/.test(best.why)) { const ev = lf2Ev().find((q: any) => q.id === +best.why.slice(3)); if (ev) return TE.text(ev, { who: ev.actor }).replace(/^./, (c: string) => c.toUpperCase()) + '.'; }
    else if (/^heard/.test(best.why)) return 'I ' + best.why + '.'; else return gender + ' ' + best.why + '.';
  }
  if (rel && PEOPLE_RELS[rel]) return gender + ' is ' + PEOPLE_RELS[rel] + '.'; if (rel === 'friend') return 'We get on.'; if (a.job && a.job === b.job) return 'We work side by side.';
  const anyL = L[0]; if (anyL) return 'We have talked a few times.'; return '';
}
/** somebody this person has a view of, who is not one of the two talking */
function peopleAbout(sp: any, li: any, need: 'view' | 'strong'): any {
  const cands = npcs.filter((o: any) => o !== sp && o !== li && !o.dead && !o.infant && o.age >= 6 && !o.player && (need === 'strong' ? Math.abs(sp.aff[o.id] || 0) >= 20 : (Math.abs(sp.aff[o.id] || 0) >= 6 || (sp.know[o.id] || 0) > 12)));
  return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
}
/** hearing an opinion: kept as a memory and moves the listener a little toward it */
function peopleHear(li: any, from: any, about: any, word: string, reason: string) {
  TM.add(li, { kind: 'opinion', about: about.id, from: from.id, word, reason, conf: 0.8, imp: 0.3 });
  const dir = word === 'fond' ? 1.5 : word === 'like' ? 0.8 : word === 'dislike' ? -1.5 : word === 'wary' ? -0.8 : 0; if (dir && li.aff) lfAff(li, about, dir * (0.5 + Math.max(0, (li.aff[from.id] || 0)) / 100), 'heard what ' + from.first + ' thinks of ' + about.first);
}
const peopleSet = (c: any, sp: any, about: any) => { c.about = about; c.op = peopleWord(sp, about); c.reason = peopleReason(sp, about); };

for (const id of ['ask_opinion', 'give_opinion', 'gossip_person', 'agree_opinion', 'differ_opinion', 'no_view', 'ask_family', 'answer_family'])
  ACTS[id] = { kind: 'person', stage: 'topic', reply: !['ask_opinion', 'gossip_person', 'ask_family'].includes(id), when: () => true, apply: () => {}, replies: [] };
ACTS.ask_opinion = { kind: 'person', stage: 'topic', preview: (c: any) => ({ about: c.about.first }), w: () => 0.8, when: (c: any, sp: any, li: any) => { if (c.done.ask_opinion) return false; const o = peopleAbout(sp, li, 'view'); if (!o || !((li.know[o.id] || 0) > 8 || Math.abs(li.aff[o.id] || 0) >= 6)) return false; c.about = o; return true; },
  apply: (c: any) => { c.done.ask_opinion = 1; c.aboutName = c.about.first; }, replies: ['give_opinion', 'no_view'] };
ACTS.give_opinion = { kind: 'person', stage: 'topic', reply: true, when: (c: any, sp: any) => !!c.about && (Math.abs(sp.aff[c.about.id] || 0) >= 6 || (sp.know[c.about.id] || 0) > 12), apply: (c: any, sp: any, li: any) => { peopleSet(c, sp, c.about); c.aboutName = c.about.first; peopleHear(li, sp, c.about, c.op, c.reason); }, replies: [] };
ACTS.no_view = { kind: 'person', stage: 'topic', reply: true, when: (c: any, sp: any) => !!c.about && !(Math.abs(sp.aff[c.about.id] || 0) >= 6 || (sp.know[c.about.id] || 0) > 12), apply: (c: any) => { c.aboutName = c.about.first; c.op = 'none'; }, replies: [] };
ACTS.gossip_person = { kind: 'person', stage: 'topic', preview: (c: any, sp: any) => ({ about: c.about.first, op: peopleWord(sp, c.about), reason: peopleReason(sp, c.about) }), w: (c: any, sp: any) => 0.5 + (talkHas(sp, 'gossipy') ? 1.2 : 0), when: (c: any, sp: any, li: any) => { if ((c.done.gossip_person || 0) >= 1) return false; const o = peopleAbout(sp, li, 'strong'); if (!o) return false; c.about = o; return true; },
  apply: (c: any, sp: any, li: any) => { c.done.gossip_person = 1; peopleSet(c, sp, c.about); c.aboutName = c.about.first; peopleHear(li, sp, c.about, c.op, c.reason); c.listenerView = Math.sign(li.aff[c.about.id] || 0); }, replies: ['agree_opinion', 'differ_opinion', 'no_view_g'] };
ACTS.agree_opinion.when = (c: any, sp: any) => !!c.about && Math.sign(sp.aff[c.about.id] || 0) === Math.sign(c.op === 'fond' || c.op === 'like' ? 1 : c.op === 'dislike' || c.op === 'wary' ? -1 : 0) && Math.abs(sp.aff[c.about.id] || 0) >= 6;
ACTS.differ_opinion.when = (c: any, sp: any) => !!c.about && Math.abs(sp.aff[c.about.id] || 0) >= 6 && Math.sign(sp.aff[c.about.id]) === -Math.sign(c.op === 'fond' || c.op === 'like' ? 1 : c.op === 'dislike' || c.op === 'wary' ? -1 : 0);
ACTS.no_view_g = { kind: 'person', stage: 'topic', reply: true, when: (c: any, sp: any) => !!c.about && !(Math.abs(sp.aff[c.about.id] || 0) >= 6), apply: () => {}, replies: [] };
/** somebody's people: a spouse, a child, a parent, a sibling of the one being asked */
function peopleKin(n: any): any[] { const f = n.fam || {}; const ids = [f.spouse, f.mother, f.father].concat(f.kids || []).filter((x: any) => x != null); return ids.map((id: any) => byId(id)).filter((o: any) => o && !o.dead && o !== n); }
ACTS.ask_family = { kind: 'person', stage: 'topic', preview: (c: any) => ({ about: c.about.first }), w: () => 0.9, when: (c: any, sp: any, li: any) => { if (c.done.ask_family) return false; const k = peopleKin(li).filter((o: any) => o !== sp && ((sp.know[o.id] || 0) > 3 || (sp.know[li.id] || 0) > 10)); if (!k.length) return false; c.about = k[Math.floor(Math.random() * k.length)]; c.famState = talkState(c.about) || 'fine'; return true; },
  apply: (c: any) => { c.done.ask_family = 1; c.aboutName = c.about.first; }, replies: ['answer_family'] };
ACTS.answer_family = { kind: 'person', stage: 'topic', reply: true, when: (c: any) => !!c.about, apply: (c: any) => { c.state = c.famState || talkState(c.about) || 'fine'; c.aboutName = c.about.first; }, replies: [] };

/* ---- words (plain) ---- */
lx('ask_opinion', 'plain', 'What do you make of {about}?'); lx('ask_opinion', 'plain', 'What\'s {about} like, really?'); lx('ask_opinion', 'plain', 'Do you get on with {about}?');
lx('give_opinion', 'plain', 'I\'m fond of {about}. {reason}', { op: 'fond' }); lx('give_opinion', 'plain', '{about} is one of the good ones. {reason}', { op: 'fond' }); lx('give_opinion', 'plain', '{about}\'s all right. {reason}', { op: 'like' }); lx('give_opinion', 'plain', 'I\'ve nothing against {about}. {reason}', { op: 'like' });
lx('give_opinion', 'plain', 'I don\'t know {about} well. No complaints.', { op: 'neutral' }); lx('give_opinion', 'plain', 'Not much to say about {about}. {reason}', { op: 'neutral' }); lx('give_opinion', 'plain', 'I\'m not keen on {about}. {reason}', { op: 'wary' }); lx('give_opinion', 'plain', '{about}? Hard work. {reason}', { op: 'wary' });
lx('give_opinion', 'plain', 'I can\'t stand {about}. {reason}', { op: 'dislike' }); lx('give_opinion', 'plain', 'Keep away from {about}, if you can. {reason}', { op: 'dislike' });
lx('no_view', 'plain', 'I don\'t know {about} well enough to say.'); lx('no_view', 'plain', 'No idea. I\'ve hardly spoken to {about}.'); lx('no_view_g', 'plain', 'I don\'t know them well enough to say.'); lx('no_view_g', 'plain', 'Hm. I haven\'t formed a view.');
lx('gossip_person', 'plain', 'Between us, I\'m fond of {about}. {reason}', { op: 'fond' }); lx('gossip_person', 'plain', 'You should know {about}. One of the good ones. {reason}', { op: 'fond' }); lx('gossip_person', 'plain', 'I\'ve got a soft spot for {about}. {reason}', { op: 'like' });
lx('gossip_person', 'plain', 'I\'m not sure about {about}. {reason}', { op: 'wary' }); lx('gossip_person', 'plain', 'Watch yourself with {about}. {reason}', { op: 'dislike' }); lx('gossip_person', 'plain', 'I\'ll say it: I can\'t stand {about}. {reason}', { op: 'dislike' }); lx('gossip_person', 'plain', 'Have you noticed {about}? {reason}', { op: 'neutral' });
lx('agree_opinion', 'plain', 'I think so too.'); lx('agree_opinion', 'plain', 'You\'re not the only one.'); lx('agree_opinion', 'plain', 'Funny, I\'d say the same.'); lx('differ_opinion', 'plain', 'Really? I\'ve always got on with them.'); lx('differ_opinion', 'plain', 'Hm. I\'ve found them fine.'); lx('differ_opinion', 'plain', 'I\'d never have said that.');
lx('ask_family', 'plain', 'How is {about}?'); lx('ask_family', 'plain', 'How is {about} getting on?'); lx('ask_family', 'plain', 'And {about}? Everything all right?');
lx('answer_family', 'plain', '{about} is well. Busy.', { state: 'fine' }); lx('answer_family', 'plain', '{about} is hungry, mostly.', { state: 'hungry' }); lx('answer_family', 'plain', '{about} is worn out.', { state: 'tired' }); lx('answer_family', 'plain', '{about} is in a good mood. Rare.', { state: 'glad' }); lx('answer_family', 'plain', '{about} has been low lately.', { state: 'low' });
/* ---- words (island) ---- */
lxi('ask_opinion', 'What is {about} like? I would like to know before I have to find out.'); lxi('ask_opinion', 'What do you make of {about}?'); lxi('ask_opinion', 'Do you get on with {about}? Be honest. I am only curious.');
lxi('give_opinion', 'I am fond of {about}. {reason} I do not say that about many people.', { op: 'fond' }); lxi('give_opinion', '{about} is one of the good ones. {reason}', { op: 'fond' }); lxi('give_opinion', '{about} is all right. {reason}', { op: 'like' }); lxi('give_opinion', 'I have nothing against {about}. {reason} That is not nothing.', { op: 'like' });
lxi('give_opinion', 'I do not know {about} well. I have no complaints, and no compliments.', { op: 'neutral' }); lxi('give_opinion', 'There is not much to say about {about}. {reason}', { op: 'neutral' }); lxi('give_opinion', 'I am not keen on {about}. {reason}', { op: 'wary' }); lxi('give_opinion', '{about}? I get tired around {about}. {reason}', { op: 'wary' });
lxi('give_opinion', 'I cannot stand {about}. {reason} I have tried.', { op: 'dislike' }); lxi('give_opinion', 'Keep away from {about} if you can. {reason}', { op: 'dislike' });
lxi('no_view', 'I do not know {about} well enough to say. We have shared a lot of air and very few sentences.'); lxi('no_view', 'No idea. I have hardly spoken to {about}.'); lxi('no_view_g', 'I do not know them well enough to say.'); lxi('no_view_g', 'Hm. I have not formed a view.');
lxi('gossip_person', 'Between us, I am fond of {about}. {reason}', { op: 'fond' }); lxi('gossip_person', 'You should know {about}. {reason} That is all I will say.', { op: 'fond' }); lxi('gossip_person', 'I have a soft spot for {about}. {reason}', { op: 'like' });
lxi('gossip_person', 'I am not sure about {about}. {reason}', { op: 'wary' }); lxi('gossip_person', 'Watch yourself with {about}. {reason}', { op: 'dislike' }); lxi('gossip_person', 'I will say it, since nobody else is listening: I cannot stand {about}. {reason}', { op: 'dislike' }); lxi('gossip_person', 'Have you noticed {about}? {reason}', { op: 'neutral' });
lxi('agree_opinion', 'I think so too. I had hoped it was only me.'); lxi('agree_opinion', 'You are not the only one.'); lxi('differ_opinion', 'Really? I have always got on with them.'); lxi('differ_opinion', 'Hm. I have found them fine. Perhaps we met different ones.');
lxi('ask_family', 'How is {about}?'); lxi('ask_family', 'And {about}? How is {about} getting on?'); lxi('ask_family', 'How is {about}? I realised I had not asked.');
lxi('answer_family', '{about} is well. Busy.', { state: 'fine' }); lxi('answer_family', '{about} is hungry, mostly. We are working on it.', { state: 'hungry' }); lxi('answer_family', '{about} is worn out. I keep telling them to sit down.', { state: 'tired' }); lxi('answer_family', '{about} is in a good mood. I have decided not to question it.', { state: 'glad' }); lxi('answer_family', '{about} has been low. It is not anything I can fix by talking, so I stay close.', { state: 'low' });
