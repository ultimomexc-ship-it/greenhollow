/* Who talks to whom, and when (docs/talk-engine.md, section 10). Villagers who are idle (standing or at leisure) and have company near find a partner, walk up,
   stop, and talk; what they were doing carries on afterwards. Conversations happen everywhere; the words are looked up only when the player is within earshot. */

TALK.range = 10;   // tiles (a radius for now; TrueSight perception later)
TALK.earshot = 16;
TALK.stroll = true;   // people on a walk stop for a word with somebody near (not people at work, at a meal or on the way to bed)
TALK.hyper = false;   // developer mode (H): a lot of talking, so there is always something to watch; it costs the economy, so it is for testing
const talkOnScreen = (n: any) => { const sp = toScreen(n.x * TS + TS / 2, n.y * TS); return sp.x > -40 && sp.y > -40 && sp.x < cam.cw + 40 && sp.y < cam.ch + 40; };
const talkLeisure = (n: any) => { const h = (game.time % 1440) / 60; return h >= 17 && h < 22 && n.hunger < 45 && n.bladder < 60 && !(n.job && n.pose === 'work'); };
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
function talkPartner(a: any): any {
  let best: any = null, bw = 0;
  for (const b of npcs) {
    if (b === a || !talkIdle(b) || lvlOf(a.ty) !== lvlOf(b.ty) || lfDist(a, b) > (TALK.hyper ? 12 : TALK.range)) continue;
    const gap = game.time - TM.lastTalk(a, b), close = (a.aff[b.id] || 0); if (gap < (TALK.hyper ? 8 : 60 + Math.max(0, 120 - close * 2))) continue;   // (friends meet more often than strangers)
    if (!talkSpot(b, a)) continue;
    const w = (1 + Math.max(0, close) / 40 + (a.fam && (a.fam.spouse === b.id || a.fam.kids.includes(b.id) || a.fam.mother === b.id || a.fam.father === b.id) ? 0.8 : 0)) * (0.5 + Math.random()); if (w > bw) { bw = w; best = b; }
  }
  return best;
}
/** walk up to b, stop, talk; then carry on with whatever was planned */
function talkApproach(a: any, b: any) {
  b.talkBusy = a.talkBusy = game.time + 16 + 3 * lfDist(a, b);
  if (b.moving || (b.plan && b.plan[b.si] && b.plan[b.si].k === 'go')) { const rb = b.plan ? b.plan.slice(b.si) : []; abortPlan(b); b.plan = [waitS(1, 'stand', 'Stopping to talk with ' + a.first, { nopie: true })].concat(rb); b.si = 0; b.stepStarted = false; }   // (somebody on a walk stops, and goes on afterwards)
  b.talkUntil = Math.max(b.talkUntil || 0, game.time + 8 + 3 * lfDist(a, b));   // (waits for the one who is walking over)
  const rest = a.plan ? a.plan.slice(a.si) : []; abortPlan(a);
  a.plan = [goS(() => talkSpot(b, a) || { x: b.tx, y: b.ty, face: null }, 'Going over to ' + b.first),
    waitS(1, 'stand', 'Talking with ' + b.first, { nopie: true, onEnd(nn: any) {
      if (b.dead || b.pose === 'sleep' || lfDist(nn, b) !== 1) { nn.talkBusy = b.talkBusy = 0; return; }   // (only side by side, on the next tile)
      faceTo(nn, b); faceTo(b, nn);
      const pl = game.player, near = TALK.hyper || (!!pl && (lfDist(nn, pl) <= TALK.earshot || lfDist(b, pl) <= TALK.earshot || talkOnScreen(nn) || talkOnScreen(b)));   // (words for whatever you could see or hear)
      talkRun(nn, b, near); nn.talkBusy = b.talkBusy = 0;
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
