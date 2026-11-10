/* The carpenter and the workshop. A carpenter comes ashore once the first harvest is in, with a carpentry table in his pack. Put the table and a shelf in a room and it is a workshop (functions.ts);
   he turns wood (and stone for the hearth things) into walls, beds, chairs and the rest, and what he makes goes straight to your kit. Everybody helps with the wood; you can also hand wood and stone in at his table. */

/** what the carpenter should make next, from what the island lacks and what your kit already holds */
function carpWant(needs?: any[]): string | null {
  if (!town || !kitOn()) return null; const B = townBalance(), K = (k: string) => kitCount(k), placed = (k: string) => (town.props || []).filter(p => p.kind === k && !p.fixed).length;
  if (B.beds + K('bed') < B.bedsNeeded) return 'bed';
  if (K('bwall') < 12) return 'bwall';
  if (K('bdoor') < 2) return 'bdoor';
  if (B.privies + K('toilet') + placed('toilet') < B.priviesNeeded) return 'toilet';
  const top = (needs || islandNeeds() || []).find(q => !q.hard && ['bakery', 'smithy', 'shop', 'tavern', 'church', 'pews'].includes(q.id));
  const need: Record<string, string[]> = { bakery: ['oven', 'counter'], smithy: ['forge', 'anvil'], shop: ['counter', 'shelf'], tavern: ['counter', 'table', 'chair', 'chair'], church: ['altar', 'pew', 'pew'], pews: ['pew'] };
  if (top) { const want = need[top.id] || [], have: Record<string, number> = {}; for (const k of want) { have[k] = (have[k] || 0) + 1; if (K(k) + placed(k) < have[k]) return k; } }
  return null;
}
function carpPlan(n: any, r: any) {
  const s = lf2Stock(r), sp = lf2Spot(r, 'work') || lf2Spot(r, 'front'); if (!sp) return null;
  const kind = carpWant(); if (!kind) return lf2GoWork(r, 'work', 'Sharpening the tools', 30, 'stand');
  const R = KIT_RECIPE[kind]; if (!R) return null;
  if ((R.wood || 0) > (s.wood || 0) || (R.stone || 0) > (s.stone || 0)) return lf2GoWork(r, 'work', `Waiting for ${(R.wood || 0) > (s.wood || 0) ? 'wood' : 'stone'} for ${itBuildName(kind).toLowerCase()}`, 25, 'stand');
  return lf2GoWork(r, 'work', `Making ${itBuildName(kind).toLowerCase()}`, 38, 'work', { tool: 'hammer', onEnd(nn) {
    if ((R.wood || 0) > (s.wood || 0) || (R.stone || 0) > (s.stone || 0)) return;
    s.wood = (s.wood || 0) - (R.wood || 0); s.stone = (s.stone || 0) - (R.stone || 0); kitGive(kind, R.q);
    const pl = game.player; chron(`The carpenter finished ${R.q > 1 ? R.q + ' ' : 'a '}${itBuildName(kind).toLowerCase()}${R.q > 1 ? 's' : ''}. It turned up in your kit, and nobody remarked on it.`, 'build'); if (pl && pl.player) playerSay(pl, 'The carpenter made ' + (R.q > 1 ? R.q + ' ' : 'a ') + itBuildName(kind).toLowerCase() + (R.q > 1 ? 's' : '') + ' for you.');
  } });
}
/** a villager with nothing better to do fells a tree and stacks the wood at the workshop */
function wcPlan(n: any) {
  const ws = lf2Room('workshop'); if (!ws) return null; const sp = lf2Spot(ws, 'front') || lf2Spot(ws, 'work'); if (!sp) return null;
  town.treeClaim = town.treeClaim || new Set(); let best: any = null, bd = 1e9; const cx = ws.x + ws.w / 2, cy = ws.y + ws.h / 2;
  for (let y = Math.max(2, Math.floor(cy - 30)); y < Math.min(H - 2, cy + 30); y++) for (let x = Math.max(2, Math.floor(cx - 30)); x < Math.min(W - 2, cx + 30); x++) {
    if (grid[y][x] !== T.TREE || town.treeClaim.has(y * W + x)) continue; const d = Math.abs(x - n.tx) + Math.abs(y - n.ty); if (d >= bd) continue;
    for (const [dx, dy] of DIRS) { const sx = x + dx, sy = y + dy; if (walkable(sx, sy) && reach[sy * W + sx] && roomAt[sy][sx] < 0 && !lfPropAt(sx, sy)) { best = { x, y, stand: { x: sx, y: sy, face: { dx: -dx, dy: -dy } } }; bd = d; break; } }
  }
  if (!best) return null; const k = best.y * W + best.x; town.treeClaim.add(k);
  return [goS(best.stand, 'Heading for a tree'), waitS(10, 'work', 'Felling a tree for the carpenter', { tool: 'axe', onEnd(nn) { town.treeClaim.delete(k); if (grid[best.y][best.x] === T.TREE) { workFx('fall', best.x, best.y, nn); setT(best.x, best.y, T.GRASS); markDirty(best.x, best.y, 1, 1); nn.inv.wood = (nn.inv.wood || 0) + 1; town.treeDirty = true; town.treeCache = null; } } }),
    goS(sp, 'Taking the wood to the workshop'), waitS(1, 'stand', 'Stacking the wood', { nopie: true, onEnd(nn) { const s = lf2Stock(ws); s.wood = (s.wood || 0) + (nn.inv.wood || 0); nn.inv.wood = 0; } })];
}
/** the carpenter arrives with his table */
function carpArrive(n: any) {
  town.tut = town.tut || { harvests: 0 }; town.tut.carpenter = true; n.lf2Want = 'Carpenter'; n.back = 'was fitting a stair in a house that has since lost its address, and then the stair was a beach'; kitGive('bench');
  lfShout(n, anyOf(['I seem to have brought my bench. I do not remember packing it. Give me a room with a shelf and I will make you walls and beds.', 'Carpenter. The bench came with me, which is lucky. Put it in a room with a shelf.']));
  const pl = game.player; if (pl && pl.player) playerSay(pl, n.first + ' arrived with a bench under one arm. It is in your kit now.');
}
(LF2_JOBS as any).Carpenter = { name: 'Carpenter', room: 'workshop', spot: 'work', fit: ['handy'], wage: 0 };
LF2_JOBORDER.push('Carpenter');
