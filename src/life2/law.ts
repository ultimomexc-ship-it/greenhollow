/* ================= life2 / law: the watch, the carcer, fines, bribes and running away =================
   Nothing is detected by magic. A crime is only known if somebody noticed it (or later works out what happened and
   learns from someone who did see). Witnesses may report to a watchman; watchmen also hear rumours. Once the watch
   knows who did it, that person is WANTED: any watchman who sees them will try to collar them. Out of sight, the
   watch can only go to where they were last seen. Arrested: pay a fine, go to the cells, bribe, deny, or run.        */
const lf2OnDuty = g => !!g && g.job === 'Guard' && !g.player && !g.dead && !g.jail && g.pose !== 'sleep' && isAwake(g, game.time % 1440);
const lf2Wanted = () => town.wanted || (town.wanted = {});
const lf2InRoom = (n, r) => !!r && n.tx > r.x && n.tx < r.x + r.w - 1 && n.ty > r.y && n.ty < r.y + r.h - 1;
function lf2CellTiles(r) { const t = []; for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (walkable(x, y) && !(x === r.doorX && Math.abs(y - r.doorY) <= 1)) t.push({ x, y }); return t; }
function lf2Want(a, ev, cert) {
  if (!a || a.dead || !LF2.on('law') || (town.lf2Done && town.lf2Done[ev.id])) return;
  const W2 = lf2Wanted(), w = W2[a.id] || (W2[a.id] = { evs: [], sev: 0, t: game.time, seen: null, cert: 0 });
  if (w.evs.includes(ev.id)) { w.cert = Math.max(w.cert, cert); return; }
  w.evs.push(ev.id); w.sev += ev.sev; w.t = game.time; w.cert = Math.max(w.cert, cert); w.seen = { x: a.tx, y: a.ty, t: game.time };
  if (a.player && w.evs.length === 1) playerSay(a, anyOf(['I have a feeling the watch is looking for me...', 'Uh oh. I think somebody told the watch.']));
}
function lf2Crimes(a) { const w = lf2Wanted()[a.id]; if (!w) return []; return w.evs.map(lf2EvById).filter(Boolean); }
/* what they did, as a phrase ("snatched Lucia's purse") and as a charge ("theft") */
const lf2CrimeText = a => { const c = lf2Crimes(a); if (!c.length) return 'caused trouble'; const t = c[c.length - 1].text; return t.replace(new RegExp('^' + a.first + '\\s+', 'i'), '').replace(/^was seen /, ''); };
const LF2_CHARGE = [['violence', 'violence'], ['sabotage', 'wrecking'], ['bribe', 'bribery'], ['theft', 'theft'], ['deceit', 'cheating'], ['trespass', 'breaking in'], ['crime', 'making trouble']];
const lf2Charge = a => { const tags = new Set(lf2Crimes(a).flatMap(e => e.tags)); const c = LF2_CHARGE.find(x => tags.has(x[0])); return c ? c[1] : 'making trouble'; };

/* witnesses and the watch react to crimes */
LF2.react.push(function (o, ev, j, c, first, reveal) {
  if (!LF2.on('law') || !ev.tags.includes('crime')) return;
  const k = o.kn && o.kn[ev.id]; const a = lf2By(ev.actor);
  if (o.job === 'Guard') { if (k && k.a && a && a !== o && c >= 0.4) lf2Want(a, ev, c); else if (k && !k.a && ev.sev >= 1 && !o.lf2Inv) o.lf2Inv = ev.id; return; }
  if (o.player || o.age < 10 || o === a) return;
  if (o.lf2Report && game.time - o.lf2Report.t < 240) return;
  if (k && !k.a && !j.victim) return;
  let w = 0.3 + (lf2Has(o, 'devout') ? 0.25 : 0) + (lf2Has(o, 'anxious') ? 0.12 : 0) + (lf2Has(o, 'brave') ? 0.12 : 0) + (j.victim ? 0.3 : 0) - (lf2Has(o, 'greedy') ? 0.25 : 0) + 0.1 * ev.sev;
  if (a && k && k.a) w -= (o.aff[a.id] || 0) / 140;
  if (!first) w *= 0.4;
  if (a && lf2Notoriety(a) > 8 && !lf2Has(o, 'brave')) w *= 0.7;    // people are a little afraid of the worst troublemakers
  if (Math.random() < w) o.lf2Report = { ev: ev.id, t: game.time, a: !!(k && k.a) };
});

/* ---------------- villagers going to tell the watch ---------------- */
function lf2NearestGuard(n) { let b = null, bd = 1e9; for (const g of npcs) { if (!lf2OnDuty(g) || g === n) continue; const d = lfDist(g, n); if (d < bd) { bd = d; b = g; } } return b; }
function lf2ReportPlan(n) {
  const R = n.lf2Report; if (!R) return null;
  const ev = lf2EvById(R.ev); if (!ev || game.time - R.t > 360) { n.lf2Report = null; return null; }
  const g = lf2NearestGuard(n); if (!g || lfDist(g, n) > 60) return null;
  n.lf2Report = null; const a = lf2By(ev.actor);
  return [goS(() => { const b = besideTile(g.tx, g.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(g.tx - b.x), dy: Math.sign(g.ty - b.y) } } : null; }, 'Hurrying to tell the watch'),
    waitS(3, 'stand', 'Telling the watch what happened', { nopie: true, social: true, onEnd(nn) {
      if (lfDist(nn, g) > 4) return;
      const k = nn.kn && nn.kn[ev.id]; if (!k) return;
      say(nn, g, [[nn, k.a && a ? anyOf([`Watchman! ${lf2Cap(lf2Low(ev.text))}. I saw it with my own eyes.`, `You need to know: ${lf2Low(ev.text)}.`]) : `Somebody ${lf2Low(ev.text).replace(/^\w+ /, '')}. I do not know who.`], [g, k.a ? anyOf(['Leave it with me.', 'Right. I will find them.', 'Is that so? Thank you.']) : 'I will ask around.']]);
      lf2Learn(g, ev, nn, k.cert * (k.from ? 0.7 : 1), k.a);
      if (!k.a) g.lf2Inv = ev.id;
      lfEmit('report', { actor: nn, target: a && k.a ? a : null, sev: 1, tags: ['justice'], chron: false, text: `${nn.first} reported ${a && k.a ? a.first : 'a crime'} to the watch` });
    } })];
}

/* ---------------- the watch on patrol, chasing, collaring ---------------- */
function lf2Waypoints() {
  const out = [], add = (x, y) => { const b = besideTile(x, y, null); if (b) out.push({ x: b.x, y: b.y, face: null }); };
  for (const m of town.markets) if (m.stalls[0]) add(m.stalls[0].front.x, m.stalls[0].front.y + 1);
  for (const r of rooms) { if (r.dead || r.kind === 'privy') continue; if (r.kind !== 'house' || Math.random() < 0.35) add(r.doorX, r.side === 'b' ? r.doorY + 1 : r.doorY - 1); }
  return out;
}
function lf2Visible(g, a) { return !a.dead && !a.jail && lf2Notice(g, a.tx, a.ty) > 0.3 && Math.hypot(g.tx - a.tx, g.ty - a.ty) < 14; }
function lf2GuardTarget(g) {
  const W2 = lf2Wanted(); let best = null, bs = -1;
  for (const id in W2) { const a = byId(+id), w = W2[id]; if (!a || a.dead || a.jail || a === g || w.cert < 0.4) continue; if (lf2Visible(g, a)) { w.seen = { x: a.tx, y: a.ty, t: game.time }; } const s = w.sev * 10 + (w.seen ? 60 - Math.min(60, (game.time - w.seen.t) / 2) : 0) - lfDist(g, a) * 0.3; if (s > bs) { bs = s; best = { a, w }; } }
  return best;
}
function lf2GuardPlan(g, tod) {
  const T0 = lf2GuardTarget(g); if (T0) { const p = lf2ChasePlan(g, T0); if (p) return p; }
  if (g.lf2Inv) { const ev = lf2EvById(g.lf2Inv); g.lf2Inv = null; if (ev && game.time - ev.t < 1440) return lf2InvestigatePlan(g, ev); }
  // keep an eye on known troublemakers
  const pl = game.player; if (pl && !pl.dead && lf2Notoriety(pl) >= 6 && lf2Visible(g, pl) && Math.random() < 0.5) return [goS(() => { const b = besideTile(pl.tx + 2, pl.ty, null); return b ? { x: b.x, y: b.y, face: null } : null; }, 'Keeping an eye on ' + pl.first), waitS(6, 'stand', 'Watching ' + pl.first + ' closely')];
  const wp = anyOf(lf2Waypoints()); if (!wp) return null;
  return [goS(wp, 'On patrol'), waitS(6 + Math.random() * 8, 'stand', anyOf(['Keeping watch', 'On patrol, watching the street', 'Leaning on a spear, watching']))];
}
function lf2ChasePlan(g, T0) {
  const a = T0.a, w = T0.w, vis = lf2Visible(g, a);
  if (!vis && (!w.seen || game.time - w.seen.t > 120)) {
    // the watch knows where everybody lives: call at the house now and then
    const r = a.homeRoom; if (!r || (w.called || 0) > game.time) return null; w.called = game.time + 360;
    const o = r.side === 'b' ? { x: r.doorX, y: r.doorY + 1 } : { x: r.doorX, y: r.doorY - 1 };
    return [goS({ x: o.x, y: o.y, face: { dx: 0, dy: r.side === 'b' ? -1 : 1 } }, `Calling at ${r.name} for ${a.first}`), waitS(10, 'stand', `Waiting at the door of ${r.name}`, { nopie: true, onEnd(gg) { if (lf2Visible(gg, a)) w.seen = { x: a.tx, y: a.ty, t: game.time }; } })];
  }
  const tgt = vis ? { x: a.tx, y: a.ty } : w.seen;
  if (vis && lfDist(g, a) <= 1.5) return [waitS(1, 'stand', 'Collaring ' + a.first, { nopie: true, onEnd(gg) { lf2Collar(gg, a); } })];
  if (vis && !g.lf2Shouted) { g.lf2Shouted = true; lfShout(g, anyOf([`You there! ${a.first}! Stop!`, `${a.first}! In the name of the watch, stop!`, `Hold it, ${a.first}!`])); setTimeout(() => { g.lf2Shouted = false; }, 20000); }
  if (!vis && lfDist(g, tgt) <= 2) { w.seen = null; return [waitS(6, 'stand', `Looking around for ${a.first}`, { nopie: true })]; }
  g.lf2Run = 1.2;
  return [goS(() => { const b = besideTile(tgt.x, tgt.y, null) || tgt; return { x: b.x, y: b.y, face: null }; }, vis ? `Chasing ${a.first}` : `Searching where ${a.first} was last seen`), waitS(1, 'stand', vis ? 'Catching breath' : 'Looking about', { nopie: true, onEnd(gg) { gg.lf2Run = 0; if (lfDist(gg, a) <= 1.5 && lf2Visible(gg, a)) lf2Collar(gg, a); } })];
}
function lf2InvestigatePlan(g, ev) {
  return [goS(() => { const b = besideTile(ev.x, ev.y, null); return b ? { x: b.x, y: b.y, face: null } : null; }, 'Going to look into a report'), waitS(10, 'stand', 'Asking around about what happened', { nopie: true, onEnd(gg) {
    let told = null;
    for (const o of npcs) { if (o === gg || o.dead || o.player || lfDist(o, gg) > 9) continue; const k = o.kn && o.kn[ev.id]; if (k && k.a && ev.actor !== o.id && (o.aff[ev.actor] || 0) < 50) { told = o; lf2Learn(gg, ev, o, k.cert * 0.9, true); break; } }
    if (told) say(gg, told, [[gg, 'Did you see anything?'], [told, `It was ${lf2By(ev.actor).first}. I am sure of it.`]]);
    else lfShout(gg, anyOf(['Nobody saw a thing. Of course.', 'No witnesses. Whoever it was, they were careful.']));
  } })];
}

/* ---------------- an arrest ---------------- */
function lf2Fine(a) { const w = lf2Wanted()[a.id] || { sev: 1, evs: [] }; return Math.round(4 + w.sev * 6 + (a.lf2Priors || 0) * 4); }
function lf2Sentence(a, extra) { const w = lf2Wanted()[a.id] || { sev: 1 }; return Math.min(720, Math.round(90 + w.sev * 70 + (a.lf2Priors || 0) * 60 + (extra || 0))); }
function lf2Clear(a) { const w = lf2Wanted()[a.id]; if (w) { const d = town.lf2Done || (town.lf2Done = {}); w.evs.forEach(id => { d[id] = 1; }); } delete lf2Wanted()[a.id]; }
function lf2Collar(g, a) {
  if (a.dead || a.jail || !lf2Wanted()[a.id]) return;
  if (a.player) {
    if ((a.lf2Ran || 0) > game.time) return;
    if (a.lf2RanN) { a.lf2RanN = 0; lfShout(g, anyOf(['Got you! No more running.', 'Enough running. Come on.'])); lf2PlayerJailed(g, a, 90); return; }
    lf2ArrestDialog(g, a); return;
  }
  const fine = lf2Fine(a), what = lf2Charge(a);
  if (a.coin >= fine && !lf2Has(a, 'greedy') || a.coin >= fine * 2) {
    a.coin -= fine; town.treasury += fine; lf2Compensate(a, fine);
    say(g, a, [[g, `${a.first}, you ${lf2CrimeText(a)}. That is a fine of ${fine} denarii.`], [a, anyOf(['Fine. Take it.', 'This is robbery.', 'It was worth it.'])]]);
    lfEmit('fined', { actor: a, sev: 1, tags: ['arrest'], chron: true, text: `The watch fined ${a.first} ${fine} denarii for ${what}` });
  } else {
    const mins = lf2Sentence(a); lf2Jail(a, mins, g);
    say(g, a, [[g, `${a.first}, you are coming with me. You ${lf2CrimeText(a)}.`], [a, anyOf(['I did nothing!', 'All right, all right.', 'You will regret this.'])]]);
    lfEmit('arrest', { actor: a, sev: 2, loud: true, tags: ['arrest'], chron: true, text: `The watch arrested ${a.first} for ${what}` });
  }
  a.lf2Priors = (a.lf2Priors || 0) + 1; lf2Clear(a); lfMod(a, 'arrested', 'humiliated by the watch', -12, 900);
}
function lf2Compensate(a, fine) { const ev = lf2Crimes(a).find(e => e.target != null); const v = ev ? lf2By(ev.target) : null; if (v && !v.dead && v !== a) { v.coin += fine * 0.5; town.treasury -= fine * 0.5; } }
function lf2Jail(a, mins, g) {
  const r = lf2Room('jail'); if (!r) return;
  a.jail = { until: game.time + mins, since: game.time, by: g ? g.id : null };
  if (a.player) { const s = lf2Spot(r, 'cell'); const p = a.player; p.act = null; p.follow = null; p.keys = {}; a.path = []; a.moving = false; a.tx = s.x; a.ty = s.y; a.x = s.x; a.y = s.y; playerSay(a, `Locked up for about ${Math.round(mins / 60)} hours. (E on the bed to sleep it off, or E on the door to try the lock.)`); }
  else { abortPlan(a); }
}
function lf2Release(a, how) {
  if (!a.jail) return; a.jail = null; lfMod(a, 'free', 'glad to be out of the cells', 6, 400);
  if (how !== 'escape') chron(`${a.first} was let out of the cells.`, 'note');
  if (a.player) { const r = lf2Room('jail'); if (r && lf2InRoom(a, r)) { const o = r.side === 'b' ? { x: r.doorX, y: r.doorY + 1 } : { x: r.doorX, y: r.doorY - 1 }; a.tx = o.x; a.ty = o.y; a.x = o.x; a.y = o.y; } playerSay(a, how === 'escape' ? 'Free! Now keep out of sight...' : 'Free to go. Behave yourself.'); }
}
/* the player, collared: choices */
function lf2ArrestDialog(g, a) {
  if (typeof lf2Dialog !== 'function') return;
  const fine = lf2Fine(a), what = lf2Charge(a), did = lf2CrimeText(a), w = lf2Wanted()[a.id], evidence = w ? w.cert : 0.5, bribe = Math.round(fine * 1.5);
  const out = (txt) => ({ say: txt, opts: [] });
  lf2Dialog(g, `${a.first}! You are under arrest for ${what}. ${evidence < 0.75 ? 'Word is' : 'People saw'} you ${did}.`, [
    [`Pay the fine (${fine}${LF2_COIN})`, () => { if (a.coin < fine) return { say: `You have not got ${fine} denarii. The cells it is, then.`, opts: [['Go quietly', () => { lf2PlayerJailed(g, a, 0); return out('In you go.'); }]] }; a.coin -= fine; town.treasury += fine; lf2Compensate(a, fine); a.lf2Priors = (a.lf2Priors || 0) + 1; lf2Clear(a); lfEmit('fined', { actor: a, sev: 1, tags: ['arrest'], chron: true, text: `The watch fined ${a.first} ${fine} denarii for ${what}` }); return out('Good. Do not let me see you again.'); }],
    ['Go quietly to the cells', () => { lf2PlayerJailed(g, a, 0); return out('Sensible. Come on.'); }],
    [`Slip them ${bribe}${LF2_COIN}`, () => {
      if (a.coin < bribe) return { say: 'With what? Your charm?', opts: [['Go quietly', () => { lf2PlayerJailed(g, a, 0); return out('In you go.'); }]] };
      const yes = Math.random() < (lf2Has(g, 'greedy') ? 0.85 : (g.aff[a.id] || 0) > 30 ? 0.45 : lf2Has(g, 'devout') || lf2Has(g, 'proud') ? 0.05 : 0.22);
      if (yes) { a.coin -= bribe; g.coin += bribe; lf2Clear(a); lfEmit('bribe', { actor: a, target: g, sev: 2, tags: ['bribe', 'crime'], aware: true, chron: false, text: `${a.first} bribed the watchman ${g.first}` }); return out(anyOf(['I did not see you. Go.', 'Hm. Must have been somebody else. Off you go.'])); }
      lfEmit('bribe', { actor: a, target: g, sev: 2, tags: ['bribe', 'crime'], text: `${a.first} tried to bribe the watchman ${g.first}` }); lf2Want(a, lf2Ev()[lf2Ev().length - 1], 1);
      return { say: 'A bribe? That is another charge.', opts: [['Go quietly', () => { lf2PlayerJailed(g, a, 120); return out('In you go.'); }]] };
    }],
    ['Deny everything', () => { if (evidence < 0.75 && Math.random() < 0.55) { lf2Clear(a); return out(`Hm. Only gossip, I suppose. I am watching you, ${a.first}.`); } return { say: 'Save it for the magistrate.', opts: [['Go quietly', () => { lf2PlayerJailed(g, a, 0); return out('In you go.'); }]] }; }],
    ['Run for it!', () => { a.lf2Ran = game.time + 4; a.lf2RanN = (a.lf2RanN || 0) + 1; lfShout(g, 'Stop! In the name of the watch!'); g.talkUntil = game.time; return null; }]
  ]);
}
function lf2PlayerJailed(g, a, extra) {
  const mins = lf2Sentence(a, extra), what = lf2Charge(a);
  a.lf2Priors = (a.lf2Priors || 0) + 1;
  lfEmit('arrest', { actor: a, target: g, sev: 2, loud: true, tags: ['arrest'], chron: true, text: `The watch arrested ${a.first} for ${what}` });
  lf2Jail(a, mins, g);
  lf2Clear(a);
}

/* ---------------- life in the cells ---------------- */
LF2.preD.push(function (n, tod) {
  if (!n.jail) return null;
  if (game.time >= n.jail.until) { lf2Release(n); return null; }
  const r = lf2Room('jail'); if (!r) { n.jail = null; return null; }
  const cell = lf2Spot(r, 'cell');
  if (!lf2InRoom(n, r)) return [goS(cell, 'Being marched to the cells'), waitS(1, 'stand', 'Locked in', { nopie: true })];
  const left = n.jail.until - game.time;
  if (n.bladder >= 70 && r.seats[0]) return [goS(r.seats[0], 'Using the bucket'), waitS(3, 'stand', 'Using the bucket in the corner', { priv: true, onEnd(nn) { nn.bladder = 0; } })];
  if (n.hunger >= 55) { n.hunger = Math.max(0, n.hunger - 35); lfShout(n, anyOf(['Gruel again.', 'Is this bread or a stone?'])); }
  if (!isAwake(n, tod) && r.beds[0]) return [goS(r.beds[0], 'Lying down on the straw'), waitS(Math.min(left, 120), 'sleep', 'Sleeping in the cells')];
  return [waitS(Math.min(left, 30), 'stand', anyOf(['Locked in the cells', 'Counting the bricks in the cell wall', 'Staring through the bars']), { roam: [10, 20], area: lf2CellTiles(r) })];
});
/* a watchman with a target drops whatever else they were doing */
LF2.preD.push(function (n, tod) {
  if (n.job !== 'Guard' || !lf2OnDuty(n) || !LF2.on('law')) return null;
  const T0 = lf2GuardTarget(n); if (!T0) return null;
  return lf2ChasePlan(n, T0);
});
LF2.dec.push(n => LF2.on('law') && n.lf2Report ? lf2ReportPlan(n) : null);

/* the player in the cells: the door is locked */
LF2.pre.push({ player(n, p, fx, fy) {
  if (!n.jail) return null; const r = lf2Room('jail'); if (!r) return null;
  if (fx > r.x && fx < r.x + r.w - 1 && fy > r.y && fy < r.y + r.h - 1) return null;
  return { msg: 'The cell door is locked. (E for more)' };
} });
LF2.verbs.push((n, x, y, o, add) => {
  if (!n.jail) return null; const r = lf2Room('jail'); if (!r) return null;
  const left = Math.max(0, Math.round((n.jail.until - game.time) / 60 * 10) / 10);
  add('Sleep until they let you out', nn => { const p = nn.player; p.sleeping = true; nn.pose = 'sleep'; p.wakeAt = nn.jail.until + 1; p.needRelease = true; });
  add('Pick the cell lock', nn => {
    let seen = false; for (const g of npcs) if (lf2OnDuty(g) && Math.random() < lf2Notice(g, nn.tx, nn.ty)) seen = true;
    if (seen || Math.random() < 0.3) { nn.jail.until += 90; lfEmit('escape', { actor: nn, sev: 1, tags: ['crime'], chron: true, text: `${nn.first} was caught trying to pick the lock of the cells` }); lf2Say(nn, seen ? 'A watchman saw you. Another hour and a half.' : 'The pick snapped. They heard. Another hour and a half.'); return; }
    lf2Release(nn, 'escape'); const ev = lfEmit('escape', { actor: nn, sev: 2, tags: ['crime'], witnessIds: [], chron: false, text: `${nn.first} broke out of the cells` });
    (town.lf2Later = town.lf2Later || []).push({ at: game.time + 40, f: 'escapeFound', ev: ev.id, who: nn.id });
  }, 15, 'Working at the lock with a bent nail', 'pick');
  add('Shout for the watch', nn => { const g = lf2NearestGuard(nn); lf2Say(nn, `About ${left} more hours, says ${g ? g.first : 'nobody'}.`); });
  return `In the cells · about ${left} h to go`;
});

/* ---------------- villagers who steal when they think nobody is looking ---------------- */
function lf2CrimePlan(n, tod) {
  if (!LF2.on('npccrime') || n.age < 14 || n.player || n.jail || n.job === 'Guard' || (n.lf2CrimeT || 0) > game.time) return null;
  n.lf2CrimeT = game.time + 180;
  const desperate = n.hunger >= 70 && foodCount(pantryOf(n)) === 0 && n.coin < 3, greedy = (lf2Has(n, 'greedy') || n.coin < 5) && n.coin < 30 && Math.random() < (lf2Has(n, 'greedy') ? 0.12 : 0.02) * (lf2Has(n, 'devout') ? 0.3 : 1);
  if (!desperate && !greedy) return null;
  // a drunk at the tavern is an easy mark
  if (greedy && town.tavern && lf2Hr() >= 19 && lf2Hr() < 23.5) { const mark = npcs.find(o => o !== n && !o.dead && (o.drunk || 0) >= 55 && lf2InRoom(o, town.tavern) && o.coin >= 4);
    if (mark) return [goS(() => { const b = besideTile(mark.tx, mark.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(mark.tx - b.x), dy: Math.sign(mark.ty - b.y) } } : null; }, 'Sidling up to a drunk'), waitS(2, 'stand', 'Being very friendly with ' + mark.first, { nopie: true, onEnd(nn) {
      if (lfDist(nn, mark) > 2 || lf2Watchers(nn.tx, nn.ty, [nn, mark]) > 1.2) return; const q = Math.max(1, Math.floor(mark.coin * 0.4)); mark.coin -= q; nn.coin += q;
      const ev = lfEmit('pickpocket', { actor: nn, target: mark, sev: 1, aware: false, tags: ['theft', 'crime'], chron: false, value: q, text: `${nn.first} lifted ${q} denarii from a drunk ${mark.first}` });
      (town.lf2Later = town.lf2Later || []).push({ at: game.time + 60 + Math.random() * 300, f: 'noticeTheft', ev: ev.id, who: mark.id, what: q + ' denarii' }); } })]; }
  if (!desperate && Math.random() < 0.5) return null;
  // a barrel in a house where nobody is home and nobody is watching
  const cands = rooms.filter(r => !r.dead && r.kind === 'house' && r !== n.homeRoom && r.barrel && foodCount(r.pantry || {}) > 2 && !npcs.some(o => !o.dead && o !== n && lf2InRoom(o, r) && o.pose !== 'sleep'));
  const r = cands.sort((a, b) => lfDist(n, { tx: a.doorX, ty: a.doorY }) - lfDist(n, { tx: b.doorX, ty: b.doorY }))[0]; if (!r) return null;
  const sp = r.spots.pantry; if (!sp) return null;
  return [goS(sp, desperate ? 'Slipping into a neighbour\'s house, desperate' : 'Wandering somewhere they should not'), waitS(3, 'work', 'Rummaging in someone else\'s barrel', { tool: 'pick', onEnd(nn) {
    if (lf2Watchers(nn.tx, nn.ty, [nn]) > 0.6 && !desperate) { lfShout(nn, '...'); return; }        // lost their nerve
    const pan = r.pantry; let c = 0; for (const g of FOODS) while ((pan[g] || 0) > 0 && c < 2) { pan[g]--; nn.inv[g] = (nn.inv[g] || 0) + 1; c++; }
    if (c) lfEmit('theft', { actor: nn, target: lf2RoomHead(r), sev: 1, aware: false, value: c * 2, tags: ['theft', 'crime', 'trespass'], chron: false, text: `${nn.first} stole food from the ${lf2Family(r)} family's barrel` });
  } })];
}
LF2.dec.push(lf2CrimePlan);

/* ---------------- things noticed later ---------------- */
const LF2_LATER = {
  noticeTheft(j) { const ev = lf2EvById(j.ev), v = byId(j.who); if (!ev || !v || v.dead) return;
    const saw = ev.witnesses.slice(); lfShout(v, anyOf([`My purse! Somebody has had my purse!`, `Where has my money gone? I have been robbed!`]));
    lfEmit('robbed', { actor: lf2By(ev.actor), target: v, sev: ev.sev + 1, anon: true, sawActor: saw, cause: ev.id, tags: ['theft', 'crime'], loud: true, text: `${lf2By(ev.actor).first} picked ${v.first}'s pocket`, anonText: `Somebody picked ${v.first}'s pocket` }).anonText = `Somebody picked ${v.first}'s pocket`; },
  escapeFound(j) { const ev = lf2EvById(j.ev), a = byId(j.who); if (!ev || !a) return; const g = npcs.find(lf2OnDuty); if (!g) { j.at = game.time + 60; return false; } lf2Learn(g, ev, null, 1, true); lf2Want(a, ev, 1); chron(`The watch found the cells empty: ${a.first} has escaped!`, 'note'); }
};
LF2.tickers.push(() => {
  const L = town.lf2Later; if (!L || !L.length) return;
  for (let i = L.length - 1; i >= 0; i--) { const j = L[i]; if (game.time < j.at) continue; let keep = false; try { keep = LF2_LATER[j.f](j) === false; } catch (e) { console.warn('later', e.message); } if (!keep) L.splice(i, 1); }
});
/* wanted notices fade if nobody has seen them for two days */
LF2.hourly.push(() => { const W2 = lf2Wanted(); for (const id in W2) { const w = W2[id], a = byId(+id); if (!a || a.dead || game.time - Math.max(w.t, w.seen ? w.seen.t : 0) > 2880) delete W2[id]; } });

