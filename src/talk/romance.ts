/* Romance (docs/talk-engine.md, kind `romance`): the same acts for everybody. A flirt (`flirt` -> `flirt_back` / `flirt_rebuff`), a declaration (`declare` -> `declare_return` / `declare_gentle`), an invitation to
   walk out (`ask_to_walk` -> `walk_yes` / `walk_later` / `walk_no`: yes starts a courtship, `startCourtship`) and a proposal (`propose` -> `propose_yes` / `propose_later` / `propose_no`: yes schedules the wedding).
   Nobody is courted without saying yes, and the villager you steer says it themselves, in the menu. The village's own daily romance (`lf2RomanceDaily` crushes, `romanceTick` pairings) is unchanged and
   still runs alongside: these acts are how it is said out loud. Same rules as the village for who can pair (`romOK`). */

/** may these two be a couple (the same rules as romanceTick) */
function romOK(a: any, b: any): boolean {
  return (
    modOn('sys.romance') &&
    !!a &&
    !!b &&
    a !== b &&
    eligible(a) &&
    eligible(b) &&
    a.female !== b.female &&
    Math.abs(a.age - b.age) <= 14 &&
    !isKin(a, b)
  );
}
const romAff = (a: any, b: any) => Math.min(a.aff[b.id] || 0, b.aff[a.id] || 0);
const romCool = (n: any, key: string, days: number) => game.time < ((n.romT || {})[key] || 0);
const romSet = (n: any, key: string, days: number) => {
  (n.romT || (n.romT = {}))[key] = game.time + days * 1440;
};
const romMood = (n: any, d: number) => {
  n.mood = Math.max(0, Math.min(100, (n.mood == null ? 50 : n.mood) + d));
};

ACTS.flirt = {
  kind: 'romance',
  stage: 'topic',
  preview: () => ({}),
  w: (c: any, sp: any, li: any) => (sp.crush === li.id ? 2.2 : 0.5),
  when: (c: any, sp: any, li: any) =>
    !c.done.flirt &&
    romOK(sp, li) &&
    !romCool(sp, 'flirt' + li.id, 0) &&
    (sp.crush === li.id || ((sp.aff[li.id] || 0) > 28 && (sp.know[li.id] || 0) > 20)),
  apply: (c: any, sp: any, li: any) => {
    c.done.flirt = 1;
    romSet(sp, 'flirt' + li.id, 3);
  },
  replies: ['flirt_back', 'flirt_rebuff']
};
ACTS.flirt_back = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) >= 20 || sp.crush === li.id,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    lfAff(sp, li, 3, 'flirted with me');
    lfAff(li, sp, 3, 'flirted back');
    if ((sp.aff[li.id] || 0) >= 25 && !sp.crush) sp.crush = li.id;
    romMood(sp, 3);
    romMood(li, 4);
  },
  replies: []
};
ACTS.flirt_rebuff = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) < 20 && sp.crush !== li.id,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    lfAff(li, sp, -1, 'turned me down');
    romMood(li, -4);
    if (Math.random() < 0.4 && li.crush === sp.id) li.crush = null;
  },
  replies: []
};

ACTS.declare = {
  kind: 'romance',
  stage: 'topic',
  preview: () => ({}),
  w: (c: any, sp: any, li: any) => (sp.crush === li.id ? 1.6 : 0.3),
  when: (c: any, sp: any, li: any) =>
    !c.done.declare && romOK(sp, li) && !romCool(sp, 'declare' + li.id, 0) && sp.crush === li.id && (sp.know[li.id] || 0) > 25 && !c.done.flirt,
  apply: (c: any, sp: any, li: any) => {
    c.done.declare = 1;
    romSet(sp, 'declare' + li.id, 12);
    lfEmit('crush', { actor: sp, target: li, sev: 1, tags: ['romance'], chron: false });
  },
  replies: ['declare_return', 'declare_gentle']
};
ACTS.declare_return = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) >= 30 || sp.crush === li.id,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    sp.crush = li.id;
    lfAff(sp, li, 6, 'told me how they feel');
    lfAff(li, sp, 6, 'felt the same');
    romMood(sp, 8);
    romMood(li, 10);
  },
  replies: ['ask_to_walk']
}; // (and then the asking comes straight after, not three topics later)
ACTS.declare_gentle = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) < 30 && sp.crush !== li.id,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    lfAff(li, sp, -3, 'did not feel the same');
    romMood(li, -10);
    if (Math.random() < 0.6) li.crush = null;
    li.refusedAt = game.time;
  },
  replies: []
};

ACTS.ask_to_walk = {
  kind: 'romance',
  stage: 'topic',
  preview: () => ({}),
  w: (c: any, sp: any, li: any) => 2.4,
  when: (c: any, sp: any, li: any) =>
    !c.done.ask_to_walk &&
    romOK(sp, li) &&
    romAff(sp, li) >= 30 &&
    Math.min(sp.know[li.id] || 0, li.know[sp.id] || 0) >= 22 &&
    !romCool(sp, 'walk' + li.id, 0) &&
    !(li.refusedAt && li.refusedAt > game.time - 20 * 1440 && sp.player),
  apply: (c: any, sp: any, li: any) => {
    c.done.ask_to_walk = 1;
    romSet(sp, 'walk' + li.id, 6);
  },
  replies: ['walk_yes', 'walk_later', 'walk_no']
};
ACTS.walk_yes = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => romOK(sp, li),
  w: (c: any, sp: any, li: any) => 1 + Math.max(0, romAff(sp, li)) / 25,
  apply: (c: any, sp: any, li: any) => {
    startCourtship(li, sp);
    c.courted = true;
  },
  replies: ['glad_courtship']
};
ACTS.walk_later = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => romOK(sp, li),
  w: () => 0.8,
  apply: (c: any, sp: any, li: any) => {
    romSet(li, 'walk' + sp.id, 6);
    li.waitCourt = game.time + 6 * 1440;
  },
  replies: []
};
ACTS.walk_no = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => true,
  w: (c: any, sp: any, li: any) => (romAff(sp, li) < 30 ? 2 : 0.4),
  apply: (c: any, sp: any, li: any) => {
    lfAff(li, sp, -6, 'turned me down');
    romMood(li, -8);
    li.refusedAt = game.time;
    chron(`${li.first} asked ${sp.first} to walk out with them, and ${sp.first} said no.`, 'love');
  },
  replies: []
};

ACTS.propose = {
  kind: 'romance',
  stage: 'topic',
  preview: () => ({}),
  w: () => 2.4,
  when: (c: any, sp: any, li: any) =>
    !c.done.propose &&
    modOn('event.wedding') &&
    sp.fam.partner === li.id &&
    li.fam.partner === sp.id &&
    !sp.fam.spouse &&
    !town.wedding &&
    game.time - (sp.courtSince || game.time) > 8 * 1440 &&
    romAff(sp, li) >= 55 &&
    !romCool(sp, 'propose' + li.id, 0),
  apply: (c: any, sp: any, li: any) => {
    c.done.propose = 1;
    romSet(sp, 'propose' + li.id, 8);
  },
  replies: ['propose_yes', 'propose_later', 'propose_no']
};
ACTS.propose_yes = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => !town.wedding && modOn('event.wedding'),
  w: (c: any, sp: any, li: any) => 1 + Math.max(0, romAff(sp, li) - 50) / 20,
  apply: (c: any, sp: any, li: any) => {
    scheduleWedding(sp.female ? li : sp, sp.female ? sp : li);
    c.wed = true;
  },
  replies: []
};
ACTS.propose_later = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: () => true,
  w: () => 0.7,
  apply: (c: any, sp: any, li: any) => {
    sp.waitMarry = li.waitMarry = game.time + 8 * 1440;
  },
  replies: []
};
ACTS.propose_no = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => romAff(sp, li) < 55,
  w: () => 1.5,
  apply: (c: any, sp: any, li: any) => {
    sp.fam.partner = li.fam.partner = null;
    sp.rel[li.id] = li.rel[sp.id] = 'friend';
    li.refusedAt = game.time;
    lfAff(li, sp, -20, 'turned down my proposal');
    chron(`${li.first} asked ${sp.first} to marry them, and ${sp.first} said no. They stopped walking out together.`, 'love');
  },
  replies: []
};
