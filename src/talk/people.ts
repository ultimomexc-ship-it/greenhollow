/* People (docs/talk-engine.md, phase 6): what a villager thinks of the others, and why, and what they say about it. An opinion is `n.aff[id]` with the reasons that moved it (`n.why[id]`,
   written by `lfAff`). Acts: `ask_opinion` -> `give_opinion`, `gossip_person` -> agree / differ / no view, and `ask_family` -> `answer_family` (how somebody's own people are, from how they really are).
   What is heard is kept (`opinion` memories) and moves what the listener thinks a little, so how people feel about each other travels by talk. The player uses the same acts with their own feelings. */

/** the reasons behind an opinion: what moved it, strongest first. Generic ones are only used when nothing better exists */
function sbWhy(a: any, b: any, v: number, why?: string) {
  if (!why) return;
  const W = a.why || (a.why = {}),
    L = W[b.id] || (W[b.id] = []),
    e = L.find((x: any) => x.why === why);
  if (e) {
    e.v += v;
    e.t = game.time;
  } else L.push({ why, v, t: game.time });
  if (L.length > 6) {
    L.sort((x: any, y: any) => Math.abs(y.v) - Math.abs(x.v));
    L.length = 6;
  }
}
const PEOPLE_GENERIC = ['chatted', 'talked with me'];
const PEOPLE_RELS: any = { spouse: 'my spouse', partner: 'my partner', parent: 'my parent', child: 'my child', sibling: 'my sibling' };
/** how fond a is of b, as a word the opinion lines are tagged with */
function peopleWord(a: any, b: any): string {
  const v = a.aff[b.id] || 0;
  return v >= 40 ? 'fond' : v >= 12 ? 'like' : v > -10 ? 'neutral' : v > -30 ? 'wary' : 'dislike';
}
/** one short sentence of why, in the speaker's words, or '' */
function peopleReason(a: any, b: any): string {
  const L = (a.why && a.why[b.id]) || [],
    sgn = Math.sign(a.aff[b.id] || 0);
  const rf = a.refl && a.refl[b.id];
  if (rf && ((rf.w === 'good' && sgn >= 0) || (rf.w === 'unkind' && sgn <= 0)) && Math.random() < 0.6)
    return (b.female ? 'She' : 'He') + (rf.w === 'good' ? ' is always good to me.' : ' is never kind to me.');
  const best = L.filter((x: any) => !PEOPLE_GENERIC.includes(x.why) && (sgn === 0 || Math.sign(x.v) === sgn)).sort(
    (x: any, y: any) => Math.abs(y.v) * (/^heard/.test(y.why) ? 0.4 : 1) - Math.abs(x.v) * (/^heard/.test(x.why) ? 0.4 : 1)
  )[0]; // (what happened between them counts for more than hearsay)
  const f = a.fam || {},
    g = b.fam || {},
    rel =
      f.spouse === b.id
        ? 'spouse'
        : f.partner === b.id
          ? 'partner'
          : (f.kids || []).includes(b.id)
            ? 'child'
            : f.mother === b.id || f.father === b.id
              ? 'parent'
              : (f.mother != null && f.mother === g.mother) || (f.father != null && f.father === g.father)
                ? 'sibling'
                : a.rel && a.rel[b.id],
    gender = b.female ? 'She' : 'He';
  if (best) {
    if (/^ev:/.test(best.why)) {
      const ev = lf2EvById(+best.why.slice(3));
      if (ev) return TE.text(ev, { who: ev.actor }, a).replace(/^./, (c: string) => c.toUpperCase()) + '.';
    } else if (/^heard/.test(best.why)) return 'I ' + best.why + '.';
    else return gender + ' ' + best.why + '.';
  }
  if (rel && PEOPLE_RELS[rel])
    return (
      gender +
      ' is ' +
      (rel === 'child'
        ? b.female
          ? 'my daughter'
          : 'my son'
        : rel === 'parent'
          ? b.female
            ? 'my mother'
            : 'my father'
          : rel === 'sibling'
            ? b.female
              ? 'my sister'
              : 'my brother'
            : rel === 'spouse'
              ? b.female
                ? 'my wife'
                : 'my husband'
              : PEOPLE_RELS[rel]) +
      '.'
    );
  if (rel === 'friend') return 'We get on.';
  if (a.job && a.job === b.job) return 'We work side by side.';
  if (a.homeRoom != null && a.homeRoom === b.homeRoom) return 'We share a roof.';
  return ''; // (no reason worth giving: the opinion is said without one, rather than with 'we have talked')
}
/** somebody this person has a view of, who is not one of the two talking */
function peopleAbout(sp: any, li: any, need: 'view' | 'strong'): any {
  const cands = npcs.filter(
    (o: any) =>
      o !== sp &&
      o !== li &&
      !o.dead &&
      !o.infant &&
      o.age >= 6 &&
      !o.player &&
      (need === 'strong' ? Math.abs(sp.aff[o.id] || 0) >= 20 : Math.abs(sp.aff[o.id] || 0) >= 14)
  );
  return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
}
/** hearing an opinion: kept as a memory and moves the listener a little toward it */
function peopleHear(li: any, from: any, about: any, word: string, reason: string) {
  TM.add(li, { kind: 'opinion', about: about.id, from: from.id, word, reason, conf: 0.8, imp: 0.3 });
  const dir = word === 'fond' ? 1.5 : word === 'like' ? 0.8 : word === 'dislike' ? -1.5 : word === 'wary' ? -0.8 : 0;
  if (dir && li.aff)
    lfAff(
      li,
      about,
      dir * (0.5 + Math.max(0, li.aff[from.id] || 0) / 100),
      'heard ' + (dir > 0 ? 'good' : 'hard') + ' things about ' + (about.female ? 'her' : 'him') + ' from ' + from.first
    );
}
const peopleYou = (text: string, li: any) =>
  !li || !text
    ? text
    : text.replace(new RegExp('what ' + li.first + ' thinks', 'g'), 'what you think').replace(new RegExp('\\b' + li.first + '\\b', 'g'), 'you'); // (said to somebody, they are "you", not a name)
const peopleSet = (c: any, sp: any, about: any, li?: any) => {
  c.about = about;
  c.op = peopleWord(sp, about);
  c.reason = peopleYou(peopleReason(sp, about), li);
};

for (const id of ['ask_opinion', 'give_opinion', 'gossip_person', 'agree_opinion', 'differ_opinion', 'no_view', 'ask_family', 'answer_family'])
  ACTS[id] = {
    kind: 'person',
    stage: 'topic',
    reply: !['ask_opinion', 'gossip_person', 'ask_family'].includes(id),
    when: () => true,
    apply: () => {},
    replies: []
  };
ACTS.ask_opinion = {
  kind: 'person',
  stage: 'topic',
  preview: (c: any) => ({ about: c.about.first }),
  w: () => 0.8,
  when: (c: any, sp: any, li: any) => {
    if (c.done.ask_opinion) return false;
    const o = peopleAbout(sp, li, 'view');
    if (!o || !((li.know[o.id] || 0) > 8 || Math.abs(li.aff[o.id] || 0) >= 6)) return false;
    c.about = o;
    return true;
  },
  apply: (c: any) => {
    c.done.ask_opinion = 1;
    c.aboutName = c.about.first;
  },
  replies: ['give_opinion', 'no_view']
};
ACTS.give_opinion = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  preview: (c: any, sp: any) => (c.about ? { about: c.about.first, op: peopleWord(sp, c.about), reason: peopleReason(sp, c.about) } : {}),
  when: (c: any, sp: any) => !!c.about && (Math.abs(sp.aff[c.about.id] || 0) >= 6 || (sp.know[c.about.id] || 0) > 12),
  apply: (c: any, sp: any, li: any) => {
    peopleSet(c, sp, c.about, li);
    c.aboutName = c.about.first;
    peopleHear(li, sp, c.about, c.op, c.reason);
  },
  replies: []
};
ACTS.no_view = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any) => !!c.about && !(Math.abs(sp.aff[c.about.id] || 0) >= 6 || (sp.know[c.about.id] || 0) > 12),
  apply: (c: any) => {
    c.aboutName = c.about.first;
    c.op = 'none';
  },
  replies: []
};
ACTS.gossip_person = {
  kind: 'person',
  stage: 'topic',
  preview: (c: any, sp: any) => ({ about: c.about.first, op: peopleWord(sp, c.about), reason: peopleReason(sp, c.about) }),
  w: (c: any, sp: any) => 0.5 + (talkHas(sp, 'gossipy') ? 1.2 : 0),
  when: (c: any, sp: any, li: any) => {
    if ((c.done.gossip_person || 0) >= 1) return false;
    const o = peopleAbout(sp, li, 'strong');
    if (!o) return false;
    c.about = o;
    return true;
  },
  apply: (c: any, sp: any, li: any) => {
    c.done.gossip_person = 1;
    peopleSet(c, sp, c.about, li);
    c.aboutName = c.about.first;
    peopleHear(li, sp, c.about, c.op, c.reason);
    c.listenerView = Math.sign(li.aff[c.about.id] || 0);
  },
  replies: ['agree_opinion', 'differ_opinion', 'no_view_g']
};
ACTS.agree_opinion.when = (c: any, sp: any) =>
  !!c.about &&
  Math.sign(sp.aff[c.about.id] || 0) === Math.sign(c.op === 'fond' || c.op === 'like' ? 1 : c.op === 'dislike' || c.op === 'wary' ? -1 : 0) &&
  Math.abs(sp.aff[c.about.id] || 0) >= 6;
ACTS.differ_opinion.when = (c: any, sp: any) =>
  !!c.about &&
  Math.abs(sp.aff[c.about.id] || 0) >= 6 &&
  Math.sign(sp.aff[c.about.id]) === -Math.sign(c.op === 'fond' || c.op === 'like' ? 1 : c.op === 'dislike' || c.op === 'wary' ? -1 : 0);
ACTS.no_view_g = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any) => !!c.about && !(Math.abs(sp.aff[c.about.id] || 0) >= 6),
  apply: () => {},
  replies: []
};
/** somebody's people: a spouse, a child, a parent, a sibling of the one being asked */
function peopleKin(n: any): any[] {
  const f = n.fam || {};
  const ids = [f.spouse, f.mother, f.father].concat(f.kids || []).filter((x: any) => x != null);
  return ids.map((id: any) => byId(id)).filter((o: any) => o && !o.dead && o !== n);
}
ACTS.ask_family = {
  kind: 'person',
  stage: 'topic',
  preview: (c: any) => ({ about: c.about.first }),
  w: () => 0.9,
  when: (c: any, sp: any, li: any) => {
    if (c.done.ask_family) return false;
    const k = peopleKin(li).filter((o: any) => o !== sp && ((sp.know[o.id] || 0) > 3 || (sp.know[li.id] || 0) > 10));
    if (!k.length) return false;
    c.about = k[Math.floor(Math.random() * k.length)];
    c.famState = talkState(c.about) || 'fine';
    return true;
  },
  apply: (c: any) => {
    c.done.ask_family = 1;
    c.aboutName = c.about.first;
  },
  replies: ['answer_family']
};
ACTS.answer_family = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  preview: (c: any) => (c.about ? { about: c.about.first, state: c.famState || talkState(c.about) || 'fine' } : {}),
  when: (c: any) => !!c.about,
  apply: (c: any) => {
    c.state = c.famState || talkState(c.about) || 'fine';
    c.aboutName = c.about.first;
  },
  replies: []
};
