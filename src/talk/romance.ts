/* Romance (docs/talk-engine.md, kind `romance`): the same acts for everybody. A flirt (`flirt` -> `flirt_back` / `flirt_rebuff`), a declaration (`declare` -> `declare_return` / `declare_gentle`), an invitation to
   walk out (`ask_to_walk` -> `walk_yes` / `walk_later` / `walk_no`: yes starts a courtship, `startCourtship`) and a proposal (`propose` -> `propose_yes` / `propose_later` / `propose_no`: yes schedules the wedding).
   Nobody is courted without saying yes, and the villager you steer says it themselves, in the menu. The village's own daily romance (`lf2RomanceDaily` crushes, `romanceTick` pairings) is unchanged and
   still runs alongside: these acts are how it is said out loud. Same rules as the village for who can pair (`romOK`). */

/** may these two be a couple (the same rules as romanceTick) */
function romOK(a: any, b: any): boolean {
  return modOn('sys.romance') && !!a && !!b && a !== b && eligible(a) && eligible(b) && a.female !== b.female && Math.abs(a.age - b.age) <= 14 && !isKin(a, b);
}
const romAff = (a: any, b: any) => Math.min(a.aff[b.id] || 0, b.aff[a.id] || 0);
const romCool = (n: any, key: string, days: number) => game.time < ((n.romT || {})[key] || 0);
const romSet = (n: any, key: string, days: number) => { (n.romT || (n.romT = {}))[key] = game.time + days * 1440; };
const romMood = (n: any, d: number) => { n.mood = Math.max(0, Math.min(100, (n.mood == null ? 50 : n.mood) + d)); };

ACTS.flirt = { kind: 'romance', stage: 'topic', preview: () => ({}), w: (c: any, sp: any, li: any) => sp.crush === li.id ? 2.2 : 0.5,
  when: (c: any, sp: any, li: any) => !c.done.flirt && romOK(sp, li) && !romCool(sp, 'flirt' + li.id, 0) && (sp.crush === li.id || ((sp.aff[li.id] || 0) > 28 && (sp.know[li.id] || 0) > 20)),
  apply: (c: any, sp: any, li: any) => { c.done.flirt = 1; romSet(sp, 'flirt' + li.id, 3); }, replies: ['flirt_back', 'flirt_rebuff'] };
ACTS.flirt_back = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) >= 20 || sp.crush === li.id, w: () => 2,
  apply: (c: any, sp: any, li: any) => { lfAff(sp, li, 3, 'flirted with me'); lfAff(li, sp, 3, 'flirted back'); if ((sp.aff[li.id] || 0) >= 25 && !sp.crush) sp.crush = li.id; romMood(sp, 3); romMood(li, 4); }, replies: [] };
ACTS.flirt_rebuff = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) < 20 && sp.crush !== li.id, w: () => 2,
  apply: (c: any, sp: any, li: any) => { lfAff(li, sp, -1, 'turned me down'); romMood(li, -4); if (Math.random() < 0.4 && li.crush === sp.id) li.crush = null; }, replies: [] };

ACTS.declare = { kind: 'romance', stage: 'topic', preview: () => ({}), w: (c: any, sp: any, li: any) => sp.crush === li.id ? 1.6 : 0.3,
  when: (c: any, sp: any, li: any) => !c.done.declare && romOK(sp, li) && !romCool(sp, 'declare' + li.id, 0) && (sp.crush === li.id) && (sp.know[li.id] || 0) > 25 && !c.done.flirt,
  apply: (c: any, sp: any, li: any) => { c.done.declare = 1; romSet(sp, 'declare' + li.id, 12); lfEmit('crush', { actor: sp, target: li, sev: 1, tags: ['romance'], chron: false, text: `${sp.first} told ${li.first} how they feel` }); }, replies: ['declare_return', 'declare_gentle'] };
ACTS.declare_return = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) >= 30 || sp.crush === li.id, w: () => 2,
  apply: (c: any, sp: any, li: any) => { sp.crush = li.id; lfAff(sp, li, 6, 'told me how they feel'); lfAff(li, sp, 6, 'felt the same'); romMood(sp, 8); romMood(li, 10); }, replies: ['ask_to_walk'] };   // (and then the asking comes straight after, not three topics later)
ACTS.declare_gentle = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) < 30 && sp.crush !== li.id, w: () => 2,
  apply: (c: any, sp: any, li: any) => { lfAff(li, sp, -3, 'did not feel the same'); romMood(li, -10); if (Math.random() < 0.6) li.crush = null; li.refusedAt = game.time; }, replies: [] };

ACTS.ask_to_walk = { kind: 'romance', stage: 'topic', preview: () => ({}), w: (c: any, sp: any, li: any) => 2.4,
  when: (c: any, sp: any, li: any) => !c.done.ask_to_walk && romOK(sp, li) && romAff(sp, li) >= 30 && Math.min(sp.know[li.id] || 0, li.know[sp.id] || 0) >= 22 && !romCool(sp, 'walk' + li.id, 0) && !(li.refusedAt && li.refusedAt > game.time - 20 * 1440 && sp.player),
  apply: (c: any, sp: any, li: any) => { c.done.ask_to_walk = 1; romSet(sp, 'walk' + li.id, 6); }, replies: ['walk_yes', 'walk_later', 'walk_no'] };
ACTS.walk_yes = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => romOK(sp, li), w: (c: any, sp: any, li: any) => 1 + Math.max(0, romAff(sp, li)) / 25,
  apply: (c: any, sp: any, li: any) => { startCourtship(li, sp); c.courted = true; }, replies: [] };
ACTS.walk_later = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => romOK(sp, li), w: () => 0.8, apply: (c: any, sp: any, li: any) => { romSet(li, 'walk' + sp.id, 6); li.waitCourt = game.time + 6 * 1440; }, replies: [] };
ACTS.walk_no = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => true, w: (c: any, sp: any, li: any) => romAff(sp, li) < 30 ? 2 : 0.4,
  apply: (c: any, sp: any, li: any) => { lfAff(li, sp, -6, 'turned me down'); romMood(li, -8); li.refusedAt = game.time; chron(`${li.first} asked ${sp.first} to walk out with them, and ${sp.first} said no.`, 'love'); }, replies: [] };

ACTS.propose = { kind: 'romance', stage: 'topic', preview: () => ({}), w: () => 2.4,
  when: (c: any, sp: any, li: any) => !c.done.propose && modOn('event.wedding') && sp.fam.partner === li.id && li.fam.partner === sp.id && !sp.fam.spouse && !town.wedding && game.time - (sp.courtSince || game.time) > 8 * 1440 && romAff(sp, li) >= 55 && !romCool(sp, 'propose' + li.id, 0),
  apply: (c: any, sp: any, li: any) => { c.done.propose = 1; romSet(sp, 'propose' + li.id, 8); }, replies: ['propose_yes', 'propose_later', 'propose_no'] };
ACTS.propose_yes = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => !town.wedding && modOn('event.wedding'), w: (c: any, sp: any, li: any) => 1 + Math.max(0, romAff(sp, li) - 50) / 20,
  apply: (c: any, sp: any, li: any) => { scheduleWedding(sp.female ? li : sp, sp.female ? sp : li); c.wed = true; }, replies: [] };
ACTS.propose_later = { kind: 'romance', stage: 'topic', reply: true, when: () => true, w: () => 0.7, apply: (c: any, sp: any, li: any) => { sp.waitMarry = li.waitMarry = game.time + 8 * 1440; }, replies: [] };
ACTS.propose_no = { kind: 'romance', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => romAff(sp, li) < 55, w: () => 1.5,
  apply: (c: any, sp: any, li: any) => { sp.fam.partner = li.fam.partner = null; sp.rel[li.id] = li.rel[sp.id] = 'friend'; li.refusedAt = game.time; lfAff(li, sp, -20, 'turned down my proposal'); chron(`${li.first} asked ${sp.first} to marry them, and ${sp.first} said no. They stopped walking out together.`, 'love'); }, replies: [] };

lx('flirt', 'plain', 'You look well today. I noticed.'); lx('flirt', 'plain', 'I keep finding reasons to walk this way.'); lx('flirt', 'plain', 'You have a good laugh. I wanted you to know.');
lx('flirt_back', 'plain', 'That\'s kind of you to say. I noticed you, too.'); lx('flirt_back', 'plain', 'Ha. Well. You\'re not so bad yourself.');
lx('flirt_rebuff', 'plain', 'That\'s kind. I\'m not sure what you want me to say.'); lx('flirt_rebuff', 'plain', 'Hm. I think you have the wrong idea.');
lx('declare', 'plain', 'I have to say it. I think of you more than I should.'); lx('declare', 'plain', 'I\'m no good at this. I\'m fond of you. Very.');
lx('declare_return', 'plain', 'I\'ve felt the same for a while. I didn\'t know how to say it.'); lx('declare_return', 'plain', 'Oh. Good. I mean, yes. Me too.');
lx('declare_gentle', 'plain', 'I\'m sorry. I don\'t feel the same. I wish I did.'); lx('declare_gentle', 'plain', 'You\'re a good person. That\'s not the same thing, I know.');
lx('ask_to_walk', 'plain', 'Would you walk out with me?'); lx('ask_to_walk', 'plain', 'I\'d like to walk with you. Properly, I mean.');
lx('walk_yes', 'plain', 'I was hoping you\'d ask.'); lx('walk_yes', 'plain', 'Yes. I\'d like that.'); lx('walk_later', 'plain', 'Not yet. Ask me again later.'); lx('walk_later', 'plain', 'Give me a little time. I\'m not saying no.');
lx('walk_no', 'plain', 'No. I\'m sorry.'); lx('walk_no', 'plain', 'I don\'t think so. I\'m sorry.');
lx('propose', 'plain', 'Will you marry me?'); lx('propose', 'plain', 'I\'ve thought about this for a long time. Marry me.');
lx('propose_yes', 'plain', 'Yes. Yes, I will.'); lx('propose_yes', 'plain', 'I thought you\'d never ask. Yes.'); lx('propose_later', 'plain', 'Not yet. Ask me again later. I\'m not saying no.'); lx('propose_no', 'plain', 'No. I\'m sorry. I can\'t.');
lxi('flirt', 'You look well. I thought you should know that someone noticed.'); lxi('flirt', 'I have been walking past here more than the route requires.'); lxi('flirt', 'You have a good laugh. I have been counting how often I hear it.');
lxi('flirt_back', 'That is kind. I have noticed you as well. I did not plan to say so.'); lxi('flirt_back', 'Well. That is unexpected. I find that I do not mind.');
lxi('flirt_rebuff', 'That is kind. I am not sure what answer is wanted.'); lxi('flirt_rebuff', 'I think there has been a misunderstanding. A small one. I hope.');
lxi('declare', 'I have been rehearsing this. I am fond of you. It is more than that. I do not have the word.'); lxi('declare', 'I think of you more than the work requires. I thought I should say so.');
lxi('declare_return', 'I have felt it too. Since about the third week. I was waiting for a better moment.'); lxi('declare_return', 'Yes. Good. I was afraid I was the only one on the island.');
lxi('declare_gentle', 'I am sorry. I do not feel it. I would have liked to, it would have been simpler.'); lxi('declare_gentle', 'You are a good person. I know that is not the same thing.');
lxi('ask_to_walk', 'Would you walk out with me? There is not much else to do, but I mean it anyway.'); lxi('ask_to_walk', 'I would like to walk with you. Not for any practical reason.');
lxi('walk_yes', 'Yes. I would like that. I did not expect to say yes today.'); lxi('walk_yes', 'I was hoping you would ask. I had a reply prepared. This is it.'); lxi('walk_later', 'Not yet. Ask me again. I am not refusing.'); lxi('walk_later', 'Give me some days. I am not good at quick answers.');
lxi('walk_no', 'No. I am sorry. I am trying to say it kindly.'); lxi('walk_no', 'I do not think so. I wanted to be clear.');
lxi('propose', 'Will you marry me? I have thought about it for some time, or possibly for about a minute.'); lxi('propose', 'I would like us to be married. I would like it to be on a good day.');
lxi('propose_yes', 'Yes. I will. It is a very quick decision and I find I have no doubts.'); lxi('propose_yes', 'Yes. I thought you would never ask. Yes.'); lxi('propose_later', 'Not yet. Ask me again later. I am not refusing, I am being slow.'); lxi('propose_no', 'No. I am sorry. I cannot, and I would rather say so now.');
