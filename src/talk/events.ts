/* World events and who knows what (docs/talk-engine.md, sections 3b and 5). `lfEmit` (life2) is the world-event bus: everything that happens on purpose calls it
   with an actor, a target, tags and a severity, and it works out the witnesses. `TE.onEmit` turns that into first-hand memories (saw / did / felt); conversation
   (`share_news`) moves them from person to person as *versions*: a little less sure each time, and sometimes changed by the one who tells it.
   An event memory: { kind: 'saw' | 'did' | 'felt' | 'told' | 'overheard', ev, evk, conf (0..1), imp (0..1), from, hop, ver: { who, sev, note? }, told: [ids] }. */

const TE = {
  /** how much it matters to this person: how bad or good, how juicy, and whether it touches somebody they know */
  importance(n: any, ev: any): number {
    let spice = 0, v = 0; for (const tag of ev.tags || []) { const d = typeof LF2_TAGS !== 'undefined' ? LF2_TAGS[tag] : null; if (d) { spice = Math.max(spice, d.spice); v += Math.abs(d.v); } }
    const a = ev.actor != null ? (n.aff[ev.actor] || 0) : 0, t = ev.target != null ? (n.aff[ev.target] || 0) : 0, kin = Math.abs(a) > 30 || Math.abs(t) > 30 ? 0.2 : 0;
    return Math.max(0.05, Math.min(1, (spice * 0.2 + v * 0.2 + (ev.sev || 1) * 0.05 + kin)));
  },
  onEmit(ev: any) {
    const a = ev.actor != null ? lf2By(ev.actor) : null; if (a && !a.dead) TM.addEv(a, ev, 'did', 1);
    for (const id of ev.witnesses || []) { const w = lf2By(id); if (!w || w.dead || w === a) continue; let ver: any, conf = 1; if (ev.anon && !(ev.sawActor || []).includes(w.id)) { const sus = typeof repSuspect === 'function' ? repSuspect(w, ev) : null; ver = { who: sus ? sus.id : null, sev: ev.sev, suspect: !!sus }; if (sus) conf = sus.conf; }
      TM.addEv(w, ev, id === ev.target ? 'felt' : 'saw', conf, null, 0, ver); }   // (an unseen deed has no name in the memory of those who only know it happened)
  },
  /** the words for an event in a version of it (who is blamed may differ from who did it) */
  text(ev: any, ver?: any): string {
    const who = ver && ver.who !== undefined ? ver.who : ev.actor, a = who != null ? lf2By(who) : null, t = ev.target != null ? lf2By(ev.target) : null;
    const tpl = LEX.filter(e => e.act === 'ev:' + ev.kind && e.pack === 'plain');
    if (tpl.length) { const e = tpl[ev.id % tpl.length]; /* the same event reads the same way every time it is shown */ return e.text.replace(/\{a\}/g, a ? a.first : 'someone').replace(/\{t\}/g, t ? t.first : 'someone').replace(/\{place\}/g, ev.place || 'a building'); }
    // an event kind with no template yet: the old sentence, with the blamed name put in
    let tx = String(ev.text || ev.kind); const real = ev.actor != null ? lf2By(ev.actor) : null;
    if (real && a !== real) tx = tx.replace(new RegExp('\\b' + real.first + '\\b', 'g'), a ? a.first : 'someone');
    return tx.charAt(0).toLowerCase() === tx.charAt(0) ? tx : tx.charAt(0) + tx.slice(1);
  },
  /** the best thing for sp to tell li now, or null: important, recent, new to the listener, not about either of them */
  pick(sp: any, li: any, c?: any): any {
    const mem = sp.tmem; if (!mem) return null; const gossip = talkHas(sp, 'gossipy') ? 1.4 : talkHas(sp, 'shy') ? 0.7 : 1; let best: any = null, bs = 0.1;
    for (const m of mem) {
      if (m.ev == null || m.conf < 0.25 || (m.kind === 'did' && Math.random() < 0.8) || (m.secret && !sp.player && !(talkHas(sp, 'gossipy') && Math.random() < 0.12))) continue;
      const ev = lf2Ev().find((q: any) => q.id === m.ev); if (!ev) continue;   // (a secret is not gossip, unless the gossipy let it slip)
      if (ev.actor === li.id || ev.target === li.id || ev.actor === sp.id || ev.target === sp.id || TM.ofEv(li, m.ev) || (c && c.sharedEv && c.sharedEv.includes(m.ev)) || (m.told || []).includes(li.id)) continue;
      const age = (game.time - m.t) / 1440, rel = 0.6 + (li.aff[ev.actor] != null || li.aff[ev.target] != null ? 0.5 : 0) + (li.know && (li.know[ev.actor] > 10 || li.know[ev.target] > 10) ? 0.3 : 0);
      const sc = m.imp * Math.exp(-age / 3) * rel * gossip * (1 + 1.5 * Math.exp(-(game.time - m.t) / 180)) * (0.8 + Math.random() * 0.4);   // (fresh news is told first) if (sc > bs) { bs = sc; best = { m, ev, score: sc }; }
    }
    return best;
  },
  /** sp tells li: li gets a version a little less sure than sp's, changed now and then by the way sp tells it */
  tell(sp: any, li: any, pk: any, c?: any) {
    const { m, ev } = pk, ver = Object.assign({}, m.ver), notes: string[] = [];
    const credit = Math.max(0.55, Math.min(1, 0.72 + (li.aff[sp.id] || 0) / 150 + (li.trust && li.trust[sp.id] ? li.trust[sp.id] / 200 : 0)));
    let conf = Math.min(1, m.conf * credit * 0.93);
    const friend = ver.who != null && (sp.aff[ver.who] || 0) > 30, foe = ver.who != null && (sp.aff[ver.who] || 0) < -30;
    if (Math.random() < (talkHas(sp, 'gossipy') ? 0.3 : 0.12) * TALK.dial.distort) { ver.sev = Math.min(3, (ver.sev || 1) * 1.4); notes.push('bigger'); }
    else if (friend && Math.random() < 0.35) { ver.sev = Math.max(0.3, (ver.sev || 1) * 0.6); notes.push('softer'); }
    if (foe && ver.who === ev.actor && Math.random() < 0.15) { conf = Math.min(1, conf + 0.05); notes.push('harder'); }
    if (Math.random() < 0.08) { ver.who = null; notes.push('nameless'); conf *= 0.9; }
    else if (m.kind !== 'saw' && m.kind !== 'did' && m.kind !== 'felt' && Math.random() < 0.06) { const other = npcs.filter(q => q !== sp && q !== li && !q.dead && q.age >= 14 && (sp.aff[q.id] || 0) < -10); if (other.length) { ver.who = other[Math.floor(Math.random() * other.length)].id; notes.push('shifted'); conf *= 0.85; } }
    ver.note = notes.join(',') || undefined;
    const mem = TM.addEv(li, ev, 'told', conf, sp, (m.hop || 0) + 1, ver); (m.told = m.told || []).push(li.id); if (m.secret && typeof secretLeak === 'function') secretLeak(m, sp, li, ev);
    // what li makes of it, and what it does to what li thinks of the one in the story
    const j = TE.appraise(li, ev, ver, conf, sp), actor = ver.who != null ? lf2By(ver.who) : null;
    if (actor && actor !== li && j.v !== 0) lfAff(li, actor, j.v * conf * 3, 'heard what ' + actor.first + ' did');
    return { mem, ver, conf, react: j.react, text: TE.text(ev, ver) };
  },
  /** how a listener takes a piece of news: one of shock, amused, sympathy, doubt, delight, unmoved */
  appraise(li: any, ev: any, ver: any, conf: number, sp: any): any {
    let v = 0, pity = 0, funny = false; for (const tag of ev.tags || []) { const d = LF2_TAGS[tag]; if (d) { v += d.v; pity += d.pity; if (tag === 'funny' || tag === 'prank' || tag === 'embarrass') funny = true; } }
    v *= 0.55 + 0.45 * Math.min(2, ver.sev || 1) / 1; const t = ev.target != null ? lf2By(ev.target) : null, fond = t ? (li.aff[t.id] || 0) : 0;
    let react = 'unmoved';
    if (conf < 0.45 || (li.aff[sp.id] || 0) < -25) react = 'doubt';
    else if (funny && (talkHas(li, 'sociable') || talkHas(li, 'jovial') || Math.random() < 0.5)) react = 'amused';
    else if (v <= -0.5) react = pity > 0.6 && fond > 15 ? 'sympathy' : 'shock';
    else if (v >= 0.5) react = 'delight';
    return { v, react };
  },
  /** people close by hear it too, less surely, and without being told */
  overhear(c: any, sp: any, li: any, pk: any) {
    for (const o of npcs) {
      if (o === sp || o === li || o.dead || o.infant || o.age < 6 || o.pose === 'sleep' || o.player || lfDist(o, sp) > 6 || TM.ofEv(o, pk.ev.id) || Math.random() > 0.5) continue;
      TM.addEv(o, pk.ev, 'overheard', Math.min(0.7, pk.m.conf * 0.6), sp, (pk.m.hop || 0) + 1, Object.assign({}, pk.m.ver));
    }
  },
};
