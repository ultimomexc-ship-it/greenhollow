/* A sign on the wall beside every door: walk into it and it says who lives there, or what the building is for (and what an unfinished one still lacks). */

function signWallOf(r: any): { x: number; y: number } | null {
  if (!r || r.dead || r.doorX == null) return null;
  const dx = r.doorX, dy = r.doorY; let ix = 0, iy = 0;   // which way is in
  for (const [ax, ay] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const x = dx + ax, y = dy + ay; const inn = r.cells ? r.cells.has(x + y * W) : (x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1); if (inn) { ix = ax; iy = ay; break; } }
  if (!ix && !iy) return null;
  for (const [ax, ay] of (ix ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]])) { const x = dx + ax, y = dy + ay; if (grid[y] && grid[y][x] === T.WALL) return { x, y }; }   // (the wall tiles on either side of the door)
  return null;
}
let SIGN_CACHE: any = { v: -1, map: new Map() };
function signMap() {
  const v = (town.gridV || 0) * 1000 + rooms.length * 7 + rooms.filter(r => r.dead).length; if (SIGN_CACHE.v === v && SIGN_CACHE.t === town) return SIGN_CACHE.map;
  const m = new Map<number, any>(); for (const r of rooms) { const s = signWallOf(r); if (s && !m.has(s.x + s.y * W)) m.set(s.x + s.y * W, r); } SIGN_CACHE = { v, map: m, t: town }; return m;
}
const signRoomAt = (x: number, y: number) => (town && rooms ? signMap().get(x + y * W) : null);
/** what is still missing for the best-matching unfinished purpose, e.g. "Unfinished bakery: oven ✓, counter ✗" */
function signUnfinished(r: any) {
  if (typeof FN_DEFS === 'undefined' || typeof fnProps !== 'function') return '';
  const P = fnProps(r); let best: any = null, bs = 0;
  for (const d of FN_DEFS) { const ks = Object.keys(d.need), have = ks.filter(k => (P[k] || []).length >= d.need[k]).length, any = ks.some(k => (P[k] || []).length > 0); if (any && have / ks.length > bs) { bs = have / ks.length; best = d; } }
  if (!best) return '';
  return `Unfinished ${best.name.replace(/^The /, '').toLowerCase()}: ` + Object.keys(best.need).map(k => `${best.need[k] > 1 ? best.need[k] + ' ' : ''}${k}${best.need[k] > 1 ? 's' : ''} ${(P[k] || []).length >= best.need[k] ? '✓' : '✗'}`).join(', ') + '.';
}
function signText(r: any): string {
  if (!r) return '';
  const names = (a: any[]) => a.map(n => n.player ? 'you' : n.first).join(' and ');
  const live = typeof occupants === 'function' ? occupants(r) : [];
  if (r.fn) return `${r.name}. ${({ bakery: 'Bread and flour.', smithy: 'Tools and mending.', shop: 'Goods for sale.', tavern: 'Food, drink and company.', church: 'Prayers, weddings and farewells.' } as any)[r.fn] || ''}`;
  if (r.ptoilet && r.name === 'Privy') return 'The privy.';
  if (r.kind === 'house') { const beds = (r.beds || []).length, freeBeds = (r.beds || []).filter(b => !b.owner || b.owner.dead || b.owner.homeRoom !== r).length;
    return live.length ? `${names(live)} ${live.length === 1 && !live[0].player ? 'lives' : 'live'} here.${freeBeds ? ' ' + freeBeds + ' free bed' + (freeBeds > 1 ? 's' : '') + '.' : ''}` : `${r.name || 'A house'}: ${beds} bed${beds === 1 ? '' : 's'}, nobody home.`; }
  if (r.kind === 'room') return signUnfinished(r) || 'An empty room. Furniture decides what it is for.';
  return `${r.name || r.kind}.`;
}
/** the plaque: a small board on the wall beside the door */
function drawSigns(c: any, now: number) {
  if (!town || cam.z < 0.9) return; const v = gaView();
  for (const [k, r] of signMap()) {
    const x = k % W, y = (k / W) | 0; if (x < v.x0 || x >= v.x1 || y < v.y0 || y >= v.y1 || !r) continue;
    const px = x * TS, py = y * TS, u = TS / 24;
    c.fillStyle = '#2a2332'; c.fillRect(px + 6 * u, py + 9 * u, 12 * u, 8 * u);
    c.fillStyle = '#9a6a3a'; c.fillRect(px + 6.8 * u, py + 9.8 * u, 10.4 * u, 6.4 * u);
    c.fillStyle = '#e8c88a'; c.fillRect(px + 8.4 * u, py + 11.4 * u, 7 * u, 1 * u); c.fillRect(px + 8.4 * u, py + 13.4 * u, 5 * u, 1 * u);
  }
}
