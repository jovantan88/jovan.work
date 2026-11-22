/*
 * The experience "journey": a pinned section where each stop has its company's logo (in ASCII,
 * extruded) and its own backdrop. Cards alternate sides; the logo sits opposite the current
 * card, and between stops it morphs into the next logo while it swings across.
 * Shared by the DOM cards (Journey.tsx) and the stage (AsciiStage.tsx / stageShader.ts).
 */

import { LOGO_AR } from "./logoField";

export const P_START = -0.75;       // progress when the section pins: the first card is still on its way
export const INTRO_SPAN = 0.45;     // stops of scrolling, from P_START, over which the section's title fades out
export const P_END = 0.3;           // progress past the last stop when the section lets go
export const SCROLL_PER_STOP = 1.1; // screens of scrolling per stop
export const BACKDROPS = 4;         // backdrops the shader knows, used in turn
// The logo camera (renderLogo in stageShader.ts): close enough for real perspective on the
// extrusion. LOGO_FILL is the logo frame's width as a share of its render box.
export const LOGO_CAM = { dist: 3.2, focal: 2.0 };
export const LOGO_FILL = (LOGO_AR / 2) * (LOGO_CAM.focal / LOGO_CAM.dist);
export const NARROW = 900;          // below this width the card sits under the logo
export const CARD_BOTTOM = 76;      // narrow: the card hangs this far above the bottom, clear of the counter

/** Narrow screens: the logo fills the room between the section head and the current card. */
export type NarrowLayout = { headBottom: number; cardHeights: number[] };

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const journeyRange = (count: number) => count - 1 - P_START + P_END;
export const journeyHeightSvh = (count: number) => journeyRange(count) * SCROLL_PER_STOP * 100 + 100;

/** Raw progress in stops (0 = first stop, count - 1 = last) from the section's rect. */
export function journeyProgress(top: number, height: number, vh: number, count: number) {
  const travel = Math.max(1, height - vh);
  return P_START + clamp01(-top / travel) * journeyRange(count);
}

/** Hold nearly still at each stop and change quickly between them (with a slow creep, so it never freezes). */
export function dwell(p: number) {
  const i = Math.floor(p), f = p - i;
  return i + 0.15 * f + 0.85 * smoothstep(0.25, 0.75, f);
}

/** Document scroll position that parks stop i. */
export function scrollForStop(i: number, sectionDocTop: number, height: number, vh: number, count: number) {
  return sectionDocTop + ((i - P_START) / journeyRange(count)) * (height - vh);
}

/** -1: stop i's card is on the left (logo on the right); 1: the other way round. */
export const sideOf = (i: number) => (i % 2 === 0 ? -1 : 1);

/**
 * Where stop i's card sits while it is current, in px within the pinned stage: its centre, or
 * on narrow screens the middle of its bottom edge (it hangs from there, whatever its height).
 */
export function cardSpot(i: number, vw: number, vh: number) {
  const s = sideOf(i);
  if (vw < NARROW) return { x: vw / 2 + s * vw * 0.02, y: vh - CARD_BOTTOM };
  return { x: vw / 2 + s * vw * 0.22, y: vh * 0.53 };
}

/** Where stop i's logo sits: centre, and the size of its render box (px within the pinned stage). */
export function logoSpot(i: number, vw: number, vh: number, layout?: NarrowLayout) {
  const s = -sideOf(i);
  if (vw < NARROW) {
    const top = (layout?.headBottom ?? vh * 0.2) + 12;
    const bottom = vh - CARD_BOTTOM - (layout?.cardHeights[i] ?? vh * 0.42) - 14;
    const h = Math.max(vh * 0.14, bottom - top);
    return { x: vw / 2 + s * vw * 0.03, y: top + h / 2, size: Math.min(vw * 0.9, h * LOGO_AR) / LOGO_FILL };
  }
  return { x: vw / 2 + s * vw * 0.23, y: vh * 0.5, size: Math.min(vw * 0.42, vh * 0.62 * LOGO_AR, 660) / LOGO_FILL };
}

/**
 * The logo at eased progress pe: the two stops it is between, how far the morph has got
 * (0..1), and where it is. It swings across in an arc, shrinking a little mid-flight.
 */
export function logoAt(pe: number, vw: number, vh: number, count: number, layout?: NarrowLayout) {
  const last = Math.max(0, count - 1);
  const q = Math.max(0, Math.min(last, pe));
  const i = Math.min(Math.max(0, last - 1), Math.floor(q));
  const w = count > 1 ? smoothstep(0.08, 0.92, q - i) : 0;
  const a = logoSpot(i, vw, vh, layout), b = logoSpot(Math.min(last, i + 1), vw, vh, layout);
  const arc = Math.sin(Math.PI * w);
  return {
    from: i,
    to: Math.min(last, i + 1),
    w,
    x: lerp(a.x, b.x, w),
    y: lerp(a.y, b.y, w) - arc * vh * 0.07,
    size: lerp(a.size, b.size, w) * (1 - 0.22 * arc),
    dir: b.x >= a.x ? 1 : -1,
  };
}
