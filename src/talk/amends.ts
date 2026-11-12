/* Gifts sent through somebody, apologies and jealousy (docs/talk-engine.md: surprise gifts, apologise/accept, confront_jealous). Everybody does these; the player is one of the people. */

/* ---- a gift sent by another hand: "give this to X, and don't say it's from me" ---- */
function sendTarget(sp: any, li: any): any {
  const cands = npcs.filter(
    (o: any) => o !== sp && o !== li && !o.dead && !o.infant && o.age >= 12 && ((sp.aff[o.id] || 0) > 22 || sp.crush === o.id) && !!giftChoose(sp, o)
  );
  cands.sort((a: any, b: any) => (sp.crush === b.id ? 100 : 0) + (sp.aff[b.id] || 0) - ((sp.crush === a.id ? 100 : 0) + (sp.aff[a.id] || 0)));
  return cands[0] || null;
}
ACTS.send_gift = {
  kind: 'gift',
  stage: 'topic',
  preview: (c: any, sp: any, li: any) => {
    const X = sendTarget(sp, li),
      k = X ? giftChoose(sp, X) : null;
    return { item: k ? giftName(k) : '', about: X ? X.first : '' };
  },
  w: (c: any, sp: any) => (sp.player ? 0.4 : 0.35),
  when: (c: any, sp: any, li: any) =>
    !c.done.send_gift &&
    !li.infant &&
    li.age >= 12 &&
    !li.parcel &&
    (sp.player || (sp.crush != null && game.time - (sp.sendT || -1e9) > 2880)) &&
    (li.aff[sp.id] || 0) > -10 &&
    !!sendTarget(sp, li),
  apply: (c: any, sp: any, li: any) => {
    c.done.send_gift = 1;
    sp.sendT = game.time;
    const X = sendTarget(sp, li)!,
      k = giftChoose(sp, X)!;
    c.parcel = { item: k, to: X.id, from: sp.id };
    c.lifeItem = giftName(k);
    c.aboutName = X.first;
  },
  replies: ['deliver_yes', 'deliver_no']
};
ACTS.deliver_yes = {
  kind: 'gift',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any) => !!c.parcel && !sp.parcel && (sp.aff[c.parcel.from] || 0) >= 0,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    const g = lf2By(c.parcel.from);
    if (!g || !g.inv || !(g.inv[c.parcel.item] > 0)) return;
    g.inv[c.parcel.item]--;
    sp.parcel = { item: c.parcel.item, to: c.parcel.to, from: c.parcel.from, t: game.time };
  },
  replies: []
};
ACTS.deliver_no = { kind: 'gift', stage: 'topic', reply: true, when: (c: any, sp: any) => !!c.parcel, w: () => 0.5, apply: () => {}, replies: [] };
function parcelBack(n: any) {
  const g = lf2By(n.parcel.from);
  if (g && !g.dead) {
    g.inv = g.inv || {};
    g.inv[n.parcel.item] = (g.inv[n.parcel.item] || 0) + 1;
  }
  n.parcel = null;
}
function parcelGive(n: any) {
  const P = n.parcel;
  if (!P) return;
  const X = lf2By(P.to),
    g = lf2By(P.from);
  n.parcel = null;
  if (!X || X.dead || lfDist(n, X) > 3) {
    n.parcel = P;
    return;
  }
  X.inv = X.inv || {};
  X.inv[P.item] = (X.inv[P.item] || 0) + 1;
  const ta = giftTastes(X),
    loved = ta.like.includes(P.item),
    hated = ta.dislike.includes(P.item),
    value = (GOODS[P.item] && GOODS[P.item].base) || 1;
  const ev = lfEmit('gift', {
    actor: g,
    target: X,
    x: X.tx,
    y: X.ty,
    sev: 1,
    tags: ['kindness', 'generous'],
    anon: true,
    sawActor: [n.id],
    witnessIds: [n.id, X.id],
    chron: false,
    text: `${g ? g.first : 'Somebody'} sent ${X.first} ${giftName(P.item)}`
  });
  const m = TM.ofEv(X, ev.id),
    guess = m && m.ver && m.ver.who != null ? lf2By(m.ver.who) : null;
  const gain = 0.35 * (2 + value * 0.8 + (loved ? 7 : 0) - (hated ? 9 : 0));
  if (guess) lfAff(X, guess, gain, 'left me a gift');
  X.mood = Math.min(100, (X.mood == null ? 50 : X.mood) + (hated ? -2 : 4));
  if (g && g.aff) lfAff(X, g, 0, '');
  if (g) {
    if (loved) giftLearn(g, X, P.item, true);
    else if (hated) giftLearn(g, X, P.item, false);
  }
  const c: any = {
    a: n,
    b: X,
    done: {},
    turns: [
      { by: n.id, act: 'gift_from_nobody', x: { item: giftName(P.item), how: 'plain' } },
      { by: X.id, act: 'gift_anon_reply', x: { item: giftName(P.item), how: loved ? 'like' : hated ? 'dislike' : 'plain' } }
    ],
    stage: 'topic',
    t0: game.time
  };
  faceTo(n, X);
  talkFinish(c, n, X, talkListened(n, X));
}
ACTS.gift_from_nobody = { kind: 'gift', stage: 'topic', when: () => false, apply: () => {}, replies: [] };
ACTS.gift_anon_reply = { kind: 'gift', stage: 'topic', when: () => false, apply: () => {}, replies: [] };
LF2.dec.push(function (n: any) {
  const P = n.parcel;
  if (!P || n.player) return null;
  if (game.time - P.t > 2880) {
    parcelBack(n);
    return null;
  }
  const X = lf2By(P.to);
  if (!X || X.dead) {
    parcelBack(n);
    return null;
  }
  return [
    goS(() => {
      const b = besideTile(X.tx, X.ty, null);
      return b ? { x: b.x, y: b.y, face: { dx: Math.sign(X.tx - b.x), dy: Math.sign(X.ty - b.y) } } : null;
    }, `Taking something to ${X.first}`),
    waitS(1, 'stand', `Handing ${X.first} something`, {
      nopie: true,
      onEnd(nn: any) {
        parcelGive(nn);
      }
    })
  ];
});

/* ---- saying sorry before you are asked ---- */
const wrongs = (sp: any, li: any) =>
  (sp.tmem || []).filter(
    (m: any) =>
      m.kind === 'did' &&
      m.ev != null &&
      !m.forgiven &&
      !m.sorry &&
      game.time - m.t < 1440 * 10 &&
      (() => {
        const ev = lf2Ev().find((q: any) => q.id === m.ev);
        return !!ev && ev.target === li.id && (ev.tags || []).some((t: string) => ['harm', 'nuisance', 'embarrass', 'deceit', 'theft'].includes(t));
      })()
  );
ACTS.apologise = {
  kind: 'feeling',
  stage: 'topic',
  preview: () => ({}),
  w: (c: any, sp: any) => (sp.player ? 0.6 : 0.5 + (talkHas(sp, 'kind') || talkHas(sp, 'devout') ? 1 : 0)),
  when: (c: any, sp: any, li: any) => !c.done.apologise && !li.infant && wrongs(sp, li).length > 0,
  apply: (c: any, sp: any, li: any) => {
    c.done.apologise = 1;
    for (const m of wrongs(sp, li)) m.sorry = true;
    c.sorryFor = wrongs(sp, li).length;
  },
  replies: ['accept_apology', 'reject_apology']
};
ACTS.accept_apology = {
  kind: 'feeling',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) > -40,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    lfAff(sp, li, 6, 'said sorry');
    lfAff(li, sp, 2, 'forgave me');
    for (const m of li.tmem || [])
      if (m.ev != null && !m.forgiven) {
        const ev = lf2Ev().find((q: any) => q.id === m.ev);
        if (ev && ev.actor === li.id && ev.target === sp.id) m.forgiven = true;
      }
    for (const m of sp.tmem || [])
      if (m.ev != null && !m.forgiven) {
        const ev = lf2Ev().find((q: any) => q.id === m.ev);
        if (ev && ev.actor === li.id && ev.target === sp.id) m.forgiven = true;
      }
  },
  replies: []
};
ACTS.reject_apology = {
  kind: 'feeling',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => (sp.aff[li.id] || 0) <= -40,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    lfAff(sp, li, -1, 'would not hear me out');
  },
  replies: []
};

/* ---- jealousy: you hear that the one you care for walks out with somebody else ---- */
const jealousFor = (sp: any, li: any) => {
  for (const m of sp.tmem || []) {
    if (m.ev == null || m.raisedJ || !['saw', 'told', 'overheard', 'felt'].includes(m.kind) || game.time - m.t > 1440 * 6) continue;
    const ev = lf2Ev().find((q: any) => q.id === m.ev);
    if (!ev || !['courting', 'tryst', 'crush'].includes(ev.kind)) continue;
    const other = ev.actor === li.id ? ev.target : ev.target === li.id ? ev.actor : null;
    if (other != null && other !== sp.id) return { m, ev, Y: lf2By(other) };
  }
  return null;
};
ACTS.confront_jealous = {
  kind: 'romance',
  stage: 'topic',
  preview: () => ({}),
  w: () => 3,
  when: (c: any, sp: any, li: any) => !c.done.confront_jealous && (sp.crush === li.id || sp.fam.partner === li.id) && !!jealousFor(sp, li),
  apply: (c: any, sp: any, li: any) => {
    const j = jealousFor(sp, li)!;
    j.m.raisedJ = true;
    c.done.confront_jealous = 1;
    c.aboutName = j.Y ? j.Y.first : 'someone';
    c.jealousY = j.Y;
    sp.mood = Math.max(0, (sp.mood == null ? 50 : sp.mood) - 4);
  },
  replies: ['jealous_explain', 'jealous_defiant', 'jealous_deny']
};
ACTS.jealous_explain = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any) => !c.jealousY || sp.fam.partner !== c.jealousY.id,
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    lfAff(li, sp, 3, 'explained');
  },
  replies: []
};
ACTS.jealous_defiant = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any) => !!c.jealousY && (sp.fam.partner === c.jealousY.id || Math.random() < 0.4),
  w: () => 2,
  apply: (c: any, sp: any, li: any) => {
    lfAff(li, sp, -8, 'does as they please');
    if (li.fam.partner === sp.id && Math.random() < 0.5) {
      li.fam.partner = sp.fam.partner = null;
      li.rel[sp.id] = sp.rel[li.id] = 'friend';
      chron(`${li.first} and ${sp.first} have stopped walking out together.`, 'love');
    }
  },
  replies: []
};
ACTS.jealous_deny = {
  kind: 'romance',
  stage: 'topic',
  reply: true,
  when: () => true,
  w: () => 0.8,
  apply: (c: any, sp: any, li: any) => {
    lfAff(li, sp, -1, 'did not believe me');
  },
  replies: []
};
