/* The first two buildings come with a layout to follow: faint markers on the ground (amber for a wall block, blue for the door, ghost furniture inside) that light up green as you
   fill them. A guide appears when the island asks for that building (your first hut, the first privy) and goes when it is built. Only a guide: you can build anywhere. */

const GUIDE_DEFS: Record<string, { w: number; h: number; door: [number, number]; items: [string, number, number][]; say: string }> = {
  hut: { w: 5, h: 5, door: [2, 4], items: [['bed', 1, 1], ['bed', 3, 1]], say: 'Put a wall block on each amber marker, a door on the blue one, and the beds inside.' },
  privy: { w: 4, h: 3, door: [1, 2], items: [['toilet', 1, 1]], say: 'Amber markers for the walls, blue for the door, and the privy seat inside.' },
};
function guideFree(x: number, y: number, w: number, h: number): boolean {
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) { const tx = x + i, ty = y + j; if (tx < 4 || ty < 4 || tx >= W - 4 || ty >= H - 4 || grid[ty][tx] !== T.GRASS || roomAt[ty][tx] >= 0 || lfPropAt(tx, ty) || (town.nodeMap && town.nodeMap.has(ty * W + tx)) || shroomAt(tx, ty) || (town.siteAt && town.siteAt[ty * W + tx]) || (town.crops || []).some(c => c.x === tx && c.y === ty)) return false; }
  return true;
}
function guideSpot(w: number, h: number) {
  const pl = game.player || npcs[0]; if (!pl) return null; let best: any = null, bd = 1e9;
  for (let r = 3; r <= 16 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = pl.tx + dx, y = pl.ty + dy; if (!guideFree(x, y, w, h)) continue;
    const d = Math.hypot(dx - 4, dy); if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
/** called with the current requests: make or drop the guides */
function guidesUpdate(needs: any[]) {
  if (!town || town.scenario !== 'blank') return; town.guides = town.guides || {};
  const top = needs[0] && needs[0].id, free = rooms.some(r => !r.dead && r.free);
  const want = { hut: (top === 'bed' || top === 'bed2') && !free && !rooms.some(r => !r.dead && r.hut), privy: top === 'privy' && !(typeof lfPrivies === 'function' && lfPrivies().length) };
  for (const k of Object.keys(GUIDE_DEFS)) {
    if (want[k] && !town.guides[k]) { const d = GUIDE_DEFS[k], p = guideSpot(d.w, d.h); if (p) { town.guides[k] = { x: p.x, y: p.y }; const pl = game.player; if (pl && pl.player) playerSay(pl, k === 'hut' ? 'Faint markers on the ground show where a hut could go. I did not put them there.' : 'Markers again, on the ground. A privy, this time.'); } }
    else if (!want[k] && town.guides[k]) delete town.guides[k];
  }
}
function drawGuides(c: any, now: number) {
  if (!town || !town.guides) return; const pulse = 0.55 + 0.25 * Math.sin(now / 400);
  for (const k of Object.keys(town.guides)) {
    const g = town.guides[k], d = GUIDE_DEFS[k]; if (!d) continue;
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
      const edge = i === 0 || j === 0 || i === d.w - 1 || j === d.h - 1, door = i === d.door[0] && j === d.door[1], x = g.x + i, y = g.y + j, px = x * TS, py = y * TS;
      if (!edge) continue; const p = lfPropAt(x, y), built = grid[y][x] === T.WALL || grid[y][x] === T.DOOR || (p && (p.kind === 'bwall' || p.kind === 'bwindow' || p.kind === 'bdoor')), right = door ? ((p && p.kind === 'bdoor') || grid[y][x] === T.DOOR) : !!built;
      c.save(); c.globalAlpha = right ? 0.55 : pulse; c.lineWidth = 2; c.strokeStyle = right ? '#8bd05f' : door ? '#6ab0ff' : '#e0a93b'; c.setLineDash([5, 4]); c.strokeRect(px + 2, py + 2, TS - 4, TS - 4); c.fillStyle = right ? 'rgba(139,208,95,.25)' : door ? 'rgba(106,176,255,.18)' : 'rgba(224,169,59,.16)'; c.fillRect(px + 2, py + 2, TS - 4, TS - 4); c.restore();
    }
    for (const [kind, ix, iy] of d.items) {
      const x = g.x + ix, y = g.y + iy, p = lfPropAt(x, y), have = !!(p && p.kind === kind); c.save(); c.globalAlpha = have ? 0.9 : 0.4 * (0.8 + 0.4 * Math.sin(now / 500));
      if (!have) gaDraw(c, kind === 'bed' ? 'bed_head_up_5' : 'toilet', x * TS, y * TS, now, 0); c.restore();
    }
  }
}
