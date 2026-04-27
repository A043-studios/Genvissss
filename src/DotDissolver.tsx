'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Params {
  seed:         number;
  resolution:   number;  // 1–8  coarse→fine
  spacing:      number;  // 1–8  tight→loose
  size:         number;  // 1–8  tiny→large
  grain:        number;  // 1–8  none→lots
  imageOpacity: number;  // 1–8  invisible→visible bg
  imageBlur:    number;  // 1–8  sharp→blurry bg
}

interface Dot {
  x: number; y: number; radius: number;
  cr: number; cg: number; cb: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PARAMS: Params = {
  seed: 42, resolution: 4, spacing: 3, size: 3,
  grain: 2, imageOpacity: 3, imageBlur: 5,
};

const CANVAS_SIZE = 800;

// ─── Seeded RNG (Mulberry32) ──────────────────────────────────────────────────

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0xFFFFFFFF;
  };
}

function seedRand(seed: number, min: number, max: number, rng: () => number) {
  return min + rng() * (max - min);
}

// ─── Demo image builder (runs on offscreen canvas) ───────────────────────────

function buildDemoCanvas(seed: number): HTMLCanvasElement {
  const SIZE = 600;
  const oc   = document.createElement('canvas');
  oc.width   = SIZE;
  oc.height  = SIZE;
  const ctx  = oc.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0, 'rgb(20,14,50)');
  grad.addColorStop(1, 'rgb(50,32,88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const palette: [number,number,number][] = [
    [150, 75, 200], [55, 115, 210], [195, 90, 155],
    [50, 170, 148], [210, 148, 50], [165, 205, 240],
    [100, 48, 165], [240, 118, 78],
  ];

  const rng = makeRng(seed * 17 + 3);

  // Soft blobs
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2 + rng() * 1.2;
    const dist  = rng() * 220 + 70;
    const cx    = 300 + Math.cos(angle) * dist * 0.58;
    const cy    = 300 + Math.sin(angle) * dist * 0.48;
    const r     = rng() * 170 + 55;
    const [cr, cg, cb] = palette[Math.floor(rng() * palette.length)];

    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g2.addColorStop(0,   `rgba(${cr},${cg},${cb},0.55)`);
    g2.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.28)`);
    g2.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central halo
  const halo = ctx.createRadialGradient(300, 280, 0, 300, 280, 260);
  halo.addColorStop(0,   'rgba(185,145,245,0.30)');
  halo.addColorStop(0.6, 'rgba(185,145,245,0.12)');
  halo.addColorStop(1,   'rgba(185,145,245,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(300, 280, 260, 0, Math.PI * 2);
  ctx.fill();

  return oc;
}

// ─── Core render ─────────────────────────────────────────────────────────────

function render(
  canvas:    HTMLCanvasElement,
  source:    HTMLCanvasElement | HTMLImageElement,
  params:    Params,
  onDots?:   (d: Dot[]) => void,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W    = canvas.width;
  const H    = canvas.height;
  const imgW = source instanceof HTMLCanvasElement ? source.width  : (source as HTMLImageElement).naturalWidth;
  const imgH = source instanceof HTMLCanvasElement ? source.height : (source as HTMLImageElement).naturalHeight;

  // Fit (contain)
  const scale = Math.min(W / imgW, H / imgH);
  const iw    = imgW * scale;
  const ih    = imgH * scale;
  const ox    = (W - iw) / 2;
  const oy    = (H - ih) / 2;

  // ── Clear
  ctx.fillStyle = '#f5f3ee';
  ctx.fillRect(0, 0, W, H);

  // ── Blurred bg layer
  const opacity = lerp(0, 0.90, (params.imageOpacity - 1) / 7);
  const blurPx  = lerp(0, 55,   (params.imageBlur    - 1) / 7);

  if (opacity > 0.01) {
    ctx.save();
    if (blurPx > 0.5) ctx.filter = `blur(${blurPx}px)`;
    ctx.globalAlpha = opacity;
    const m = blurPx * 1.3;
    ctx.drawImage(source, ox - m, oy - m, iw + m * 2, ih + m * 2);
    ctx.restore();
  }

  // ── Sample pixel data from source
  const offscreen = document.createElement('canvas');
  offscreen.width  = imgW;
  offscreen.height = imgH;
  const offCtx = offscreen.getContext('2d')!;
  offCtx.drawImage(source, 0, 0);
  const pxData = offCtx.getImageData(0, 0, imgW, imgH).data;

  const getPixel = (ix: number, iy: number) => {
    const i = (iy * imgW + ix) * 4;
    return { r: pxData[i], g: pxData[i+1], b: pxData[i+2], a: pxData[i+3] };
  };

  // ── Dot grid
  let step  = lerp(78, 11, (params.resolution - 1) / 7);
  step     *= lerp(1.9, 0.52, (params.spacing - 1) / 7);
  const dotR        = step * lerp(0.13, 0.50, (params.size  - 1) / 7);
  const maxDisplace = step * lerp(0,    0.60, (params.grain - 1) / 7);

  const rng   = makeRng(params.seed);
  const rand  = (a: number, b: number) => seedRand(0, a, b, rng);
  const dots: Dot[] = [];

  ctx.beginPath();

  const x0 = ox - step * 0.5;
  const y0 = oy - step * 0.5;
  const x1 = ox + iw + step;
  const y1 = oy + ih + step;

  for (let gy = y0 + step * 0.5; gy <= y1; gy += step) {
    for (let gx = x0 + step * 0.5; gx <= x1; gx += step) {
      const px = gx + rand(-maxDisplace, maxDisplace);
      const py = gy + rand(-maxDisplace, maxDisplace);

      const imgX = Math.floor((px - ox) / scale);
      const imgY = Math.floor((py - oy) / scale);

      if (imgX < 0 || imgX >= imgW || imgY < 0 || imgY >= imgH) continue;

      const { r, g, b, a } = getPixel(
        Math.min(imgX, imgW - 1),
        Math.min(imgY, imgH - 1),
      );
      if (a < 8) continue;

      ctx.fillStyle = `rgba(${r},${g},${b},0.855)`;
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fill();
      dots.push({ x: px, y: py, radius: dotR, cr: r, cg: g, cb: b });
    }
  }

  // ── Grain sparkles
  const sparkleCount = Math.floor(lerp(0, 380, (params.grain - 1) / 7));
  for (let i = 0; i < sparkleCount; i++) {
    const sx   = rand(ox, ox + iw);
    const sy   = rand(oy, oy + ih);
    const imgX = Math.min(Math.floor((sx - ox) / scale), imgW - 1);
    const imgY = Math.min(Math.floor((sy - oy) / scale), imgH - 1);
    const { r, g, b } = getPixel(Math.max(imgX, 0), Math.max(imgY, 0));

    const mix  = rand(0.35, 0.95);
    const fr   = Math.round(lerp(r, 255, mix));
    const fg   = Math.round(lerp(g, 255, mix));
    const fb   = Math.round(lerp(b, 255, mix));
    const sr   = rand(0.4, 2.4);
    const alpha = rand(0.35, 0.90);

    ctx.fillStyle = `rgba(${fr},${fg},${fb},${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  onDots?.(dots);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ─── Slider component ────────────────────────────────────────────────────────

function Slider({ label, id, value, onChange }: {
  label: string; id: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 500, marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'monospace', color: '#b0aea5', fontWeight: 400 }}>{value}</span>
      </div>
      <input
        type="range"
        id={id}
        min={1} max={8} step={1}
        value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', cursor: 'pointer', accentColor: '#d97757' }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DotDissolver() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const sourceRef   = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const dotsRef     = useRef<Dot[]>([]);

  const [params,  setParams]  = useState<Params>({ ...DEFAULT_PARAMS });
  const [imgName, setImgName] = useState<string | null>(null);
  const [isDrag,  setIsDrag]  = useState(false);

  // Build / refresh demo canvas whenever seed changes and no user image
  useEffect(() => {
    if (imgName) return; // user has loaded an image
    sourceRef.current = buildDemoCanvas(params.seed);
    triggerRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.seed, imgName]);

  // Redraw whenever params change
  useEffect(() => {
    triggerRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const triggerRender = useCallback(() => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    if (!canvas || !source) return;
    render(canvas, source, params, dots => { dotsRef.current = dots; });
  }, [params]);

  // ── Image loading
  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const el  = document.createElement('img');
    el.onload = () => {
      sourceRef.current = el;
      setImgName(file.name);
      URL.revokeObjectURL(url);
      triggerRender();
    };
    el.src = url;
  }, [triggerRender]);

  // ── Export PNG
  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a  = document.createElement('a');
    a.href   = canvas.toDataURL('image/png');
    a.download = 'dot-dissolve.png';
    a.click();
  };

  // ── Export SVG
  const exportSVG = () => {
    const dots = dotsRef.current;
    if (!dots.length) return;

    const lines = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">`,
      `<rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="#f5f3ee"/>`,
      ...dots.map(d =>
        `<circle cx="${d.x.toFixed(2)}" cy="${d.y.toFixed(2)}" r="${d.radius.toFixed(2)}" fill="rgb(${d.cr},${d.cg},${d.cb})" opacity="0.85"/>`
      ),
      '</svg>',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'dot-dissolve.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateParam = (key: keyof Params, val: number) =>
    setParams(p => ({ ...p, [key]: val }));

  // ── Drag-drop helpers
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDrag(true);  };
  const onDragLeave = ()                    => setIsDrag(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  // ── Styles
  const sidebarStyle: React.CSSProperties = {
    width: 290, flexShrink: 0,
    background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)',
    padding: 24, borderRadius: 12,
    boxShadow: '0 10px 30px rgba(20,20,19,0.1)',
    overflowY: 'auto', maxHeight: '100vh',
    fontFamily: "'Poppins', sans-serif",
    color: '#141413',
  };

  const btnStyle = (color = '#d97757'): React.CSSProperties => ({
    background: color, color: 'white', border: 'none',
    padding: '8px 10px', borderRadius: 6,
    fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
    flex: 1, fontFamily: "'Poppins', sans-serif",
  });

  const sectionStyle: React.CSSProperties = {
    marginBottom: 22, paddingBottom: 22,
    borderBottom: '1px solid #e8e6dc',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#b0aea5', marginBottom: 12,
  };

  return (
    <div style={{ display: 'flex', gap: 20, padding: 20, minHeight: '100vh',
                  background: 'linear-gradient(135deg, #faf9f5 0%, #f0ede6 100%)' }}>

      {/* ── Sidebar ── */}
      <div style={sidebarStyle}>
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 500, marginBottom: 5 }}>
          Dot Dissolve
        </h1>
        <p style={{ fontSize: 11.5, color: '#b0aea5', marginBottom: 24, lineHeight: 1.45 }}>
          Dissolve any image into a chromatic dot field
        </p>

        {/* Upload */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Image</div>
          <label
            style={{
              display: 'block', border: `1.5px dashed ${isDrag ? '#d97757' : '#e8e6dc'}`,
              borderRadius: 8, padding: '14px 12px', textAlign: 'center',
              cursor: 'pointer', background: isDrag ? 'rgba(217,119,87,0.04)' : '#faf9f5',
              fontSize: 12, color: '#b0aea5', transition: 'all 0.2s',
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) loadFile(e.target.files[0]); }} />
            <span style={{ fontSize: 18, display: 'block', marginBottom: 5 }}>
              {imgName ? '✓' : '⊕'}
            </span>
            {imgName
              ? <><div style={{ color: '#141413', fontSize: 11 }}>{imgName}</div><div style={{ fontSize: 10 }}>Click to replace</div></>
              : <><div>Drop image here</div><div style={{ fontSize: 10, marginTop: 3 }}>or click to upload · demo active</div></>
            }
          </label>
        </div>

        {/* Parameters */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Parameters</div>
          <Slider label="Resolution"    id="resolution"    value={params.resolution}    onChange={v => updateParam('resolution', v)} />
          <Slider label="Spacing"       id="spacing"       value={params.spacing}       onChange={v => updateParam('spacing', v)} />
          <Slider label="Size"          id="size"          value={params.size}          onChange={v => updateParam('size', v)} />
          <Slider label="Grain"         id="grain"         value={params.grain}         onChange={v => updateParam('grain', v)} />
          <Slider label="Image Opacity" id="imageOpacity"  value={params.imageOpacity}  onChange={v => updateParam('imageOpacity', v)} />
          <Slider label="Image Blur"    id="imageBlur"     value={params.imageBlur}     onChange={v => updateParam('imageBlur', v)} />
        </div>

        {/* Seed */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Seed</div>
          <input
            type="number" value={params.seed}
            onChange={e => updateParam('seed', Math.max(1, +e.target.value))}
            style={{
              width: '100%', background: '#faf9f5', padding: '8px 10px',
              borderRadius: 6, fontFamily: 'monospace', fontSize: 13,
              border: '1px solid #e8e6dc', textAlign: 'center', marginBottom: 8,
              color: '#141413',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <button style={btnStyle('#6a9bcc')} onClick={() => updateParam('seed', Math.max(1, params.seed - 1))}>← Prev</button>
            <button style={btnStyle('#6a9bcc')} onClick={() => updateParam('seed', params.seed + 1)}>Next →</button>
          </div>
          <button style={{ ...btnStyle('#788c5d'), width: '100%' }}
            onClick={() => updateParam('seed', Math.floor(Math.random() * 999998) + 1)}>
            ↻ Random
          </button>
        </div>

        {/* Export */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Export</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btnStyle('#6a9bcc')} onClick={exportSVG}>SVG</button>
            <button style={btnStyle()}           onClick={exportPNG}>PNG</button>
          </div>
        </div>

        {/* Reset */}
        <div>
          <div style={sectionTitle}>Actions</div>
          <button style={{ ...btnStyle('#788c5d'), width: '100%' }}
            onClick={() => { setParams({ ...DEFAULT_PARAMS }); setImgName(null); sourceRef.current = null; }}>
            Reset Defaults
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 820 }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(20,20,19,0.16)' }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{ display: 'block', width: '100%', height: 'auto' }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          </div>
          <p style={{ fontSize: 10, color: '#b0aea5', textAlign: 'center', marginTop: 8, letterSpacing: '0.03em' }}>
            Spectral Atomization · seed {params.seed} · {imgName ?? 'demo mode'}
          </p>
        </div>
      </div>
    </div>
  );
}
