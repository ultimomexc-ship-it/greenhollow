/* ---- a snapped word: somebody at the end of their patience says so; it is over in two lines and the people near enough heard it ---- */
ACTS.snap = {
  kind: 'feeling',
  stage: 'topic',
  preview: () => ({}),
  w: (c: any, sp: any) => 1.2 + (talkHas(sp, 'prickly') || talkHas(sp, 'grumpy') ? 1.5 : 0),
  when: (c: any, sp: any, li: any) =>
    !c.done.snap &&
    !sp.player &&
    sp.age >= 12 &&
    ['low', 'tired', 'hungry', 'ill'].includes(talkState(sp) as string) &&
    (sp.aff[li.id] || 0) < 25 &&
    (talkHas(sp, 'prickly') || talkHas(sp, 'grumpy') || (sp.mood != null && sp.mood < 22)) &&
    game.time - (sp.snapT || -1e9) > 1440,
  apply: (c: any, sp: any, li: any) => {
    c.done.snap = 1;
    sp.snapT = game.time;
    c.left[sp.id] = 0;
    c.left[li.id] = Math.min(c.left[li.id], 0.9);
    lfAff(li, sp, -3, 'snapped at me');
    lfEmit('quarrel', { actor: sp, target: li, sev: 1, tags: ['nuisance'], chron: false, text: `${sp.first} snapped at ${li.first}` });
  },
  replies: ['snap_back', 'let_it_go']
};
ACTS.snap_back = {
  kind: 'feeling',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => talkHas(sp, 'prickly') || talkHas(sp, 'proud') || (sp.aff[li.id] || 0) < 0,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    lfAff(li, sp, -2, 'snapped back');
  },
  replies: []
};
ACTS.let_it_go = { kind: 'feeling', stage: 'topic', reply: true, when: () => true, w: () => 1.5, apply: () => {}, replies: [] };
