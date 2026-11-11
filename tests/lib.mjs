// Test harness: load a built game page in headless Chromium so that it runs deterministically,
// then drive the simulation directly (no frame loop) and read its state.
//
// Determinism: Math.random is replaced with a seeded generator, performance.now / Date.now with a
// fake clock that only moves when the harness says so, requestAnimationFrame is held (the harness
// steps the sim itself), and external requests (fonts) are blocked.
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
// Playwright and Chromium come pre-installed in the cloud container; elsewhere `npm i -D playwright`.
const { chromium } = require('playwright');

export async function launch() { return chromium.launch(); }

/** Open a game file. opts.rng: seed for Math.random; opts.town: town seed text; opts.live: keep the real frame loop. */
export async function openGame(browser, file, opts = {}) {
  const { rng = 1, town = 'greenhollow-test', live = false, viewport = { width: 1280, height: 800 } } = opts;
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.stack || e)));
  // (requests to the web are blocked on purpose, so their "Failed to load resource" messages are not errors)
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route(/^https?:/, r => r.abort());
  await page.addInitScript(() => { window.GH_NOSAVE = true; window.GH_KIT_LIMITED = true; window.GH_NOSOUND = true; window.GH_LIFE_STRICT = true; });   // (the tests never touch saved islands)
  if (!live) await page.addInitScript(seed => {
    let a = seed >>> 0;
    Math.random = function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let clock = 1000;
    performance.now = () => (clock += 0.001);
    Date.now = () => 1767225600000 + Math.floor(clock);
    window.__advance = ms => { clock += ms; };
    window.requestAnimationFrame = () => 0;
  }, rng);
  await page.goto(pathToFileURL(path.resolve(file)).href);
  await page.waitForFunction(() => typeof updateSim === 'function' && typeof town !== 'undefined' && town);
  if (!live) await page.evaluate(t => newTown(t), town);
  return { page, errors };
}

/**
 * Advance the simulation by `minutes` game minutes. Each 2-minute step is one "frame" that does what
 * the real frame loop does besides drawing: step the sim, show queued conversations, the supper
 * nudge, and handing an idle player's character back to the AI. The fake clock moves as it would at
 * the game's current speed (2x by default: 4 game minutes per real second).
 */
export async function simulate(page, minutes) {
  return page.evaluate(total => {
    const t0 = game.time; let left = total;
    while (left > 0) {
      const s = Math.min(left, 2); updateSim(s); left -= s;
      window.__advance(s / (state.rate * Math.max(1, state.speed)) * 1000);
      const now = performance.now(); drainEvents(now); mealNudge(); idleRelease(now);
    }
    return game.time - t0;
  }, minutes);
}

/** A fingerprint of everything the simulation holds (town, people, game), stable across runs. */
export async function fingerprint(page) {
  return page.evaluate(() => {
    let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0, n = 0;
    const mix = s => { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 + c, 0x5bd1e995) ^ (h2 >>> 13); } n += s.length; };
    const seen = new Map();
    const skip = v => typeof v === 'function' || (typeof Node !== 'undefined' && v instanceof Node) || (typeof ImageData !== 'undefined' && v instanceof ImageData)
      || (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D) || (typeof OffscreenCanvas !== 'undefined' && v instanceof OffscreenCanvas) || (typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap);
    const walk = (v, depth) => {
      if (v === null || v === undefined) { mix(String(v)); return; }
      const t = typeof v;
      if (t === 'number') { mix(Number.isInteger(v) ? String(v) : v.toPrecision(12)); return; }
      if (t === 'string' || t === 'boolean' || t === 'bigint') { mix(t[0] + String(v)); return; }
      if (skip(v) || t !== 'object') { mix('~'); return; }
      if (seen.has(v)) { mix('@' + seen.get(v)); return; }
      seen.set(v, seen.size);
      if (ArrayBuffer.isView(v)) { mix('T' + v.length); for (let i = 0; i < v.length; i++) mix(String(v[i])); return; }
      if (v instanceof Map) { mix('M'); for (const [k, x] of v) { walk(k, depth + 1); walk(x, depth + 1); } return; }
      if (v instanceof Set) { mix('S'); for (const x of v) walk(x, depth + 1); return; }
      if (Array.isArray(v)) { mix('['); for (const x of v) walk(x, depth + 1); mix(']'); return; }
      mix('{');
      for (const k of Object.keys(v)) { if (k === 'rt' || k === 'st' || k === 'lastKey' || k === 't0' || k === 'msgAt') continue; mix(k + ':'); walk(v[k], depth + 1); }
      mix('}');
    };
    walk({ game, town, npcs }, 0);
    return { hash: (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'), bytes: n, objects: seen.size };
  });
}

/** A readable summary of the town, for test assertions and reports. */
export async function summary(page) {
  return page.evaluate(() => ({
    day: Math.floor(game.time / 1440) + 1,
    time: game.time,
    population: npcs.filter(p => !p.dead).length,
    dead: npcs.filter(p => p.dead).length,
  }));
}
