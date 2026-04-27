# Genvissss

**Generative visual studio by [A+43](https://www.a043.xyz).**
Browser-based creative instruments for image processing, procedural effects, and chromatic dot fields. No install. No build step. Open a file and create.

→ Live at **[a043.xyz/genvissss](https://www.a043.xyz/genvissss)**

---

## What's in here

| File | What it is |
|---|---|
| [`genvissss.html`](genvissss.html) | The main studio — 11 scenes, palettes, export |
| [`dot-dissolve.html`](dot-dissolve.html) | Standalone Spectral Atomization tool |
| [`src/DotDissolver.tsx`](src/DotDissolver.tsx) | React component version of the dissolve engine |
| [`philosophy.md`](philosophy.md) | The algorithmic thinking behind Spectral Atomization |

---

## genvissss

A full generative visual studio that runs entirely in the browser. Drop in an image or video, pick a scene, dial the parameters, export.

### Scenes

| Scene | What it does |
|---|---|
| **Recolor** | Hue-shift or gradient-map the source in real time |
| **Dither** | Bayer matrix or Floyd–Steinberg dithering with palette tinting |
| **Halftone** | Rotatable dot, square, or line halftone screen |
| **ASCII** | Character-mapped rendering — blocks, ASCII, binary, dots |
| **Glitch** | RGB split, scan-line noise, pixel slice corruption |
| **Tone** | Tonal shape rendering — line, circle, cross, triangle |
| **Mosaic** | Pixelated mosaic with colour quantisation and rounded tiles |
| **Binary** | High-contrast binary pattern overlay |
| **Track** | Motion region detection and connection graph |
| **CCTV** | Multi-camera surveillance grid with scan-line noise |
| **Dissolve** | Spectral Atomization — image dissolved into a chromatic dot field |

### Features

- **Universal demo image** — a vivid coloured blob canvas renders by default in every scene before you upload anything. Every scene is immediately alive.
- **Image & video input** — drag and drop or click to upload. All scenes work with both.
- **24 palettes** — Ink, Cyan, Teal, Amber, Coral, Violet, Ember, Moss, Paper, and more.
- **Aspect ratios** — Free, 1:1, 4:3, 3:4, 16:9, 9:16.
- **Per-scene parameters** — every scene has 6 sliders tuned to its algorithm.
- **Seeded randomness** — every render is reproducible by seed number. Randomize for new configurations.
- **PNG / JPG export** — high-resolution snapshot at any time.
- **Video recording** — capture WebM directly in the browser.
- **Collapsible sidebar** — full canvas focus when you need it.

### Usage

```bash
open genvissss.html
# or just double-click it
```

No server required for local use. The live version is at [a043.xyz/genvissss](https://www.a043.xyz/genvissss).

---

## Dissolve — Spectral Atomization

The Dissolve scene (and its standalone sibling `dot-dissolve.html`) implements **Spectral Atomization**: computational image dissolution through chromatic dot fields.

Every pixel in the source image becomes a potential dot. A seeded random grid of sample points is laid over the canvas — each point jittered by grain, each dot sized by the saturation and luminance of the colour it samples. A glow pass blurs oversized halos behind the dots. Sparkle particles scatter specular light across the composition.

**Parameters**

| Parameter | Effect |
|---|---|
| Resolution | Coarse → fine dot grid density |
| Spacing | Tight → loose grid cell size |
| Dot Size | Tiny → large dots relative to grid |
| Grain | No displacement → heavy scatter |
| Img Opacity | Ghost of the original image behind the dots |
| Img Blur | Blur radius of the background image layer |

The Randomize button shifts the seed — changing the jitter pattern, sparkle positions, and demo blob layout simultaneously.

See [`philosophy.md`](philosophy.md) for the full algorithmic thinking.

### Standalone tool

`dot-dissolve.html` is a self-contained version of the same engine with its own dark floating panel, SVG export, and a slightly different default set. Open it directly in any browser.

---

## React component

`src/DotDissolver.tsx` is a drop-in React component (Next.js / React 18+). Copy it into your project — no additional dependencies required beyond React itself.

---

## Technical notes

- **Vanilla JS + Canvas 2D** — no frameworks, no bundler, no CDN dependencies in `genvissss.html`
- **`dot-dissolve.html`** uses p5.js (loaded from CDN) for its standalone rendering
- **`DotDissolver.tsx`** uses React hooks and raw Canvas 2D — no p5.js
- **Single-file architecture** — each HTML tool is fully self-contained; copy one file and it works anywhere
- **OffscreenCanvas** for the glow pass — blurred halo layer composited separately to preserve filter isolation
- **`mulberry32`** seeded PRNG — fast, deterministic, reproducible across browsers

---

## Author

**A+43** — interdisciplinary Art + Design, shaped in Berlin.

[a043.xyz](https://www.a043.xyz) · [/tim](https://www.a043.xyz/tim) · [/blog](https://www.a043.xyz/blog)
