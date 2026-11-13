/* Dress-up: name and dress the villager you steer, with the art the game already has (render/main.ts gaSpec, ART.drawDoll). A Character button
   in the top bar opens a panel: a big live preview on the left (turn it round, let it walk), the name, and tabs on the right: Body (woman or
   man, skin), Hair (style, colour, beard), Face (eyes, eye colour, brows, nose, mouth, freckles, blush, spectacles), Clothes (shirt, pattern,
   its colour, trousers, a robe) and Hat (none or one of the hats, and its colour). Every choice is a small picture drawn by the same doll code.
   Nothing changes until Save: then the person's own fields are set (n.first, n.surname, n.female, n.skin, n.hair0/hair, n.look, n.shirt, n.robe,
   n.hat, n.hatCol, n.faceLook) and `n.ownLook` keeps work clothes from overriding what you chose. */
const DRESS: any = { open: false, draft: null, tab: 'body', dir: 0, walk: false, raf: 0 };
const DRESS_TABS = [['body', 'Body'], ['hair', 'Hair'], ['face', 'Face'], ['clothes', 'Clothes'], ['hat', 'Hat']];
const DRESS_HATCOLS = ['#c8a65a', '#8a5a34', '#4a6fa5', '#a8493f', '#3f8a6a', '#6a6a6a', '#e8e0d0', '#2a2a2a', '#8a5aa5', '#c0953a'];
const DRESS_DIRS = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }];
const dressCap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** the draft: everything the panel can change, read from the person */
function dressDraft(n: any): any {
  const L = n.look || assignLook(n), sp = gaSpec(n, performance.now());
  return { first: n.first || '', surname: n.surname || '', female: !!n.female, skin: n.skin, hair: n.hair0 || n.hair, hs: L.hs, beard: L.beard || null, shirt: n.shirt, pat: L.pat || 'plain', acc: L.acc || n.shirt, pants: L.pants, robe: !!n.robe,
    hat: n.ownLook ? (L.hatOn ? n.hat : 'none') : (sp.hatOn ? sp.hat : 'none'), hatCol: (n.ownLook ? n.hatCol : sp.hatCol) || DRESS_HATCOLS[0], face: Object.assign({}, ART.lookOf(sp)) };
}
/** a doll spec from the draft (or the draft with one thing changed), facing dir, standing or walking */
function dressSpec(n: any, d: any, dir: any, walk: boolean): any {
  const sp = Object.assign({}, gaSpec(n, performance.now()));
  Object.assign(sp, { female: d.female, skin: d.skin, hair: d.hair, hs: d.hs, beard: d.female ? null : d.beard, shirt: d.shirt, pat: d.pat, acc: d.acc, pants: d.pants, robe: d.robe, apron: false,
    hat: d.hat === 'none' ? 'none' : d.hat, hatCol: d.hatCol, hatOn: d.hat !== 'none', look: d.face, face: dir, pose: walk ? 'walk' : 'stand', moving: walk, tool: null, hold: null, wave: false, mourning: false, dress: null });
  return sp;
}
/** draw a doll into a canvas, centred, k = game pixels to canvas pixels; crop 'head' frames the head and shoulders */
function dressDraw(cv: any, sp: any, k: number, crop?: string, T = 0) {
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = true;
  const ox = cv.width / 2 - 12 * k, oy = crop === 'face' ? 2 + 1.5 * k : crop === 'head' ? 1 + 7 * k : cv.height - 25.5 * k;   // ('face': a close-up of the head, for faces and hair)   // (the head view shows game rows -7 to 14: a tall hat fits; the whole figure stands two rows above the bottom)
  g.translate(ox, oy); g.scale(k, k); try { ART.drawDoll(g, sp, 0, 0, 1, T); } catch (e) { /* (a missing layer never breaks the panel) */ }
}

function dressOpen() {
  const n = game.player; if (!n) return; DRESS.n = n; DRESS.draft = dressDraft(n); DRESS.open = true; DRESS.dir = 0; DRESS.walk = false;
  let el = document.getElementById('dressup'); if (!el) { el = document.createElement('div'); el.id = 'dressup'; document.body.appendChild(el); }
  el.innerHTML = `<div class="dsveil"></div><div class="dsbox" role="dialog" aria-label="Your character">
    <div class="dsleft"><canvas id="dsprev" width="300" height="360"></canvas>
      <div class="dsturn"><button type="button" data-dturn="-1" title="Turn left">&#x27F2;</button><button type="button" data-dwalk="1" class="dswalk">Walk</button><button type="button" data-dturn="1" title="Turn right">&#x27F3;</button></div>
      <div class="dsnameshow" id="dsnameshow"></div></div>
    <div class="dsright"><h2>Your character</h2>
      <div class="dsname"><label>First name<input id="dsfirst" maxlength="16" autocomplete="off" spellcheck="false"></label><label>Family name<input id="dssur" maxlength="18" autocomplete="off" spellcheck="false"></label></div>
      <div class="dstabs">${DRESS_TABS.map(([k, t]) => `<button type="button" data-dtab="${k}">${t}</button>`).join('')}</div>
      <div class="dsbody" id="dsbody"></div>
      <div class="dsfoot"><button type="button" class="btn" data-dact="random">Surprise me</button><span></span><button type="button" class="btn" data-dact="cancel">Cancel</button><button type="button" class="btn primary" data-dact="save">Save</button></div>
    </div></div>`;
  el.hidden = false;
  const f: any = document.getElementById('dsfirst'), s: any = document.getElementById('dssur'); f.value = DRESS.draft.first; s.value = DRESS.draft.surname;
  f.oninput = () => { DRESS.draft.first = f.value.trim(); dressNameShow(); }; s.oninput = () => { DRESS.draft.surname = s.value.trim(); dressNameShow(); };
  el.onkeydown = (e: any) => { e.stopPropagation(); if (e.key === 'Escape') dressClose(false); };   // (typing a name never moves you or opens build mode)
  el.onkeyup = (e: any) => e.stopPropagation();
  el.onclick = (e: any) => {
    const t = e.target.closest('button'); if (!t) { if (e.target.classList.contains('dsveil')) dressClose(false); return; }
    if (t.dataset.dtab) { DRESS.tab = t.dataset.dtab; dressRender(); }
    else if (t.dataset.dturn) DRESS.dir = (DRESS.dir + Number(t.dataset.dturn) + 4) % 4;
    else if (t.dataset.dwalk) { DRESS.walk = !DRESS.walk; t.classList.toggle('on', DRESS.walk); }
    else if (t.dataset.dset) { const [k, v] = t.dataset.dset.split('='); dressSetVal(k, v); dressRender(); }
    else if (t.dataset.dact === 'random') { dressRandom(); dressRender(); }
    else if (t.dataset.dact === 'cancel') dressClose(false);
    else if (t.dataset.dact === 'save') dressClose(true);
  };
  dressRender(); dressNameShow();
  const loop = (now: number) => { if (!DRESS.open) return; const cv = document.getElementById('dsprev'); if (cv) dressDraw(cv, dressSpec(DRESS.n, DRESS.draft, DRESS_DIRS[DRESS.dir], DRESS.walk), 9, undefined, now / 1000); DRESS.raf = requestAnimationFrame(loop); };
  DRESS.raf = requestAnimationFrame(loop);
}
function dressNameShow() { const e = document.getElementById('dsnameshow'); if (e) e.textContent = [DRESS.draft.first, DRESS.draft.surname].filter(Boolean).join(' ') || 'Nameless'; }
/** one choice: 'face.eyes=round' sets inside the face, '#rrggbb' colours stay strings, 'true'/'false' are booleans */
function dressSetVal(k: string, v: string) {
  const d = DRESS.draft, val: any = v === 'true' ? true : v === 'false' ? false : v === 'null' ? null : v;
  if (k.startsWith('face.')) d.face[k.slice(5)] = k === 'face.blush' ? Number(v) : val; else d[k] = val;
  if (k === 'female' && val && d.beard) d.beard = null;
}
function dressRandom() {
  const P = ART.PARTS, pk = (a: any[]) => a[Math.floor(Math.random() * a.length)], d = DRESS.draft;
  Object.assign(d, { skin: pk(SKINS), hair: pk(HAIRS), hs: pk(d.female ? HS_F : HS_M), beard: !d.female && Math.random() < 0.5 ? pk(P.BEARDS) : null, shirt: pk(SHIRTS), pat: pk(PATTERNS), acc: pk(SHIRTS), pants: pk(PANTS),
    hat: Math.random() < 0.4 ? pk(P.HATS) : 'none', hatCol: pk(DRESS_HATCOLS) });
  Object.assign(d.face, { eyes: pk(P.EYES), iris: pk(P.IRIS), brow: pk(P.BROWS), nose: pk(P.NOSES), mouth: pk(P.MOUTHS), freckles: Math.random() < 0.25 });
}

/** the right side: the chosen tab's choices, each a picture of you with that one thing changed (or a colour swatch) */
function dressRender() {
  const b = document.getElementById('dsbody'), d = DRESS.draft, P = ART.PARTS; if (!b) return;
  document.querySelectorAll('[data-dtab]').forEach((x: any) => x.classList.toggle('on', x.dataset.dtab === DRESS.tab));
  const pics: any[] = [];   // (canvases to draw once the HTML is in)
  const pic = (key: string, val: any, label: string, change: any, crop?: string) => { const on = String(key.startsWith('face.') ? d.face[key.slice(5)] : d[key]) === String(val); pics.push({ id: 'dsp' + pics.length, change, crop });
    return `<button type="button" class="dspick${on ? ' on' : ''}" data-dset="${key}=${val}" title="${esc(label)}"><canvas id="dsp${pics.length - 1}" width="64" height="64"></canvas><span>${esc(label)}</span></button>`; };
  const sw = (key: string, cols: string[]) => `<div class="dssw">${cols.map(c => `<button type="button" class="dsdot${String(d[key]) === c ? ' on' : ''}" data-dset="${key}=${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>`;
  const row = (t: string, inner: string) => `<div class="dsrow"><h3>${t}</h3>${inner}</div>`;
  const grid = (items: string[]) => `<div class="dsgrid">${items.join('')}</div>`;
  let h = '';
  if (DRESS.tab === 'body') h = row('Who', grid([pic('female', 'true', 'Woman', { female: true, beard: null, hs: HS_F.includes(d.hs) ? d.hs : 'long' }), pic('female', 'false', 'Man', { female: false, hs: HS_M.includes(d.hs) ? d.hs : 'short' })])) + row('Skin', sw('skin', SKINS));
  else if (DRESS.tab === 'hair') h = row('Style', grid(P.HSTYLES.map((s: string) => pic('hs', s, dressCap(s), { hs: s, hat: 'none' }, 'face')))) + row('Colour', sw('hair', HAIRS.concat(['#b8b8b8', '#e8e4dc'])))
    + (d.female ? '' : row('Beard', grid([pic('beard', 'null', 'None', { beard: null, hat: 'none' }, 'face')].concat(P.BEARDS.map((s: string) => pic('beard', s, dressCap(s), { beard: s, hat: 'none' }, 'face'))))));
  else if (DRESS.tab === 'face') {
    const fp = (part: string, list: string[], t: string) => row(t, grid(list.map(v => pic('face.' + part, v, dressCap(v), { face: Object.assign({}, d.face, { [part]: v }), hat: 'none' }, 'face'))));
    h = fp('eyes', P.EYES, 'Eyes') + fp('iris', P.IRIS, 'Eye colour') + fp('brow', P.BROWS, 'Brows') + fp('nose', P.NOSES, 'Nose') + fp('mouth', P.MOUTHS, 'Mouth')
      + row('Extras', grid([pic('face.freckles', d.face.freckles ? 'false' : 'true', d.face.freckles ? 'No freckles' : 'Freckles', { face: Object.assign({}, d.face, { freckles: !d.face.freckles }) }, 'face'),
        pic('face.glasses', d.face.glasses ? 'false' : 'true', d.face.glasses ? 'No spectacles' : 'Spectacles', { face: Object.assign({}, d.face, { glasses: !d.face.glasses }) }, 'face'),
        pic('face.blush', d.face.blush > 0.55 ? '0.3' : '0.8', d.face.blush > 0.55 ? 'Less blush' : 'Rosy cheeks', { face: Object.assign({}, d.face, { blush: d.face.blush > 0.55 ? 0.3 : 0.8 }) }, 'face')]));
  }
  else if (DRESS.tab === 'clothes') h = row('Shirt', sw('shirt', SHIRTS)) + row('Pattern', grid(['plain'].concat(P.PATS).map((s: string) => pic('pat', s, dressCap(s), { pat: s })))) + (d.pat !== 'plain' ? row('Pattern colour', sw('acc', SHIRTS)) : '')
    + row('Trousers', sw('pants', PANTS)) + row('Length', grid([pic('robe', 'false', 'Tunic', { robe: false }), pic('robe', 'true', 'Robe', { robe: true })]));
  else if (DRESS.tab === 'hat') h = row('Hat', grid([pic('hat', 'none', 'None', { hat: 'none' }, 'head')].concat(P.HATS.map((s: string) => pic('hat', s, dressCap(s), { hat: s }, 'head'))))) + (d.hat !== 'none' ? row('Hat colour', sw('hatCol', DRESS_HATCOLS)) : '');
  b.innerHTML = h;
  for (const p of pics) { const cv = document.getElementById(p.id); if (cv) dressDraw(cv, dressSpec(DRESS.n, Object.assign({}, d, p.change), { dx: 0, dy: 1 }, false), p.crop === 'face' ? 4.4 : p.crop === 'head' ? 3 : 2.3, p.crop); }
}

function dressClose(save: boolean) {
  DRESS.open = false; cancelAnimationFrame(DRESS.raf); const el = document.getElementById('dressup'); if (el) el.hidden = true;
  if (!save) return; const n = DRESS.n, d = DRESS.draft; if (!n) return;
  if (d.first) n.first = d.first; if (d.surname) n.surname = d.surname;
  n.female = d.female; n.skin = d.skin; n.hair0 = d.hair; n.hair = d.hair; n.shirt = d.shirt; n.robe = d.robe; n.hat = d.hat === 'none' ? (n.hat || 'cap') : d.hat; n.hatCol = d.hatCol;
  const L = n.look || assignLook(n); Object.assign(L, { hs: d.hs, beard: d.female ? null : d.beard, pat: d.pat, acc: d.acc, pants: d.pants, hatOn: d.hat !== 'none' });
  n.faceLook = Object.assign({}, d.face); n.ownLook = true; n._sp = null;
  ART.dollForget(); if (typeof updateHud === 'function') updateHud(true);
  if (typeof playerSay === 'function') playerSay(n, 'That is me now. ' + n.first + ' ' + n.surname + '.');
}
/* the button, in the top bar */
(function dressButton() {
  if (typeof document === 'undefined') return; const box = document.querySelector('header .controls'); if (!box) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn dsbtn'; b.textContent = 'Character'; b.title = 'Name and dress your character';
  b.addEventListener('click', () => { if (game.player) dressOpen(); }); box.appendChild(b);
})();
