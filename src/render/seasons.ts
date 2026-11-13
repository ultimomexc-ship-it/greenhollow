/* Seasons, the look only: buttons in the top bar (Spring, Summer, Autumn, Winter) repaint the grass, trees, bushes and the small plants from the
   season's palettes (`ART.setSeason`, painters.ts: green and blossom, the summer as it was, gold and red leaves, snow and bare branches). Nothing in the
   game changes and it is not saved; the ground chunks and the overview are rebaked (`buildStatic`). */
const SEASON_KINDS = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_LABEL = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
function seasonSet(k: string) {
  if (!ART.setSeason(k)) return;
  if (typeof town !== 'undefined' && town && typeof grid !== 'undefined' && grid && grid.length) buildStatic();
  if (typeof document !== 'undefined') document.querySelectorAll('[data-season]').forEach((b: any) => b.setAttribute('aria-pressed', b.dataset.season === k ? 'true' : 'false'));
}
// the overview (what shows at a distance and through the chunks' gaps) takes the season's grass and leaves
// @ts-expect-error -- deliberate patch
const _seasonTile = gaTileColour; gaTileColour = function (x, y) {
  const c = _seasonTile(x, y); if (c === '#79a845') return ART.seasonCol().grass; if (c === '#3f7a3a') return ART.seasonCol().tree; return c;
};
(function seasonButtons() {
  if (typeof document === 'undefined') return; const box = document.querySelector('header .controls'); if (!box) return;
  const seg = document.createElement('div'); seg.className = 'seg wxseg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Season (look only)');
  seg.innerHTML = '<span class="wxlab">Season</span>' + SEASON_KINDS.map(k => `<button type="button" data-season="${k}" aria-pressed="${k === 'summer'}">${SEASON_LABEL[k]}</button>`).join('');
  box.appendChild(seg); seg.addEventListener('click', (e: any) => { const b = e.target.closest('[data-season]'); if (b) seasonSet(b.dataset.season); });
})();
