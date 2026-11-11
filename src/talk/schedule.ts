/* Who talks to whom, and when (docs/talk-engine.md, section 10). Villagers who are idle (standing or at leisure) and have company near find a partner, walk up,
   stop, and talk; what they were doing carries on afterwards. Conversations happen everywhere; the words are looked up only when the player is within earshot. */

TALK.range = 10;   // tiles (a radius for now; TrueSight perception later)
TALK.earshot = 16;
function talkIdle(n: any): boolean {
  if (n.dead || n.player || n.infant || n.age < 6 || n.pose === 'sleep' || n.trapped || n.jail) return false;
  if ((n.talkUntil || 0) > game.time || (n.talkBusy || 0) > game.time) return false;
  const st = n.plan && n.plan[n.si]; return !st || !!n.roaming || (st.k === 'wait' && (st.act === 'stand' || st.act === 'leisure'));
}
function talkPartner(a: any): any {
  let best: any = null, bw = 0;
  for (const b of npcs) {
    if (b === a || !talkIdle(b) || b.moving || lvlOf(a.ty) !== lvlOf(b.ty) || lfDist(a, b) > TALK.range) continue;
    const gap = game.time - TM.lastTalk(a, b), close = (a.aff[b.id] || 0); if (gap < 60 + Math.max(0, 120 - close * 2)) continue;   // (friends meet more often than strangers)
    if (!visNearTile(b)) continue;
    const w = (1 + Math.max(0, close) / 40 + (a.fam && (a.fam.spouse === b.id || a.fam.kids.includes(b.id) || a.fam.mother === b.id || a.fam.father === b.id) ? 0.8 : 0)) * (0.5 + Math.random()); if (w > bw) { bw = w; best = b; }
  }
  return best;
}
/** walk up to b, stop, talk; then carry on with whatever was planned */
function talkApproach(a: any, b: any) {
  b.talkBusy = a.talkBusy = game.time + 16; b.talkUntil = Math.max(b.talkUntil || 0, game.time + 9);
  const rest = a.plan ? a.plan.slice(a.si) : []; abortPlan(a);
  a.plan = [goS(() => visNearTile(b) || { x: b.tx, y: b.ty, face: null }, 'Going over to ' + b.first),
    waitS(1, 'stand', 'Talking with ' + b.first, { onEnd(nn: any) {
      if (b.dead || b.pose === 'sleep' || lfDist(nn, b) > 3) { nn.talkBusy = b.talkBusy = 0; return; }
      faceTo(nn, b); faceTo(b, nn);
      const pl = game.player, near = !!pl && (lfDist(nn, pl) <= TALK.earshot || lfDist(b, pl) <= TALK.earshot);
      talkRun(nn, b, near); nn.talkBusy = b.talkBusy = 0;
    } })].concat(rest);
  a.si = 0; a.stepStarted = false;
}
function talkTick() {
  if (!town || !TALK.running || !game.player) return;
  for (const a of npcs) {
    if ((a.talkNext || 0) > game.time) continue;
    a.talkNext = game.time + (8 + Math.random() * 16) / (talkHas(a, 'sociable') ? 1.5 : talkHas(a, 'shy') ? 0.7 : 1);
    if (!talkIdle(a)) continue;
    const b = talkPartner(a); if (b) talkApproach(a, b);
  }
}
LF2.tickers.push(talkTick);
