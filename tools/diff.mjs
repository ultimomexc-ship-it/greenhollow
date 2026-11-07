// Visual regression: render two builds at the same fixed states and compare the canvas pixel by pixel.
//   node tools/diff.mjs base.html dist/index.html [--no-people]
// Prints, per view, how many pixels differ and by how much. --no-people hides villagers so only the world is compared.
import { launch, openGame, simulate } from '../tests/lib.mjs';
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).filter(x => !x.startsWith('--'));
const hide = process.argv.includes('--no-people'), save = process.argv.find(x => x.startsWith('--save='));
const views = [['far', 0.4, 0.5], ['mid', 0.8, 0.5], ['close', 1.3, 0.5], ['closer', 2.2, 0.5], ['night close', 1.3, 0.08], ['dusk mid', 0.8, 0.8]];
const browser = await launch();
const grab = async (file, v) => {
  const { page } = await openGame(browser, file, { rng: 5, town: 'diff' });
  await simulate(page, 9 * 60);
  const r = await page.evaluate(([name, z, frac, hide]) => {
    if (hide) npcs = [];
    const p = game.player || npcs[0]; cam.follow = false; cam.z = z; clampCam();
    if (p) { cam.x = p.x * TS - cam.cw / cam.z / 2; cam.y = p.y * TS - cam.ch / cam.z / 2; clampCam(); }
    GA.boost = 50; game.time = Math.floor(game.time / 1440) * 1440 + Math.round(frac * 1440);
    for (let i = 0; i < 40; i++) { window.__advance(50); render(performance.now(), 0.016, (game.time % 1440) / 60); }
    const c = document.getElementById('c'); return { w: c.width, h: c.height, url: c.toDataURL('image/png') };
  }, [v[0], v[1], v[2], hide]);
  await page.close(); return r;
};
let worst = 0;
for (const v of views) {
  const ra = await grab(a, v), rb = await grab(b, v);
  const cmp = await (async () => { const pg = await browser.newPage(); const o = await pg.evaluate(async ([x, y]) => {
    const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const [ia, ib] = await Promise.all([load(x), load(y)]); const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data; g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, mx = 0, sum = 0; for (let i = 0; i < da.length; i += 4) { const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])); if (d > 0) { n++; sum += d; if (d > mx) mx = d; } }
    return { n, mx, mean: n ? sum / n : 0, px: da.length / 4 };
  }, [ra.url, rb.url]); await pg.close(); return o; })();
  worst = Math.max(worst, cmp.n / cmp.px);
  console.log(`${v[0].padEnd(12)} zoom ${v[1]}: ${cmp.n} of ${cmp.px} pixels differ (${(100 * cmp.n / cmp.px).toFixed(3)}%)  max channel diff ${cmp.mx}  mean ${cmp.mean.toFixed(1)}`);
  if (save) { const t = save.slice(7); fs.writeFileSync(`${t}-${v[0].replace(' ', '_')}-a.png`, Buffer.from(ra.url.split(',')[1], 'base64')); fs.writeFileSync(`${t}-${v[0].replace(' ', '_')}-b.png`, Buffer.from(rb.url.split(',')[1], 'base64')); }
}
await browser.close();
