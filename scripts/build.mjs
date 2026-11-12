// Build: join src/ into one self-contained dist/index.html (the file that gets published).
//
// The game's .ts files are classic scripts that share one global scope, in the order listed in
// src/order.json (later files may patch functions defined by earlier ones). They are joined in that
// order, the types are stripped by esbuild, and the result is inlined into src/index.html with the CSS.
//
//   node scripts/build.mjs            -> dist/index.html
//   node scripts/build.mjs --minify   -> smaller output
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const minify = process.argv.includes('--minify');

const order = JSON.parse(fs.readFileSync(path.join(src, 'order.json'), 'utf8'));
const onDisk = fs.readdirSync(src, { recursive: true }).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts')).map(f => f.split(path.sep).join('/'));
const missing = order.filter(f => !onDisk.includes(f)), unlisted = onDisk.filter(f => !order.includes(f));
if (missing.length) throw new Error('src/order.json lists files that do not exist: ' + missing.join(', '));
if (unlisted.length) throw new Error('these .ts files are not in src/order.json, so they would not be built: ' + unlisted.join(', '));

// A `// comment` in the middle of a very long line silently comments out the code after it (it has happened six times).
// The talk engine and its neighbours are formatted one statement per line, so there a line over 240 characters that has code
// before a `//` comment is the shape of that accident. Fail the build and say where.
const GUARDED = f => f.startsWith('talk/') || f === 'life2/smalllife.ts' || f === 'life2/meddle.ts';
const suspect = [];
for (const f of order.filter(GUARDED)) {
  fs.readFileSync(path.join(src, f), 'utf8').split('\n').forEach((l, i) => {
    if (l.length > 240 && /[;{}]\s+\/\/\s/.test(l)) suspect.push(`  src/${f}:${i + 1}: ${l.slice(0, 100)}...`);
  });
}
if (suspect.length) throw new Error('a // comment inside a long line may be hiding code after it (put the comment on the line above, or split the line):\n' + suspect.join('\n'));

// Game code reports what happened as data (lfEmit / LIFE.emit); only the lexicon has words (the `ev:<kind>` lines). A `text:` in an lfEmit call is an English sentence in game code.
const texty = [];
for (const f of order) { const t = fs.readFileSync(path.join(src, f), 'utf8'), m = t.match(/lfEmit\((?:[^;]|\n)*?[{,\s]text\s*:/); if (m && !t.slice(0, m.index).split('\n').pop().trim().startsWith('//') && !f.endsWith('core.ts')) texty.push('  src/' + f + ': ' + m[0].slice(0, 60).replace(/\s+/g, ' ')); }
if (texty.length) throw new Error('lfEmit calls must not carry a `text:` sentence (add an `ev:<kind>` line to the words files instead):\n' + texty.join('\n'));

const joined = order.map(f => `// ---- src/${f} ----\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
let js;
try {
  js = transformSync(joined, { loader: 'ts', target: 'es2022', minify, legalComments: 'none', sourcefile: 'greenhollow.ts' }).code;
} catch (e) {
  // map an error in the joined text back to the source file and line
  const starts = []; let line = 1;
  for (const f of order) { starts.push([line, f]); line += 1 + fs.readFileSync(path.join(src, f), 'utf8').split('\n').length; }
  for (const err of e.errors || []) { const l = err.location && err.location.line; if (!l) continue;
    const [s, f] = starts.filter(([s]) => s <= l).pop(); console.error(`  in src/${f}:${l - s}: ${err.text}`); }
  throw e;
}
if (/<\/script/i.test(js)) throw new Error('the built script contains "</script", which would end the inline <script> early');

const css = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8')
  .replace('/*@@CSS@@*/', () => css)
  .replace('/*@@JS@@*/', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB  (${order.length} source files${minify ? ', minified' : ''})`);
