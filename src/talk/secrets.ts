/* Secrets (docs/talk-engine.md, 5.6): what somebody did or suffered that few know, and told in confidence. `secretPick` is the thing sp could confide: a deed of theirs (or something that shamed them)
   that is not yet common knowledge. `confide` gives li the memory marked `secret` with its `keeper`; ordinary gossip does not pass it on (`TE.pick`), but the gossipy leak and the player may choose
   to tell it. A secret passed on is a leak: a day later the keeper finds out (`LF2.hourly`), thinks the worse of the teller, and it is a `betrayal` event they will raise (talk/deeds.ts).
   Everybody confides: the player confesses what they did the same way (their anonymous deeds are their secrets). */

const SECRET_TAGS = ['harm', 'embarrass', 'scandal', 'theft', 'deceit', 'nuisance'];
function secretPick(sp: any, li: any): any {
  let best: any = null,
    bs = 0;
  for (const m of sp.tmem || []) {
    if (m.ev == null || !['did', 'felt'].includes(m.kind) || m.confided || m.secret) continue;
    if (game.time - m.t > 1440 * 10) continue;
    const ev = lf2Ev().find((q: any) => q.id === m.ev);
    if (!ev || !(ev.tags || []).some((t: string) => SECRET_TAGS.includes(t))) continue;
    const theirs = TM.ofEv(li, ev.id),
      wrong = !!theirs && m.kind === 'did' && theirs.ver && theirs.ver.who !== sp.id && !theirs.cleared; // (they blame somebody else: owning up puts it right)
    if (!wrong && ((ev.know || []).length > 4 || theirs)) continue;
    const s = m.imp + (ev.anon ? 0.4 : 0) + (wrong ? 1 : 0) + Math.random() * 0.2;
    if (s > bs) {
      bs = s;
      best = { m, ev, wrong };
    }
  }
  return best;
}
ACTS.confide = {
  kind: 'secret',
  stage: 'topic',
  preview: (c: any, sp: any, li: any) => {
    const k = secretPick(sp, li);
    return { news: k ? TE.text(k.ev, k.m.kind === 'did' ? { who: sp.id } : k.m.ver) : '' };
  },
  w: (c: any, sp: any) => (sp.player ? 0.4 : 0.6),
  when: (c: any, sp: any, li: any) =>
    !c.done.confide && !li.infant && li.age >= 10 && (sp.player || ((sp.aff[li.id] || 0) > 45 && (sp.know[li.id] || 0) > 30)) && !!secretPick(sp, li),
  apply: (c: any, sp: any, li: any) => {
    const k = secretPick(sp, li)!;
    c.done.confide = 1;
    k.m.confided = true;
    const ver = k.m.kind === 'did' ? { who: sp.id, sev: k.ev.sev } : Object.assign({}, k.m.ver);
    const old = TM.ofEv(li, k.ev.id);
    let mem: any;
    if (old) {
      old.ver = ver;
      old.conf = 1;
      old.kind = 'told';
      old.from = sp.id;
      old.raised = false;
      old.cleared = false;
      mem = old;
      const wrongOne = old.ver;
    } // (the wrong version is put right)
    else mem = TM.addEv(li, k.ev, 'told', 1, sp, 1, ver);
    if (mem && !k.wrong) {
      mem.secret = true;
      mem.keeper = sp.id;
    }
    c.told = { text: TE.text(k.ev, ver), react: '' };
    c.secretEv = k.ev;
    lfAff(li, sp, 3, 'trusted me with a secret');
    lfAff(sp, li, 2, 'kept my confidence');
  },
  replies: ['secret_keep', 'secret_alarmed']
};
const secretServe = (c: any) =>
  c.secretEv && ((c.secretEv.sev || 1) >= 3 || (c.secretEv.tags || []).some((t: string) => ['theft', 'harm', 'violence'].includes(t)));
ACTS.secret_keep = {
  kind: 'secret',
  stage: 'topic',
  reply: true,
  when: (c: any) => !!c.secretEv && !secretServe(c),
  w: () => 1,
  apply: () => {},
  replies: []
};
ACTS.secret_alarmed = {
  kind: 'secret',
  stage: 'topic',
  reply: true,
  when: (c: any) => !!c.secretEv && secretServe(c),
  w: () => 1,
  apply: (c: any, sp: any, li: any) => {
    lfAff(sp, li, -2, 'did something serious');
  },
  replies: []
};

/** a secret passed on (called by TE.tell) */
function secretLeak(m: any, by: any, to: any, ev: any) {
  if (!m.secret || m.keeper == null || m.keeper === by.id) return;
  (town.leaks || (town.leaks = [])).push({ keeper: m.keeper, by: by.id, to: to.id, ev: ev.id, t: game.time });
}
LF2.hourly.push(() => {
  const L = town.leaks;
  if (!L || !L.length) return;
  const keep: any[] = [];
  for (const l of L) {
    if (game.time - l.t < 720) {
      keep.push(l);
      continue;
    }
    const k = lf2By(l.keeper),
      b = lf2By(l.by);
    if (!k || !b || k.dead || b.dead) continue;
    const ev = lfEmit('betrayal', {
      actor: b,
      target: k,
      x: k.tx,
      y: k.ty,
      sev: 2,
      tags: ['deceit', 'harm'],
      anon: false,
      witnessIds: [k.id],
      chron: !!k.player,
      chronKind: 'note',
      loud: false,
      text: `${b.first} told ${k.first}'s secret`
    });
    lfAff(k, b, -10, 'told my secret');
  }
  town.leaks = keep;
});
