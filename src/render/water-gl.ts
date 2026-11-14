/* Realistic water (WebGL). The sea is drawn by a fragment shader on its own off-screen WebGL canvas, every frame, and copied onto the game's canvas
   before the ground (`wglDraw`, from render); the baked ground leaves its water transparent (`GA.wgl`, render/village.ts), so everything else (sand,
   people, night, weather, TrueSight, the blueprint) is drawn over it as before. What the shader knows of the island is one small texture (`wglData`): for
   each tile of the ground level its distance from land (depth) and whether it is land. From that it makes a seabed (sand with ripples, rocks, seagrass and
   coral heads in the shallows), sees it through the water (light absorbed by depth, red first, so shallows are turquoise and the deep is blue), bends it
   under the moving surface (refraction), lights it with caustics, and adds sun glints and foam where the waves meet the shore.
   `WATER.mode` is 'real' or 'classic' (the old painted tiles), kept in `gh.water`, switched by the Water buttons in the top bar (developer mode).
   Automated browsers keep the classic water unless `window.GH_WATERGL` is set (software WebGL is slow and the tests compare pictures). */

const WATER: any = { mode: 'real', ok: null, gl: null, cv: null, prog: null, tex: null, texTown: null, texV: -1, buf: null, loc: {}, maxPx: 1.4e6, err: '' };
{ let v: string | null = null; try { v = localStorage.getItem('gh.water'); } catch (e) {} if (v === 'classic' || v === 'real') WATER.mode = v; }

const WGL_VS = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }';
const WGL_FS = `
precision highp float;
uniform vec2 uRes; uniform vec2 uCam; uniform float uZoom; uniform float uTime; uniform vec2 uMap; uniform float uTS;
uniform sampler2D uData; uniform float uSun; uniform vec3 uSunCol; uniform vec2 uSunDir;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float fbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * noise(p); p = p * 2.07 + vec2(5.3, 1.1); a *= 0.5; } return s / 0.875; }
/* distance from land, in tiles (0 on land); outside the map the open sea */
float rawDepth(vec2 t) {
  if (t.x < 0.0 || t.y < 0.0 || t.x > uMap.x || t.y > uMap.y) return 24.0;
  return texture2D(uData, t / uMap).r * 24.0;
}
/* the sea floor, in metres below the surface: gentle near the beach, falling away further out, with a little unevenness */
float floorDepth(vec2 t) {
  float D = max(rawDepth(t) - 0.5, 0.0);
  D += (fbm3(t * 0.55 + 5.0) - 0.5) * 0.9 * smoothstep(0.4, 2.5, D);
  D = max(D, 0.0);
  return D * 0.5 + D * D * 0.035;
}
/* the surface: long swells, a cross swell, chop, and a little noise that drifts */
float waveH(vec2 p, float t) {
  float h = sin(dot(p, vec2(0.8, 0.6)) * 1.25 + t * 1.05) * 0.5;
  h += sin(dot(p, vec2(-0.5, 0.86)) * 2.1 + t * 1.55) * 0.28;
  h += sin(dot(p, vec2(0.95, -0.31)) * 3.7 + t * 2.3) * 0.14;
  h += (fbm3(p * 1.4 + vec2(t * 0.22, t * 0.16)) - 0.5) * 0.9;
  h += (noise(p * 5.5 - vec2(t * 0.55, -t * 0.42)) - 0.5) * 0.22;
  return h;
}
vec3 waveN(vec2 p, float t, float k) {
  float e = 0.06;
  float hx = waveH(p + vec2(e, 0.0), t) - waveH(p - vec2(e, 0.0), t);
  float hy = waveH(p + vec2(0.0, e), t) - waveH(p - vec2(0.0, e), t);
  return normalize(vec3(-hx / (2.0 * e) * k, -hy / (2.0 * e) * k, 1.0));
}
/* caustics: the bright net of light the waves focus on the floor */
float caustic(vec2 p, float time) {
  vec2 pp = mod(p * 6.28318, 6.28318) - 250.0, i = pp; float c = 1.0, inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = pp + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(pp.x / (sin(i.x + t) / inten), pp.y / (cos(i.y + t) / inten)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
/* the seabed: sand with ripples, rocks, seagrass, and coral heads where it is shallow enough */
vec3 seabed(vec2 p, float dm) {
  float n = fbm(p * 0.9), n2 = fbm3(p * 3.0 + 7.0);
  vec3 sand = mix(vec3(0.95, 0.88, 0.70), vec3(0.80, 0.72, 0.54), n2);
  float rip = sin(p.x * 4.2 + p.y * 1.6 + n * 7.0) * 0.5 + 0.5; sand *= 0.9 + 0.1 * rip;
  float rk = smoothstep(0.64, 0.74, fbm3(p * 0.5 + 13.0)) * 0.8;
  vec3 rock = mix(vec3(0.62, 0.6, 0.52), vec3(0.42, 0.43, 0.38), n2) * (0.85 + 0.3 * noise(p * 9.0));
  vec3 col = mix(sand, rock, rk);
  float sg = smoothstep(0.62, 0.72, fbm3(p * 0.42 + 31.0)) * smoothstep(1.5, 3.0, dm) * (1.0 - rk);
  float blade = noise(p * vec2(26.0, 7.0)); col = mix(col, vec3(0.42, 0.58, 0.3) * (0.7 + 0.5 * blade), sg * 0.6 * smoothstep(0.25, 0.6, blade));
  float zone = smoothstep(0.53, 0.66, fbm3(p * 0.3 + 71.0)) * smoothstep(0.7, 1.5, dm) * (1.0 - smoothstep(6.0, 9.0, dm));
  vec2 q = p * 1.25, cell = floor(q), f = fract(q), rv = vec2(0.0), cid = vec2(0.0); float cd = 9.0; vec3 cc = vec3(0.0); float ck = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), o = vec2(h21(cell + g), h21(cell + g + 17.0)), r = g + o - f; float d = length(r);
    if (d < cd) { cd = d; ck = h21(cell + g + 3.0); rv = r; cid = cell + g; }
  }
  cc = ck < 0.22 ? vec3(1.0, 0.45, 0.5) : ck < 0.44 ? vec3(1.0, 0.66, 0.3) : ck < 0.62 ? vec3(0.78, 0.5, 1.0) : ck < 0.8 ? vec3(0.4, 0.9, 0.75) : vec3(1.0, 0.9, 0.55);
  float size = (0.3 + 0.2 * h21(cid + 9.0)) * step(0.42, h21(cid + 21.0));
  float ang = atan(rv.y, rv.x), kind = h21(cid + 5.0);
  // a ragged outline, then either a branching coral (spokes from the middle) or a brain coral (winding ridges)
  float edge = size * (0.75 + 0.45 * noise(vec2(ang * 2.5 + ck * 10.0, ck * 7.0)));
  float head = smoothstep(edge + 0.02, edge - 0.03, cd) * zone;
  float spokes = 0.5 + 0.5 * sin(ang * (6.0 + floor(ck * 7.0)) + noise(q * 6.0) * 2.5);
  float ridges = 0.5 + 0.5 * sin((cd * 40.0) + noise(q * 5.0) * 6.0);
  float tex = kind < 0.5 ? smoothstep(0.25, 0.75, spokes) : smoothstep(0.3, 0.8, ridges);
  float lit = 1.0 + 0.45 * dot(normalize(-rv + 1e-4), normalize(vec2(-0.7, -0.75))) * (cd / max(size, 0.01));
  col *= 1.0 - 0.38 * smoothstep(edge + 0.22, edge, cd) * zone * (1.0 - head);
  vec3 coral = mix(cc, vec3(0.78, 0.7, 0.58), 0.35) * mix(0.68, 1.02, tex) * lit * (0.85 + 0.3 * noise(p * 40.0));
  col = mix(col, coral, head);
  return col;
}
void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (uCam + frag / uZoom) / uTS;
  float t = uTime;
  float dm = floorDepth(p);
  vec3 n = waveN(p, t, 0.08 + 0.05 * smoothstep(0.0, 3.0, dm));
  vec2 rp = p + n.xy * (0.25 + min(dm, 8.0) * 0.06);
  float dr = floorDepth(rp);
  vec3 bed = seabed(rp, dr);
  float ca = caustic(rp * 0.32 + n.xy * 0.2, t * 0.55);
  bed *= 0.72 + (0.25 + 1.5 * ca) * exp(-dr * 0.16) * uSun;
  vec3 ext = vec3(0.34, 0.075, 0.05);
  vec3 trans = exp(-ext * dr);
  vec3 body = mix(vec3(0.06, 0.48, 0.52), vec3(0.015, 0.14, 0.30), 1.0 - exp(-dr * 0.07));
  vec3 col = bed * trans + body * (1.0 - trans);
  vec3 L = normalize(vec3(uSunDir, 0.75)), H = normalize(L + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(n, H), 0.0);
  col += vec3(0.62, 0.8, 0.95) * 0.08 * smoothstep(0.0, 4.0, dm) * (1.0 - n.z) * 12.0;
  col += uSunCol * (pow(nh, 260.0) * 2.2 + pow(nh, 40.0) * 0.12) * uSun;
  float glint = step(0.998, noise(p * 22.0 + vec2(t * 1.3, -t * 0.9))) * smoothstep(0.5, 3.0, dm) * smoothstep(1.0, 2.2, uZoom);
  col += uSunCol * glint * 0.9 * uSun;
  float D = max(rawDepth(p) - 0.5, 0.0);
  float fn = fbm3(p * 3.2 + vec2(t * 0.25, -t * 0.1));
  float band = sin(D * 8.0 - t * 1.7 + fbm3(p * 1.1) * 5.0) * 0.5 + 0.5;
  float foam = (1.0 - smoothstep(0.05, 1.0, D)) * smoothstep(0.62, 0.92, band * 0.55 + fn * 0.6);
  foam += (1.0 - smoothstep(0.0, 0.28, D)) * smoothstep(0.3, 0.55, fn);
  col = mix(col, vec3(0.96, 0.98, 1.0), clamp(foam, 0.0, 1.0) * 0.85);
  gl_FragColor = vec4(col, 1.0);
}`;

/** is realistic water wanted (the choice, and not an automated browser unless asked) */
function wglWanted(): boolean {
  if (WATER.mode !== 'real' || typeof document === 'undefined') return false;
  const w: any = window; if (w.GH_WATERGL) return true;
  return !(w.GH_NOSAVE || (typeof navigator !== 'undefined' && navigator.webdriver));
}
/** make the context and the program, once; false when WebGL is not there */
function wglInit(): boolean {
  if (WATER.ok != null) return WATER.ok;
  try {
    const cv = document.createElement('canvas'), gl: any = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('no WebGL');
    const sh = (type: number, src: string) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, WGL_VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, WGL_FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr) || 'link');
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(pr, 'aP'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
    for (const k of ['uRes', 'uCam', 'uZoom', 'uTime', 'uMap', 'uTS', 'uData', 'uSun', 'uSunCol', 'uSunDir']) WATER.loc[k] = gl.getUniformLocation(pr, k);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    cv.addEventListener('webglcontextlost', (e: any) => { e.preventDefault(); WATER.ok = false; WATER.err = 'context lost'; if (typeof buildStatic === 'function' && typeof town !== 'undefined' && town) buildStatic(); });
    Object.assign(WATER, { cv, gl, prog: pr, tex, buf, ok: true });
  } catch (e) { WATER.ok = false; WATER.err = String((e as any) && (e as any).message || e); console.warn('realistic water off:', WATER.err); }
  return WATER.ok;
}
/** realistic water is drawn this session (chunks are baked for it: `GA.wgl`) */
function wglReady(): boolean { return wglWanted() && wglInit(); }
/** the island as the shader sees it: distance from land (8-way chamfer, in tiles) for every tile of the ground level */
function wglData() {
  const gl = WATER.gl, H0 = town.h0 || H, n = W * H0, d = new Float32Array(n).fill(1e9), land = new Uint8Array(n);
  const q: number[] = [];
  for (let y = 0; y < H0; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (gclass(x, y) !== 'water') { land[k] = 1; d[k] = 0; q.push(k); } }
  // two passes of a chamfer distance (1 and 1.414), good enough for a smooth sea floor
  const pass = (fwd: boolean) => {
    const ys = fwd ? 0 : H0 - 1, ye = fwd ? H0 : -1, st = fwd ? 1 : -1;
    for (let y = ys; y !== ye; y += st) for (let x = fwd ? 0 : W - 1; fwd ? x < W : x >= 0; x += st) {
      const k = y * W + x; if (land[k]) continue; let v = d[k];
      const nb = fwd ? [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]] : [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]];
      for (const [dx, dy, c] of nb) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H0) { v = Math.min(v, 12); continue; } v = Math.min(v, d[yy * W + xx] + c); }
      d[k] = v;
    }
  };
  pass(true); pass(false); pass(true);
  const px = new Uint8Array(n * 4);
  for (let k = 0; k < n; k++) { px[k * 4] = Math.round(Math.min(12, d[k]) / 12 * 255); px[k * 4 + 1] = land[k] * 255; px[k * 4 + 2] = 0; px[k * 4 + 3] = 255; }
  gl.bindTexture(gl.TEXTURE_2D, WATER.tex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H0, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  WATER.texTown = town; WATER.texV = WATER.ver || 0; WATER.texH = H0;
}
/** the ground was rebaked: look at the island again */
function wglInvalidate() { WATER.ver = (WATER.ver || 0) + 1; }
/** the sun for the shader: how strong (0 at night) and its colour (warm at dawn and dusk) */
function wglSun(): any {
  const h = (typeof GA !== 'undefined' && GA.hour != null ? GA.hour : 12), day = Math.max(0, Math.min(1, (h - 5) / 2)) * Math.max(0, Math.min(1, (20.5 - h) / 2));
  const warm = Math.max(0, 1 - Math.abs(h - 12.5) / 6.5);
  return { k: 0.15 + 0.85 * day, col: [1.0, 0.82 + 0.16 * warm, 0.62 + 0.36 * warm] };
}
/** draw the sea for the view (camera at x, y in world pixels) onto the 2D canvas, filling it; false when it cannot */
function wglDraw(c: any, cx: number, cy: number): boolean {
  if (!(typeof GA !== 'undefined' && GA.wgl) || !WATER.ok) return false;
  const gl = WATER.gl, cv = WATER.cv, w0 = canvas.width, h0 = canvas.height; if (!w0 || !h0) return false;
  const k = Math.min(1, Math.sqrt(WATER.maxPx / (w0 * h0))), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  if (WATER.texTown !== town || WATER.texV !== (WATER.ver || 0)) wglData();
  const L = WATER.loc, sun = wglSun(), z = cam.z * cam.dpr * k;
  gl.viewport(0, 0, w, h); gl.useProgram(WATER.prog);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, WATER.tex); gl.uniform1i(L.uData, 0);
  gl.uniform2f(L.uRes, w, h); gl.uniform2f(L.uCam, cx, cy); gl.uniform1f(L.uZoom, z); gl.uniform1f(L.uTime, (performance.now() / 1000) % 3600);
  gl.uniform2f(L.uMap, W, WATER.texH || H); gl.uniform1f(L.uTS, TS); gl.uniform1f(L.uSun, sun.k); gl.uniform3f(L.uSunCol, sun.col[0], sun.col[1], sun.col[2]); gl.uniform2f(L.uSunDir, -0.45, -0.5);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(cv, 0, 0, w0, h0); c.restore();
  return true;
}
/** switch between the realistic and the painted water (the ground is rebaked) */
function waterSet(mode: string) {
  WATER.mode = mode === 'classic' ? 'classic' : 'real'; try { localStorage.setItem('gh.water', WATER.mode); } catch (e) {}
  if (typeof town !== 'undefined' && town && typeof grid !== 'undefined' && grid && grid.length) buildStatic();
  if (typeof document !== 'undefined') document.querySelectorAll('[data-water]').forEach((b: any) => b.setAttribute('aria-pressed', b.dataset.water === WATER.mode ? 'true' : 'false'));
}
(function waterButtons() {
  if (typeof document === 'undefined') return; const box = document.querySelector('header .controls'); if (!box) return;
  const seg = document.createElement('div'); seg.className = 'seg wxseg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Water');
  seg.innerHTML = '<span class="wxlab">Water</span>' + [['real', 'Realistic'], ['classic', 'Classic']].map(([k, l]) => `<button type="button" data-water="${k}" aria-pressed="${WATER.mode === k}">${l}</button>`).join('');
  box.appendChild(seg); seg.addEventListener('click', (e: any) => { const b = e.target.closest('[data-water]'); if (b) waterSet(b.dataset.water); });
})();
