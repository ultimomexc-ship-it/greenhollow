/* Paullus, the trader of the Hamlet (and the build town): the one person on the island who is not like the others. He does not sleep and has no bed, so he
   never asks for one, never wishes at the well, never puts coin in it and never asks a favour (`isPaullus`, hamlet.ts, is checked where those happen:
   yardHousing, arrivals, the bed shouts, talkState, reqWant, wishWant, rentContent; rentTrader already keeps him out of rent, wishes and the well).
   By day he keeps the stall (`HAMLET_TRADER_DEF.open`); when he shuts it he goes wandering about the island until morning (`paullusPlan`). Once every
   tutorial is over and the stalls that take his place are built (`PAULLUS.replacedBy`), he leaves the island (`paullusLeave`). The stall that would buy
   crops instead of him does not exist yet, so for now he stays. */

const PAULLUS: any = { replacedBy: ['stallseed', 'stallcarp', 'stallgrocer'], wanderR: 22 };
/** the stall is shut and he is out walking */
const paullusOut = (n: any): boolean => { if (!isPaullus(n)) return false; const h = (game.time % 1440) / 60, o = HAMLET_TRADER_DEF.open; return h < o[0] || h >= o[1]; };
// he never tires and never needs the privy (like the villager you steer)
LF2.tickers.push(() => {
  for (const n of npcs) if (isPaullus(n)) { n.energy = Math.max(n.energy || 0, 90); n.bladder = 0; }
});
/** a place to wander to at night: open ground within a walk of where he is, not inside anybody's yard */
function paullusSpot(n: any): any {
  for (let i = 0; i < 30; i++) {
    const x = n.tx + Math.round((Math.random() * 2 - 1) * PAULLUS.wanderR), y = n.ty + Math.round((Math.random() * 2 - 1) * PAULLUS.wanderR);
    if (!grid[y] || !walkable(x, y) || lfPropAt(x, y) || roomAt[y][x] >= 0 || (town.yardAt && town.yardAt.has(y * W + x)) || tileOwner.get(y * W + x)) continue;
    if (![T.GRASS, T.PATH, T.SAND].includes(grid[y][x])) continue;
    return { x, y, face: null };
  }
  return null;
}
/** his own plan: out walking while the stall is shut (he never goes to bed); by day the ordinary work plan */
function paullusPlan(n: any): any {
  if (!paullusOut(n) || n.tutHold) return null;
  const sp = paullusSpot(n); if (!sp) return [waitS(20, 'stand', 'Standing about in the dark')];
  return [goS(sp, 'Wandering about while the stall is shut'), waitS(10 + Math.random() * 30, 'stand', Math.random() < 0.5 ? 'Looking at the sea' : 'Looking at nothing in particular')];
}
// @ts-expect-error -- deliberate patch
const _pDecide = decide; decide = function (n: any) { if (isPaullus(n)) { const p = paullusPlan(n); if (p) return p; } return _pDecide(n); };

/** may he go: every tutorial over and every stall that takes his place built */
function paullusMayLeave(): boolean {
  if (town.tut2 && !town.tut2.done) return false;
  return PAULLUS.replacedBy.every((k: string) => (town.stalls || []).some((s: any) => s.built === k));
}
/** he leaves: a last line, a chronicle line, and he is gone (his stall stays, empty) */
function paullusLeave(n: any) {
  if (!n || n.dead) return;
  if (game.player && lfDist(n, game.player) <= 16 && typeof tut2Say === 'function') tut2Say(n, "That's me done here. You'll manage.", game.player);
  chron(`${n.first} shut the trading stall for the last time and left the island. Nobody saw the boat.`, 'note');
  n.dead = true; n.gone = true; n.plan = null; tileOwner.delete(n.ty * W + n.tx); town.paullusGone = game.time;
}
LF2.hourly.push(() => { if (town.paullusGone) return; const n = npcs.find((q: any) => isPaullus(q)); if (n && paullusMayLeave()) paullusLeave(n); });
