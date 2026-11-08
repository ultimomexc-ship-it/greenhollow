/* ---------- where buildings are placed, and no more hauling: see handsMax below ---------- */
const perim = (w, h) => 2 * (w + h) - 4;
const BUILDING = { house: 1, church: 1, tavern: 1, privy: 1 };
/* nobody has a carrying limit any more: wood and stone go straight into the bag (n.inv) without limit, and nothing is hauled to building sites (the player builds: life2/yard.ts, life2/sealing.ts) */
const handsMax = n => 1e9;
const handsUsed = n => 0;
/** a path laid down at once (the tiles between a new building's door and the nearest road) */
function queueRoad(route) {
  (route || []).forEach(t => { if (grid[t.y][t.x] === T.GRASS || grid[t.y][t.x] === T.SAND) { if (roomAt[t.y][t.x] < 0) { setT(t.x, t.y, T.PATH); markDirty(t.x, t.y, 1, 1); } } });
  return null;
}
/* people standing on a footprint when it is marked out are moved clear */
function ejectFrom(x, y, w, h, site) {
  const out = (xx, yy) => (xx < x || xx >= x + w || yy < y || yy >= y + h) && walkable(xx, yy) && roomAt[yy][xx] < 0;
  npcs.forEach(n => {
    if (n.x > x - 0.5 && n.x < x + w - 0.5 && n.y > y - 0.5 && n.y < y + h - 0.5) {
      let best = null, bd = 1e9;
      for (let yy = y - 3; yy < y + h + 3; yy++) for (let xx = x - 3; xx < x + w + 3; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W && out(xx, yy)) { const d = Math.hypot(xx - n.x, yy - n.y); if (d < bd) { bd = d; best = { x: xx, y: yy }; } }
      if (best) { n.tx = best.x; n.ty = best.y; n.x = best.x; n.y = best.y; n.path = []; n.moving = false; abortPlan && abortPlan(n); }
    }
  });
}

