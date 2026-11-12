// Prints every lexicon entry (act, pack, tags, requires, text), sorted, one per line: run it before and after moving words around and diff the two.
//   node tools/lexdump.mjs > /tmp/lex-before.txt
import { openGame, launch } from '../tests/lib.mjs';
const b = await launch();
const { page } = await openGame(b, new URL('../dist/index.html', import.meta.url).pathname, { rng: 41, town: 'x' });
const rows = await page.evaluate(() => LEX.map(e => [e.act, e.pack, JSON.stringify(Object.keys(e.tags || {}).sort().map(k => [k, e.tags[k]])), JSON.stringify(e.requires || []), e.text].join('\t')));
console.log(rows.sort().join('\n'));
console.error(rows.length + ' entries');
await b.close();
