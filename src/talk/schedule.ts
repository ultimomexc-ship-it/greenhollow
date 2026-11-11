/* Who talks to whom, and when (docs/talk-engine.md, section 10). Villagers who are idle (standing or at leisure) and have company near find a partner, walk up,
   stop, and talk; what they were doing carries on afterwards. Conversations happen everywhere; the words are looked up only when the player is within earshot. */

TALK.range = 10;   // tiles (a radius for now; TrueSight perception later)
TALK.earshot = 16;
TALK.stroll = true;   // people on a walk stop for a word with somebody near (not people at work, at a meal or on the way to bed)
TALK.hyper = false;   // developer mode (H): a lot of talking, so there is always something to watch; it costs the economy, so it is for testing
const talkOnScreen = (n: any) => { const sp = toScreen(n.x * TS + TS / 2, n.y * TS); return sp.x > -40 && sp.y > -40 && sp.x < cam.cw + 40 && sp.y < cam.ch + 40; };
const talkLeisure = (n: any) => { const h = (game.time % 1440) / 60; return h >= 17 && h < 22 && n.hunger < 45 && n.bladder < 60 && !(n.job && n.pose === 'work'); };
/** words are looked up for whatever you could see or hear */
const talkListened = (a: any, b: any): boolean => { const pl = game.player; return TALK.hyper || (!!pl && (lfDist(a, pl) <= TALK.earshot || lfDist(b, pl) <= TALK.earshot || talkOnScreen(a) || talkOnScreen(b))); };
function talkIdle(n: any): boolean {
  if (n.dead || n.player || n.infant || n.age < 6 || n.pose === 'sleep' || n.trapped || n.jail) return false;
  if ((n.talkUntil || 0) > game.time || (n.talkBusy || 0) > game.time) return false;
  if (n.hunger > 92 || n.bladder > 85) return false;   // (nothing urgent)
  if (TALK.hyper) return true;
  const st = n.plan && n.plan[n.si]; return !st || !!n.roaming || (st.k === 'wait' && (st.act === 'stand' || st.act === 'leisure')) || (st.k === 'go' && TALK.stroll && talkLeisure(n));   // (a walk can be broken for a word in the evening, when nobody is hungry or working: it resumes after)
}
/** the whole tile beside somebody (up, down, left or right, never a diagonal) where another can stand and talk: free, walkable, same room or both outside; the one nearest to the walker */
function talkSpot(b: any, from?: any): any {
  let best: any = null, bd = 1e9;
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const x = b.tx + dx, y = b.ty + dy; if (!walkable(x, y) || lfPropAt(x, y) || roomAt[y][x] !== roomAt[b.ty][b.tx] || npcs.some((o: any) => o !== b && o !== from && o.tx === x && o.ty === y && !o.dead)) continue;
    const d = from ? Math.abs(from.tx - x) + Math.abs(from.ty - y) : 0; if (d < bd) { bd = d; best = { x, y, face: { dx: -dx, dy: -dy } }; }
  }
  return best;
}
/** a reason to talk to this person now: a crush or a partner, a promise to chase, a grudge to air, fresh news they have not heard */
function talkReason(a: any, b: any): number {
  let w = 0; if (a.crush === b.id || (a.fam && a.fam.partner === b.id)) w += 2.5;
  if ((a.reqs || []).some((r: any) => r.state === 'promised' && r.to === b.id)) w += 1.5;
  const mem = a.tmem || []; for (let i = mem.length - 1; i >= Math.max(0, mem.length - 14); i--) { const m = mem[i]; if (m.ev == null || m.kind === 'did') continue; if (m.imp >= 0.55 && game.time - m.t < 240 && !TM.ofEv(b, m.ev)) { w += 1.2; break; } }
  for (let i = (b.tmem || []).length - 1; i >= Math.max(0, (b.tmem || []).length - 14); i--) { const m = b.tmem[i]; if (m.ev != null && !m.raised && !m.forgiven && m.conf >= 0.5 && game.time - m.t < 1440 * 3 && m.ver && m.ver.who === a.id) { w += 1.2; break; } }   // (b holds a grudge against a)
  return w;
}
function talkPartner(a: any): any {
  let best: any = null, bw = 0;
  for (const b of npcs) {
    if (b === a || !talkIdle(b) || lvlOf(a.ty) !== lvlOf(b.ty) || lfDist(a, b) > (TALK.hyper ? 12 : TALK.range)) continue;
    const why = talkReason(a, b), gap = game.time - TM.lastTalk(a, b), close = (a.aff[b.id] || 0); if (gap < (TALK.hyper ? 8 : (60 + Math.max(0, 120 - close * 2)) * (why >= 2 ? 0.3 : 1))) continue;   // (friends meet more often than strangers, and people with something to say meet sooner)
    if (!talkSpot(b, a)) continue;
    const w = (1 + Math.max(0, close) / 40 + (a.fam && (a.fam.spouse === b.id || a.fam.kids.includes(b.id) || a.fam.mother === b.id || a.fam.father === b.id) ? 0.8 : 0) + why) * (0.5 + Math.random()); if (w > bw) { bw = w; best = b; }
  }
  return best;
}
/** walk up to b, stop, talk; then carry on with whatever was planned */
function talkApproach(a: any, b: any) {
  b.talkBusy = a.talkBusy = game.time + 16 + 3 * lfDist(a, b);
  if (b.moving || (b.plan && b.plan[b.si] && b.plan[b.si].k === 'go')) { const rb = b.plan ? b.plan.slice(b.si) : []; abortPlan(b); b.plan = [waitS(1, 'stand', 'Stopping to talk with ' + a.first, { nopie: true })].concat(rb); b.si = 0; b.stepStarted = false; }   // (somebody on a walk stops, and goes on afterwards)
  b.talkUntil = Math.max(b.talkUntil || 0, game.time + 8 + 3 * lfDist(a, b));   // (waits for the one who is walking over)
  const rest = a.plan ? a.plan.slice(a.si) : []; abortPlan(a);
  a.chatTarget = null;   // (somebody who was wandering after an old acquaintance stops chasing them: the walk is to b now)
  a.plan = [goS(() => talkSpot(b, a) || { x: b.tx, y: b.ty, face: null }, 'Going over to ' + b.first),
    waitS(1, 'stand', 'Talking with ' + b.first, { nopie: true, onEnd(nn: any) {
      if (b.dead || b.pose === 'sleep' || lfDist(nn, b) !== 1) { nn.talkBusy = b.talkBusy = 0; return; }   // (only side by side, on the next tile)
      faceTo(nn, b); faceTo(b, nn);
      talkRun(nn, b, talkListened(nn, b)); nn.talkBusy = b.talkBusy = 0;
    } })].concat(rest);
  a.si = 0; a.stepStarted = false;
}
function talkTick() {
  if (!town || !TALK.running || !game.player) return;
  for (const a of npcs) {
    if ((a.talkNext || 0) > game.time) continue;
    if (TALK.hyper && game.player && lfDist(a, game.player) > 28) continue;   // (hyper talk: the effort goes to whoever you can see)
    a.talkNext = game.time + (TALK.hyper ? 0.5 + Math.random() * 1.5 : 8 + Math.random() * 16) / (talkHas(a, 'sociable') ? 1.5 : talkHas(a, 'shy') ? 0.7 : 1);
    if (!talkIdle(a)) continue;
    const b = talkPartner(a); if (b) talkApproach(a, b);
  }
}
LF2.tickers.push(talkTick);

/* ---- developer hyper mode: H toggles; a badge shows it is on ---- */
(function () {
  const stage = canvas.parentNode as any; if (!stage) return;
  const badge = document.createElement('div'); badge.className = 'hyperbadge'; badge.hidden = true; badge.textContent = 'hyper talk (H)'; stage.appendChild(badge);
  window.addEventListener('keydown', (e: any) => {
    if ((e.key !== 'h' && e.key !== 'H') || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') || !town) return;
    TALK.hyper = !TALK.hyper; TALK.words = TALK.hyper; badge.hidden = !TALK.hyper;
  });
})();

/* ---- a word in passing: people who pass each other on the way somewhere stop for a moment, say a few things, and carry on. It costs the day a minute or two, so it can happen all day long,
   and it is how news and opinions travel between people who are never idle at the same time ---- */
function talkPass() {
  if (!town || !TALK.running || !game.player || !TALK.on.ritual || TALK.hyper) return;
  const mv = npcs.filter((n: any) => !n.dead && !n.player && !n.infant && n.age >= 8 && n.pose !== 'sleep' && !n.inShip && !n.trapped && !n.jail && (n.talkUntil || 0) <= game.time && (n.passNext || 0) <= game.time && n.hunger < 88 && n.bladder < 80 && !(n.plan && n.plan[n.si] && n.plan[n.si].nopie));
  for (let i = 0; i < mv.length; i++) {
    const a = mv[i]; if ((a.passNext || 0) > game.time || (a.talkUntil || 0) > game.time) continue;
    for (let j = i + 1; j < mv.length; j++) {
      const b = mv[j]; if ((b.passNext || 0) > game.time || (b.talkUntil || 0) > game.time || lvlOf(a.ty) !== lvlOf(b.ty) || lfDist(a, b) > 2) continue;
      if (game.time - TM.lastTalk(a, b) < 150 + Math.max(0, 100 - (a.aff[b.id] || 0))) continue; if (Math.random() > 0.55) continue;
      a.passNext = b.passNext = game.time + 40 + Math.random() * 30; talkRun(a, b, talkListened(a, b), true); break;
    }
  }
}
LF2.tickers.push(talkPass);
