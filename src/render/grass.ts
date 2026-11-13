/* Living grass: tufts of blades on open grass that sway in the wind and part round whoever walks through them, then spring back.
   Drawn row by row in the same depth order as people (a YSORT provider), so the blades of the row you stand in come in front of your feet:
   you walk *in* the grass. Cheap: only the tiles on screen, only when zoomed in, one path per row and shade, positions from a hash (no state per
   blade); the bending comes from the people near the row and a short trail of where you have just been. */
const GRASS: any = { on: true, minZoom: 0.9, tufts: 3, trail: [] as any[], plaza: null, plazaN: -1 };
/** a fixed pseudo-random number for a tile and a blade (the same every frame) */
const grHash = (x: number, y: number, i: number) => { let h = (x * 374761393 + y * 668265263 + i * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const GR_SHADES = ['#356b22', '#457f2a', '#589a34', '#6db03f', '#86c452'];
const grOpen = (x: number, y: number) => grid[y] && grid[y][x] === T.GRASS;   // (blades grow only where grass meets grass, not on the camp ground or a sandy edge)
/** where a walker bends the grass: { x, y (tile units, the feet), w (0..1 strength) } */
function grBenders(now: number): any[] {
  const out: any[] = [], P = game.player;
  // the trail: where you have just walked, fading over a second and a half
  if (P && (!GRASS.trail.length || Math.hypot(GRASS.trail[GRASS.trail.length - 1].x - P.x, GRASS.trail[GRASS.trail.length - 1].y - P.y) > 0.25)) { GRASS.trail.push({ x: P.x, y: P.y, t: now }); if (GRASS.trail.length > 24) GRASS.trail.shift(); }
  for (const q of GRASS.trail) { const a = (now - q.t) / 1500; if (a < 1) out.push({ x: q.x + 0.5, y: q.y + 0.9, w: (1 - a) * 0.7 }); }
  for (const n of npcs) { if (n.dead || n.inShip || n.infant) continue; out.push({ x: n.x + 0.5, y: n.y + 0.9, w: 1 }); }
  return out;
}
YSORT.push(function (c: any, now: number) {
  if (!GRASS.on || !town || cam.z < GRASS.minZoom || (typeof itBuildOn === 'function' && game.player && itBuildOn(game.player))) return [];
  const x0 = Math.max(0, Math.floor(cam.x / TS) - 1), y0 = Math.max(0, Math.floor(cam.y / TS) - 1), x1 = Math.min(W - 1, x0 + Math.ceil(cam.cw / cam.z / TS) + 2), y1 = Math.min(H - 1, y0 + Math.ceil(cam.ch / cam.z / TS) + 2);
  if (GRASS.plazaN !== plazaTiles.length) { GRASS.plaza = new Set(plazaTiles.map((q: any) => q.y * W + q.x)); GRASS.plazaN = plazaTiles.length; }
  const t = now / 1000, gust = 0.5 + 0.5 * Math.sin(t * 0.35) * Math.sin(t * 0.13 + 1.7), bend = grBenders(now), items: any[] = [];
  for (let y = y0; y <= y1; y++) {
    const row = grid[y]; if (!row) continue;
    const near = bend.filter(b => Math.abs(b.y - (y + 0.9)) < 1.6 && b.x >= x0 - 2 && b.x <= x1 + 3);
    items.push({ k: y + 0.03, f: () => {
      const paths: any[] = GR_SHADES.map(() => new Path2D());
      for (let x = x0; x <= x1; x++) {
        if (row[x] !== T.GRASS || (town.propAt && town.propAt.get(y * W + x)) || roomAt[y][x] >= 0 || GRASS.plaza.has(y * W + x) || !grOpen(x - 1, y) || !grOpen(x + 1, y) || !grOpen(x, y - 1) || !grOpen(x, y + 1)) continue;
        for (let i = 0; i < GRASS.tufts; i++) {
          const hx = grHash(x, y, i), hy = grHash(x, y, i + 17), bx = x + 0.12 + hx * 0.76, by = y + 0.4 + hy * 0.55, len = 0.2 + grHash(x, y, i + 31) * 0.16;
          // the wind: a slow sway that travels across the island, a little stronger in a gust
          let lean = Math.sin(t * 1.7 + bx * 0.9 + by * 0.5) * (0.16 + 0.22 * gust) + 0.06, flat = 1;
          // walkers: blades lean away from a foot nearby and flatten under it
          for (const b of near) { const dx = bx - b.x, dy = by - b.y, d = Math.hypot(dx, dy); if (d > 0.9) continue; const s = (1 - d / 0.9) * b.w; lean += Math.sign(dx || 0.01) * s * 1.2; flat = Math.min(flat, 1 - s * 0.6); }
          const px = bx * TS, py = by * TS, h = len * TS * flat;
          for (let j = -1; j <= 1; j++) {   // (a tuft: three blades from one root)
            const a = lean + j * 0.32, hh = h * (j === 0 ? 1 : 0.78), tx = px + j * 1.2 + Math.sin(a) * hh, ty = py - Math.cos(a) * hh;
            const p = paths[((hx * 11 | 0) + j + 1) % GR_SHADES.length]; p.moveTo(px + j * 0.8, py); p.quadraticCurveTo(px + j * 1.1 + Math.sin(a) * hh * 0.3, py - hh * 0.6, tx, ty);
          }
        }
      }
      c.save(); c.lineWidth = 1.3; c.lineCap = 'round';
      for (let i = 0; i < paths.length; i++) { c.strokeStyle = GR_SHADES[i]; c.stroke(paths[i]); }
      c.restore();
    } });
  }
  return items;
});
