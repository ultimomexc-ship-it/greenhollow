import { openGame, launch } from '../tests/lib.mjs';
const b = await launch();
const { page } = await openGame(b, new URL('../dist/index.html', import.meta.url).pathname, { rng: 41, town: 'x' });
const r = await page.evaluate(() => { const T = TALK_TOPICS(); const rep = new Set(); for (const id of Object.keys(ACTS)) for (const x of (ACTS[id].replies || [])) rep.add(x); return { topics: T.map(id => id + ':' + ACTS[id].kind), replies: [...rep].filter(x => ACTS[x]).map(id => id + ':' + ACTS[id].kind) }; });
console.log('TOPICS', r.topics.join(' ')); console.log('REPLIES', r.replies.join(' ')); await b.close();
