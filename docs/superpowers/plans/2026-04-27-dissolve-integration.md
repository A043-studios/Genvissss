# Dissolve Scene Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Spectral Atomization (Dot Dissolve) as a first-class "Dissolve" scene in `genvissss.html`, replacing p5.js with vanilla Canvas 2D, and install the vivid blob demo image as the universal fallback for all media scenes.

**Architecture:** Single file edit to `genvissss.html`. The dissolve algorithm is ported from p5.js to vanilla Canvas 2D using genvissss's existing `mulberry32` seeded RNG and `OffscreenCanvas` for the glow pass. A `buildDemoImage()` function creates a 900×900 blob canvas on load; `sampleMediaToCanvas()` falls through to it when no real media is loaded.

**Tech Stack:** Vanilla JS, Canvas 2D API, OffscreenCanvas — no new dependencies.

---

## File Map

| File | What changes |
|---|---|
| `genvissss.html` | All changes — ~180 lines added, ~3 lines modified |

**Lines to modify (exact):**
- Line 660 — HTML: add Dissolve scene card after CCTV card
- Line 970 — `sceneTitles`: add `dissolve` entry
- Line 971 — `mediaScenes`: add `"dissolve"`
- Line 883 — `state.params`: add `dissolve` object
- Line 967 — `paramDefs`: add `dissolve` array
- Line 1098 — `updateMediaUI()`: change drop overlay display logic
- Lines 1484/1490 — `renderThumbs()` list + `thumbBgFor()`: add dissolve
- Line 1511 — `sampleMediaToCanvas()`: add demo fallback branch
- Line 1232 — `btn-random` click handler: rebuild demo on seed change
- Line 2297 — render switch: add `case "dissolve"`
- Line 2542 — INIT block: call `buildDemoImage()` before `requestAnimationFrame`

**Lines to add (new):**
- After line 1335 (`lerp`): add `gmap()` utility
- After line 1335: add `demoCanvas` variable declaration
- Before `sampleMediaToCanvas` (line 1509): add `buildDemoImage()` function
- After `drawCCTV` (line 2263): add `drawDissolve()` function

---

## Task 1: Register Dissolve in state and scene tables

**Files:**
- Modify: `genvissss.html:883` (state.params)
- Modify: `genvissss.html:887` (paramDefs)
- Modify: `genvissss.html:970` (sceneTitles)
- Modify: `genvissss.html:971` (mediaScenes)

- [ ] **Step 1: Add `dissolve` to `state.params`**

Find line 883 in genvissss.html (the `cctv` params entry):
```js
    cctv:      { grid:3, contrast:1.4, noise:0.25, scan:0.55, tint:0.15, zoom:0.4 },
```
Add after it (before the closing `}`):
```js
    dissolve:  { resolution:5, spacing:3, size:4, grain:2, imgOpacity:5, imgBlur:6 },
```

- [ ] **Step 2: Add `dissolve` to `paramDefs`**

Find the `cctv` entry in `paramDefs` (around line 960–967). After its closing `],` add:
```js
  dissolve: [
    { key:"resolution", label:"Resolution", min:1, max:8, step:1, fmt:v=>(v|0)+"" },
    { key:"spacing",    label:"Spacing",    min:1, max:8, step:1, fmt:v=>(v|0)+"" },
    { key:"size",       label:"Dot Size",   min:1, max:8, step:1, fmt:v=>(v|0)+"" },
    { key:"grain",      label:"Grain",      min:1, max:8, step:1, fmt:v=>(v|0)+"" },
    { key:"imgOpacity", label:"Img Opacity",min:1, max:8, step:1, fmt:v=>(v|0)+"" },
    { key:"imgBlur",    label:"Img Blur",   min:1, max:8, step:1, fmt:v=>(v|0)+"" },
  ],
```

- [ ] **Step 3: Add `dissolve` to `sceneTitles` and `mediaScenes`**

Line 970 — add to `sceneTitles`:
```js
const sceneTitles = { recolor:"Recolor", dither:"Dither", halftone:"Halftone", ascii:"ASCII", glitch:"Glitch", tone:"Tone", mosaic:"Mosaic", binary:"Binary", track:"Track", cctv:"CCTV", dissolve:"Dissolve" };
```

Line 971 — add to `mediaScenes`:
```js
const mediaScenes = new Set(["recolor","dither","halftone","ascii","glitch","tone","mosaic","binary","track","cctv","dissolve"]);
```

- [ ] **Step 4: Verify in browser**

Open `genvissss.html` in a browser. Open the JS console and run:
```js
console.log(state.params.dissolve, paramDefs.dissolve, sceneTitles.dissolve, mediaScenes.has("dissolve"));
```
Expected output:
```
{resolution:5, spacing:3, size:4, grain:2, imgOpacity:5, imgBlur:6}
[Array of 6 objects]
"Dissolve"
true
```

- [ ] **Step 5: Commit**

```bash
cd /Users/t.gelzleichter/Claude/Genvissss
git add genvissss.html
git commit -m "feat: register dissolve scene in state, paramDefs, sceneTitles, mediaScenes"
```

---

## Task 2: Add Dissolve scene card + thumbnail

**Files:**
- Modify: `genvissss.html:660` (scene card HTML)
- Modify: `genvissss.html:1484` (`renderThumbs` list)
- Modify: `genvissss.html:1490` (`thumbBgFor`)

- [ ] **Step 1: Add scene card HTML**

Find line 660 — the CCTV scene card:
```html
            <div class="scene-card" data-scene="cctv"><div class="thumb" id="thumb-cctv"></div><span class="tag">CCTV</span></div>
```
Add directly after it:
```html
            <div class="scene-card" data-scene="dissolve"><div class="thumb" id="thumb-dissolve"></div><span class="tag">Dissolve</span></div>
```

- [ ] **Step 2: Add `"dissolve"` to `renderThumbs` list**

Line 1484 — `renderThumbs()`:
```js
function renderThumbs(){
  ["recolor","dither","halftone","ascii","glitch","tone","mosaic","binary","track","cctv"].forEach(name=>{
```
Change to:
```js
function renderThumbs(){
  ["recolor","dither","halftone","ascii","glitch","tone","mosaic","binary","track","cctv","dissolve"].forEach(name=>{
```

- [ ] **Step 3: Add dissolve thumbnail gradient to `thumbBgFor`**

Find `return "#111";` at the end of `thumbBgFor` (line 1506). Add before it:
```js
  if(name==="dissolve")  return `radial-gradient(circle at 30% 40%, #2d6fe8 0%, transparent 45%),
    radial-gradient(circle at 70% 30%, #1eb89e 0%, transparent 40%),
    radial-gradient(circle at 50% 55%, #c0325a 0%, transparent 50%),
    radial-gradient(circle at 20% 70%, #3ab800 0%, transparent 35%),
    radial-gradient(circle at 80% 65%, #d07020 0%, transparent 40%),
    #f5f5f4`;
```

- [ ] **Step 4: Verify in browser**

Reload the page. The sidebar Scene section should now show an 11th card labelled **Dissolve** with a colourful multi-blob thumbnail. Clicking it should update the sidebar Parameters title to "Dissolve" and show 6 sliders (Resolution, Spacing, Dot Size, Grain, Img Opacity, Img Blur). The upload bar should appear below the scene grid.

- [ ] **Step 5: Commit**

```bash
git add genvissss.html
git commit -m "feat: add Dissolve scene card and thumbnail"
```

---

## Task 3: Add `gmap()` utility + `buildDemoImage()` + init call

**Files:**
- Modify: `genvissss.html:1335` (after `lerp` — add `gmap` + `demoCanvas` declaration)
- Modify: `genvissss.html:1509` (before `sampleMediaToCanvas` — add `buildDemoImage`)
- Modify: `genvissss.html:1231` (`btn-random` click — rebuild demo)
- Modify: `genvissss.html:2542` (INIT block — call `buildDemoImage`)

- [ ] **Step 1: Add `gmap()` and `demoCanvas` declaration**

Find line 1335:
```js
function lerp(a,b,t){ return a+(b-a)*t; }
```
Add after it:
```js
function gmap(v,a,b,c,d){ return c+(d-c)*(v-a)/(b-a); }
let demoCanvas = null;
```

- [ ] **Step 2: Add `buildDemoImage()` before `sampleMediaToCanvas`**

Find the comment `// ---- MEDIA HELPERS ----` (just before `sampleMediaToCanvas`, line ~1509). Add the function before it:
```js
function buildDemoImage(){
  demoCanvas = new OffscreenCanvas(900, 900);
  const g = demoCanvas.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 900, 900);

  const anchors = [
    { cx:150, cy:150, r:280, cr:45,  cg:110, cb:235 },
    { cx:750, cy:120, r:240, cr:30,  cg:185, cb:165 },
    { cx:420, cy:350, r:320, cr:215, cg:50,  cb:105 },
    { cx:90,  cy:580, r:200, cr:75,  cg:175, cb:45  },
    { cx:790, cy:520, r:260, cr:235, cg:145, cb:25  },
    { cx:230, cy:770, r:195, cr:190, cg:60,  cb:215 },
    { cx:670, cy:780, r:220, cr:235, cg:85,  cb:45  },
    { cx:430, cy:120, r:165, cr:130, cg:55,  cb:250 },
  ];

  const rng = mulberry32(state.seed * 13 + 7);
  for(const a of anchors){
    const ox = (rng() - 0.5) * 100;
    const oy = (rng() - 0.5) * 100;
    const cx = Math.max(0, Math.min(900, a.cx + ox));
    const cy = Math.max(0, Math.min(900, a.cy + oy));
    for(let rad = a.r; rad > 0; rad -= 3){
      g.fillStyle = `rgba(${a.cr},${a.cg},${a.cb},${210*(1-rad/a.r)/255})`;
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI*2);
      g.fill();
    }
  }
}
```

- [ ] **Step 3: Call `buildDemoImage()` in the INIT block**

Find the INIT block near the bottom (line ~2539–2547):
```js
// ========= INIT =========
renderParams();
renderPalettes();
renderThumbs();
updateDim();
updateFilename();
updateMediaUI();
resizeCanvas();
requestAnimationFrame(loop);
```
Change to:
```js
// ========= INIT =========
renderParams();
renderPalettes();
renderThumbs();
updateDim();
updateFilename();
updateMediaUI();
resizeCanvas();
buildDemoImage();
requestAnimationFrame(loop);
```

- [ ] **Step 4: Rebuild demo when seed changes**

Find the `btn-random` click handler (line ~1231):
```js
$("#btn-random").addEventListener("click", ()=>{
  state.seed = Math.floor(Math.random()*9000+1000);
  $("#seed").innerHTML = "seed <b>#"+state.seed+"</b>";
```
Add `buildDemoImage();` after the seed line:
```js
$("#btn-random").addEventListener("click", ()=>{
  state.seed = Math.floor(Math.random()*9000+1000);
  $("#seed").innerHTML = "seed <b>#"+state.seed+"</b>";
  buildDemoImage();
```

- [ ] **Step 5: Verify in browser console**

Reload. Open console:
```js
console.log(demoCanvas, demoCanvas.width, demoCanvas.height);
```
Expected: `OffscreenCanvas {}  900  900`

- [ ] **Step 6: Commit**

```bash
git add genvissss.html
git commit -m "feat: add buildDemoImage() — vivid blob fallback canvas"
```

---

## Task 4: Wire demo image into `sampleMediaToCanvas()` + fix drop overlay

**Files:**
- Modify: `genvissss.html:1510` (`sampleMediaToCanvas`)
- Modify: `genvissss.html:1098` (`updateMediaUI`)

- [ ] **Step 1: Update `sampleMediaToCanvas()` to use demo as fallback**

Find the function (line 1510):
```js
function sampleMediaToCanvas(){
  if(!media.ready) return false;
  // fit media into W×H preserving aspect (cover)
  const mw = media.width, mh = media.height;
  const ratio = Math.max(W/mw, H/mh);
  const dw = mw*ratio, dh = mh*ratio;
  const dx = (W-dw)/2, dy = (H-dh)/2;
  mediaCanvas.width = W; mediaCanvas.height = H;
  mediaCtx.fillStyle = state.bg;
  mediaCtx.fillRect(0,0,W,H);
  try{ mediaCtx.drawImage(media.el, dx, dy, dw, dh); } catch(e){ return false; }
  return true;
}
```
Replace with:
```js
function sampleMediaToCanvas(){
  const src = media.ready ? media.el : demoCanvas;
  const mw  = media.ready ? media.width  : demoCanvas.width;
  const mh  = media.ready ? media.height : demoCanvas.height;
  const ratio = Math.max(W/mw, H/mh);
  const dw = mw*ratio, dh = mh*ratio;
  const dx = (W-dw)/2, dy = (H-dh)/2;
  mediaCanvas.width = W; mediaCanvas.height = H;
  mediaCtx.fillStyle = state.bg;
  mediaCtx.fillRect(0,0,W,H);
  try{ mediaCtx.drawImage(src, dx, dy, dw, dh); } catch(e){ return false; }
  return true;
}
```

- [ ] **Step 2: Remove the static "no media" drop overlay in `updateMediaUI()`**

Find line 1098 inside `updateMediaUI()`:
```js
  dropOverlay.style.display = (isMediaScene && !media.ready) ? "flex" : "none";
```
Replace with:
```js
  dropOverlay.style.display = "none";
```
(The drag-and-drop events still show it temporarily during an active drag — that code is separate and untouched.)

- [ ] **Step 3: Verify in browser**

Reload and switch to any media scene (e.g. Dither). The canvas should immediately show the vivid coloured blobs processed through the Dither algorithm — no empty drop overlay. Uploading a real image should override the demo. Clicking Randomize should visibly change the blob layout (blob positions shift with the new seed).

- [ ] **Step 4: Commit**

```bash
git add genvissss.html
git commit -m "feat: use demo blob image as universal media fallback for all scenes"
```

---

## Task 5: Implement `drawDissolve()`

**Files:**
- Modify: `genvissss.html` — add after `drawCCTV` ends (around line 2263)

- [ ] **Step 1: Add `drawDissolve()` after `drawCCTV`**

Find the line after `drawCCTV` ends:
```js
  if(state.grain) drawGrain(0.07);
}
```
(This is the last line of `drawCCTV`, around line 2262–2263.)

Add `drawDissolve()` directly after the closing `}`:

```js
// ---- Scene: DISSOLVE ----
function drawDissolve(){
  sampleMediaToCanvas();
  const p = state.params.dissolve;
  const rng = mulberry32(state.seed);

  // Sample pixels from the W×H media canvas
  const imgData = mediaCtx.getImageData(0, 0, W, H);
  const pixels  = imgData.data;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Blurred background image layer
  const bgOpacity = gmap(p.imgOpacity, 1, 8, 0, 0.92);
  const blurPx    = gmap(p.imgBlur,    1, 8, 0, 65);
  if(bgOpacity > 0.01){
    ctx.save();
    if(blurPx > 0.5) ctx.filter = `blur(${blurPx}px)`;
    ctx.globalAlpha = bgOpacity;
    const m = blurPx * 1.6;
    ctx.drawImage(mediaCanvas, -m, -m, W + m*2, H + m*2);
    ctx.restore();
  }

  // Dot grid
  let step = gmap(p.resolution, 1, 8, 80, 10);
  step    *= gmap(p.spacing,    1, 8, 1.9, 0.52);
  const baseDotR    = step * gmap(p.size,  1, 8, 0.13, 0.52);
  const maxDisplace = step * gmap(p.grain, 1, 8, 0, 0.65);

  const dots = [];
  for(let gy = step * 0.5; gy <= H; gy += step){
    for(let gx = step * 0.5; gx <= W; gx += step){
      const px = gx + (rng() * 2 - 1) * maxDisplace;
      const py = gy + (rng() * 2 - 1) * maxDisplace;
      const ix = px | 0;
      const iy = py | 0;
      if(ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
      const pidx = (iy * W + ix) * 4;
      const r = pixels[pidx], g = pixels[pidx+1], b = pixels[pidx+2], a = pixels[pidx+3];
      if(a < 10) continue;

      const maxC = Math.max(r,g,b) / 255;
      const minC = Math.min(r,g,b) / 255;
      const sat  = maxC > 0 ? (maxC - minC) / maxC : 0;
      const lum  = (r*0.299 + g*0.587 + b*0.114) / 255;
      const dotR = baseDotR * gmap(sat*0.6 + lum*0.4, 0, 1, 0.35, 1.55);
      dots.push({ x:px, y:py, r:dotR, cr:r, cg:g, cb:b });
    }
  }

  // Glow pass — offscreen canvas blurred onto main
  const glowMult = gmap(baseDotR, 3, 30, 3.5, 2.2);
  const glowBlur = gmap(baseDotR, 3, 30, 3, 10);
  const glowOff  = new OffscreenCanvas(W, H);
  const glowCtx  = glowOff.getContext('2d');
  for(const d of dots){
    glowCtx.fillStyle = `rgba(${d.cr},${d.cg},${d.cb},${160/255})`;
    glowCtx.beginPath();
    glowCtx.arc(d.x, d.y, d.r * glowMult, 0, Math.PI*2);
    glowCtx.fill();
  }
  ctx.save();
  ctx.filter = `blur(${glowBlur}px)`;
  ctx.globalAlpha = 0.68;
  ctx.drawImage(glowOff, 0, 0);
  ctx.restore();

  // Sharp dots
  for(const d of dots){
    ctx.fillStyle = `rgba(${d.cr},${d.cg},${d.cb},${230/255})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
    ctx.fill();
  }

  // Sparkles
  const sparkleCount = Math.floor(gmap(p.grain, 1, 8, 0, 500));
  for(let i = 0; i < sparkleCount; i++){
    const sx  = rng() * W;
    const sy  = rng() * H;
    const six = Math.max(0, Math.min(W-1, sx | 0));
    const siy = Math.max(0, Math.min(H-1, sy | 0));
    const pidx = (siy * W + six) * 4;
    const r = pixels[pidx], g = pixels[pidx+1], b = pixels[pidx+2];
    const mix   = rng() * 0.52 + 0.45;
    const sr    = rng() * 2.1  + 0.5;
    const alpha = rng() * 0.49 + 0.51;
    ctx.fillStyle = `rgba(${(r+(255-r)*mix)|0},${(g+(255-g)*mix)|0},${(b+(255-b)*mix)|0},${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI*2);
    ctx.fill();
  }
}
```

- [ ] **Step 2: Verify the function exists**

Reload. In the browser console:
```js
console.log(typeof drawDissolve);
```
Expected: `"function"`

- [ ] **Step 3: Commit**

```bash
git add genvissss.html
git commit -m "feat: implement drawDissolve() — Spectral Atomization ported to Canvas 2D"
```

---

## Task 6: Wire Dissolve into the render switch + delete Lumen.html

**Files:**
- Modify: `genvissss.html:2297` (render switch)
- Delete: `Lumen.html`

- [ ] **Step 1: Add `case "dissolve"` to the render switch**

Find the render switch (line ~2287):
```js
  switch(state.scene){
    case "recolor":   drawRecolor(time); break;
    case "dither":    drawDither(time); break;
    case "halftone":  drawHalftone(time); break;
    case "ascii":     drawAscii(time); break;
    case "glitch":    drawGlitch(time); break;
    case "tone":      drawTone(time); break;
    case "mosaic":    drawMosaic(time); break;
    case "binary":    drawBinary(time); break;
    case "track":     drawTrack(time); break;
    case "cctv":      drawCCTV(time);  break;
  }
```
Replace with:
```js
  switch(state.scene){
    case "recolor":   drawRecolor(time);  break;
    case "dither":    drawDither(time);   break;
    case "halftone":  drawHalftone(time); break;
    case "ascii":     drawAscii(time);    break;
    case "glitch":    drawGlitch(time);   break;
    case "tone":      drawTone(time);     break;
    case "mosaic":    drawMosaic(time);   break;
    case "binary":    drawBinary(time);   break;
    case "track":     drawTrack(time);    break;
    case "cctv":      drawCCTV(time);     break;
    case "dissolve":  drawDissolve();     break;
  }
```

- [ ] **Step 2: Delete Lumen.html**

```bash
cd /Users/t.gelzleichter/Claude/Genvissss
rm Lumen.html
```

- [ ] **Step 3: Full integration test**

Reload `genvissss.html`. Run through this checklist:

1. Click **Dissolve** in the scene grid → canvas renders colourful dots over the demo image, no JS errors in console
2. Move **Resolution** slider → dot density changes
3. Move **Spacing** slider → dot grid tightens/loosens
4. Move **Dot Size** slider → dots grow/shrink
5. Move **Grain** slider → dots scatter more; sparkle count increases at high values
6. Move **Img Opacity** slider → blurred background image appears/disappears
7. Move **Img Blur** slider → background blur changes
8. Click **Randomize** (right toolstrip) → dot layout shifts with new seed; demo blobs also shift
9. Upload a real image via the upload bar → scene switches to that image
10. Clear media → reverts to demo blobs
11. Switch to **Dither** → demo blobs are rendered through dither (not empty canvas)
12. Switch back to **Dissolve** → still works
13. Click **PNG export** (camera icon) → downloads a PNG of the dissolve output

- [ ] **Step 4: Commit**

```bash
git add genvissss.html
git rm Lumen.html
git commit -m "feat: wire Dissolve into render loop; remove Lumen.html"
```

---

## Task 7: Push to GitHub

- [ ] **Step 1: Final check — no console errors**

Reload and run all 13 integration checks from Task 6 Step 3. Confirm zero JS errors.

- [ ] **Step 2: Push**

```bash
cd /Users/t.gelzleichter/Claude/Genvissss
git push origin main
```
