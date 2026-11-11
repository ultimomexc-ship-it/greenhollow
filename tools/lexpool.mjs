
import { openGame, launch } from '../tests/lib.mjs';
const b = await launch();
const { page } = await openGame(b, new URL('../dist/index.html', import.meta.url).pathname, { rng: 41, town: 'x' });
const r = await page.evaluate(() => { const o = {}; for (const e of LEX) { if (e.pack !== 'island') continue; const k = e.act; (o[k] = o[k] || [0, 0, 0, 0]); const m = lxMarked(e.text), t = Object.keys(e.tags).length > 0; o[k][(t ? 2 : 0) + (m ? 1 : 0)]++; } return o; });
const top = process.argv.slice(2);
for (const k of Object.keys(r).filter(k => top.includes(k) || k.startsWith('life:'))) console.log(k.padEnd(26), 'untagged short/marked', r[k][0] + '/' + r[k][1], ' tagged short/marked', r[k][2] + '/' + r[k][3]);
await b.close();
