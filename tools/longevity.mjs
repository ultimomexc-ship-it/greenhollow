// Longevity and readability of conversation: play many in-game days, talk to villagers every day like a player would,
// and measure what comes out.
//
//   node tools/longevity.mjs [days] [talksPerDay] [turns] [seed] [--json=out.json] [--md=out.md]
//
// Freshness: how much of what people say on day N has never been said before; which sentences (as templates, with names
// and numbers blanked) come up again and again; how varied the topics are.
// Readability: words per turn, sentence length, a reading-ease score, and hard errors (unfilled placeholders, "undefined",
// doubled words, a sentence starting in lower case, banned filler).
import fs from 'node:fs';
import { launch, openGame, simulate } from '../tests/lib.mjs';

export async function playDays({ days = 30, talksPerDay = 6, turns = 10, seed = 'longevity', rng = 7, file = null, collect = false } = {}) {
  const browser = await launch();
  const { page, errors } = await openGame(browser, file || new URL('../dist/index.html', import.meta.url).pathname, { rng, town: seed });
  await page.evaluate((collect) => {
    if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl));
    // trace which topics are told (without changing the game)
    // optionally collect everything else villagers say: the overheard list and speech bubbles (for tools/lintalk.mjs)
    window.__heard = []; window.__shouts = []; window.__collect = collect;
    if (window.__collect) { const a0 = addChatter; addChatter = function (ev) { window.__heard.push({ day: Math.floor(game.time / 1440), topic: ev.topic || '', lines: ev.lines.map(l => ({ who: l.who.first, id: l.who.id, age: l.who.age, text: l.text })), to: [ev.a && ev.a.id, ev.b && ev.b.id] }); return a0.apply(this, arguments); };
      const s0 = lfShout; lfShout = function (n, t) { window.__shouts.push({ day: Math.floor(game.time / 1440), who: n.first, id: n.id, age: n.age, text: t }); return s0.apply(this, arguments); }; }
    window.__trace = []; const t0 = cvTell; cvTell = function (c, t, layer) { const u = t0.apply(this, arguments); if (u) window.__trace.push({ kind: t.kind, key: t.key, layer, day: Math.floor(game.time / 1440) }); return u; };
  }, collect);
  const rows = [];
  for (let d = 0; d < days; d++) {
    for (const hour of [10, 18]) {
      const now = await page.evaluate(() => game.time); const target = Math.floor(now / 1440) * 1440 + hour * 60; if (target > now) await simulate(page, target - now);
      const r = await page.evaluate(([n, turns]) => {
        if (!game.player) startPlaying(canControl(byId(game.steer)) ? byId(game.steer) : npcs.find(canControl)); const out = [], P = game.player; if (!P) { out.push({ err: 'no player: ' + JSON.stringify({ steer: game.steer, dead: (byId(game.steer) || {}).dead, succession: !!town.succession }) }); return out; }
        // a player who looks after themselves between conversations (the harness does not walk them to meals)
        P.hunger = Math.min(P.hunger, 20); P.energy = Math.max(P.energy || 0, 70); if (P.bladder != null) P.bladder = Math.min(P.bladder, 20); if (P.player) { P.player.sleeping = false; P.pose = 'stand'; }
        const cand = npcs.filter(q => q !== P && !q.dead && !q.infant && q.age >= 8 && q.pose !== 'sleep'); for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
        for (const o of cand.slice(0, n)) {
          try { openTalk(o); } catch (e) { out.push({ err: String(e) }); continue; }
          for (let k = 0; k < turns; k++) {
            const t = document.getElementById('talk'); if (!t || t.hidden) break;
            const say = t.querySelector('.ta').innerText, opts = [...t.querySelectorAll('[data-k]')].map(b => b.innerText.replace(/^\d+\s*/, '').trim());
            const row = { day: Math.floor(game.time / 1440), npc: o.id, me: P.id, arch: cvVoice(o).arch, turn: k, say, opts }; out.push(row);
            if (!opts.length) break; const pick = Math.floor(Math.random() * opts.length); row.picked = opts[pick]; [...t.querySelectorAll('[data-k]')][pick].click();
          }
          if (talkUI.o) closeTalk();
        }
        if (typeof stopPlaying === 'function') stopPlaying();   // back to the AI until the next session
        return out;
      }, [Math.ceil(talksPerDay / 2), turns]);
      rows.push(...r); if (process.env.LONG_DEBUG) console.error('day', d, 'hour', hour, 'rows', r.length, JSON.stringify(await page.evaluate(() => { const P = game.player; return P ? { jail: !!P.jail, dead: P.dead, talk: !!talkUI.o, sleeping: P.player && P.player.sleeping, focus: typeof focusOn === 'function' && focusOn(), busy: typeof eventsBusy === 'function' && eventsBusy(), act: P.player && P.player.act && P.player.act.text } : 'no player'; })));
    }
    const now = await page.evaluate(() => game.time); const next = (Math.floor(now / 1440) + 1) * 1440 + 6 * 60; await simulate(page, next - now);
  }
  const trace = await page.evaluate(() => window.__trace), names = await page.evaluate(() => npcs.map(n => n.first).concat(npcs.map(n => n.surname || '')).filter(Boolean));
  const world = collect ? await page.evaluate(() => ({ heard: window.__heard, shouts: window.__shouts, people: npcs.map(n => ({ id: n.id, first: n.first, surname: n.surname || '', full: nameOf(n), age: n.age, infant: !!n.infant, female: !!n.female })), player: game.player ? game.player.id : (byId(game.steer) || {}).id })) : null;
  await browser.close();
  return { rows, trace, names, errors, world };
}

/* ---------------- measuring ---------------- */
const sentences = s => s.replace(/\*[^*]+\*/g, ' ').split(/(?<=[.!?…])\s+(?=[A-Z"“'(*—])/).map(x => x.trim()).filter(x => x.length > 1);
function templ(s, names) { let t = s; for (const n of names) if (n.length > 2) t = t.replace(new RegExp('\\b' + n + '\\b', 'g'), 'NAME'); return t.replace(/\d+/g, '#').replace(/\b(he|she|him|her|his|hers)\b/gi, 'PRON').replace(/(NAME[ ,]*)+/g, 'NAME '); }
const syll = w => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); const m = w.match(/[aeiouy]{1,2}/g); return Math.max(1, m ? m.length : 1); };
const HARD = [[/\{[a-z]+\}/i, 'unfilled placeholder'], [/\bundefined\b|\bnull\b|\bNaN\b|\[object/, 'code leaking into text'], [/\b(\w+) \1\b/i, 'doubled word'], [/ {2,}/, 'double space'], [/\s[,!?]|\s\.(?!\.\.)/, 'space before punctuation'], [/[.!?] [a-z]/, 'sentence starts in lower case'], [/(?<!\.)\.\.(?!\.)/, 'double full stop'],
  [/that'?s interesting|i see what you mean|it'?s complicated|anything else (you'?d like|you want) to know|that'?s life in the village/i, 'banned filler']];
const isPron = w => /^(he|she|him|her|his|hers|they|them|their)$/i.test(w);

export function measure({ rows, trace, names }) {
  const npcLines = rows.filter(r => r.say !== undefined), days = [...new Set(npcLines.map(r => r.day))].sort((a, b) => a - b);
  const seenRaw = new Set(), seenT = new Set(), perDay = [], tCount = new Map(), sCount = new Map();
  for (const d of days) {
    const lines = npcLines.filter(r => r.day === d), sents = lines.flatMap(r => sentences(r.say)); let novelRaw = 0, novelT = 0;
    for (const s of sents) { const t = templ(s, names); if (!seenRaw.has(s)) novelRaw++; if (!seenT.has(t)) novelT++; seenRaw.add(s); seenT.add(t); tCount.set(t, (tCount.get(t) || 0) + 1); sCount.set(s, (sCount.get(s) || 0) + 1); }
    perDay.push({ day: d, turns: lines.length, sentences: sents.length, novelRaw: sents.length ? novelRaw / sents.length : 0, novelTemplate: sents.length ? novelT / sents.length : 0 });
  }
  const totalS = [...tCount.values()].reduce((a, b) => a + b, 0), topT = [...tCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([t, n]) => ({ t, n, share: n / totalS }));
  const opts = rows.flatMap(r => r.opts || []), optT = new Map(); for (const o of opts) { const t = templ(o, names); optT.set(t, (optT.get(t) || 0) + 1); }
  const topOpt = [...optT.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t, n]) => ({ t, n, share: n / opts.length }));
  // readability
  const words = npcLines.map(r => r.say.split(/\s+/).filter(Boolean).length).sort((a, b) => a - b), allS = npcLines.flatMap(r => sentences(r.say));
  const sw = allS.map(s => s.split(/\s+/).filter(Boolean)), totalW = sw.reduce((a, w) => a + w.length, 0), totalSyl = sw.reduce((a, w) => a + w.reduce((b, x) => b + syll(x), 0), 0);
  const flesch = 206.835 - 1.015 * (totalW / Math.max(1, sw.length)) - 84.6 * (totalSyl / Math.max(1, totalW));
  const longS = sw.filter(w => w.length > 25).length / Math.max(1, sw.length), q = p => words[Math.min(words.length - 1, Math.floor(words.length * p))] || 0;
  const hard = []; for (const r of rows) for (const text of [r.say, ...(r.opts || [])].filter(Boolean)) for (const [re, what] of HARD) if (re.test(text)) hard.push({ what, text: text.slice(0, 140) });
  // conversation shape
  const convs = new Map(); for (const r of npcLines) { const k = r.day + ':' + r.npc + ':' + Math.floor(rows.indexOf(r) / 1000); if (r.turn === 0) convs.set(k + ':' + rows.indexOf(r), [r]); else { const last = [...convs.values()].pop(); if (last) last.push(r); } }
  const lens = [...convs.values()].map(c => c.length), deadEnds = [...convs.values()].filter(c => c.length && c[c.length - 1].opts && c[c.length - 1].opts.length === 0 && c.length < 3).length;
  const kinds = {}; for (const t of trace) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
  // new information: a topic told at a layer the player had never heard (from anyone, for village-wide facts) that day
  const heard = new Set(), info = {}; for (const t of trace) { const k = t.key + '@' + t.layer, d = t.day; info[d] = info[d] || { told: 0, fresh: 0 }; info[d].told++; if (!heard.has(k)) { info[d].fresh++; heard.add(k); } }
  for (const d of perDay) { const x = info[d.day] || { told: 0, fresh: 0 }; d.newInfo = x.told ? x.fresh / x.told : 0; d.newFacts = x.fresh; }
  const keys = new Map(); for (const t of trace) if (t.layer === 0) keys.set(t.key, (keys.get(t.key) || 0) + 1);
  const overTold = [...keys.entries()].filter(([, n]) => n >= 6).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { perDay, topTemplates: topT, topOptions: topOpt, uniqueTemplates: seenT.size, totalSentences: totalS,
    readability: { turns: npcLines.length, wordsPerTurn: { median: q(0.5), p90: q(0.9), max: words[words.length - 1] || 0 }, wordsPerSentence: +(totalW / Math.max(1, sw.length)).toFixed(1), longSentenceShare: +longS.toFixed(3), fleschReadingEase: +flesch.toFixed(1) },
    hardErrors: hard, conversations: { count: lens.length, meanTurns: +(lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length)).toFixed(1), shortDeadEnds: deadEnds }, topicKinds: kinds, overToldTopics: overTold };
}

export function report(m, label = '') {
  const pct = x => (100 * x).toFixed(0) + '%', L = [];
  L.push(`# Conversation longevity and readability${label ? ' — ' + label : ''}`, '');
  L.push(`Sentences: ${m.totalSentences}, distinct templates: ${m.uniqueTemplates} (${pct(m.uniqueTemplates / Math.max(1, m.totalSentences))} of all sentences)`);
  L.push(`Conversations: ${m.conversations.count}, mean ${m.conversations.meanTurns} turns, short dead ends: ${m.conversations.shortDeadEnds}`, '');
  L.push('## Freshness by day (share of sentences never heard before)', '', '| day | turns | new (exact) | new (template) | new facts | facts new to you |', '|---|---|---|---|---|---|');
  for (const d of m.perDay) L.push(`| ${d.day} | ${d.turns} | ${pct(d.novelRaw)} | ${pct(d.novelTemplate)} | ${d.newFacts} | ${pct(d.newInfo)} |`);
  L.push('', '## Most repeated sentences (templates)', ''); for (const t of m.topTemplates.slice(0, 15)) L.push(`- ${t.n}× (${pct(t.share)}) ${t.t}`);
  L.push('', '## Most repeated player options', ''); for (const t of m.topOptions.slice(0, 10)) L.push(`- ${t.n}× (${pct(t.share)}) ${t.t}`);
  L.push('', '## Readability', '', `- words per turn: median ${m.readability.wordsPerTurn.median}, 90th percentile ${m.readability.wordsPerTurn.p90}, longest ${m.readability.wordsPerTurn.max}`,
    `- words per sentence: ${m.readability.wordsPerSentence}; sentences over 25 words: ${pct(m.readability.longSentenceShare)}`, `- Flesch reading ease: ${m.readability.fleschReadingEase} (60-80 is plain English; higher is easier)`);
  L.push('', `## Hard errors: ${m.hardErrors.length}`, ''); const byWhat = {}; for (const h of m.hardErrors) (byWhat[h.what] = byWhat[h.what] || []).push(h.text); for (const k in byWhat) L.push(`- ${k}: ${byWhat[k].length}, e.g. "${byWhat[k][0]}"`);
  L.push('', '## What people talk about (topics told, by kind)', '', Object.entries(m.topicKinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
  if (m.overToldTopics.length) L.push('', 'Told 6+ times: ' + m.overToldTopics.map(([k, n]) => `${k} (${n})`).join(', '));
  return L.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2).filter(x => !x.startsWith('--')), flag = k => (process.argv.find(x => x.startsWith('--' + k + '=')) || '').split('=')[1];
  const t0 = Date.now(), data = await playDays({ days: +(a[0] || 30), talksPerDay: +(a[1] || 6), turns: +(a[2] || 10), seed: a[3] || 'longevity', file: flag('file') || null });
  const m = measure(data), md = report(m, `${a[0] || 30} days, seed ${a[3] || 'longevity'}`);
  console.log(md); console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s${data.errors.length ? '; page errors: ' + data.errors.slice(0, 3).join(' | ') : ''})`);
  if (flag('json')) fs.writeFileSync(flag('json'), JSON.stringify({ m, rows: data.rows }, null, 1)); if (flag('md')) fs.writeFileSync(flag('md'), md);
}
