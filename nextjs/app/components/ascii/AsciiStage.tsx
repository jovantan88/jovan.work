"use client";

import { useEffect, useRef } from "react";
import {
  BLIT_FRAG, BLIT_UNIFORMS, FIELD_FRAG, FIELD_UNIFORMS, GLYPHS, NOISE_GLYPHS, RING_CELL, RING_FAR, RING_GLYPH, RING_RUST, VERT, toGlyphs,
} from "./stageShader";
import { INTRO_SPAN, LOGO_FILL, NARROW, P_START, dwell, journeyProgress, logoAt } from "./journeyMath";
import { LOGO_AR, buildLogoAtlas } from "./logoField";
import { DECK_MAX_SHEETS, DECK_NARROW, DECK_PAN, boxIn, buildPrintTiles, deckProgress, skyAt } from "./deckMath";
import { buildNameField } from "./nameField";

/**
 * Fixed full-screen ASCII canvas behind the site (see stageShader.ts for what it draws).
 *
 * It reads the page every frame instead of being told what to draw:
 *  - sections marked [data-act], in order hello, about, experience, work, contact,
 *    decide which backdrop each cell gets and where the torn seams are;
 *  - elements marked [data-anchor="portrait" | "cube" | "hand" | "name"] are where the
 *    objects are drawn. Each object's presence comes from where its anchor sits on screen.
 *    The name anchor's own text is baked into a distance field (nameField.ts) and drawn in
 *    ASCII over it; html[data-ascii-name] tells the CSS to make the DOM text transparent;
 *  - the experience section's pinned stage ([data-journey]) carries the morphing logo; its
 *    cards ([data-stop], with data-logo and data-skills) say which logo and which skills
 *    (see journeyMath.ts and logoField.ts);
 *  - the work section's pinned stage ([data-deck]) is a stack of sheets ([data-sheet], the cover
 *    first, then one per project with data-print naming its artwork); [data-deck-print] is where
 *    each print goes, and the track's scroll pans the landscape (see deckMath.ts).
 * So layout and breakpoints stay in CSS, and the canvas follows them exactly.
 *
 * It also sets html[data-ink-top] / html[data-ink-bottom] while the inverted
 * experience section is under the fixed top / bottom bars, so they can flip colour.
 */

// CSS px per character cell, and the glyph size in it. Phones get smaller cells, so the
// objects keep their detail on a narrow screen.
const CELL = { w: 9, h: 16, font: 13 };
const CELL_PHONE = { w: 7, h: 12, font: 10 };
const PHONE = 640;
const IDLE_MS = 33;               // ~30 fps while nothing is scrolling
const INTRO_MS = 1900;
const ANCHORS = ["portrait", "cube", "hand", "name"] as const;
const NAME_MIN_PX = 120;          // a line box shorter than this won't read in ASCII, so the page keeps its text
const COLORS = { paper: "#f1ece1", ink: "#16140f", rust: "#b4532a", rustInv: "#e07a45" };
const PORTRAIT_SRC = "/jovan-ascii.webp";
const ORBIT = { rx: 0.6, ry: 0.62, ryNarrow: 0.5, tilt: 0.12 };  // skills ring round the logo: radii as shares of the logo frame's width and height, tilt

type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

const RING_TRACE_MAX = 4096;                   // cells the ring may pass through

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t); };
const hexRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
function hash01(a: number, b: number) {
  let h = Math.imul(a ^ 0x9e3779b1, 0x85ebca77) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 8) / 16777216;
}
const ellipsePerimeter = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));

/**
 * Exactly `length` characters of "skill * skill * ...", so the text loops round the ring with
 * no seam: whole words only, and the spare room spread across the gaps.
 */
function ringText(words: string[], length: number) {
  const parts: string[] = [];
  let used = 0;
  for (let k = 0; words.length && used < length; k++) {
    const word = words[k % words.length];
    if (parts.length && used + word.length + 3 > length) break;
    parts.push(word);
    used += word.length + 3;
  }
  const spare = Math.max(0, length - used);
  let out = "";
  parts.forEach((word, j) => {
    const extra = Math.floor((spare * (j + 1)) / parts.length) - Math.floor((spare * j) / parts.length);
    out += `${word}${" ".repeat(1 + (extra >> 1))}*${" ".repeat(1 + extra - (extra >> 1))}`;
  });
  return toGlyphs(out.slice(0, length).padEnd(length, " "));
}

function makeProgram(gl: WebGL2RenderingContext, fragment: string, names: readonly string[]): Program {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("ascii stage: createShader failed");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`ascii stage: ${gl.getShaderInfoLog(shader)}`);
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  const p = gl.createProgram();
  if (!p) throw new Error("ascii stage: createProgram failed");
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`ascii stage: ${gl.getProgramInfoLog(p)}`);
  const u: Program["u"] = {};
  for (const name of names) u[name] = gl.getUniformLocation(p, name);
  return { p, u };
}

function makeTexture(gl: WebGL2RenderingContext, w: number, h: number, source?: TexImageSource, mipmaps = false) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
  else gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
  if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mipmaps ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

async function loadImage(src: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  return img;
}

export default function AsciiStage({
  className,
  onReady,
  onProgress,
}: {
  className?: string;
  onReady?: (ready: boolean) => void;
  /** How far the stage has got towards its first frame (0..1), and what it is doing. */
  onProgress?: (done: number, step: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: "high-performance",
    });
    const progress = (done: number, step: string) => onProgressRef.current?.(done, step);
    // without the stage the page still works as plain text, so the loader lets it through
    if (!gl) { progress(1, "ready"); return; }

    progress(0.12, "mixing the ink");
    let field: Program, blit: Program;
    try {
      field = makeProgram(gl, FIELD_FRAG, FIELD_UNIFORMS);
      blit = makeProgram(gl, BLIT_FRAG, BLIT_UNIFORMS);
    } catch (error) {
      console.warn(error);
      progress(1, "ready");
      return;
    }
    progress(0.35, "setting the type");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim()
      || "ui-monospace, monospace";
    const html = document.documentElement;
    const acts = Array.from(document.querySelectorAll<HTMLElement>("[data-act]"));
    const anchors = ANCHORS.map(name => document.querySelector<HTMLElement>(`[data-anchor="${name}"]`));
    const stops = Array.from(document.querySelectorAll<HTMLElement>("[data-stop]"));
    const stopWords = stops.map(el => (el.dataset.skills ?? "").toLowerCase().split(" * ").filter(Boolean));
    const stopLogos = stops.map(el => el.dataset.logo ?? "");
    const deckStage = document.querySelector<HTMLElement>("[data-deck]");
    const deckTrack = deckStage?.parentElement ?? null;
    const deckPrint = document.querySelector<HTMLElement>("[data-deck-print]");
    const sheetEls = Array.from(document.querySelectorAll<HTMLElement>("[data-sheet]")).slice(0, DECK_MAX_SHEETS);
    const printKeys = sheetEls.slice(1).map(el => el.dataset.print ?? "");

    const bounds = new Float32Array(6);
    const objRect = new Float32Array(ANCHORS.length * 4);
    const objState = new Float32Array(ANCHORS.length * 2);
    const loc = new Float32Array(2);
    const deck = new Float32Array([0, 0, -1, -1]);
    const vista = new Float32Array(4);
    const printBox = new Float32Array(DECK_MAX_SHEETS * 4);
    const journeyStage = document.querySelector<HTMLElement>("[data-journey]");
    const journeyHead = journeyStage?.firstElementChild instanceof HTMLElement ? journeyStage.firstElementChild : null;
    const morph = { x: 0, y: 0, size: 1, presence: 0, from: 0, to: 0, w: 0, spin: 0, dir: 1 };
    // The skills ring, traced cell by cell around the current card (see traceRing).
    const trace = {
      col: new Int32Array(RING_TRACE_MAX), row: new Int32Array(RING_TRACE_MAX), side: new Float32Array(RING_TRACE_MAX), n: 0,
    };
    const ringTexts = new Map<number, number[]>();
    let ringPixels = new Uint8Array(0);
    let ringLive = false, ringStale = false;
    const paper = hexRgb(COLORS.paper), ink = hexRgb(COLORS.ink);
    const rust = hexRgb(COLORS.rust), rustInv = hexRgb(COLORS.rustInv);

    let disposed = false;
    let ready = false;
    let raf = 0;
    let dpr = 1, devW = 0, devH = 0, cellW = 0, cellH = 0, cols = 0, rows = 0;
    let fieldTex: WebGLTexture | null = null;
    let fbo: WebGLFramebuffer | null = null;
    let atlasTex: WebGLTexture | null = null;
    // the name's own pass, on cells half the size (see stageShader.ts)
    let nameCellW = 0, nameCellH = 0, nameCols = 0, nameRows = 0;
    let nameFieldTex: WebGLTexture | null = null;
    let nameFbo: WebGLFramebuffer | null = null;
    let nameAtlasTex: WebGLTexture | null = null;
    let portraitTex: WebGLTexture | null = null;
    // the vista's ridges, worked out once a frame (see VISTA_GLSL): one texel per CSS px across
    // the screen and a margin either side, one row per layer
    let ridgeTex: WebGLTexture | null = null;
    let ridgeFbo: WebGLFramebuffer | null = null;
    let ridgeW = 0, ridgeMargin = 0;
    let ringTex: WebGLTexture | null = null;
    let logoTex: WebGLTexture | null = null;
    let logoCount = 0;
    let printGlyphTex: WebGLTexture | null = null;
    let printInkTex: WebGLTexture | null = null;
    const printTile = [1, 1];
    let printCount = 0;
    let nameTex: WebGLTexture | null = null;
    const nameFrame = [0, 0];
    let nameBox = { width: 0, height: 0 }, nameBaking = false, nameShown = false, nameTimer = 0;
    let portraitAspect = 0;
    let lastScroll = NaN, lastFrame = 0, lastDraw = -Infinity, dirty = true;
    let introStart = -1;
    let inkTop = false, inkBottom = false;
    const t0 = performance.now();
    const ptr = { x: -1e4, y: -1e4, s: 0, tx: -1e4, ty: -1e4, ts: 0 };

    // every glyph side by side, one w x h cell each (device px), white on transparent
    function buildAtlas(w: number, h: number, fontPx: number, weight = 500) {
      const c = document.createElement("canvas");
      c.width = w * GLYPHS.length;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx || !gl) return null;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${weight} ${fontPx}px ${family}`;
      GLYPHS.forEach((glyph, i) => ctx.fillText(glyph, i * w + w / 2, h / 2));
      return makeTexture(gl, c.width, c.height, c);
    }

    // a cols x rows field texture and the framebuffer that renders into it
    function makeTarget(w: number, h: number) {
      if (!gl) return { tex: null, target: null };
      const tex = makeTexture(gl, w, h);
      const target = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, target };
    }

    function resize() {
      if (!ready || !gl || !canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      devW = Math.max(1, Math.round(canvas.clientWidth * dpr));
      devH = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = devW;
      canvas.height = devH;
      // Whole device pixels per cell, so glyphs stay crisp and the grid never shimmers.
      const cell = canvas.clientWidth <= PHONE ? CELL_PHONE : CELL;
      const cw = Math.max(4, Math.round(cell.w * dpr));
      const ch = Math.max(6, Math.round(cell.h * dpr));
      const atlasStale = cw !== cellW || ch !== cellH || !atlasTex;
      cellW = cw;
      cellH = ch;
      const nc = Math.ceil(devW / cellW), nr = Math.ceil(devH / cellH);
      if (nc !== cols || nr !== rows || !fieldTex) {
        cols = nc;
        rows = nr;
        gl.deleteTexture(fieldTex);
        gl.deleteFramebuffer(fbo);
        ({ tex: fieldTex, target: fbo } = makeTarget(cols, rows));
        gl.deleteTexture(ringTex);
        ringTex = makeTexture(gl, cols, rows);
        ringPixels = new Uint8Array(cols * rows * 4);
        ringLive = false;
        ringStale = true;
      }
      if (atlasStale) {
        gl.deleteTexture(atlasTex);
        atlasTex = buildAtlas(cellW, cellH, Math.round(cell.font * dpr));
      }
      // the ridges reach far enough past the screen for the widest slope the shading reads
      const vwCss = devW / dpr, vhCss = devH / dpr;
      const margin = Math.ceil(Math.max(vwCss * 0.6, vhCss * 0.4));
      const rw = Math.ceil(vwCss) + 2 * margin;
      if (rw !== ridgeW || !ridgeTex) {
        ridgeW = rw;
        gl.deleteTexture(ridgeTex);
        gl.deleteFramebuffer(ridgeFbo);
        ({ tex: ridgeTex, target: ridgeFbo } = makeTarget(ridgeW, 4));
      }
      ridgeMargin = margin;
      // the name's grid: half-size cells, with the glyphs drawn at half size to fit them
      const nw = Math.max(3, Math.round(cellW / 2)), nh = Math.max(4, Math.round(cellH / 2));
      if (nw !== nameCellW || nh !== nameCellH || !nameAtlasTex) {
        gl.deleteTexture(nameAtlasTex);
        // heavy, so the small glyphs still carry ink
        nameAtlasTex = buildAtlas(nw, nh, Math.max(5, Math.round((cell.font * dpr) / 2)), 800);
      }
      nameCellW = nw;
      nameCellH = nh;
      const ncols = Math.ceil(devW / nw), nrows = Math.ceil(devH / nh);
      if (ncols !== nameCols || nrows !== nameRows || !nameFieldTex) {
        nameCols = ncols;
        nameRows = nrows;
        gl.deleteTexture(nameFieldTex);
        gl.deleteFramebuffer(nameFbo);
        ({ tex: nameFieldTex, target: nameFbo } = makeTarget(nameCols, nameRows));
      }
      dirty = true;
    }

    // The experience logo (where it is, what it is morphing between) and its skills ring.
    function measureJourney(rect: DOMRect | undefined, vw: number, vh: number, t: number) {
      morph.presence = 0;
      if (!rect || !stops.length) { clearRing(); return; }
      const count = stops.length;
      const p = journeyProgress(rect.top, rect.height, vh, count);
      const pe = dwell(p);
      // the stage is pinned in the middle of the section, and scrolls with it at either end
      const top = journeyStage ? journeyStage.getBoundingClientRect().top : rect.top;
      // narrow screens: the logo fills the room between the section head and the card
      const narrow = vw < NARROW ? {
        headBottom: journeyHead ? journeyHead.offsetTop + journeyHead.offsetHeight : vh * 0.2,
        cardHeights: stops.map(el => el.offsetHeight),
      } : undefined;
      const at = logoAt(pe, vw, vh, count, narrow);
      // it assembles while the section scrolls in, so it is whole by the time it pins
      morph.presence = smooth((0.85 - top / vh) / 0.55) * (rect.bottom > 0 ? 1 : 0);
      // narrow screens have the logo where the section's title is, so it waits for the title to
      // scroll away, then assembles before the first stop
      if (narrow) morph.presence *= smooth((p - P_START - INTRO_SPAN) / 0.3);
      morph.x = at.x;
      morph.y = top + at.y;
      morph.size = at.size;
      morph.from = at.from;
      morph.to = at.to;
      morph.w = at.w;
      morph.dir = at.dir;
      // a half turn per stop as you scroll, and a slow turn of its own
      morph.spin = (reduced ? 0 : t * 0.3) + pe * Math.PI;

      const i = Math.max(0, Math.min(count - 1, Math.round(pe)));
      const alpha = morph.presence * (1 - smooth((Math.abs(pe - i) - 0.04) / 0.2));
      if (alpha <= 0) { clearRing(); return; }
      const tilt = ORBIT.tilt * (at.x < vw / 2 ? 1 : -1);
      const frameW = morph.size * LOGO_FILL;
      // flatter on narrow screens, where there is little height to spare round the logo
      // and kept on screen
      const ry = (frameW / LOGO_AR) * (narrow ? ORBIT.ryNarrow : ORBIT.ry);
      const rx = narrow ? Math.min(frameW * ORBIT.rx, vw / 2 - Math.abs(morph.x - vw / 2) - 14) : frameW * ORBIT.rx;
      drawRing(i, morph.x, morph.y, rx, ry, tilt, alpha, reduced ? 0 : t * 0.2 + p * 1.6, t);
    }

    // Walk round the ellipse and list every cell it passes through, in order and 8-connected,
    // clockwise from the left so the near (lower) side reads left to right.
    function traceRing(cx: number, cy: number, rx: number, ry: number, tilt: number, cw: number, ch: number) {
      const steps = Math.min(20000, Math.ceil(ellipsePerimeter(rx, ry) / (Math.min(cw, ch) * 0.2)));
      const { col, row, side } = trace;
      const near = (a: number, b: number) => Math.abs(col[a] - col[b]) <= 1 && Math.abs(row[a] - row[b]) <= 1;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      let n = 0;
      for (let s = 0; s < steps && n < RING_TRACE_MAX; s++) {
        const a = Math.PI - (s / steps) * Math.PI * 2;
        const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
        const c = Math.floor((cx + ex * ct - ey * st) / cw), r = Math.floor((cy + ex * st + ey * ct) / ch);
        if (n && col[n - 1] === c && row[n - 1] === r) continue;
        // cutting a corner diagonally: drop the corner cell so the letters don't stair-step
        if (n >= 2 && Math.abs(col[n - 2] - c) <= 1 && Math.abs(row[n - 2] - r) <= 1) n--;
        col[n] = c; row[n] = r; side[n] = Math.sin(a); n++;
      }
      // close the loop without doubling up next to the first cell
      while (n > 2 && (col[n - 1] === col[0] && row[n - 1] === row[0] || near(n - 1, 0) && near(n - 2, 0))) n--;
      trace.n = n;
    }

    function clearRing() {
      if (!ringLive) return;
      ringPixels.fill(0);
      ringLive = false;
      ringStale = true;
    }

    // The ring of the current stop's skills: in order round the logo, crawling with `spin`.
    // The near (lower) half is strong and rust and passes in front; the far half is faint and
    // goes behind. It assembles and dissolves with `alpha`.
    function drawRing(i: number, cx: number, cy: number, rx: number, ry: number, tilt: number, alpha: number, spin: number, t: number) {
      const cw = cellW / dpr, ch = cellH / dpr;
      traceRing(cx, cy, rx, ry, tilt, cw, ch);
      const n = trace.n;
      if (n < 8) { clearRing(); return; }
      const key = i * 1e5 + n;
      let text = ringTexts.get(key);
      if (!text) {
        if (ringTexts.size > 64) ringTexts.clear();
        text = ringText(stopWords[i], n);
        ringTexts.set(key, text);
      }
      const turn = spin / (Math.PI * 2);
      const shift = Math.floor((turn - Math.floor(turn)) * n);
      const tick = Math.floor(t * 12);
      ringPixels.fill(0);
      for (let j = 0; j < n; j++) {
        const c = trace.col[j], r = trace.row[j];
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const o = (r * cols + c) * 4;
        const h = hash01(j, 911 + i);
        if (h > alpha) { if (alpha > 0.5) ringPixels[o + 2] = RING_CELL | (trace.side[j] < 0 ? RING_FAR : 0); continue; }
        let glyph = text[(j + shift) % n];
        // letters still arriving flicker through random glyphs
        if (!reduced && alpha < 0.999 && h > alpha - 0.15) glyph = NOISE_GLYPHS[Math.floor(hash01(j + tick * 131, 5) * NOISE_GLYPHS.length)];
        const front = smooth((trace.side[j] + 0.7) / 1.4);
        ringPixels[o] = glyph;
        ringPixels[o + 1] = Math.round((0.4 + 0.6 * front) * 255);
        ringPixels[o + 2] = RING_CELL | RING_GLYPH | (front > 0.75 ? RING_RUST : 0) | (trace.side[j] < 0 ? RING_FAR : 0);
      }
      ringLive = true;
      ringStale = true;
    }

    // The work vista: how far the landscape has panned, the time of day, and where each print sits.
    let vistaNight = false;
    function measureDeck(vh: number) {
      deck[2] = -1;
      vistaNight = false;
      if (!deckStage || !deckTrack || sheetEls.length < 2) return;
      const tr = deckTrack.getBoundingClientRect();
      if (tr.bottom < 0 || tr.top > vh) return;
      const sr = deckStage.getBoundingClientRect();
      const sw = sr.width, sh = sr.height, n = sheetEls.length;
      const pe = dwell(deckProgress(tr.top, tr.height, vh, n));
      const sky = skyAt(pe, n);
      deck.set([sr.top, sh, pe, n]);
      vista.set([sky.night, sky.sun, sky.moon, sw * DECK_PAN]);
      vistaNight = sky.night > 0.75 && sr.top < 36 && sr.bottom > 36;
      const box = deckPrint ? boxIn(deckPrint, deckStage) : { x: 0, y: 0, w: sw, h: sh };
      const head = deckStage.firstElementChild instanceof HTMLElement ? deckStage.firstElementChild : null;
      const headBottom = head ? head.offsetTop + head.offsetHeight + 18 : 0;
      for (let k = 0; k < n; k++) {
        const top = Math.max(box.y, headBottom);
        let bottom = box.y + box.h;
        // narrow screens: the print fills the room between the section head and the card
        if (sw < DECK_NARROW) bottom = Math.min(bottom, boxIn(sheetEls[k], deckStage).y - 14);
        printBox.set([box.x, top, box.w, Math.max(0, bottom - top)], k * 4);
      }
    }

    function loadPrints() {
      if (!gl || !printKeys.length) return;
      const tiles = buildPrintTiles(printKeys);
      const upload = (data: Uint8Array, mipmaps: boolean) => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, tiles.W, tiles.H * tiles.count, 0, gl.RED, gl.UNSIGNED_BYTE, data);
        if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mipmaps ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
      };
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      printGlyphTex = upload(tiles.glyph, false);
      printInkTex = upload(tiles.ink, true);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      printTile[0] = tiles.W;
      printTile[1] = tiles.H;
      printCount = tiles.count;
    }

    function showName(on: boolean) {
      if (on === nameShown) return;
      nameShown = on;
      if (on) html.setAttribute("data-ascii-name", ""); else html.removeAttribute("data-ascii-name");
    }

    async function bakeName() {
      const el = anchors[3];
      if (!el || !gl || nameBaking || disposed) return;
      nameBaking = true;
      try {
        const field = await buildNameField(el);
        if (disposed || !field) return;
        if (!nameTex) nameTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, nameTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, field.width, field.height, 0, gl.RGBA, gl.FLOAT, field.data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        nameFrame[0] = field.frame[0];
        nameFrame[1] = field.frame[1];
        nameBox = field.box;
        dirty = true;
      } catch (error) {
        console.warn("ascii stage: name", error);
      } finally {
        nameBaking = false;
      }
    }

    function scheduleNameBake() {
      if (nameTimer || nameBaking || !ready) return;
      nameTimer = window.setTimeout(() => { nameTimer = 0; void bakeName(); }, 200);
    }

    // Read the page: section seams, anchors, and how far along each part is.
    function measure(vw: number, vh: number, t: number) {
      const rects = acts.map(el => el.getBoundingClientRect());
      for (let i = 0; i < 5; i++) bounds[i] = rects[i] ? rects[i].top : 1e6;
      bounds[5] = rects.length ? rects[rects.length - 1].bottom : 1e6;

      anchors.forEach((el, k) => {
        if (!el) { objState[k * 2] = 0; return; }
        const r = el.getBoundingClientRect();
        objRect.set([r.left, r.top, r.width, r.height], k * 4);
        const cy = r.top + r.height / 2;
        // Whole while the anchor's middle is anywhere from 0.35 to 0.9 of the screen height;
        // assembles below that band, blows apart above it.
        const enter = smooth((1.3 * vh - cy) / (0.4 * vh));
        // The hand is the last thing on the page: it stays whole at the bottom.
        const leave = k === 2 ? 0 : clamp01((0.35 * vh - cy) / (0.5 * vh));
        objState[k * 2] = enter * (1 - smooth(leave));
        objState[k * 2 + 1] = leave;
        if (k === 3) {
          // only in the two-column layout: on phones, tablets and narrow windows the cells are
          // too small for it to read, so the page keeps its own text there
          const readable = r.height >= NAME_MIN_PX && vw >= NARROW;
          if (!readable || nameFrame[0] <= 0) objState[k * 2] = 0;
          showName(readable && nameFrame[0] > 0);
          // the font size follows the viewport: bake again once it settles at a new size
          if (Math.abs(r.width - nameBox.width) > 2 || Math.abs(r.height - nameBox.height) > 2) scheduleNameBake();
        }
      });

      const [, about, experience, , contact] = rects;
      measureJourney(experience, vw, vh, t);
      measureDeck(vh);
      loc[0] = about ? -about.top / vh : 0;
      loc[1] = contact ? -contact.top / vh : 0;

      // Let the fixed bars know when the ink section is under them.
      const top = (!!experience && experience.top < 36 && experience.bottom > 36) || vistaNight;
      const bottom = !!experience && experience.top < vh - 28 && experience.bottom > vh - 28;
      if (top !== inkTop) { inkTop = top; if (top) html.setAttribute("data-ink-top", ""); else html.removeAttribute("data-ink-top"); }
      if (bottom !== inkBottom) { inkBottom = bottom; if (bottom) html.setAttribute("data-ink-bottom", ""); else html.removeAttribute("data-ink-bottom"); }
    }

    function draw(now: number) {
      if (!gl || !fieldTex || !atlasTex) return;
      const vw = devW / dpr, vh = devH / dpr;
      const t = reduced ? 0 : (now - t0) / 1000;
      measure(vw, vh, t);
      const intro = introStart < 0 ? 1 : clamp01((now - introStart) / INTRO_MS);
      if (intro >= 1) introStart = -1;

      const fu = field.u;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, cols, rows);
      gl.useProgram(field.p);
      gl.uniform2f(fu.uCell, cellW / dpr, cellH / dpr);
      gl.uniform2f(fu.uView, vw, vh);
      gl.uniform1f(fu.uT, t);
      gl.uniform1f(fu.uMotion, reduced ? 0 : 1);
      gl.uniform1fv(fu.uBounds, bounds);
      gl.uniform4fv(fu.uObjRect, objRect);
      gl.uniform2fv(fu.uObjState, objState);
      gl.uniform2fv(fu.uLoc, loc);
      gl.uniform3f(fu.uPtr, ptr.x, ptr.y, ptr.s);
      gl.uniform1f(fu.uIntro, intro);
      gl.uniform1f(fu.uPortraitAspect, portraitAspect);
      gl.uniform4f(fu.uMorph, morph.x, morph.y, morph.size, morph.presence);
      gl.uniform4f(fu.uMorphFx, morph.from, morph.to, morph.w, morph.spin);
      gl.uniform1f(fu.uWipeDir, morph.dir);
      gl.uniform4fv(fu.uDeck, deck);
      gl.uniform4fv(fu.uVista, vista);
      gl.uniform4fv(fu.uPrintBox, printBox);
      gl.uniform2f(fu.uPrintTile, printTile[0], printTile[1]);
      gl.uniform1i(fu.uPrintCount, printInkTex ? printCount : 0);
      gl.activeTexture(gl.TEXTURE8);
      gl.bindTexture(gl.TEXTURE_2D, printGlyphTex);
      gl.uniform1i(fu.uPrintGlyph, 8);
      gl.activeTexture(gl.TEXTURE9);
      gl.bindTexture(gl.TEXTURE_2D, printInkTex);
      gl.uniform1i(fu.uPrintInk, 9);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, logoTex);
      gl.uniform1i(fu.uLogos, 4);
      gl.uniform1i(fu.uLogoCount, logoTex ? logoCount : 0);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, ringTex);
      if (ringStale) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RGBA, gl.UNSIGNED_BYTE, ringPixels);
        ringStale = false;
      }
      gl.uniform1i(fu.uRing, 3);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, portraitTex);
      gl.uniform1i(fu.uPortrait, 2);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, nameTex);
      gl.uniform1i(fu.uName, 5);
      gl.uniform2f(fu.uNameFrame, nameTex ? nameFrame[0] : 0, nameFrame[1]);
      gl.uniform1i(fu.uNamePass, 0);
      gl.uniform1f(fu.uRidgeMargin, ridgeMargin);
      // the vista's ridges first, while the ridge texture is bound nowhere
      gl.activeTexture(gl.TEXTURE10);
      gl.bindTexture(gl.TEXTURE_2D, null);
      if (deck[2] >= 0 && ridgeFbo) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, ridgeFbo);
        gl.viewport(0, 0, ridgeW, 4);
        gl.uniform1i(fu.uRidgePass, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, cols, rows);
      }
      gl.uniform1i(fu.uRidgePass, 0);
      gl.bindTexture(gl.TEXTURE_2D, ridgeTex);
      gl.uniform1i(fu.uRidge, 10);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // the name, on its own finer grid, only while it is on screen
      const nameOn = !!(nameTex && nameFbo && nameAtlasTex) && objState[6] > 0;
      if (nameOn) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, nameFbo);
        gl.viewport(0, 0, nameCols, nameRows);
        gl.uniform2f(fu.uCell, nameCellW / dpr, nameCellH / dpr);
        gl.uniform1i(fu.uNamePass, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      const bu = blit.u;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, devW, devH);
      gl.useProgram(blit.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTex);
      gl.uniform1i(bu.uField, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.uniform1i(bu.uAtlas, 1);
      gl.uniform2i(bu.uCellDev, cellW, cellH);
      gl.uniform1i(bu.uDevH, devH);
      gl.uniform3fv(bu.uPaper, paper);
      gl.uniform3fv(bu.uInk, ink);
      gl.uniform3fv(bu.uRust, rust);
      gl.uniform3fv(bu.uRustInv, rustInv);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, nameFieldTex);
      gl.uniform1i(bu.uNameField, 6);
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, nameAtlasTex);
      gl.uniform1i(bu.uNameAtlas, 7);
      gl.uniform2i(bu.uNameCellDev, nameOn ? nameCellW : 0, nameCellH);
      gl.uniform4fv(bu.uDeck, deck);
      gl.uniform4fv(bu.uVista, vista);
      gl.uniform1i(bu.uRidge, 10);
      gl.uniform1f(bu.uRidgeMargin, ridgeMargin);
      gl.uniform3f(bu.uPtr, ptr.x, ptr.y, ptr.s);
      gl.uniform2f(bu.uView, vw, vh);
      gl.uniform1f(bu.uT, t);
      gl.uniform1f(bu.uMotion, reduced ? 0 : 1);
      gl.uniform2f(bu.uCellCss, cellW / dpr, cellH / dpr);
      gl.uniform1f(bu.uDpr, dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // Unbind the fields so the next passes never render into a texture bound for sampling.
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - (lastFrame || now)) / 1000);
      lastFrame = now;
      const k = 1 - Math.pow(0.85, dt * 60);
      ptr.x += (ptr.tx - ptr.x) * k;
      ptr.y += (ptr.ty - ptr.y) * k;
      ptr.s += (ptr.ts - ptr.s) * k * 0.6;
      const scrolled = window.scrollY !== lastScroll;
      // Scrolling redraws every frame so the seams and anchors never lag the page.
      const busy = dirty || scrolled || introStart >= 0;
      if (!busy && now - lastDraw < (reduced ? 250 : IDLE_MS)) return;
      dirty = false;
      lastScroll = window.scrollY;
      lastDraw = now;
      draw(now);
    }

    const onResize = () => resize();
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (ptr.s < 0.01) { ptr.x = event.clientX; ptr.y = event.clientY; }
      ptr.tx = event.clientX;
      ptr.ty = event.clientY;
      ptr.ts = 1;
    };
    const onPointerAway = () => { ptr.ts = 0; };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      onReadyRef.current?.(false);
    };

    window.addEventListener("resize", onResize);
    canvas.addEventListener("webglcontextlost", onContextLost);
    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      html.addEventListener("mouseleave", onPointerAway);
      window.addEventListener("blur", onPointerAway);
    }

    (async () => {
      let loaded = 0;
      const step = <T,>(work: Promise<T>, label: string) => work.finally(() => {
        loaded++;
        if (!disposed) progress(0.35 + loaded * 0.25, label);
      });
      const [, portrait] = await Promise.allSettled([
        step(document.fonts.load(`500 ${CELL.font}px ${family}`), "inking the portrait"),
        step(loadImage(PORTRAIT_SRC), "pulling the first print"),
      ]);
      if (disposed) return;
      if (portrait.status === "fulfilled") {
        const img = portrait.value;
        portraitTex = makeTexture(gl, img.naturalWidth, img.naturalHeight, img, true);
        portraitAspect = img.naturalWidth / img.naturalHeight;
      }
      ready = true;
      loadPrints();
      resize();
      if (!reduced) introStart = performance.now();
      draw(performance.now());   // a frame exists before the page goes see-through
      onReadyRef.current?.(true);
      progress(1, "ready");
      raf = requestAnimationFrame(frame);

      // The name and the logos are baked into distance fields after the first frame, off the
      // critical path.
      await bakeName();
      if (disposed || !stops.length) return;
      try {
        const atlas = await buildLogoAtlas(stopLogos);
        if (disposed) return;
        logoTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, logoTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, atlas.width, atlas.height, 0, gl.RGBA, gl.FLOAT, atlas.data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        logoCount = atlas.count;
        dirty = true;
      } catch (error) {
        console.warn("ascii stage: logos", error);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener("pointermove", onPointerMove);
      html.removeEventListener("mouseleave", onPointerAway);
      window.removeEventListener("blur", onPointerAway);
      html.removeAttribute("data-ink-top");
      html.removeAttribute("data-ink-bottom");
      html.removeAttribute("data-ascii-name");
      window.clearTimeout(nameTimer);
      gl.deleteProgram(field.p);
      gl.deleteProgram(blit.p);
      gl.deleteTexture(fieldTex);
      gl.deleteTexture(atlasTex);
      gl.deleteTexture(portraitTex);
      gl.deleteTexture(ringTex);
      gl.deleteTexture(logoTex);
      gl.deleteTexture(nameTex);
      gl.deleteTexture(printGlyphTex);
      gl.deleteTexture(ridgeTex);
      gl.deleteFramebuffer(ridgeFbo);
      gl.deleteTexture(printInkTex);
      gl.deleteTexture(nameFieldTex);
      gl.deleteTexture(nameAtlasTex);
      gl.deleteFramebuffer(fbo);
      gl.deleteFramebuffer(nameFbo);
      onReadyRef.current?.(false);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
