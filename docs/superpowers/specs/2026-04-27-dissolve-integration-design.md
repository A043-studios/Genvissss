# Dissolve Scene Integration — Design Spec
**Date:** 2026-04-27
**Status:** Approved

---

## Overview

Integrate the Dot Dissolve / Spectral Atomization tool (`dot-dissolve.html`) into `genvissss.html` as a first-class scene called **Dissolve**. The p5.js rendering engine is dropped entirely and ported to the vanilla Canvas 2D API that genvissss already uses. The vivid blob demo image from dot-dissolve becomes the universal media fallback across all scenes.

---

## 1. Scene Registration

Add `"dissolve"` everywhere a scene is registered in genvissss:

- **HTML** — new scene card in `#scenes` grid: `data-scene="dissolve"`, tag label "Dissolve"
- **`mediaScenes`** — add `"dissolve"` to the Set so the upload bar appears
- **`sceneTitles`** — `dissolve: "Dissolve"`
- **`state.params.dissolve`** — default values:
  ```js
  { resolution:5, spacing:3, size:4, grain:2, imgOpacity:5, imgBlur:6 }
  ```
- **`paramDefs.dissolve`** — 6 sliders, all integer 1–8 scale matching the original map() calls:

| key | label | min | max | step | fmt |
|---|---|---|---|---|---|
| resolution | Resolution | 1 | 8 | 1 | `v => v` |
| spacing | Spacing | 1 | 8 | 1 | `v => v` |
| size | Dot Size | 1 | 8 | 1 | `v => v` |
| grain | Grain | 1 | 8 | 1 | `v => v` |
| imgOpacity | Img Opacity | 1 | 8 | 1 | `v => v` |
| imgBlur | Img Blur | 1 | 8 | 1 | `v => v` |

- **`drawScene()` switch** — add `case "dissolve": drawDissolve(); break;`

---

## 2. Demo Image as Universal Fallback

### Problem
Currently `sampleMediaToCanvas()` returns `false` when no media is loaded, causing `drawMediaEmpty()` to render a placeholder. This means all scenes are dark/empty until the user uploads something.

### Solution
Build a 900×900 vivid blob demo image once on load using vanilla Canvas 2D (port of dot-dissolve's `buildDemoImage()`). Store it as `demoCanvas` (an OffscreenCanvas). Modify `sampleMediaToCanvas()` to fall through to `demoCanvas` when `media.ready` is false, so every scene renders immediately.

### Demo image spec
- Eight anchor blobs with hard-coded vivid colors (blue, teal, crimson, green, amber, violet, orange, purple)
- Each blob: radial gradient of filled circles from full opacity to 0 at edge
- Positions jittered by `state.seed` using `mulberry32` — randomize button refreshes the demo too
- Size: 900×900, pixel density 1

### Behaviour
- On load → build demo → all scenes show blobs
- Upload image/video → overrides demo → all scenes use real media
- Clear media → reverts to demo
- Randomize button → rebuilds demo with new seed (for Dissolve this changes dot layout; for other scenes it changes blob positions)

---

## 3. `drawDissolve()` Implementation

### Algorithm (direct port of dot-dissolve's `renderScene()`)

```
1. Sample source pixels via getImageData on the demo/media canvas
2. White background fill
3. Blurred bg layer: ctx.filter = blur(Xpx) + globalAlpha, drawImage source
4. Build dot grid:
   - step = map(resolution,1,8,80,10) × map(spacing,1,8,1.9,0.52)
   - baseDotR = step × map(size,1,8,0.13,0.52)
   - maxDisplace = step × map(grain,1,8,0,0.65)
   - For each grid point: jitter position by ±maxDisplace (seeded rng)
   - Sample pixel color at jittered position from pixel array
   - Compute saturation + luminance → sizeFactor → dotR
   - Collect dot objects {x,y,r,cr,cg,cb}
5. Glow pass:
   - New OffscreenCanvas(W,H)
   - Draw large semi-transparent circles (glowMult × dotR) for each dot
   - Blit to main ctx with ctx.filter = blur(Xpx) + globalAlpha=0.68
6. Sharp dots pass: ctx.arc() for each dot, fill rgba(r,g,b,230/255)
7. Sparkles: map(grain,1,8,0,500) random specular micro-dots
```

### p5 → Canvas 2D translation table

| p5 | Vanilla replacement |
|---|---|
| `randomSeed(n)` + `random(a,b)` | `let rng = mulberry32(seed); rng()*(b-a)+a` |
| `loadPixels()` on Graphics | `offscreen.getContext('2d').getImageData(0,0,w,h).data` |
| `map(v,a,b,c,d)` | inline `function map(v,a,b,c,d){ return c+(d-c)*(v-a)/(b-a); }` (or reuse if already present) |
| `createGraphics(w,h)` | `new OffscreenCanvas(w,h)` |
| `glowBuf.filter(BLUR,amt)` | draw to offscreen ctx, then blit with `ctx.filter='blur(Xpx)'` on main |
| `fill(r,g,b,a)` + `ellipse()` | `ctx.fillStyle=\`rgba(${r},${g},${b},${a/255})\`` + `ctx.beginPath();ctx.arc();ctx.fill()` |
| `background(255)` | `ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H)` |

### Seed
Uses `state.seed` (the global genvissss seed) — no separate seed param. The randomize button (already wired) drives the dot jitter and sparkle layout.

### Export
No changes needed — genvissss's PNG/JPG export reads from `#c` canvas directly, so Dissolve exports work for free.

---

## 4. Files Modified

| File | Changes |
|---|---|
| `genvissss.html` | All changes — one self-contained file |

### What gets added
- `buildDemoImage()` function (~35 lines)
- `demoCanvas` OffscreenCanvas variable
- `drawDissolve()` function (~80 lines)
- `state.params.dissolve` object
- `paramDefs.dissolve` array
- Scene card HTML element
- `"dissolve"` in `mediaScenes` and `sceneTitles`
- `case "dissolve"` in render switch

### What gets changed
- `sampleMediaToCanvas()` — fallthrough to demoCanvas when `media.ready` is false; always returns `true` now, so `drawMediaEmpty()` is never reached for any scene (no removal needed, just unreachable)
- `map()` utility — add a small inline helper if one doesn't already exist in genvissss

### What does NOT change
- All existing scenes and their rendering
- Export, record, palette, aspect ratio, toolstrip
- Slider widget, group collapse, sidebar layout

---

## 5. Out of Scope

- SVG export for Dissolve (dot-dissolve had it; genvissss uses raster-only export — consistent to leave it out)
- Palette tinting of Dissolve output (the original dot-dissolve renders natural image colors; keeping that behaviour)
- Animation / looping for Dissolve (static render, redraws on param change or seed change)
