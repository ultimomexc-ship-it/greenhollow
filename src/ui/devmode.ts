/* Developer mode: the menus round the map (speed, skip, weather, seasons, character, seeds, the side panels) are for building the game, not for playing it.
   Press X to show or hide them (kept in `gh.dev`). Without them the map fills the window, the game opens on the Islands list, and the button with the
   islands on it (top right, `#zisl`) brings the list back. Automated browsers (tests and tools: `navigator.webdriver`) start in developer mode. */
const DEV: any = { on: false };
function devSet(on: boolean, save?: boolean) {
  DEV.on = on; document.body.classList.toggle('play', !on);
  if (save) try { localStorage.setItem('gh.dev', on ? '1' : '0'); } catch (e) {}
  if (typeof canvas !== 'undefined' && canvas) canvas.style.height = '';
  if (typeof town !== 'undefined' && town && typeof sizeCanvas === 'function') { sizeCanvas(); requestAnimationFrame(() => sizeCanvas()); }
}
{
  let v: string | null = null; try { v = localStorage.getItem('gh.dev'); } catch (e) {}
  const auto = !!((window as any).GH_NOSAVE || (window as any).GH_DEV || (typeof navigator !== 'undefined' && navigator.webdriver));
  devSet(v === '1' || (v == null && auto));
}
window.addEventListener('keydown', (e: any) => {
  if ((e.key !== 'x' && e.key !== 'X') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  devSet(!DEV.on, true); devToast(DEV.on ? 'Developer mode: menus shown (X hides them)' : 'Developer mode off (X shows the menus)');
});
{ const b = document.getElementById('zisl'); if (b) b.addEventListener('click', () => { if (typeof isleShow === 'function') isleShow(); }); }
/** a short line in the middle of the map, for a moment */
function devToast(text: string) {
  const st = typeof canvas !== 'undefined' && canvas ? canvas.parentNode as any : null; if (!st) return;
  let d: any = document.getElementById('devtoast'); if (!d) { d = document.createElement('div'); d.id = 'devtoast'; d.className = 'devtoast'; st.appendChild(d); }
  d.textContent = text; d.hidden = false; clearTimeout(DEV.tt); DEV.tt = setTimeout(() => { d.hidden = true; }, 2200);
}
