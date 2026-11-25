/*
 * The work "vista": a pinned, full-screen ASCII landscape that the projects travel through.
 * Scrolling pans the world sideways; each depth layer (far ranges, nearer ridges, hills, the
 * grass underfoot) moves at its own speed, so the scene opens up in parallax. Every project's
 * print (projectPrints.json) hangs in the sky beside its card, and the pair slides in together.
 * Over the section the evening warms the sky and night falls, with fireflies and shooting stars.
 * Shared by the DOM cards (Deck.tsx) and the stage (AsciiStage.tsx / stageShader.ts).
 */

import artwork from "./projectPrints.json";
import { dwell } from "./journeyMath";

export { dwell };

export const DECK_P_END = 0.35;      // sheets of scrolling past the last one before the section lets go
export const SCROLL_PER_SHEET = 1.05; // screens of scrolling per sheet
export const DECK_NARROW = 900;      // below this width the card hangs at the bottom, under the print
export const DECK_CARD_BOTTOM = 76;  // narrow: the card hangs this far above the bottom of the stage
export const DECK_MAX_SHEETS = 8;    // the shader's limit, cover included
export const DECK_PAN = 0.95;        // the print and card layer moves this many screen widths per project

export const PRINT_CAPTIONS: Record<string, string> = {
  iris: "iris scan",
  reel: "film reel",
  globe: "society graph",
  stairs: "career pathways",
  garment: "garment study",
  map: "event atlas",
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const deckRange = (sheets: number) => Math.max(0, sheets - 1) + DECK_P_END;
export const deckHeightSvh = (sheets: number) => deckRange(sheets) * SCROLL_PER_SHEET * 100 + 100;

/** Raw progress in sheets (0 = the cover, sheets - 1 = the last project) from the track's rect. */
export function deckProgress(top: number, height: number, vh: number, sheets: number) {
  const travel = Math.max(1, height - vh);
  return clamp01(-top / travel) * deckRange(sheets);
}

/** Document scroll position that lays sheet i flat on top. */
export function scrollForSheet(i: number, trackDocTop: number, height: number, vh: number, sheets: number) {
  return trackDocTop + (i / deckRange(sheets)) * Math.max(1, height - vh);
}

/** How far sheet k (0 = the cover) sits from the middle of the screen, in px, at eased progress pe. */
export const sheetShift = (k: number, pe: number, vw: number) => (k - pe) * vw * DECK_PAN;

/** The sky at eased progress pe: sun 0..1 (how far into the evening), night 0..1, moon 0..1 (late night). */
export function skyAt(pe: number, sheets: number) {
  const t = clamp01(pe / Math.max(1, sheets - 1));
  return { sun: smoothstep(0.05, 0.62, t), night: smoothstep(0.5, 0.9, t), moon: smoothstep(0.6, 1, t) };
}

/**
 * The prints as one texture: a tile per project, stacked top to bottom, each cropped to its art
 * and centred, with crop marks in the corners and a caption along the bottom.
 * glyph = printable ASCII minus 32, ink = density 0..255.
 */
const PRINT_RAMP = " .:;i=+*ox%#@";
export function buildPrintTiles(keys: string[]) {
  const art = artwork as Record<string, string[]>;
  const crops = keys.map(key => {
    const rows = art[key] ?? [];
    let x0 = Infinity, x1 = 0, y0 = Infinity, y1 = -1;
    rows.forEach((row, y) => {
      const first = row.search(/\S/);
      if (first < 0) return;
      x0 = Math.min(x0, first);
      x1 = Math.max(x1, row.trimEnd().length);
      y0 = Math.min(y0, y);
      y1 = y;
    });
    if (y1 < 0) return { rows: [] as string[], w: 0, h: 0 };
    const cut = rows.slice(y0, y1 + 1).map(row => row.slice(x0, x1).padEnd(x1 - x0));
    return { rows: cut, w: x1 - x0, h: cut.length };
  });
  const artW = Math.max(1, ...crops.map(c => c.w));
  const artH = Math.max(1, ...crops.map(c => c.h));
  const W = artW + 6, H = artH + 5;
  const count = Math.max(1, keys.length);
  const glyph = new Uint8Array(W * H * count);
  const ink = new Uint8Array(W * H * count);

  crops.forEach((crop, t) => {
    const put = (x: number, y: number, ch: string, d?: number) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const code = ch.charCodeAt(0) - 32;
      if (code <= 0 || code >= 95) return;
      const i = (t * H + y) * W + x;
      glyph[i] = code;
      const r = PRINT_RAMP.indexOf(ch);
      ink[i] = Math.round((d ?? (r > 0 ? r / (PRINT_RAMP.length - 1) : 0.5)) * 255);
    };
    const ox = 3 + Math.floor((artW - crop.w) / 2), oy = 2 + Math.floor((artH - crop.h) / 2);
    crop.rows.forEach((row, y) => [...row].forEach((ch, x) => put(ox + x, oy + y, ch)));
    // crop marks
    for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [W - 1, 0, -1, 1], [0, H - 1, 1, -1], [W - 1, H - 1, -1, -1]]) {
      put(cx, cy, "+", 0.4);
      put(cx + sx, cy, "-", 0.3);
      put(cx + 2 * sx, cy, "-", 0.3);
      put(cx, cy + sy, "|", 0.3);
    }
    const caption = `fig. ${String(t + 1).padStart(2, "0")} / ${PRINT_CAPTIONS[keys[t]] ?? keys[t]}`;
    [...caption].forEach((ch, x) => put(4 + x, H - 1, ch, 0.62));
  });
  return { W, H, count, glyph, ink };
}

/** An element's layout box within `stage` (its offset parents, so CSS transforms don't count). */
export function boxIn(el: HTMLElement, stage: HTMLElement) {
  let x = 0, y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== stage) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
