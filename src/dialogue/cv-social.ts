/* ================= dialogue / cv-social: talk drawn from the social simulation (social2) =================
   What villagers say about the village's relationships, as they believe them: who cannot stand whom and why (second-order beliefs,
   o.sbRel), the conversations they have had today (o.sbConv), how sure they are of a story (sbKind), and what happens when you
   tell them you heard it differently.                                                                                            */

/** a third-person event line as the person in it would say it: "Aemilia sat with Galba when he was low" -> "Aemilia sat with me when I was low" */
/** ...and the player, who is the one listening, becomes "you" */
function cvYou(txt: string, o?): string {
  const p = game.player; if (!p || p === o || !txt || !new RegExp('\\b' + p.first + '\\b').test(txt)) return txt;
  return txt.replace(new RegExp('^' + p.first + "'s\\b"), 'Your').replace(new RegExp('\\b' + p.first + "'s\\b", 'g'), 'your').replace(new RegExp('^' + p.first + '\\b'), 'You').replace(new RegExp('\\b' + p.first + '\\b', 'g'), 'you');
}
function cvMe(o, txt: string): string { txt = cvYou(txt, o);
  if (!o || !txt || !new RegExp('\\b' + o.first + '\\b').test(txt)) return txt; const ph = cvPron(o), P = ph.he;
  let s = txt.replace(new RegExp('^' + o.first + ' and (\\w+)'), '$1 and I').replace(new RegExp('\\band ' + o.first + '\\b'), 'and me').replace(new RegExp('^' + o.first + "'s\\b"), 'My').replace(new RegExp('\\b' + o.first + "'s\\b", 'g'), 'my')
    .replace(new RegExp('^' + o.first + '\\b'), 'I').replace(new RegExp('\\b' + o.first + '\\b', 'g'), 'me');
  const subj = new RegExp('^' + o.first + '\\b').test(txt), V = (v) => ({ is: 'am', has: 'have', owes: 'owe' } as any)[v] || v;
  s = s.replace(new RegExp('\\b(when|as|because|since|while|so|that|and) ' + P + ' (was|is|has|had|owes|said|would)\\b', 'g'), (m, w, v) => `${w} I ${V(v)}`);
  if (subj) s = s.replace(new RegExp('\\b' + P + ' (was|is|has|had|owes|said|would)\\b', 'g'), (m, v) => `I ${V(v)}`);
  s = s.replace(/^(\w+) and me\b/, '$1 and I');
  s = s.replace(/^I (is|has|owes|was|lands|lost|landed)\b/, (m, v) => 'I ' + (({ is: 'am', has: 'have', owes: 'owe' } as any)[v] || v)).replace(/\bI and (\w+)/, '$1 and I').replace(/^I and/, 'I and');
  return s.replace(new RegExp('\\b' + ph.his + ' own\\b', 'g'), 'my own');
}
/** how they came to know it, in their words: saw it, were told, only half believe it, or suspect somebody */
function cvHedge(o, ev, k): string {
  if (!k || k.mine) return '';
  if (k.sus && k.who != null) { const s = byId(k.who); return s ? ' ' + pk([`Nobody saw who. I would bet my last coin it was ${s.first}, mind.`, `Nobody saw. But I know what I think, and I think ${s.first}.`]) : ''; }
  const from = k.from != null ? byId(k.from) : null, kind = sbKind(o, ev);
  if (from && from === game.player) return ' ' + pk(['You told me yourself.', 'You were the one who told me.']);
  if (kind === 'fact') return ' ' + pk(['I saw it myself.', 'I was there.']);
  if (kind === 'rumour') return ' ' + (from ? pk([`${from.first} told me, though I would not swear to it.`, `That is what ${from.first} says. Make of it what you like.`]) : pk(['That is what people are saying, anyway.', 'Or so they say.']));
  return from ? ' ' + pk([`${from.first} told me.`, `I had it from ${from.first}.`]) : '';
}

/* ---------------- who feels what about whom ---------------- */
const CV_RELWHY: any = { 'unpaid loan': 'over money that was never paid back', 'paid me back': 'ever since the money was paid back on time', 'lent me money': 'ever since the loan', 'refused a loan': 'ever since the loan that never was',
  argument: 'since they had words', 'row at home': 'the rows at home', 'comforted me': 'since the time they sat up together', competition: 'over work. Always over work', jealous: 'over a sweetheart', 'old feud': 'it goes back years', courting: 'they have been walking out', 'took my side': 'since one took the other\'s side' };
function cvRelWhy(o, a, b, r): string {
  if (!r || !r.why) return ''; if (r.why.startsWith('ev:')) { const ev = lf2EvById(+r.why.slice(3)); return ev && o.kn && o.kn[ev.id] ? `Ever since ${lf2Low(cvMe(o, sbText(o, ev)))}.` : ''; }
  const w = CV_RELWHY[r.why]; return w ? cvCap(w) + '.' : '';
}
/** the beliefs they hold about others, worth mentioning (strong enough, not about them or you) */
function cvRelTopics(c): CvTopic[] {
  const o = c.o, p = c.p, R = o.sbRel || {}, out: CvTopic[] = [];
  for (const key in R) { const r = R[key]; if (Math.abs(r.v) < 0.4 || r.c < 0.45 || game.time - r.t > 20 * 1440) continue; const [ai, bi] = key.split(':').map(Number), a = byId(ai), b = byId(bi);
    if (!a || !b || a.dead || b.dead || a === o || b === o || a === p || b === p) continue;
    out.push({ key: 'rel' + key, kind: 'rel', q: a, extra: { b, r }, w: (0.5 + Math.abs(r.v)) * (c.v.arch === 'nosy' || lf2Has(o, 'gossipy') ? 1.5 : 1) * (r.v < 0 ? 1.2 : 1), sens: r.v < 0 ? 0.3 : 0.15 }); }
  return out.sort((x, y) => y.w - x.w).slice(0, 4);
}
function cvTellRel(c, t, layer): CvUtt | null {
  const o = c.o, p = c.p, a = t.q, b = t.extra.b, r = sbRelGet(o, a, b) || t.extra.r, hooks: CvHook[] = [cvHook(t), cvPersonHook(a), cvPersonHook(b)], pa = cvPron(a);
  if (layer === 0) {
    const v = r.v, why = cvRelWhy(o, a, b, r), sure = r.c < 0.7 ? pk([' Or so it looks to me.', ' That is how it looks, anyway.']) : '';
    const say = v <= -0.6 ? pk([`${a.first} cannot stand ${b.first}, you know.`, `There is no love lost between ${a.first} and ${b.first}. Not from ${a.first}'s side, anyway.`, `${a.first} would cross the square to avoid ${b.first}.`])
      : v < 0 ? pk([`${a.first} is cool with ${b.first} these days.`, `Something has soured between ${a.first} and ${b.first}. ${a.first} barely says good morning.`])
      : v >= 0.7 ? pk([`${a.first} is sweet on ${b.first}. Have you not noticed?`, `${a.first} thinks the world of ${b.first}.`]) : pk([`${a.first} has a lot of time for ${b.first}.`, `${a.first} and ${b.first} get on, these days.`]);
    return { text: `${say} ${why}${sure}`.replace(/\s+/g, ' ').trim(), hooks };
  }
  if (layer === 1) {
    const mine = o.aff[b.id] || 0, agree = r.v < 0 ? mine < -10 : mine > 20, top = sbTopWhy(o, b, r.v < 0 ? -1 : 1), wt = top && sbWhyText(o, b, top);
    if (agree) return { text: r.v < 0 ? `And between you and me, I see why. ${wt ? cvCap(wt) + '.' : `${b.first} has a way of getting under your skin.`}` : `I can see it. ${wt ? cvCap(wt) + '.' : `${b.first} is easy to like.`}`, hooks };
    const ex = sbTopWhy(o, b, mine >= 0 ? 1 : -1), et = ex && sbWhyText(o, b, ex);
    return { text: r.v < 0 ? `I do not see it myself. ${et && mine >= 0 ? cvCap(et) + '.' : `${b.first} has always been decent enough to me.`} But ${a.first} is ${a.first}.` : `I cannot see what ${a.first} sees in ${cvPron(b).him}, frankly.${et && mine < 0 ? ' ' + cvCap(et) + '.' : ''}`, hooks };
  }
  if (layer === 2) { const told = Object.values(o.sbConv || []).filter((n: any) => n.about === b.id && n.w === a.id && (n.ty === 'vent' || n.ty === 'praise')).length;
    return { text: told ? `${a.first} told me so ${pa.him}self, more than once. I did not have to guess.` : pk([`Nobody told me. You only have to watch them in the same room.`, `I have eyes. That is all it takes in a village this size.`]), hooks }; }
  return null;
}

/* ---------------- conversations they have had today ---------------- */
const CV_CONVSAY: any = {
  vent: (w, q) => [`${w.first} was going on to me about ${q.first} this morning. On and on.`, `I have had an earful from ${w.first} about ${q.first} already today.`],
  praise: (w, q) => [`${w.first} was singing ${q.first}'s praises to me earlier. Funny, I had never heard that before.`],
  console: (w) => [`I sat with ${w.first} for a while earlier. ${cvCap(cvPron(w).he)} is not doing well.`],
  row: (w) => [`${w.first} and I had words at home this morning. I do not want to talk about it. …Well. Maybe a little.`],
  argue: (w) => [`${w.first} and I had a proper argument earlier. I am still turning it over.`],
  borrow: (w) => [`I had to ask ${w.first} for a loan. Do not look at me like that.`], lend: (w) => [`${w.first} came to me for money this morning. I said yes. I hope I do not regret it.`],
  refused: (w) => [`I asked ${w.first} for a few coins and ${cvPron(w).he} said no. After everything.`], asked: (w) => [`${w.first} asked me for money. I said no. I feel bad about it, but I have little enough.`],
  repaid: (w) => [`${w.first} paid me back today. Every coin. I had half given up.`], court: (w) => [`I walked with ${w.first} for a while this morning. …That is all. Why are you smiling?`],
  'heard secret': (w, q) => [`${w.first} told me something about ${q ? q.first : 'somebody'} that I was not supposed to hear.`], rivalry: (w) => [`${w.first} is at it again at work. Always has to be first, always has to be best.`],
};
function cvConvTopics(c): CvTopic[] {
  const o = c.o, p = c.p, out: CvTopic[] = [];
  for (const n of (o.sbConv || []).slice().reverse()) { if (game.time - n.t > 1440 || !CV_CONVSAY[n.ty]) continue; const w = byId(n.w); if (!w || w === p || w.dead) continue;
    const q = n.about != null ? byId(n.about) : null; if (q === p) continue; const k = 'cv' + n.ty + n.w + '.' + n.t; out.push({ key: k, kind: 'conv', q: w, extra: { n, about: q }, w: ['vent', 'row', 'argue', 'refused', 'heard secret'].includes(n.ty) ? 1.3 : 0.8, sens: ['row', 'borrow', 'refused', 'heard secret'].includes(n.ty) ? 0.35 : 0.15 });
    if (out.length >= 2) break; }
  return out;
}
function cvTellConv(c, t, layer): CvUtt | null {
  const o = c.o, n = t.extra.n, w = t.q, q = t.extra.about, hooks: CvHook[] = [cvHook(t), cvPersonHook(w)]; if (q && q !== o) hooks.push(cvPersonHook(q));
  if (layer === 0) { const L = CV_CONVSAY[n.ty](w, q); const ln = cvFreshest(c.p, L); cvMarkHeard(c.p, ln); return { text: ln, hooks }; }
  if (layer === 1) {
    if (n.ty === 'vent' && q) { const r = sbRelGet(o, w, q), why = cvRelWhy(o, w, q, r); return { text: `${why || `I never did get to the bottom of why.`} ${(o.aff[q.id] || 0) > 30 ? `I like ${q.first}, so I said nothing. It was hard.` : `I let ${cvPron(w).him} talk. It seemed to help.`}`, hooks }; }
    if (n.ty === 'row') { const ev = lf2Ev().slice().reverse().find(e => e.kind === 'quarrel' && ((e.actor === o.id && e.target === w.id) || (e.actor === w.id && e.target === o.id))); return { text: ev ? `If you must know, ${lf2Low(ev.text.replace(/^.*? had a row( at home)? /, 'it was '))}. It is always something small. It is never something small.` : 'It is always something small. It is never something small.', hooks }; }
    if (n.ty === 'borrow' || n.ty === 'lend' || n.ty === 'refused' || n.ty === 'asked') { const l = (town.sbLoans || []).slice().reverse().find(x => (x.from === w.id && x.to === o.id) || (x.from === o.id && x.to === w.id));
      return { text: l ? `${l.amt} denarii. ${l.from === o.id ? `${cvCap(cvPron(w).he)} says by the end of the week. We will see.` : `I will pay it back. I always pay it back.`}` : `Money is a cold thing to ask for. It does not matter which side of it you are on.`, hooks }; }
    return { text: pk([`That is all there is to it. Some days are like that.`, `I keep thinking about it, is all.`]), hooks };
  }
  return null;
}

/* ---------------- "I heard it differently": comparing versions ---------------- */
/** the player's version of an event, if it differs from the speaker's (another culprit, or one where they have none) */
function cvVersionGap(c, ev) {
  const o = c.o, p = c.p, mine = p.kn && p.kn[ev.id], theirs = o.kn && o.kn[ev.id]; if (!mine || !theirs || !mine.a) return null;
  const pw = mine.who != null ? mine.who : ev.actor, ow = theirs.a ? (theirs.who != null ? theirs.who : ev.actor) : null; return pw !== ow ? lf2By(pw) : null;
}
function cvContradict(c, ev): CvUtt {
  const o = c.o, p = c.p, k = o.kn[ev.id], alt = cvVersionGap(c, ev), cur = k.a ? lf2By(sbWhoId(o, ev)) : null, hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: cvLabel({ kind: 'event', ev }), ev }];
  if (!alt) return { text: pk([`Differently how? That is how I heard it, and from somebody who should know.`, `Then somebody has been telling it wrong, and it is not me.`]), hooks };
  hooks.push(cvPersonHook(alt)); const trust = (o.aff[p.id] || 0) / 100 + sbTrustOf(o, p) / 100 + (k.cert < 0.6 ? 0.3 : 0) - (sbKind(o, ev) === 'fact' ? 0.6 : 0), likesCur = cur ? (o.aff[cur.id] || 0) : 0;
  if (trust + Math.random() * 0.4 > 0.45 + Math.max(0, -likesCur) / 150) { k.who = alt.id; k.a = true; k.from = p.id; k.cert = Math.max(0.4, k.cert * 0.8); delete k.sus; if (cur && cur !== alt) lfAff(o, cur, 2, 'misjudged');
    return { text: cur ? `${alt.first}? Not ${cur.first}? …Well. That changes things. I have been saying ${cur.first} to anyone who would listen.` : `${alt.first}. Huh. I should have guessed. Thank you for telling me.`, hooks }; }
  return { text: cur ? `${alt.first}? No. It was ${cur.first}. ${sbKind(o, ev) === 'fact' ? 'I was there.' : 'Whoever told you that has their own reasons.'}` : `${alt.first}? You cannot know that. Nobody saw.`, hooks };
}
