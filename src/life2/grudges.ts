/* ================= life2 / grudges: people who were wronged decide what to do about it =================
   Generic: any event that makes a victim angry at someone they can name leaves a grudge. Later, character decides
   the response: have it out in public, get even (spread a rumour, pinch something back), or let it go.          */
LF2.react.push(function (o, ev, j, c, first, reveal) {
  if (!LF2.on('revenge') || o.player || !j.victim || !j.a || j.a === o || j.v > -0.6 || c < 0.4) return;
  const g = o.lf2Grudge && o.lf2Grudge.who === j.a.id ? o.lf2Grudge : { who: j.a.id, n: 0 };
  g.ev = ev.id; g.t = game.time; g.n++; g.heat = Math.min(5, (g.heat || 0) + (-j.v) * c); o.lf2Grudge = g;
});
function lf2GrudgePlan(n, tod) {
  if (!LF2.on('revenge') || !n.lf2Grudge || n.player || n.jail || n.age < 12 || (n.lf2GrudgeT || 0) > game.time) return null;
  const g = n.lf2Grudge, a = byId(g.who); n.lf2GrudgeT = game.time + 240;
  if (!a || a.dead || game.time - g.t > 3 * 1440) { n.lf2Grudge = null; return null; }
  const hot = (lf2Has(n, 'grumpy') ? 1.6 : 1) * (lf2Has(n, 'proud') ? 1.4 : 1) * (lf2Has(n, 'brave') ? 1.2 : 1) * (lf2Has(n, 'generous') || lf2Has(n, 'cheerful') ? 0.5 : 1) * (lf2Has(n, 'devout') ? 0.7 : 1) * g.heat;
  if (Math.random() > Math.min(0.9, 0.18 * hot)) { if (Math.random() < 0.15 && hot < 1.2) { n.lf2Grudge = null; lfMod(n, 'forgave', 'decided to let it go', 3, 400); addMem(n, 'forgave', `the day I forgave ${a.first}`, null, a.id); } return null; }
  const ev = lf2EvById(g.ev), why = ev ? lf2Low(ev.text) : 'what happened';
  const pick = Math.random(), ownBad = lf2Has(n, 'greedy') || lf2Has(n, 'grumpy');
  const near = () => { const b = besideTile(a.tx, a.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(a.tx - b.x), dy: Math.sign(a.ty - b.y) } } : null; };
  if (pick < 0.45 && !a.jail) { n.lf2Grudge = null;   // have it out, in public
    return [goS(near, `Going to have it out with ${a.first}`), waitS(4, 'stand', `Having it out with ${a.first}`, { nopie: true, onEnd(nn) {
      if (lfDist(nn, a) > 3) return; say(nn, a, [[nn, anyOf([`I know it was you. ${lf2Cap(why)}.`, `Did you think I would not find out?`, `You owe me an apology, ${a.first}.`])], [a, a.player ? '' : anyOf(['Prove it.', 'I... I am sorry.', 'Get out of my face.'])]]);
      lfEmit('confront', { actor: nn, target: a, sev: 1, loud: true, tags: ['embarrass'], cause: g.ev, chron: false });
      if ((lf2Has(nn, 'brave') || (nn.drunk || 0) > 50) && Math.random() < 0.25 && LF2.on('tavern')) lf2Brawl(nn, a);
    } })];
  }
  if (pick < 0.8) { n.lf2Grudge = null;   // a nasty story, to a friend
    const f = npcs.filter(o => o !== n && o !== a && !o.dead && !o.player && o.pose !== 'sleep' && (n.aff[o.id] || 0) >= 20).sort((x, y) => lfDist(x, n) - lfDist(y, n))[0]; if (!f) return null;
    return [goS(() => { const b = besideTile(f.tx, f.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(f.tx - b.x), dy: Math.sign(f.ty - b.y) } } : null; }, `Off to tell ${f.first} a thing or two about ${a.first}`), waitS(4, 'stand', `Telling tales about ${a.first}`, { social: true, nopie: true, onEnd(nn) {
      if (lfDist(nn, f) > 3) return; const kinds = [['theft', `${a.first} is light-fingered, everyone knows it`], ['deceit', `${a.first} cannot be trusted with anything`], ['drunk', `${a.first} is drunk half the time`]];
      const k = anyOf(kinds); const fe: any = lfEmit('rumour', { actor: a, sev: 1, tags: [k[0]], fake: true, witnessIds: [], chron: false }); fe.liar = nn.id; fe.know = [nn.id]; delete (a.kn || {})[fe.id]; (nn.kn || (nn.kn = {}))[fe.id] = { t: game.time, from: null, cert: 1, a: true, mine: true, liar: true };
      say(nn, f, [[nn, k[1] + '. Just so you know.'], [f, anyOf(['Really?', 'I had heard something like that.', 'Hm. Thanks for telling me.'])]]); lf2Learn(f, fe, nn, 0.7, true);
    } })];
  }
  // pinch something back, if their house is empty and nobody is looking
  const r = a.homeRoom; if (!ownBad || !r || !r.spots.pantry || npcs.some(o => !o.dead && o !== n && lf2InRoom(o, r) && o.pose !== 'sleep')) return null; n.lf2Grudge = null;
  return [goS(r.spots.pantry, `Slipping into ${r.name}`), waitS(3, 'work', 'Helping themself from the barrel', { tool: 'pick', onEnd(nn) {
    if (lf2Watchers(nn.tx, nn.ty, [nn]) > 0.6) return; const pan = r.pantry || {}; let c = 0; for (const g2 of FOODS) while ((pan[g2] || 0) > 0 && c < 3) { pan[g2]--; nn.inv[g2] = (nn.inv[g2] || 0) + 1; c++; }
    if (c) lfEmit('theft', { actor: nn, target: a, sev: 1, aware: false, cause: g.ev, tags: ['theft', 'crime', 'trespass'], chron: false });
  } })];
}
LF2.dec.push(lf2GrudgePlan);


