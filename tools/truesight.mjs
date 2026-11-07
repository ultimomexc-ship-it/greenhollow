// TrueSight test ground: stamps the lab (tsLab in src/render/truesight.ts), stands the player at each scene's spot, places villagers,
// renders, and reports who the player can see. Screenshots go to --out (default: no screenshots).
//   node tools/truesight.mjs [--out=dir] [--zoom=2.2]
import { launch, openGame, simulate } from '../tests/lib.mjs';
import fs from 'node:fs';
import path from 'node:path';
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = arg('out', null), zoom = +arg('zoom', '2.2');
// [name, player at (lab coords), villagers: [x, y, should the player see them?, what they are], camera centre]
export const SCENES = [
  ['rooms: from room A, through the archway into B; the shut door hides C', [3, 3], [[9, 3, true, 'in B, in line with the archway'], [8, 1, false, 'in B, off to the side of the archway'], [15, 3, false, 'in C, behind the shut door'], [3, 1, true, 'in A with you']], [9, 3]],
  ['corridor: at the entrance, the first corner hides the rest', [2 + 22, 12], [[24, 9, true, 'up the first leg'], [30, 8, false, 'round the first corner'], [35, 4, false, 'round the second corner']], [30, 7]],
  ['corridor: at the first corner, the next leg opens up', [24, 8], [[30, 8, true, 'along the second leg'], [35, 8, true, 'at the far end of the leg'], [35, 4, false, 'round the second corner']], [30, 6]],
  ['window house: outside the back wall, a window lets you look in', [2, 10], [[2, 14, true, 'straight in through the window'], [6, 15, false, 'inside, not in line with a window'], [8, 13, false, 'inside, behind the wall between the windows']], [5, 13]],
  ['outdoors: trees do not hide anything, you see around them', [10, 22], [[16, 18, true, 'behind a tree'], [16, 23, true, 'in the open'], [4, 22, true, 'behind you, in the open']], [11, 21]],
  ['outdoors: behind the shed', [22, 22], [[33, 22, false, 'on the far side of the shed'], [28, 27, true, 'south of the shed, in the open']], [28, 22]],
];
export async function truesightRun({ file = new URL('../dist/index.html', import.meta.url).pathname, shots = out } = {}) {
  const browser = await launch(); const { page, errors } = await openGame(browser, file, { rng: 3, town: 'truesight-lab', viewport: { width: 1100, height: 760 } });
  await simulate(page, 12 * 60);
  const lab = await page.evaluate(() => { if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl)); const L = tsLab(); window.__lab = L; return L && { ox: L.ox, oy: L.oy }; });
  if (!lab) throw new Error('no room for the lab');
  const res = [];
  for (const [name, at, people, look] of SCENES) {
    const r = await page.evaluate(([at, people, look, zoom]) => {
      const L = window.__lab, P = game.player, others = npcs.filter(n => !n.dead && !n.player && n.age >= 16).slice(0, people.length);
      const put = (n, x, y) => { n.tx = n.x = L.ox + x; n.ty = n.y = L.oy + y; n.path = []; n.moving = false; n.pose = 'stand'; n.plan = [waitS(999, 'stand', 'Standing about')]; n.si = 0; n.slide = null; };
      put(P, at[0], at[1]); others.forEach((n, i) => put(n, people[i][0], people[i][1])); for (const n of npcs) if (!n.player && !others.includes(n) && Math.abs(n.x - L.ox - 20) < 26 && Math.abs(n.y - L.oy - 15) < 18) { n.tx = n.x = 2; n.ty = n.y = 2; }
      rebuildOcc(); cam.follow = false; cam.z = zoom; clampCam(); cam.x = (L.ox + look[0]) * TS - cam.cw / cam.z / 2; cam.y = (L.oy + look[1]) * TS - cam.ch / cam.z / 2; clampCam(); GA.boost = 50;
      for (let i = 0; i < 30; i++) { window.__advance(50); render(performance.now(), 0.016, (game.time % 1440) / 60); }
      const seen = others.map((n, i) => ({ who: people[i][3], want: people[i][2], got: tsSees(n.x, n.y) }));
      return { seen, ms: TSIGHT.ms, verts: TSIGHT.poly.length, png: document.getElementById('c').toDataURL('image/png') };
    }, [at, people, look, zoom]);
    if (shots) { fs.mkdirSync(shots, { recursive: true }); fs.writeFileSync(path.join(shots, res.length + 1 + '.png'), Buffer.from(r.png.split(',')[1], 'base64')); }
    res.push({ name, seen: r.seen, ms: r.ms, verts: r.verts });
  }
  // moving: a villager walks past the far side of the shed (seen, then hidden, then seen); the player walks up to a corridor corner (the view grows)
  const moves = await page.evaluate(() => {
    const L = window.__lab, P = game.player, w = npcs.find(n => !n.dead && !n.player && n.age >= 16);
    const put = (n, x, y) => { n.tx = n.x = L.ox + x; n.ty = n.y = L.oy + y; n.path = []; n.moving = false; n.slide = null; };
    const step = () => { rebuildOcc(); for (let i = 0; i < 3; i++) { window.__advance(50); render(performance.now(), 0.016, (game.time % 1440) / 60); } };
    const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
    put(P, 18, 22); cam.x = (L.ox + 26) * TS - cam.cw / cam.z / 2; cam.y = (L.oy + 22) * TS - cam.ch / cam.z / 2; clampCam(); const walk = []; for (let y = 15; y <= 28; y++) { put(w, 33, y); step(); walk.push(tsSees(w.x, w.y)); }
    const approach = []; put(w, 30, 8); for (let y = 12; y >= 8; y--) { put(P, 24, y); cam.x = (L.ox + 30) * TS - cam.cw / cam.z / 2; cam.y = (L.oy + 7) * TS - cam.ch / cam.z / 2; clampCam(); step(); approach.push({ area: Math.round(area(TSIGHT.poly)), sees: tsSees(w.x, w.y) }); }
    return { walk, approach };
  });
  // two walls touching only at a corner: a line exactly through that corner must not get through
  const diag = await page.evaluate(() => { const L = window.__lab; return { through: tsLine(L.ox + 38, L.oy + 26, L.ox + 42, L.oy + 20), beside: tsLine(L.ox + 38, L.oy + 26, L.ox + 44, L.oy + 26) }; });
  await browser.close();
  return { res, diag, moves, errors };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await truesightRun(); let bad = 0;
  for (const s of r.res) { console.log(`\n${s.name}  (${s.ms.toFixed(2)} ms, ${s.verts} polygon points)`); for (const p of s.seen) { const ok = p.want === p.got; if (!ok) bad++; console.log(`  ${ok ? 'ok ' : 'BAD'} ${p.got ? 'seen  ' : 'hidden'}  ${p.who}`); } }
  const w = r.moves.walk, hid = w.indexOf(false), back = w.lastIndexOf(false), okW = w[0] && hid > 0 && back < w.length - 1 && w[w.length - 1];
  console.log(`\nwalking past the shed: ${w.map(v => v ? 'o' : '.').join('')}  (o seen, . hidden) ${okW ? 'ok' : 'BAD'}`); if (!okW) bad++;
  const ap = r.moves.approach, okA = ap[ap.length - 1].area > ap[0].area && !ap[0].sees && ap[ap.length - 1].sees;
  console.log(`walking up to the corridor corner: visible area ${ap.map(a => a.area).join(' -> ')} tiles; the villager round the corner seen only at the corner: ${ap.map(a => a.sees ? 'o' : '.').join('')} ${okA ? 'ok' : 'BAD'}`); if (!okA) bad++;
  console.log(`\ndiagonal walls: a line through their touching corner is ${r.diag.through ? 'NOT blocked (BAD)' : 'blocked (ok)'}; a line beside them is ${r.diag.beside ? 'clear (ok)' : 'blocked (BAD)'}`);
  if (r.diag.through || !r.diag.beside) bad++;
  console.log(`\n${bad ? bad + ' wrong' : 'all as expected'}${r.errors.length ? '; page errors: ' + r.errors.slice(0, 3).join(' | ') : ''}`);
}
