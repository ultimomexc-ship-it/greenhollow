/* Deeds (docs/talk-engine.md, phase 3): what people say to you about what you did. A villager who knows that you did something to them or to somebody (saw it, felt it, or was told) raises it
   when they talk to you (`raise_deed`); you answer (sorry / it had to be done / it was not me / so what) and they answer that (`deed_forgive`, `deed_cold`, `deed_believe`, `deed_doubt`).
   `cry_deed` is the one-line cry when you are caught in the act. Works for anybody's deeds against the listener, but only the player's meddling makes them now. */

const DEED_TAGS = ['harm', 'nuisance', 'embarrass', 'scandal', 'violence', 'theft', 'deceit'];
/** the deed in the words of 'you ...' */
function deedYou(ev: any, sp: any): string {
  const t = ev.target != null ? lf2By(ev.target) : null, me = t === sp, they = t ? t.first : 'somebody';
  switch (ev.kind) {
    case 'wall_removed': return me ? 'knocked a wall out of my house' : t ? 'knocked a wall out of ' + they + '\'s house' : 'knocked a wall down';
    case 'home_destroyed': return me ? 'pulled my house down' : t ? 'pulled ' + they + '\'s house down' : 'pulled a house down';
    case 'betrayal': return me ? 'told somebody my secret' : t ? 'told ' + they + '\'s secret' : 'told a secret';
    case 'furniture_removed': return me ? 'took my ' + (ev.place || 'furniture') + ' away' : t ? 'took ' + they + '\'s ' + (ev.place || 'furniture') + ' away' : 'took some furniture away';
    case 'person_pushed': return me ? 'pushed me about' : t ? 'pushed ' + they + ' about' : 'pushed somebody about';
    case 'caught_bathing': return me ? 'knocked the wall out while I was bathing' : 'knocked the wall out while ' + they + ' was bathing';
    case 'caught_praying': return me ? 'knocked the wall out while I was praying' : 'knocked the wall out while ' + they + ' was praying';
    case 'building_down': return 'pulled down ' + (ev.place || 'a building');
    case 'bed_moved': return me ? 'carried me out of my house in my sleep' : t ? 'carried ' + they + ' out of the house in their sleep' : 'moved a bed with somebody in it';
    case 'caught_on_privy': return me ? 'knocked the wall out while I was on the privy' : 'knocked the wall out while ' + they + ' was on the privy';
    default: return TE.text(ev, { who: null }).replace(/^someone /, '');
  }
}
/** the deed sp holds against li that is worth raising, or null */
function deedPick(sp: any, li: any): any {
  let best: any = null, bs = 0;
  for (const m of sp.tmem || []) {
    if (m.ev == null || m.raised || m.forgiven || m.conf < 0.5 || !['saw', 'felt', 'told', 'overheard'].includes(m.kind)) continue;
    const ev = lf2Ev().find((q: any) => q.id === m.ev); if (!ev) continue; const who = m.ver && m.ver.who !== undefined ? m.ver.who : ev.actor; if (who !== li.id) continue;   // (the one they believe did it, rightly or not)
    if (!(ev.tags || []).some((t: string) => DEED_TAGS.includes(t))) continue; if (game.time - m.t > 1440 * 8) continue;
    const s = m.imp + (ev.target === sp.id ? 1 : 0) + (m.kind === 'saw' || m.kind === 'felt' ? 0.3 : 0); if (s > bs) { bs = s; best = { m, ev }; }
  }
  return best;
}
const deedSet = (c: any, sp: any, d: any) => { c.deed = d; c.deedText = deedYou(d.ev, sp); c.newsHow = d.m.ver && d.m.ver.suspect ? 'suspect' : d.ev.target === sp.id ? 'victim' : d.m.kind === 'told' ? 'told' : 'saw'; };

ACTS.raise_deed = { kind: 'deed', stage: 'topic', preview: (c: any) => ({ deed: c.deedText, how: c.newsHow }), when: (c: any, sp: any, li: any) => !c.done.raise_deed && !!deedPick(sp, li) && !(li.player && false),
  w: (c: any, sp: any, li: any) => { const d = deedPick(sp, li); return d && d.ev.target === sp.id ? 8 : 2.5; },
  apply: (c: any, sp: any, li: any) => { const d = deedPick(sp, li); deedSet(c, sp, d); d.m.raised = true; c.done.raise_deed = 1; }, replies: ['deed_sorry', 'deed_defend', 'deed_deny', 'deed_shrug', 'deed_blame', 'offer_gift'] };
ACTS.cry_deed = { kind: 'deed', stage: 'topic', when: () => false, apply: () => {}, replies: [] };
const deedGuilty = (c: any, sp: any) => !!c.deed && c.deed.ev.actor === sp.id;   // (am I the one who really did it)
const deedReply = (id: string, next: string[], fx: (c: any, sp: any, li: any) => void, ok: (c: any, sp: any, li: any) => boolean = () => true, w: (c: any, sp: any) => number = () => 1) => { ACTS[id] = { kind: 'deed', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => !!c.deed && ok(c, sp, li), w: (c: any, sp: any) => w(c, sp), apply: (c: any, sp: any, li: any) => { c.deedAnswer = id; fx(c, sp, li); }, replies: next }; };
// sp is the one answering the accusation (the player, or a villager); the innocent can only deny, shrug or blame
deedReply('deed_sorry', ['deed_forgive', 'deed_cold'], (c, sp, li) => { lfAff(li, sp, 3, 'said sorry'); }, deedGuilty);
deedReply('deed_defend', ['deed_cold'], (c, sp, li) => { lfAff(li, sp, -3, 'did not think it was wrong'); }, deedGuilty);
deedReply('deed_deny', ['deed_believe', 'deed_doubt'], (c, sp, li) => { c.deedLie = deedGuilty(c, sp); }, () => true, (c, sp) => deedGuilty(c, sp) ? 1 : 4);
deedReply('deed_shrug', ['deed_cold'], (c, sp, li) => { lfAff(li, sp, -4, 'shrugged it off'); }, deedGuilty);
const blameWho = (c: any, sp: any, li: any) => { const cands = npcs.filter((o: any) => !o.dead && !o.infant && o.age >= 12 && o !== sp && o !== li && o.id !== c.deed.ev.target); return cands.filter((o: any) => (sp.aff[o.id] || 0) < -10)[0] || cands[Math.floor(Math.random() * cands.length)]; };
deedReply('deed_blame', ['deed_believe', 'deed_doubt'], (c, sp, li) => {
  const X = c.blameCand && c.blameCand !== sp && c.blameCand !== li ? c.blameCand : blameWho(c, sp, li); c.blameCand = null;
  if (!X) return; c.blamed = X; c.aboutName = X.first; c.deedLie = true; c.deed.m.ver = Object.assign({}, c.deed.m.ver, { who: X.id, suspect: true }); c.deed.m.conf = 0.55; c.deed.m.raised = false;
  lfAff(li, X, -6, 'was said to have done it'); }, (c, sp) => deedGuilty(c, sp) && npcs.length > 3, (c, sp) => (sp.player ? 1 : 0.7));
ACTS.deed_blame.preview = (c: any, sp: any, li: any) => { const X = blameWho(c, sp, li); c.blameCand = X; return { about: X ? X.first : '' }; };
const deedAnswer = (id: string, ok: (c: any, sp: any, li: any) => boolean, fx?: (c: any, sp: any, li: any) => void) => { ACTS[id] = { kind: 'deed', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => !!c.deed && ok(c, sp, li), w: () => 1, apply: (c: any, sp: any, li: any) => { if (fx) fx(c, sp, li); }, replies: [] }; };
deedAnswer('deed_forgive', (c, sp, li) => (sp.aff[li.id] || 0) > -28, (c, sp, li) => { lfAff(sp, li, 4, 'forgave me'); });
deedAnswer('deed_cold', (c, sp, li) => (sp.aff[li.id] || 0) <= -28 || (c.deedAnswer !== 'deed_sorry'));
// believed: a hunch is dropped (and the blame cleared); a first-hand certainty is not
deedAnswer('deed_believe', (c, sp, li) => { const m = c.deed.m; return (m.ver && m.ver.suspect) || (m.kind !== 'saw' && m.kind !== 'felt'); }, (c, sp, li) => { const m = c.deed.m; if (c.deedAnswer === 'deed_deny' && !c.blamed) { m.cleared = true; lfAff(sp, li, 2, 'said it was not them'); } else lfAff(sp, li, 1, 'put me straight'); });
deedAnswer('deed_doubt', (c) => true, (c, sp, li) => { lfAff(sp, li, -3, 'lied to me'); });

/* ---- the words: plain ---- */
lx('raise_deed', 'plain', 'You {deed}. I would like to know why.', { how: 'victim' }); lx('raise_deed', 'plain', 'I know it was you. You {deed}.', { how: 'victim' }); lx('raise_deed', 'plain', 'You {deed}. I was there.', { how: 'victim' });
lx('raise_deed', 'plain', 'I saw what you did. You {deed}.', { how: 'saw' }); lx('raise_deed', 'plain', 'That was you, wasn\'t it? You {deed}.', { how: 'saw' });
lx('raise_deed', 'plain', 'I heard you {deed}. Is it true?', { how: 'told' }); lx('raise_deed', 'plain', 'People say you {deed}.', { how: 'told' });
lx('raise_deed', 'plain', 'Be honest. Was it you who {deed}?', { how: 'suspect' }); lx('raise_deed', 'plain', 'Somebody {deed}. I think it was you.', { how: 'suspect' });
lx('deed_blame', 'plain', 'It wasn\'t me. I\'d look at {about}.'); lx('deed_blame', 'plain', 'Ask {about}. I saw them near there.');
lxi('raise_deed', 'I have been thinking about who {deed}. I keep arriving at you.', { how: 'suspect' }); lxi('raise_deed', 'It is a hunch. Was it you who {deed}?', { how: 'suspect' });
lxi('deed_blame', 'I would look at {about}. I am not saying more than that. I am saying that.'); lxi('deed_blame', 'It was not me. I have noticed {about} nearby, more than usual.');
lx('deed_sorry', 'plain', 'I\'m sorry. I shouldn\'t have done it.'); lx('deed_sorry', 'plain', 'You\'re right. I\'m sorry.');
lx('deed_defend', 'plain', 'It had to be done.'); lx('deed_defend', 'plain', 'It was for the best. Believe me.');
lx('deed_deny', 'plain', 'That wasn\'t me.'); lx('deed_deny', 'plain', 'You\'ve got the wrong person.');
lx('deed_shrug', 'plain', 'So what if I did?'); lx('deed_shrug', 'plain', 'Walls come down. It happens.');
lx('deed_forgive', 'plain', 'Well. Don\'t do it again.'); lx('deed_forgive', 'plain', 'All right. I\'ll let it go.');
lx('deed_cold', 'plain', 'I won\'t forget it.'); lx('deed_cold', 'plain', 'Keep away from my house.');
lx('deed_believe', 'plain', 'Then I must have heard wrong.'); lx('deed_believe', 'plain', 'Hm. Maybe it was someone else.');
lx('deed_doubt', 'plain', 'I don\'t believe you.'); lx('deed_doubt', 'plain', 'Somebody saw you. Don\'t lie.');
lx('cry_deed', 'plain', 'What are you doing?', { how: 'wall' }); lx('cry_deed', 'plain', 'Hey! That wall was holding something up.', { how: 'wall' });
lx('cry_deed', 'plain', 'Hey! That\'s my wall!', { how: 'wall_home' }); lx('cry_deed', 'plain', 'My house! What are you doing to my house?', { how: 'wall_home' });
lx('cry_deed', 'plain', 'Occupied! I am occupied!', { how: 'privy' }); lx('cry_deed', 'plain', 'Do you mind? I was in the middle of something!', { how: 'privy' });
lx('cry_deed', 'plain', 'My home! Stop!', { how: 'home' }); lx('cry_deed', 'plain', 'You\'ve pulled down my house!', { how: 'home' });
/* ---- the island voice ---- */
lxi('raise_deed', 'You {deed}. I have thought about little else.', { how: 'victim' }); lxi('raise_deed', 'It was you. You {deed}. I would like an explanation, if one exists.', { how: 'victim' });
lxi('raise_deed', 'I saw you. You {deed}. I did not say anything at the time.', { how: 'saw' }); lxi('raise_deed', 'You {deed}. I was standing right there.', { how: 'saw' });
lxi('raise_deed', 'I was told you {deed}. I would rather hear it from you.', { how: 'told' }); lxi('raise_deed', 'People say you {deed}. People say many things here.', { how: 'told' });
lxi('deed_sorry', 'I am sorry. I do not know what came over me.'); lxi('deed_sorry', 'I am sorry. It looked different from the other side.');
lxi('deed_defend', 'It needed doing. I cannot explain it better than that.'); lxi('deed_defend', 'I had a reason. It seemed to be a good one.');
lxi('deed_deny', 'It was not me. I was somewhere else. I am nearly sure.'); lxi('deed_deny', 'No. You are thinking of somebody else.');
lxi('deed_shrug', 'It is a wall. There are others.'); lxi('deed_shrug', 'I did. I am not sure what you want me to say.');
lxi('deed_forgive', 'Very well. We will not mention it again. I will, but not today.'); lxi('deed_forgive', 'All right. I have had worse mornings. Not many.');
lxi('deed_cold', 'I will remember this. I remember most things.'); lxi('deed_cold', 'No. I do not think I will forget that.');
lxi('deed_believe', 'Then I was misinformed. It happens on an island this size.'); lxi('deed_believe', 'Ah. Then it was someone who looks like you.');
lxi('deed_doubt', 'I do not believe you. I would like to.'); lxi('deed_doubt', 'You are not a good liar. It is not an insult.');
lxi('cry_deed', 'What are you doing?', { how: 'wall' }); lxi('cry_deed', 'That wall was in use.', { how: 'wall' });
lxi('cry_deed', 'That is my wall.', { how: 'wall_home' }); lxi('cry_deed', 'That is my house. I am standing in it.', { how: 'wall_home' });
lxi('cry_deed', 'I am using this. I am using this right now.', { how: 'privy' }); lxi('cry_deed', 'There was a wall there. A moment ago there was a wall.', { how: 'privy' });
lxi('cry_deed', 'That was my house. It was there this morning.', { how: 'home' }); lxi('cry_deed', 'My house. You have taken my house down.', { how: 'home' });
/* ---- how the news of it reads ---- */
lx('ev:wall_removed', 'plain', '{a} knocked a wall out of {t}\'s house'); lx('ev:wall_removed', 'plain', '{t}\'s wall was knocked down, and {a} did it');
lx('ev:home_destroyed', 'plain', '{a} pulled {t}\'s house down'); lx('ev:home_destroyed', 'plain', '{t}\'s house came down, and {a} was there');
lx('ev:building_down', 'plain', '{a} pulled down {place}'); lx('ev:bed_moved', 'plain', '{t} was carried out of the house in their sleep'); lx('ev:bed_moved', 'plain', '{t} woke up outdoors, bed and all');
lx('ev:caught_on_privy', 'plain', '{t} was caught on the privy when the wall came down'); lx('ev:caught_on_privy', 'plain', '{a} knocked the wall out while {t} was on the privy');
lx('cry_deed', 'plain', 'Where am I? That was my bed!', { how: 'bed' }); lx('cry_deed', 'plain', 'Is that a tree? Who moved my bed?', { how: 'bed' }); lx('cry_deed', 'plain', 'Who has carried off my chair?', { how: 'chair' });
lxi('cry_deed', 'I went to sleep indoors. I am nearly certain of that.', { how: 'bed' }); lxi('cry_deed', 'There is a tree where the ceiling was.', { how: 'bed' }); lxi('cry_deed', 'I was sitting down just now. I was indoors.', { how: 'chair' });
lx('cry_deed', 'plain', 'Is that my bed? Where is it going?', { how: 'furniture' }); lx('cry_deed', 'plain', 'Put that back!', { how: 'furniture' }); lx('cry_deed', 'plain', 'Hey! Hands off me!', { how: 'pushed' }); lx('cry_deed', 'plain', 'What is this? Put me down!', { how: 'pushed' });
lx('cry_deed', 'plain', 'I am bathing! Do you mind!', { how: 'bath' }); lx('cry_deed', 'plain', 'Not now! I am praying!', { how: 'pray' });
lxi('cry_deed', 'That was mine. It was there a moment ago.', { how: 'furniture' }); lxi('cry_deed', 'I would like that back. I know where it was.', { how: 'furniture' }); lxi('cry_deed', 'I am being moved. I would like it noted.', { how: 'pushed' }); lxi('cry_deed', 'Please stop pushing me. I was going somewhere.', { how: 'pushed' });
lxi('cry_deed', 'I am bathing. I was. The wall was there when I started.', { how: 'bath' }); lxi('cry_deed', 'I was praying. I do not think it was heard.', { how: 'pray' });
lx('ev:furniture_removed', 'plain', '{a} took {t}\'s furniture away'); lx('ev:furniture_removed', 'plain', '{t} came home and the furniture was gone'); lx('ev:person_pushed', 'plain', '{a} pushed {t} around'); lx('ev:person_pushed', 'plain', '{t} was shoved about, and {a} did it');
lx('ev:caught_bathing', 'plain', '{t} was caught bathing when the wall came down'); lx('ev:caught_bathing', 'plain', '{a} knocked the wall out while {t} was bathing'); lx('ev:caught_praying', 'plain', '{t} was praying when the wall came down'); lx('ev:caught_praying', 'plain', '{a} took the wall down while {t} was at prayer');
