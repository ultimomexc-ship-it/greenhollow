import { chromium } from 'playwright';
const S = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 700 } });
await p.addInitScript(() => { window.GH_NOSAVE = true; window.GH_NOTUT = true; window.GH_NOCARDS = true; window.GH_NOSOUND = true; });
await p.goto('file:///home/user/greenhollow/dist/index.html'); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => { newTown('look1', 'hamlet'); const m = merchants.find(q => q.def === HAMLET_TRADER_DEF); const P = game.player; P.x = P.tx = m.front.x; P.y = P.ty = m.front.y + 1; cam.z = 3;
  return JSON.stringify({ n: merchants.length, post: !!m.post, tiles: m.post && m.post.tiles, serving: m.serving, open: typeof isOpen === 'function' && isOpen(m) }); }));
await p.waitForTimeout(1000); await p.locator('canvas').first().screenshot({ path: S + '/stall.png' }); await b.close();
