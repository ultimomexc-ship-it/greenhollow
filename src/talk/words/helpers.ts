/* Helpers for the words files (src/talk/words/): one place for the little functions that register lines. The words files come after every file that defines acts.
   lx (lexicon.ts) registers one line; lxi is the island voice's; LXP / LXI register a list of lines for one act in the plain / island voice; LXLP / LXLI are the same
   for the life lines (`life:<kind>`); kidl / kidi register a line only children say. */

/* The island voice (docs/talk-engine.md, 9.5): ordinary people calmly accepting an impossible situation. Dry, specific, understated; exact numbers; small odd remarks said as if normal;
   nobody raises their voice (no exclamation marks); questions are answered a little sideways. Used by blank and farming islands (`town.pack = 'island'`); anything it lacks falls back to the plain pack. */

const lxi = (act: string, text: string, tags?: any, requires?: string[]) => lx(act, 'island', text, tags, requires);
/* ---- how children talk (under twelve): short, direct, and about what a child is busy with ---- */
const kidl = (act: string, text: string, tags: any = {}) => {
  lx(act, 'plain', text, Object.assign({ age: 'child' }, tags));
};
const kidi = (act: string, text: string, tags: any = {}) => {
  lxi(act, text, Object.assign({ age: 'child' }, tags));
};
/* ---- more to say: the acts people use most needed the most lines ---- */
const LXP = (act: string, lines: string[], tags: any = {}) => {
  for (const t of lines) lx(act, 'plain', t, tags);
};
const LXI = (act: string, lines: string[], tags: any = {}) => {
  for (const t of lines) lxi(act, t, tags);
};
const LXLP = (kind: string, lines: string[]) => {
  for (const t of lines) lx('life:' + kind, 'plain', t);
};
const LXLI = (kind: string, lines: string[]) => {
  for (const t of lines) lxi('life:' + kind, t);
};
