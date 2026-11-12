/* Deeds (docs/talk-engine.md, phase 3): what people say to you about what you did. A villager who knows that you did something to them or to somebody (saw it, felt it, or was told) raises it
   when they talk to you (`raise_deed`); you answer (sorry / it had to be done / it was not me / so what) and they answer that (`deed_forgive`, `deed_cold`, `deed_believe`, `deed_doubt`).
   `cry_deed` is the one-line cry when you are caught in the act. Works for anybody's deeds against the listener, but only the player's meddling makes them now. */

const DEED_TAGS = ['harm', 'nuisance', 'embarrass', 'scandal', 'violence', 'theft', 'deceit'];
/** the deed in the words of 'you ...' */
function deedYou(ev: any, sp: any): string {
  const t = ev.target != null ? lf2By(ev.target) : null,
    me = t === sp,
    they = t ? t.first : 'somebody';
  switch (ev.kind) {
    case 'wall_removed':
      return me ? 'knocked a wall out of my house' : t ? 'knocked a wall out of ' + they + "'s house" : 'knocked a wall down';
    case 'home_destroyed':
      return me ? 'pulled my house down' : t ? 'pulled ' + they + "'s house down" : 'pulled a house down';
    case 'betrayal':
      return me ? 'told somebody my secret' : t ? 'told ' + they + "'s secret" : 'told a secret';
    case 'furniture_removed':
      return me
        ? 'took my ' + (ev.place || 'furniture') + ' away'
        : t
          ? 'took ' + they + "'s " + (ev.place || 'furniture') + ' away'
          : 'took some furniture away';
    case 'person_pushed':
      return me ? 'pushed me about' : t ? 'pushed ' + they + ' about' : 'pushed somebody about';
    case 'caught_bathing':
      return me ? 'knocked the wall out while I was bathing' : 'knocked the wall out while ' + they + ' was bathing';
    case 'caught_praying':
      return me ? 'knocked the wall out while I was praying' : 'knocked the wall out while ' + they + ' was praying';
    case 'building_down':
      return 'pulled down ' + (ev.place || 'a building');
    case 'bed_moved':
      return me
        ? 'carried me out of my house in my sleep'
        : t
          ? 'carried ' + they + ' out of the house in their sleep'
          : 'moved a bed with somebody in it';
    case 'caught_on_privy':
      return me ? 'knocked the wall out while I was on the privy' : 'knocked the wall out while ' + they + ' was on the privy';
    default:
      return TE.text(ev, { who: null }, sp).replace(/^someone /, '');
  }
}
/** the deed sp holds against li that is worth raising, or null */
function deedPick(sp: any, li: any): any {
  let best: any = null,
    bs = 0;
  for (const m of sp.tmem || []) {
    if (m.ev == null || m.raised || m.forgiven || m.conf < 0.5 || !['saw', 'felt', 'told', 'overheard'].includes(m.kind)) continue;
    const ev = lf2Ev().find((q: any) => q.id === m.ev);
    if (!ev) continue;
    const who = m.ver && m.ver.who !== undefined ? m.ver.who : ev.actor;
    if (who !== li.id) continue; // (the one they believe did it, rightly or not)
    if (!(ev.tags || []).some((t: string) => DEED_TAGS.includes(t))) continue;
    if (game.time - m.t > 1440 * 8) continue;
    const s = m.imp + (ev.target === sp.id ? 1 : 0) + (m.kind === 'saw' || m.kind === 'felt' ? 0.3 : 0);
    if (s > bs) {
      bs = s;
      best = { m, ev };
    }
  }
  return best;
}
const deedSet = (c: any, sp: any, d: any) => {
  c.deed = d;
  c.deedText = deedYou(d.ev, sp);
  c.newsHow = d.m.ver && d.m.ver.suspect ? 'suspect' : d.ev.target === sp.id ? 'victim' : d.m.kind === 'told' ? 'told' : 'saw';
};

ACTS.raise_deed = {
  kind: 'deed',
  stage: 'topic',
  preview: (c: any, sp: any, li: any) => {
    if (!c.deedText) {
      const d = deedPick(sp, li);
      if (d) deedSet(c, sp, d);
    }
    return { deed: c.deedText, how: c.newsHow };
  },
  when: (c: any, sp: any, li: any) => !c.done.raise_deed && !!deedPick(sp, li) && !(li.player && false),
  w: (c: any, sp: any, li: any) => {
    const d = deedPick(sp, li);
    return d && d.ev.target === sp.id ? 8 : 2.5;
  },
  apply: (c: any, sp: any, li: any) => {
    const d = deedPick(sp, li);
    deedSet(c, sp, d);
    d.m.raised = true;
    c.done.raise_deed = 1;
  },
  replies: ['deed_sorry', 'deed_defend', 'deed_deny', 'deed_shrug', 'deed_blame', 'offer_gift']
};
ACTS.cry_deed = { kind: 'deed', stage: 'topic', when: () => false, apply: () => {}, replies: [] };
const deedGuilty = (c: any, sp: any) => !!c.deed && c.deed.ev.actor === sp.id; // (am I the one who really did it)
const deedReply = (
  id: string,
  next: string[],
  fx: (c: any, sp: any, li: any) => void,
  ok: (c: any, sp: any, li: any) => boolean = () => true,
  w: (c: any, sp: any) => number = () => 1
) => {
  ACTS[id] = {
    kind: 'deed',
    stage: 'topic',
    reply: true,
    when: (c: any, sp: any, li: any) => !!c.deed && ok(c, sp, li),
    w: (c: any, sp: any) => w(c, sp),
    apply: (c: any, sp: any, li: any) => {
      c.deedAnswer = id;
      fx(c, sp, li);
    },
    replies: next
  };
};
// sp is the one answering the accusation (the player, or a villager); the innocent can only deny, shrug or blame
deedReply(
  'deed_sorry',
  ['deed_forgive', 'deed_cold'],
  (c, sp, li) => {
    lfAff(li, sp, 3, 'said sorry');
  },
  deedGuilty
);
deedReply(
  'deed_defend',
  ['deed_cold'],
  (c, sp, li) => {
    lfAff(li, sp, -3, 'did not think it was wrong');
  },
  deedGuilty
);
deedReply(
  'deed_deny',
  ['deed_believe', 'deed_doubt'],
  (c, sp, li) => {
    c.deedLie = deedGuilty(c, sp);
  },
  () => true,
  (c, sp) => (deedGuilty(c, sp) ? 1 : 4)
);
deedReply(
  'deed_shrug',
  ['deed_cold'],
  (c, sp, li) => {
    lfAff(li, sp, -4, 'shrugged it off');
  },
  deedGuilty
);
const blameWho = (c: any, sp: any, li: any) => {
  const cands = npcs.filter((o: any) => !o.dead && !o.infant && o.age >= 12 && o !== sp && o !== li && o.id !== c.deed.ev.target);
  return cands.filter((o: any) => (sp.aff[o.id] || 0) < -10)[0] || cands[Math.floor(Math.random() * cands.length)];
};
deedReply(
  'deed_blame',
  ['deed_believe', 'deed_doubt'],
  (c, sp, li) => {
    const X = c.blameCand && c.blameCand !== sp && c.blameCand !== li ? c.blameCand : blameWho(c, sp, li);
    c.blameCand = null;
    if (!X) return;
    c.blamed = X;
    c.aboutName = X.first;
    c.deedLie = true;
    c.deed.m.ver = Object.assign({}, c.deed.m.ver, { who: X.id, suspect: true });
    c.deed.m.conf = 0.55;
    c.deed.m.raised = false;
    lfAff(li, X, -6, 'was said to have done it');
  },
  (c, sp) => deedGuilty(c, sp) && npcs.length > 3,
  (c, sp) => (sp.player ? 1 : 0.7)
);
ACTS.deed_blame.preview = (c: any, sp: any, li: any) => {
  const X = blameWho(c, sp, li);
  c.blameCand = X;
  return { about: X ? X.first : '' };
};
const deedAnswer = (id: string, ok: (c: any, sp: any, li: any) => boolean, fx?: (c: any, sp: any, li: any) => void) => {
  ACTS[id] = {
    kind: 'deed',
    stage: 'topic',
    reply: true,
    when: (c: any, sp: any, li: any) => !!c.deed && ok(c, sp, li),
    w: () => 1,
    apply: (c: any, sp: any, li: any) => {
      if (fx) fx(c, sp, li);
    },
    replies: []
  };
};
deedAnswer(
  'deed_forgive',
  (c, sp, li) => (sp.aff[li.id] || 0) > -28,
  (c, sp, li) => {
    lfAff(sp, li, 4, 'forgave me');
  }
);
deedAnswer('deed_cold', (c, sp, li) => (sp.aff[li.id] || 0) <= -28 || c.deedAnswer !== 'deed_sorry');
// believed: a hunch is dropped (and the blame cleared); a first-hand certainty is not
deedAnswer(
  'deed_believe',
  (c, sp, li) => {
    const m = c.deed.m;
    return (m.ver && m.ver.suspect) || (m.kind !== 'saw' && m.kind !== 'felt');
  },
  (c, sp, li) => {
    const m = c.deed.m;
    if (c.deedAnswer === 'deed_deny' && !c.blamed) {
      m.cleared = true;
      lfAff(sp, li, 2, 'said it was not them');
    } else lfAff(sp, li, 1, 'put me straight');
  }
);
deedAnswer(
  'deed_doubt',
  c => true,
  (c, sp, li) => {
    lfAff(sp, li, -3, 'lied to me');
  }
);
