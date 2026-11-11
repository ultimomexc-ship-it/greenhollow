import { openGame, launch } from '../tests/lib.mjs';
const b = await launch();
const { page } = await openGame(b, new URL('../dist/index.html', import.meta.url).pathname, { rng: 41, town: 'x' });
const acts = process.argv.slice(2);
const r = await page.evaluate((acts) => LEX.filter(e => e.pack === 'island' && acts.includes(e.act)).map(e => e.act + ' ' + JSON.stringify(e.tags) + ' ' + e.text), acts);
console.log(r.join('\n')); await b.close();
