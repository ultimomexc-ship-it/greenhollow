/* Deeds (docs/talk-engine.md, phase 3): what people say to you about what you did. A villager who knows that you did something to them or to somebody (saw it, felt it, or was told) raises it
   when they talk to you (`raise_deed`); you answer (sorry / it had to be done / it was not me / so what) and they answer that (`deed_forgive`, `deed_cold`, `deed_believe`, `deed_doubt`).
   `cry_deed` is the one-line cry when you are caught in the act. Works for anybody's deeds against the listener, but only the player's meddling makes them now. */

const DEED_TAGS = ['harm', 'nuisance', 'embarrass', 'scandal', 'violence', 'theft'];
/** the deed in the words of 'you ...' */
function deedYou(ev: any, sp: any): string {
  const t = ev.target != null ? lf2By(ev.target) : null, me = t === sp, they = t ? t.first : 'somebody';
  switch (ev.kind) {
    case 'wall_removed': return me ? 'knocked a wall out of my house' : t ? 'knocked a wall out of ' + they + '\'s house' : 'knocked a wall down';
    case 'home_destroyed': return me ? 'pulled my house down' : t ? 'pulled ' + they + '\'s house down' : 'pulled a house down';
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
    if (m.ev == null || m.raised || m.conf < 0.5 || !['saw', 'felt', 'told', 'overheard'].includes(m.kind)) continue;
    const ev = lf2Ev().find((q: any) => q.id === m.ev); if (!ev || ev.actor !== li.id || (m.ver && m.ver.who !== undefined && m.ver.who !== li.id)) continue;
    if (!(ev.tags || []).some((t: string) => DEED_TAGS.includes(t))) continue; if (game.time - m.t > 1440 * 8) continue;
    const s = m.imp + (ev.target === sp.id ? 1 : 0) + (m.kind === 'saw' || m.kind === 'felt' ? 0.3 : 0); if (s > bs) { bs = s; best = { m, ev }; }
  }
  return best;
}
const deedSet = (c: any, sp: any, d: any) => { c.deed = d; c.deedText = deedYou(d.ev, sp); c.newsHow = d.ev.target === sp.id ? 'victim' : d.m.kind === 'told' ? 'told' : 'saw'; };

ACTS.raise_deed = { kind: 'deed', stage: 'topic', preview: (c: any) => ({ deed: c.deedText, how: c.newsHow }), when: (c: any, sp: any, li: any) => !c.done.raise_deed && !!deedPick(sp, li) && !(li.player && false),
  w: (c: any, sp: any, li: any) => { const d = deedPick(sp, li); return d && d.ev.target === sp.id ? 8 : 2.5; },
  apply: (c: any, sp: any, li: any) => { const d = deedPick(sp, li); deedSet(c, sp, d); d.m.raised = true; c.done.raise_deed = 1; }, replies: ['deed_sorry', 'deed_defend', 'deed_deny', 'deed_shrug'] };
ACTS.cry_deed = { kind: 'deed', stage: 'topic', when: () => false, apply: () => {}, replies: [] };
const deedReply = (id: string, next: string[], fx: (c: any, sp: any, li: any) => void) => { ACTS[id] = { kind: 'deed', stage: 'topic', reply: true, when: (c: any) => !!c.deed, w: () => 1, apply: (c: any, sp: any, li: any) => { c.deedAnswer = id; fx(c, sp, li); }, replies: next }; };
// sp is the one answering the accusation (the player, or a villager)
deedReply('deed_sorry', ['deed_forgive', 'deed_cold'], (c, sp, li) => { lfAff(li, sp, 3, 'said sorry'); });
deedReply('deed_defend', ['deed_cold'], (c, sp, li) => { lfAff(li, sp, -3, 'did not think it was wrong'); });
deedReply('deed_deny', ['deed_believe', 'deed_doubt'], (c, sp, li) => {});
deedReply('deed_shrug', ['deed_cold'], (c, sp, li) => { lfAff(li, sp, -4, 'shrugged it off'); });
const deedAnswer = (id: string, ok: (c: any, sp: any, li: any) => boolean, fx?: (c: any, sp: any, li: any) => void) => { ACTS[id] = { kind: 'deed', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => !!c.deed && ok(c, sp, li), w: () => 1, apply: (c: any, sp: any, li: any) => { if (fx) fx(c, sp, li); }, replies: [] }; };
deedAnswer('deed_forgive', (c, sp, li) => (sp.aff[li.id] || 0) > -28, (c, sp, li) => { lfAff(sp, li, 4, 'forgave me'); });
deedAnswer('deed_cold', (c, sp, li) => (sp.aff[li.id] || 0) <= -28 || c.deedAnswer !== 'deed_sorry');
deedAnswer('deed_believe', (c) => !!c.deed && c.deed.m.kind !== 'saw' && c.deed.m.kind !== 'felt', (c, sp, li) => { lfAff(sp, li, 2, 'said it was not them'); });
deedAnswer('deed_doubt', (c) => !!c.deed, (c, sp, li) => { lfAff(sp, li, -3, 'lied to me'); });

/* ---- the words: plain ---- */
lx('raise_deed', 'plain', 'You {deed}. I would like to know why.', { how: 'victim' }); lx('raise_deed', 'plain', 'I know it was you. You {deed}.', { how: 'victim' }); lx('raise_deed', 'plain', 'You {deed}. I was there.', { how: 'victim' });
lx('raise_deed', 'plain', 'I saw what you did. You {deed}.', { how: 'saw' }); lx('raise_deed', 'plain', 'That was you, wasn\'t it? You {deed}.', { how: 'saw' });
lx('raise_deed', 'plain', 'I heard you {deed}. Is it true?', { how: 'told' }); lx('raise_deed', 'plain', 'People say you {deed}.', { how: 'told' });
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
