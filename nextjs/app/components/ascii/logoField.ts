/*
 * The experience logos as signed distance fields, so the stage can extrude them into 3D and
 * morph one into the next (a blend of two distance fields is a shape halfway between them).
 *
 * Each logo is cut out of its image by a colour rule, fitted into a shared frame of
 * LOGO_AR : 1, and run through an exact Euclidean distance transform. The atlas stacks one
 * tile per stop: r = signed distance in frame heights (negative inside), g = rust 0..1.
 */

export const LOGO_AR = 1.3;                               // the frame every logo is fitted into, width : height
export const LOGO_TILE_H = 280;                           // px per tile; plenty for ~25 rows of characters
export const LOGO_TILE_W = Math.round(LOGO_TILE_H * LOGO_AR);
const PAD = 0.06;                                         // empty margin round each logo, of the tile height

/** A source pixel, 0..1, with u, v across the logo's own bounds (left to right, top to bottom). */
type Pixel = { r: number; g: number; b: number; a: number; u: number; v: number };
type LogoSpec = {
  src?: string;                                           // an image in /public
  draw?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;  // or drawn here
  ink: (p: Pixel) => boolean;                             // which pixels are the logo
  rust?: (p: Pixel) => boolean;                           // which of those are inked in rust
};

const luma = (p: Pixel) => 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;

// "</>" for the freelance years
function drawCode(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = h * 0.16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const line = (pts: number[][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
    ctx.stroke();
  };
  line([[0.3, 0.2], [0.1, 0.5], [0.3, 0.8]]);
  line([[0.57, 0.12], [0.43, 0.88]]);
  line([[0.7, 0.2], [0.9, 0.5], [0.7, 0.8]]);
}

/** Logos by company name (as in EXPERIENCES). */
const LOGOS: Record<string, LogoSpec> = {
  // white on black; the full stop in rust
  PitchMe: { src: "/logos/pitchme.webp", ink: p => luma(p) > 0.5, rust: p => p.u > 0.91 },
  // the white mark off its purple tile
  "'Sup (AI EdTech startup)": { src: "/logos/sup.webp", ink: p => luma(p) > 0.72 },
  // AIBP: only the red (the small "by Industry Platform" line would be mush), the globe in rust
  "Industry Platform": {
    src: "/logos/aibp.webp",
    ink: p => p.a > 0.5 && p.r - Math.max(p.g, p.b) > 0.25,
    rust: p => p.u < 0.34,
  },
  "Self-employed": { draw: drawCode, ink: p => p.a > 0.5, rust: p => p.u > 0.38 && p.u < 0.62 },
};

/** Anything without a logo gets its initials. */
function initialsSpec(name: string): LogoSpec {
  const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "*";
  return {
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#fff";
      ctx.font = `700 ${Math.round(h * 0.7)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials, w / 2, h / 2);
    },
    ink: p => p.a > 0.5,
  };
}

async function loadImage(src: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  return img;
}

// ---------------------------------------------------------------- distance transform
// Felzenszwalb & Huttenlocher: exact squared Euclidean distance in two 1D passes.
const INF = 1e20;
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/** Distance from every pixel to the nearest pixel whose mask equals `want`. */
function distanceTo(mask: Uint8Array, w: number, h: number, want: number) {
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) grid[i] = mask[i] === want ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]);
  }
  return grid;
}

// ---------------------------------------------------------------- one logo
function pixelAt(data: Uint8ClampedArray, i: number, u: number, v: number): Pixel {
  return { r: data[i] / 255, g: data[i + 1] / 255, b: data[i + 2] / 255, a: data[i + 3] / 255, u, v };
}

async function rasterise(spec: LogoSpec): Promise<HTMLCanvasElement | null> {
  const c = document.createElement("canvas");
  if (spec.src) {
    const img = await loadImage(spec.src);
    const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, c.width, c.height);
  } else if (spec.draw) {
    c.width = 1000;
    c.height = 500;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    spec.draw(ctx, c.width, c.height);
  } else return null;
  return c;
}

/** Writes one logo's tile (distance, rust) into the atlas at row offset `k * LOGO_TILE_H`. */
async function bakeLogo(spec: LogoSpec, out: Float32Array, k: number) {
  const W = LOGO_TILE_W, H = LOGO_TILE_H;
  const base = k * W * H * 4;
  for (let i = 0; i < W * H; i++) { out[base + i * 4] = 1; out[base + i * 4 + 3] = 1; }   // empty until proven otherwise

  const src = await rasterise(spec);
  const sctx = src?.getContext("2d", { willReadFrequently: true });
  if (!src || !sctx) return;
  const sw = src.width, sh = src.height;
  const sdata = sctx.getImageData(0, 0, sw, sh).data;

  // the logo's bounds in the source
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (!spec.ink(pixelAt(sdata, (y * sw + x) * 4, 0, 0))) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < x0) return;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

  // fit those bounds into the tile, centred, inside the margin
  const pad = PAD * H;
  const scale = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh);
  const dw = bw * scale, dh = bh * scale, dx = (W - dw) / 2, dy = (H - dh) / 2;
  const tile = document.createElement("canvas");
  tile.width = W;
  tile.height = H;
  const tctx = tile.getContext("2d", { willReadFrequently: true });
  if (!tctx) return;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(src, x0, y0, bw, bh, dx, dy, dw, dh);
  const tdata = tctx.getImageData(0, 0, W, H).data;

  const ink = new Uint8Array(W * H);
  const rust = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const p = pixelAt(tdata, i * 4, (x + 0.5 - dx) / dw, (y + 0.5 - dy) / dh);
    if (!spec.ink(p)) continue;
    ink[i] = 1;
    if (spec.rust?.(p)) rust[i] = 1;
  }
  writeField(ink, rust, W, H, H, out, base);
}

/**
 * Writes a signed distance field (negative inside, in units of `unit` px, capped at 1) into
 * out[base + i * 4], with the rust mask in the next channel, spread a few px past the edges
 * so the walls and the outline pick it up too.
 */
export function writeField(ink: Uint8Array, rustMask: Uint8Array, W: number, H: number, unit: number, out: Float32Array, base: number) {
  // Every pixel takes the colour of the ink nearest to it, so a stroke the stage thickens or
  // a wall it extrudes stays one colour all the way out.
  const plain = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) plain[i] = ink[i] && !rustMask[i] ? 1 : 0;
  const toRust = distanceTo(rustMask, W, H, 1), toPlain = distanceTo(plain, W, H, 1);
  const toInk = distanceTo(ink, W, H, 1), toEmpty = distanceTo(ink, W, H, 0);
  for (let i = 0; i < W * H; i++) {
    const px = ink[i] ? -(toEmpty[i] - 0.5) : toInk[i] - 0.5;
    out[base + i * 4] = Math.min(1, px / unit);
    out[base + i * 4 + 1] = toRust[i] < toPlain[i] ? 1 : 0;
    out[base + i * 4 + 3] = 1;
  }
}

/** One tile per company, in order. Unknown companies get their initials. */
export async function buildLogoAtlas(companies: string[]) {
  const W = LOGO_TILE_W, H = LOGO_TILE_H;
  const data = new Float32Array(W * H * 4 * Math.max(1, companies.length));
  for (let k = 0; k < companies.length; k++) {
    try {
      await bakeLogo(LOGOS[companies[k]] ?? initialsSpec(companies[k]), data, k);
    } catch (error) {
      console.warn(`ascii stage: logo for ${companies[k]} failed`, error);
    }
  }
  return { data, width: W, height: H * Math.max(1, companies.length), count: companies.length };
}
