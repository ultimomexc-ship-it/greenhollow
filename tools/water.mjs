/* node tools/water.mjs <out-prefix> [seed] [scenario]: screenshots of the realistic water (render/water-gl.ts) at three zooms, on the coast, at 11:00, and the time 10 frames take. */
import { launch, openGame, simulate } from '../tests/lib.mjs';
const out = process.argv[2], seed = process.argv[3] || 'tutorial', scen = process.argv[4] || 'hamlet';
const b = await launch(); const { page, errors } = await openGame(b, '/home/user/greenhollow/dist/index.html', { rng: 41, town: 'greenhollow-test', viewport: { width: 1280, height: 800 } });
const info = await page.evaluate(([seed, scen]) => { window.GH_WATERGL = true; window.GH_NOCARDS = true; newTown(seed, scen); buildStatic(); return { ok: WATER.ok, err: WATER.err, gl: GA.wgl }; }, [seed, scen]);
console.log(JSON.stringify(info));
for (const [i, z] of [[1, 2.2], [2, 1.2], [3, 0.6]]) {
  await page.evaluate(z => { const sh = shoreTiles.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)); const best = sh[Math.floor(sh.length * 0.6)];
    const P = game.player; P.tx = P.x = best.x - 3; P.ty = P.y = best.y; rebuildOcc(); cam.follow = false; cam.z = z; cam.x = best.x * TS - cam.cw / cam.z / 2; cam.y = best.y * TS - cam.ch / cam.z / 2; clampCam(); GA.boost = 50; game.time = Math.floor(game.time / 1440) * 1440 + 11 * 60;
    for (let k = 0; k < 4; k++) { window.__advance(400); render(performance.now(), 0.05, 11); } }, z);
  await page.locator('canvas#c').screenshot({ path: `${out}-${i}.png` });
}
const t0 = Date.now(); await page.evaluate(() => { for (let k = 0; k < 10; k++) { window.__advance(16); render(performance.now(), 0.016, 11); } }); console.log('10 frames ms', Date.now() - t0, 'errors', errors.slice(0, 3));
await b.close();
