/* Asking about work and about where somebody is (docs/talk-engine.md, act catalogue): the question, the answer, the thanks, and the not knowing. The same for everybody. */

ACTS.ask_work = {
  kind: 'person',
  stage: 'topic',
  preview: (c: any, sp: any, li: any) => ({ about: li.first }),
  w: () => 0.8,
  when: (c: any, sp: any, li: any) => !c.done.ask_work && !!li.job && li.age >= 12 && (sp.know[li.id] || 0) < 60,
  apply: (c: any, sp: any, li: any) => {
    c.done.ask_work = 1;
    c.aboutName = li.first;
  },
  replies: ['answer_work']
};
ACTS.answer_work = { kind: 'person', stage: 'topic', reply: true, when: (c: any, sp: any) => !!sp.job, w: () => 1, apply: () => {}, replies: [] };
ACTS.ask_where = {
  kind: 'person',
  stage: 'topic',
  preview: (c: any) => ({ about: c.whereObj ? c.whereObj.first : '' }),
  w: () => 0.9,
  when: (c: any, sp: any, li: any) => {
    if (c.done.ask_where) return false;
    const kin = (o: any) => sp.fam && (sp.fam.spouse === o.id || sp.fam.partner === o.id || (sp.fam.kids || []).includes(o.id)),
      X = npcs.find(
        (o: any) =>
          o !== sp &&
          o !== li &&
          !o.dead &&
          !o.infant &&
          o.age >= 12 &&
          lfDist(sp, o) > 12 &&
          (sp.crush === o.id || kin(o) || (sp.reqs || []).some((r: any) => r.to === o.id && r.state === 'promised'))
      );
    if (!X) return false;
    c.whereObj = X;
    return true;
  },
  apply: (c: any, sp: any, li: any) => {
    c.done.ask_where = 1;
    c.aboutName = c.whereObj.first;
  },
  replies: ['tell_where', 'dont_know_where']
};
const whereText = (X: any) => {
  const pl = String(placeOf(X) || '').replace(/^(in|at)\s+/, '');
  return !pl ? 'about somewhere' : /^the /.test(pl) ? 'at ' + pl : 'in ' + pl;
};
ACTS.tell_where = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  preview: (c: any) => ({ about: c.whereObj ? c.whereObj.first : '', reason: c.whereObj ? whereText(c.whereObj) : '' }),
  when: (c: any, sp: any) => !!c.whereObj && lfDist(sp, c.whereObj) <= 30 && lvlOf(sp.ty) === lvlOf(c.whereObj.ty),
  w: () => 3,
  apply: (c: any, sp: any, li: any) => {
    c.reason = whereText(c.whereObj);
    li.seek = { id: c.whereObj.id, until: game.time + 120 };
  },
  replies: ['thanks_where']
};
ACTS.thanks_where = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
LF2.dec.push(function (n: any) {
  const s = n.seek;
  if (!s || n.player) return null;
  n.seek = null;
  if (game.time > s.until) return null;
  const X = lf2By(s.id);
  if (!X || X.dead || X.pose === 'sleep' || lvlOf(X.ty) !== lvlOf(n.ty)) return null;
  return [
    goS(() => {
      const b = besideTile(X.tx, X.ty, null);
      return b ? { x: b.x, y: b.y, face: { dx: Math.sign(X.tx - b.x), dy: Math.sign(X.ty - b.y) } } : null;
    }, `Going to find ${X.first}`),
    waitS(2, 'stand', `Looking for a word with ${X.first}`, { nopie: true })
  ];
}); // (the answer is acted on)
ACTS.dont_know_where = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any) => !!c.whereObj && !(lfDist(sp, c.whereObj) <= 30 && lvlOf(sp.ty) === lvlOf(c.whereObj.ty)),
  w: () => 3,
  apply: () => {},
  replies: []
};
