# Genvissss

Generative visual tools by A+43. Browser-based creative instruments for exploring procedural scenes, palettes, motion, and chromatic dot fields.

---

## Tools

### [genvissss.html](genvissss.html)
The main generative visual tool. Explore procedural scenes, color palettes, and motion — all running in the browser with no build step required.

- Live at [a043.xyz/genvissss](https://www.a043.xyz/genvissss)
- Controls panel for scene, palette, and render settings
- PNG export

### [Lumen.html](Lumen.html)
A standalone generative canvas focused on light and form. Single-file, open in any browser.

### [dot-dissolve.html](dot-dissolve.html)
**Spectral Atomization** — dissolves images into chromatic dot fields using p5.js. Upload any image and watch it atomize into a breathing grid of colored spheres.

- Powered by [p5.js](https://p5js.org/)
- Parameters: resolution, spacing, dot size, grain, image opacity, blur
- Drag & drop image support

### [src/DotDissolver.tsx](src/DotDissolver.tsx)
React component version of the Dot Dissolve engine. Drop into any Next.js / React project.

---

## Philosophy

See [philosophy.md](philosophy.md) — the algorithmic philosophy behind Spectral Atomization: computational image dissolution through chromatic dot fields.

---

## Usage

All HTML tools are self-contained single files. No dependencies to install, no build step.

```bash
# Open any tool directly in your browser
open genvissss.html
open Lumen.html
open dot-dissolve.html
```

For the React component, copy `src/DotDissolver.tsx` into your project.

---

## Author

**A+43** — [a043.xyz](https://www.a043.xyz)
