// Short and marked lines per act and tag group: how many lines are one plain sentence, how many carry an aside (see the voice rule in CLAUDE.md).
//   node tools/lexpool.mjs [--pack=island|plain] [--deficits] act act ...      (no acts: every act)
//   --deficits lists the groups that have marked lines but fewer than three short ones
import { openGame, launch } from '../tests/lib.mjs';
const args = process.argv.slice(2), pack = (args.find(a => a.startsWith('--pack=')) || '--pack=island').slice(7), deficits = args.includes('--deficits'), acts = args.filter(a => !a.startsWith('--'));
const b = await launch();
const { page } = await openGame(b, new URL('../dist/index.html', import.meta.url).pathname, { rng: 41, town: 'x' });
const r = await page.evaluate(([pack, acts]) => { const o = {}; for (const e of LEX) { if (e.pack !== pack || (acts.length && !acts.includes(e.act) && !acts.some(a => a.endsWith('*') && e.act.startsWith(a.slice(0, -1))))) continue; const k = e.act + ' ' + JSON.stringify(Object.keys(e.tags || {}).sort().map(t => [t, e.tags[t]])); (o[k] = o[k] || [0, 0])[lxMarked(e.text) ? 1 : 0]++; } return o; }, [pack, acts]);
for (const [k, [short, marked]] of Object.entries(r).sort()) if (!deficits || (marked >= 1 && short < 3)) console.log(k.padEnd(60), 'short', short, 'marked', marked);
await b.close();
