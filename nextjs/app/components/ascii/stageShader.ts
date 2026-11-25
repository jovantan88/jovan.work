/*
 * The ASCII stage: one shader pass per character cell, then a blit through a glyph atlas.
 *
 * Every cell first works out which section of the page it sits over (with a torn,
 * dithered edge between sections), and draws that section's backdrop:
 *   hello, about, contact  -> paper with faint registration marks
 *   experience             -> inverted ink, pinned: every stop has its company's logo, extruded
 *                             into 3D, and its own backdrop. Between stops the logo morphs into
 *                             the next one as it swings across, and the new backdrop wipes in
 *                             behind it. A ring of the stop's skills orbits the logo.
 *   work                   -> pinned: a full-screen landscape in four parallax layers that pans
 *                             as you scroll (see deckMath.ts). Each project's print hangs in the
 *                             sky beside its card; birds, a boat and chimney smoke move through
 *                             it, and evening warms into a night of fireflies and falling stars.
 * On top, four objects sit where the page reserves room for them (DOM anchors):
 *   0 portrait of Jovan (from a cutout photo), 1 a puzzle cube that twists, 2 a waving hand,
 *   3 the hero name, in 3D (from nameField.ts). The name has a pass of its own on a grid of
 *     half-size cells (uNamePass), which the blit lays over the main grid, so its letters get
 *     twice the rows at the same size.
 * Each object assembles as it scrolls in and blows apart upward as it scrolls out; the
 * dissolving edge scrambles through random glyphs.
 *
 * Glyph indices are printable ASCII minus 32 (space = 0), so any text can be drawn.
 * Field texture: r = glyph index, g = tone (0 ink, 1 rust), b = strength 0..1,
 * a = 1 inverted, 0.25 / 0.375 the work vista (whose tints the blit paints per pixel).
 */

import { BACKDROPS, LOGO_CAM } from "./journeyMath";
import { DECK_MAX_SHEETS } from "./deckMath";
import { LOGO_AR, LOGO_TILE_H, LOGO_TILE_W } from "./logoField";

export const GLYPHS = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
const RAMP = " .,:;-~=+*#%@";         // density, light to heavy
const NOISE = "01/\\<>[]{}?$&x";       // scramble
const g = (c: string) => c.charCodeAt(0) - 32;
const list = (s: string) => [...s].map(g).join(", ");

/**
 * A little ASCII drawing as GLSL: NAME(p) gives the glyph at cell p (0, 0 top left), or -1 where
 * it is see-through (a space). A backtick is a solid blank: it hides what is behind but prints
 * nothing. NAME_SIZE is its size in cells.
 */
function sprite(name: string, rows: string[]) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const cells = rows.flatMap(r => [...r.padEnd(w)].map(c => (c === " " ? -1 : c === "`" ? 0 : g(c))));
  return `const ivec2 ${name}_SIZE = ivec2(${w}, ${h});
const int ${name}_G[${w * h}] = int[${w * h}](${cells.join(", ")});
int ${name}(ivec2 p) { return p.x < 0 || p.y < 0 || p.x >= ${w} || p.y >= ${h} ? -1 : ${name}_G[p.y * ${w} + p.x]; }`;
}

/** Text to glyph indices; anything outside printable ASCII becomes a space. */
export function toGlyphs(text: string) {
  return [...text].map(c => { const v = c.charCodeAt(0) - 32; return v >= 0 && v < 95 ? v : 0; });
}
export const NOISE_GLYPHS = toGlyphs(NOISE);

/**
 * The skills ring is traced on the CPU (so every letter lands in its own cell, in order) and
 * handed over as a cols x rows texture: r = glyph, g = strength, b = RING_* flags.
 */
export const RING_CELL = 1, RING_RUST = 2, RING_GLYPH = 4, RING_FAR = 8;

/** Hashing and gradient noise, shared by the field and the blit. */
const NOISE_GLSL = `const float PI = 3.14159265;
uint hashU(uvec2 v) {
  v = v * uvec2(0x9E3779B1u, 0x85EBCA77u);
  uint h = v.x ^ (v.y + 0x7F4A7C15u);
  h ^= h >> 15; h *= 0x2C1B3C6Du;
  h ^= h >> 12; h *= 0x297A2D39u;
  h ^= h >> 15;
  return h;
}
float hash01(ivec2 p) { return float(hashU(uvec2(p + ivec2(1 << 20))) >> 8) / 16777216.0; }
vec2 gradAt(ivec2 p) { float a = hash01(p) * 2.0 * PI; return vec2(cos(a), sin(a)); }
float gnoise(vec2 p) {
  vec2 i = floor(p), f = p - i;
  ivec2 q = ivec2(i);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = dot(gradAt(q), f);
  float b = dot(gradAt(q + ivec2(1, 0)), f - vec2(1.0, 0.0));
  float c = dot(gradAt(q + ivec2(0, 1)), f - vec2(0.0, 1.0));
  float d = dot(gradAt(q + ivec2(1, 1)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4;
}
float fbm1(float x, float seed) {
  float a = 0.0, w = 0.5, f = 1.0;
  for (int i = 0; i < 4; i++) { a += w * gnoise(vec2(x * f, seed + float(i) * 7.3)); f *= 2.03; w *= 0.5; }
  return a;
}`;

/**
 * The work vista's shape, shared by the field (which places its characters) and the blit
 * (which paints its tints per pixel, so edges stay smooth rather than stepping cell by cell).
 * The ridges are worked out once a frame by the field's ridge pass into uRidge: one texel per
 * CSS px across the screen and a margin either side, one row per layer, y packed in 16 bits.
 * The including shader declares uPtr, uView and uMotion.
 */
const VISTA_GLSL = `uniform vec4 uDeck;          // work vista: stage top, stage height (CSS px), eased progress in sheets (< 0: off), sheets
uniform vec4 uVista;         // night 0..1, evening 0..1, (unused), px the prints pan per sheet
uniform highp sampler2D uRidge;
uniform float uRidgeMargin;  // CSS px the ridge texture reaches past each side of the screen

// Depth layers, back to front: parallax factor, ridge base and relief (shares of the stage
// height), feature size (px). Two ranges with peaks, rolling hills, the ground underfoot.
const vec4 LAYERS[4] = vec4[4](vec4(0.1, 0.6, 0.34, 300.0), vec4(0.3, 0.71, 0.22, 210.0),
                               vec4(0.62, 0.89, 0.17, 200.0), vec4(1.45, 0.955, 0.045, 130.0));
const float WATER = 0.745;   // the lake's surface, as a share of the stage height
// tints for the lit and shadowed faces of the three back layers: by day ink on paper, lighter
// with distance; by night paper on ink, so the far ranges glow faintly in the haze
const vec2 TINT_DAY[3] = vec2[3](vec2(0.06, 0.15), vec2(0.12, 0.3), vec2(0.3, 0.46));
const vec2 TINT_NIGHT[3] = vec2[3](vec2(0.16, 0.11), vec2(0.1, 0.065), vec2(0.05, 0.03));

vec2 gLook;   // the pointer, -1..1 from the middle of the screen (0 with no pointer)
void vistaLook() { gLook = clamp((uPtr.xy - uView * 0.5) / (uView * 0.5), -1.0, 1.0) * uPtr.z * uMotion; }

// how far a layer has panned: with the scroll, and a little with the pointer
float layerPan(float f) { return uDeck.z * uVista.w * f + gLook.x * 46.0 * f; }
// a layer's height at world x, 0..1
float ridgeR(int l, float wx) {
  vec4 L = LAYERS[l];
  float n = fbm1(wx / L.w, float(l) * 13.1 + 2.0);
  if (l < 2) {
    // ridged noise makes peaks, on a slow swell so the range rises and falls
    float peak = clamp(1.0 - abs(n) * 1.9, 0.0, 1.0);
    return 0.3 * (0.5 + 0.5 * gnoise(vec2(wx / (L.w * 3.1), float(l) * 5.0))) + 0.7 * peak * peak;
  }
  // the hills dip into the lake between rises
  return clamp((0.5 + 0.5 * n) * 1.35 - 0.2, 0.0, 1.0);
}
// the ridge's y (stage px) at screen x, worked out from scratch (the ridge pass)
float ridgeCalc(int l, float sx) {
  vec4 L = LAYERS[l];
  return uDeck.y * (L.y - L.z * ridgeR(l, sx + layerPan(L.x))) + gLook.y * 16.0 * L.x;
}
float ridgeDecode(vec4 t) { return ((t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0 * 2.0 - 0.5) * uDeck.y; }
// ...and read back from the ridge texture, between texels
float ridgeY(int l, float sx) {
  float t = sx + uRidgeMargin - 0.5;
  int w = textureSize(uRidge, 0).x;
  int i = clamp(int(floor(t)), 0, w - 2);
  float f = clamp(t - float(i), 0.0, 1.0);
  return mix(ridgeDecode(texelFetch(uRidge, ivec2(i, l), 0)), ridgeDecode(texelFetch(uRidge, ivec2(i + 1, l), 0)), f);
}
// how tall the layer stands at a ridge height y, 0..1
float ridgeShare(int l, float y) { vec4 L = LAYERS[l]; return (L.y * uDeck.y + gLook.y * 16.0 * L.x - y) / (L.z * uDeck.y); }
// Which way the face at (sx, y) turns: falling to the right faces the sun. Near the ridge it
// follows the local slope; deeper down, broader and broader shapes, so the line between light
// and shade runs down from each peak and the faces spread as they descend.
bool faceLit(int l, float sx, float y, float ridge) {
  float span = LAYERS[l].w * 0.04 + max(y - ridge, 0.0) * 0.9;
  return ridgeY(l, sx + span) - ridgeY(l, sx - span) > 0.0;
}
bool isSnow(int l, float share, float depth) { return l < 2 && share > 0.62 && depth < 0.07 * (share - 0.55) / 0.45; }
// alpenglow: as the sun goes down, the faces turned to it and the snow warm to rust
float alpenglow(int l) { return l == 2 ? 0.0 : smoothstep(0.15, 0.55, uVista.y) * (1.0 - smoothstep(0.8, 1.0, uVista.y)); }
// night falls as a wipe from the top of the sky down: true past this line
float nightLine(float sy) { return uVista.x * 1.3 - 0.3 * (sy / uDeck.y) - 0.5; }

float waterY() { return uDeck.y * WATER + gLook.y * 16.0 * 0.4; }`;

export const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FIELD_UNIFORMS = [
  "uCell", "uView", "uT", "uMotion", "uBounds", "uObjRect", "uObjState", "uName", "uNameFrame", "uNamePass",
  "uLoc", "uPtr", "uIntro", "uPortraitAspect", "uPortrait",
  "uMorph", "uMorphFx", "uWipeDir", "uRing", "uLogos", "uLogoCount",
  "uDeck", "uVista", "uPrintBox", "uPrintTile", "uPrintCount", "uPrintGlyph", "uPrintInk",
  "uRidge", "uRidgeMargin", "uRidgePass",
] as const;

export const FIELD_FRAG = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uCell;          // CSS px per cell
uniform vec2 uView;          // viewport, CSS px
uniform float uT;            // seconds; 0 under reduced motion
uniform float uMotion;       // 1 normally, 0 under reduced motion (no scramble, no flicker)
uniform float uBounds[6];    // screen y of each section's top (CSS px), then the last section's bottom
uniform vec4 uObjRect[4];    // anchors: portrait, cube, hand, name (x, y, w, h in CSS px)
uniform vec2 uObjState[4];   // presence 0..1, leaving 0..1
uniform vec2 uLoc;           // about (cube) and contact (hand) scroll positions, in screens
uniform highp sampler2D uName; // hero name: r = signed distance (line heights), g = rust
uniform vec2 uNameFrame;     // that field's size in line heights; 0 until it is baked
uniform int uNamePass;       // 1: this pass draws only the name, on the half-size grid
uniform vec3 uPtr;           // pointer x, y (CSS px), strength 0..1
uniform float uIntro;        // portrait print-in, 0..1
uniform float uPortraitAspect; // cutout width / height; 0 = not loaded
uniform highp sampler2D uPortrait;
uniform vec4 uMorph;         // experience logo: centre x, y, size (CSS px), presence 0..1
uniform vec4 uMorphFx;       // stop it is leaving, stop it is becoming, morph 0..1, spin (radians)
uniform highp sampler2D uLogos; // one tile per stop (logoField.ts): r = signed distance, g = rust
uniform int uLogoCount;      // 0 until the logos are baked
uniform float uWipeDir;      // the new backdrop sweeps in: 1 left to right, -1 right to left
uniform highp sampler2D uRing; // skills ring, one texel per cell (see RING_* flags)
uniform int uRidgePass;      // 1: this pass works out the vista's ridges (see VISTA_GLSL)
uniform vec4 uPrintBox[${DECK_MAX_SHEETS}]; // each sheet's print area within the stage (x, y, w, h)
uniform vec2 uPrintTile;     // one print tile, in characters
uniform int uPrintCount;     // print tiles (sheet k >= 1 uses tile k - 1); 0 until they load
uniform highp sampler2D uPrintGlyph; // the tiles stacked top to bottom: glyph index
uniform highp sampler2D uPrintInk;   // ...and density, mipmapped for smaller screens

out vec4 outCell;

const int RAMP_G[${RAMP.length}] = int[${RAMP.length}](${list(RAMP)});
const int NOISE_G[${NOISE.length}] = int[${NOISE.length}](${list(NOISE)});
const int NOISE_COUNT = ${NOISE.length};
const int G_PLUS = ${g("+")}, G_DASH = ${g("-")}, G_HASH = ${g("#")}, G_EQ = ${g("=")};
const int G_COLON = ${g(":")}, G_DOT = ${g(".")}, G_STAR = ${g("*")}, G_ZERO = ${g("0")}, G_ONE = ${g("1")};

struct Ink { float d; float s; int tone; int glyph; };   // density, strength, tone, explicit glyph (-1 = from density)

// ---------------------------------------------------------------- helpers
float bayer4(ivec2 p) {
  int a = (p.x ^ p.y) & 3, b = p.y & 3;
  int v = ((a & 1) << 3) | ((b & 1) << 2) | (a & 2) | ((b >> 1) & 1);
  return (float(v) + 0.5) / 16.0;
}
${NOISE_GLSL}
int noiseGlyph(ivec2 ic, int salt) { return NOISE_G[int(hash01(ic + ivec2(int(uT * 12.0) + salt, 5)) * float(NOISE_COUNT))]; }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// ---------------------------------------------------------------- objects (cube, hand)
// The puzzle cube: 27 cubies. One layer at a time takes a full turn, so the faces always come
// back solved; which layer turns changes from move to move.
const float CUBE_PITCH = 0.52, CUBIE = 0.235, CUBIE_R = 0.065;
const vec2 CUBE_MOVES[6] = vec2[6](vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(2.0, -1.0),
                                   vec2(0.0, -1.0), vec2(1.0, 0.0), vec2(2.0, 1.0));   // axis, layer
vec3 gTwist;   // the move under way: axis (0 x, 1 y, 2 z), layer (-1, 0, 1), angle

float sdCubies(vec3 p) {
  vec3 c = clamp(floor(p / CUBE_PITCH + 0.5), -1.0, 1.0);
  return sdRoundBox(p - c * CUBE_PITCH, vec3(CUBIE), CUBIE_R);
}
// a point or direction in the turning layer, carried back to where it sits when solved
vec3 untwist(vec3 v) {
  mat2 m = rot(gTwist.z);
  int ax = int(gTwist.x);
  if (ax == 0) v.yz *= m; else if (ax == 1) v.xz *= m; else v.xy *= m;
  return v;
}
// < 0 inside the turning layer
float inTurn(vec3 p) {
  int ax = int(gTwist.x);
  float coord = ax == 0 ? p.x : ax == 1 ? p.y : p.z;
  return abs(coord - gTwist.y * CUBE_PITCH) - 0.5 * CUBE_PITCH;
}
float sdCube(vec3 p) {
  float w = inTurn(p);
  return min(max(sdCubies(untwist(p)), w), max(sdCubies(p), -w));
}

// an open hand, palm out, fingers spread so they read apart at cell size
float sdHand(vec3 p) {
  float d = sdRoundBox(p - vec3(0.0, -0.28, 0.0), vec3(0.43, 0.43, 0.11), 0.16);           // palm
  d = smin(d, sdRoundBox(p - vec3(0.0, -0.95, 0.0), vec3(0.29, 0.27, 0.09), 0.12), 0.12);  // wrist
  d = smin(d, sdCapsule(p, vec3(-0.31, 0.1, 0.0), vec3(-0.56, 0.95, 0.0), 0.125), 0.06);  // index
  d = smin(d, sdCapsule(p, vec3(-0.1, 0.14, 0.0), vec3(-0.17, 1.12, 0.0), 0.13), 0.06);   // middle
  d = smin(d, sdCapsule(p, vec3(0.12, 0.12, 0.0), vec3(0.23, 1.03, 0.0), 0.125), 0.06);   // ring
  d = smin(d, sdCapsule(p, vec3(0.32, 0.02, 0.0), vec3(0.6, 0.72, 0.0), 0.11), 0.06);     // little
  d = smin(d, sdCapsule(p, vec3(-0.36, -0.5, 0.0), vec3(-0.74, -0.1, 0.0), 0.13), 0.1);   // thumb
  d = smin(d, sdCapsule(p, vec3(-0.74, -0.1, 0.0), vec3(-0.9, 0.24, 0.0), 0.115), 0.04);
  return d;
}

vec3 toObject(vec3 v, vec3 ang) {
  v.yz *= rot(ang.x);
  v.xz *= rot(ang.y);
  return v;
}

float sdObject(int kind, vec3 p, vec3 ang) {
  p = toObject(p, ang);
  if (kind == 1) return sdCube(p);
  // the hand waves from the wrist, a little larger than its unit sketch
  const float HS = 1.12;
  p.y += HS;
  p.xy *= rot(ang.z);
  p.y -= HS;
  return sdHand(p / HS) * HS;
}

Ink renderObject(int kind, vec2 Q, vec4 rect, float spin) {
  Ink o = Ink(0.0, 0.0, 0, -1);
  vec2 c = rect.xy + rect.zw * 0.5;
  float size = max(min(rect.z, rect.w), 1.0);
  vec2 uv = (Q - c) / (0.5 * size);
  uv.y = -uv.y;
  if (dot(uv, uv) > 1.8) return o;

  // cube: seen from above at three-quarters, turning slowly, with a layer twist every half
  // screen of scrolling (and every eight seconds or so on its own); hand: waves hello,
  // turning a little so it reads as 3D, and scrolling waves it too
  vec3 ang = kind == 1
    ? vec3(0.55 + 0.12 * sin(spin * 0.9 + uT * 0.2), 0.75 + spin * 0.7 + uT * 0.12, 0.0)
    : vec3(0.18 * sin(spin * 0.8 + uT * 0.25), 0.45 * sin(spin * 1.1 + uT * 0.3), 0.3 * sin(uT * 3.4) + 0.3 * sin(spin * 2.2));
  if (kind == 1) {
    float s = max(spin, 0.0) * 2.0 + uT * 0.12;
    float m = floor(s);
    vec2 mv = CUBE_MOVES[int(mod(m, 6.0))];
    float dir = mod(m, 2.0) < 1.0 ? 1.0 : -1.0;
    gTwist = vec3(mv, dir * 2.0 * PI * smoothstep(0.2, 0.8, s - m));
  }
  // the pointer tilts the object a little
  vec2 tilt = uPtr.z * clamp((uPtr.xy - c) / size, -1.0, 1.0);
  ang.x += tilt.y * 0.5;
  ang.y += tilt.x * 0.6;

  vec3 ro = vec3(0.0, 0.0, -4.2);
  vec3 rd = normalize(vec3(uv, 2.6));
  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 64; i++) {
    float d = sdObject(kind, ro + rd * t, ang);
    if (d < 0.002) { hit = true; break; }
    t += d * 0.85;                               // the cubies' field is a bound, not exact
    if (t > 8.0) break;
  }
  if (!hit) return o;

  vec3 p = ro + rd * t;
  const vec2 e = vec2(0.002, -0.002);
  vec3 n = normalize(e.xyy * sdObject(kind, p + e.xyy, ang) + e.yyx * sdObject(kind, p + e.yyx, ang) +
                     e.yxy * sdObject(kind, p + e.yxy, ang) + e.xxx * sdObject(kind, p + e.xxx, ang));
  // light comes from the top-left, or from the pointer when it is around
  vec3 lp = vec3(clamp((uPtr.xy - c) / size, -1.5, 1.5) * vec2(2.0, -2.0), -1.4);
  vec3 l = normalize(mix(vec3(-0.6, 0.75, -0.7), lp, uPtr.z));
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(reflect(-l, n), -rd), 0.0), 18.0);
  float lum = clamp(0.08 + 0.8 * diff + 0.45 * spec, 0.0, 1.0);
  float rim = 1.0 - abs(dot(n, rd));
  // on paper the shadow carries the ink; lit faces stay light but never vanish. The hand is
  // mostly one flat palm facing out, so it is inked solid and shaded on top, with a dark rim
  // to hold its outline.
  o.d = kind == 2
    ? clamp(0.5 + 0.38 * (1.0 - lum) + rim * 0.3, 0.0, 1.0)
    : clamp(mix(0.22, 1.0, 1.0 - lum) + rim * rim * 0.15, 0.0, 1.0);
  o.s = 0.94;
  o.tone = kind == 2 ? 1 : 0;
  if (kind == 1) {
    // Which face of which cubie: in the turning layer, look from where it sits when solved.
    // Each outer face has an inset sticker: rust on top and on the left and right, paper on the
    // bottom, front and back, so the sides alternate as it turns and every view shows both.
    // The plastic round the stickers, and the insides a twist opens up, stay ink, so the grid
    // reads as thick dark lines.
    vec3 po = toObject(p, ang), no = toObject(n, ang);
    if (inTurn(po) < 0.0) { po = untwist(po); no = untwist(no); }
    vec3 a = abs(no);
    int ax = a.x > a.y && a.x > a.z ? 0 : a.y > a.z ? 1 : 2;
    float sgn = no[ax] > 0.0 ? 1.0 : -1.0;
    vec3 cell = clamp(floor(po / CUBE_PITCH + 0.5), -1.0, 1.0);
    vec3 local = abs(po - cell * CUBE_PITCH);
    local[ax] = 0.0;
    bool sticker = cell[ax] == sgn && a[ax] > 0.9 && max(local.x, max(local.y, local.z)) < CUBIE - 0.06;
    bool rust = (ax == 1 && sgn > 0.0) || ax == 0;
    o.d = !sticker ? clamp(0.85 + 0.15 * (1.0 - lum), 0.0, 1.0)
        : rust ? mix(0.42, 0.85, 1.0 - lum)
        : mix(0.1, 0.55, 1.0 - lum);
    o.tone = sticker && rust ? 1 : 0;
  }
  return o;
}

// ---------------------------------------------------------------- portrait
Ink renderPortrait(vec2 Q, vec4 rect, ivec2 ic) {
  Ink o = Ink(0.0, 0.0, 0, -1);
  if (uPortraitAspect <= 0.0) return o;
  // contain the cutout in the anchor, standing on its bottom edge
  float ra = rect.z / max(rect.w, 1.0);
  vec2 size = uPortraitAspect > ra ? vec2(rect.z, rect.z / uPortraitAspect) : vec2(rect.w * uPortraitAspect, rect.w);
  vec2 origin = vec2(rect.x + (rect.z - size.x) * 0.5, rect.y + rect.w - size.y);
  vec2 uv = (Q - origin) / size;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return o;

  // intro: printed top to bottom, the print head scrambles
  float head = uIntro * 1.25 - 0.1 + hash01(ic + ivec2(3, 9)) * 0.06;
  if (uv.y > head) return o;

  vec4 s = texture(uPortrait, uv);
  if (s.a < 0.35) return o;
  const vec3 LUMA = vec3(0.299, 0.587, 0.114);
  float Y = dot(s.rgb, LUMA);
  // Darkness alone turns the black shirt into a wall of @; adding the edge strength
  // (one cell over, right and down) keeps the glasses, collar and seams readable.
  vec2 step1 = uCell / size;
  float Yx = dot(texture(uPortrait, uv + vec2(step1.x, 0.0)).rgb, LUMA);
  float Yy = dot(texture(uPortrait, uv + vec2(0.0, step1.y)).rgb, LUMA);
  float edge = length(vec2(Yx - Y, Yy - Y));
  float d = clamp(pow(1.0 - Y, 1.2) * 0.78 + edge * 1.6 + 0.1, 0.0, 1.0);
  // a little life: a few cells shift a step now and then
  d += (hash01(ic + ivec2(int(uT * 5.0) * 17, 1)) - 0.5) * 0.08 * uMotion;
  o.d = clamp(d, 0.0, 1.0);
  o.s = 0.95;
  // the pointer inks a rust spot and presses the characters darker
  float near = uPtr.z * (1.0 - smoothstep(30.0, 110.0, length(Q - uPtr.xy)));
  if (near > 0.15) { o.tone = 1; o.d = clamp(o.d + 0.18 * near, 0.0, 1.0); }
  if (uv.y > head - 0.035 && uIntro < 1.0 && uMotion > 0.0) o.glyph = noiseGlyph(ic, 0);
  return o;
}

// ---------------------------------------------------------------- the hero name
const float NAME_DEPTH = 0.12;    // half the extrusion, in line heights
// seen in parallel projection: facing front the sides stay hidden (in perspective they fill
// the narrow gaps between letters), and they show evenly as the name turns to the pointer
const float NAME_DIST = 4.0;

// the name's field at q (line heights, from the middle of the line, y up)
vec2 nameField(vec2 q) {
  vec2 uv = vec2(q.x / uNameFrame.x + 0.5, 0.5 - q.y / uNameFrame.y);
  vec2 cl = clamp(uv, vec2(0.0), vec2(1.0));
  vec4 s = texture(uName, cl);
  return vec2(s.r + length((uv - cl) * uNameFrame), s.g);
}
vec2 sdName(vec3 p, float bold) {
  vec2 f = nameField(p.xy);
  vec2 e = vec2(f.x - bold, abs(p.z) - NAME_DEPTH);
  return vec2(min(max(e.x, e.y), 0.0) + length(max(e, 0.0)), f.y);
}

// "Jovan Tan." extruded and drawn over the transparent DOM text. Like the logos, it faces
// straight out with the pointer in the middle of the screen and turns to look at it elsewhere.
Ink renderName(vec2 Q, vec4 rect, ivec2 ic) {
  Ink o = Ink(0.0, 0.0, 0, -1);
  if (uNameFrame.x <= 0.0) return o;
  float unit = max(rect.w, 1.0);
  vec2 c = rect.xy + rect.zw * 0.5;
  vec2 uv = (Q - c) / unit;
  uv.y = -uv.y;
  // it decodes in with the page
  float hh = hash01(ic + ivec2(7, 77));
  if (hh > uIntro * 1.2) return o;

  vec2 look = clamp((uPtr.xy - uView * 0.5) / (uView * 0.5), -1.0, 1.0) * uPtr.z;
  float idle = (1.0 - uPtr.z) * uMotion;
  // it turns less than the logos do: it has to stay readable
  mat2 ry = rot(-look.x * 0.24 + idle * 0.08 * sin(uT * 0.5));
  mat2 rx = rot(look.y * 0.18 + idle * 0.04 * sin(uT * 0.37));
  vec3 ro = vec3(uv, -NAME_DIST), rd = vec3(0.0, 0.0, 1.0);
  ro.xz *= ry; rd.xz *= ry;
  ro.yz *= rx; rd.yz *= rx;
  // Instrument Serif's hairlines are far thinner than a cell: thicken every stroke (by a
  // third of a row, in line heights) so none of them drops out between rows
  float bold = 0.34 * uCell.y / unit;

  float t = 0.0;
  vec2 r = vec2(1e9, 0.0);
  bool hit = false;
  for (int i = 0; i < 64; i++) {
    r = sdName(ro + rd * t, bold);
    if (r.x < 0.003) { hit = true; break; }
    t += r.x * 0.85;
    if (t > NAME_DIST + 2.0) break;
  }
  if (!hit) return o;

  // Letters only a few rows tall read best as crisp banner lettering, not shading: the face
  // is one dense glyph throughout and the extruded sides one lighter glyph, so the shapes
  // stay clean and the depth still shows as the name turns.
  vec3 p = ro + rd * t;
  // (a ray that only grazes a stroke's edge counts as face, so no stray sides show head on)
  bool face = abs(p.z) - NAME_DEPTH > nameField(p.xy).x - bold - 0.01;
  o.glyph = face ? G_HASH : G_EQ;
  o.d = face ? 0.85 : 0.55;
  o.s = 0.95;
  o.tone = r.y > 0.5 ? 1 : 0;
  if (uMotion > 0.0 && uIntro < 1.0 && hh > uIntro * 1.2 - 0.18) o.glyph = noiseGlyph(ic, 5);
  return o;
}

// ---------------------------------------------------------------- experience: logos
const float LOGO_AR = ${LOGO_AR.toFixed(4)};
const vec2 LOGO_TILE = vec2(${LOGO_TILE_W.toFixed(1)}, ${LOGO_TILE_H.toFixed(1)});
const float LOGO_DEPTH = 0.1;     // half the extrusion, in frame heights
const float CAM_DIST = ${LOGO_CAM.dist.toFixed(4)}, CAM_FOCAL = ${LOGO_CAM.focal.toFixed(4)};

// Stop k's logo at frame point q (x across +-LOGO_AR / 2, y across +-0.5, y up):
// (signed distance in frame heights, rust). Outside its tile it is at least that far away.
vec2 logoField(int k, vec2 q) {
  vec2 uv = vec2(q.x / LOGO_AR + 0.5, 0.5 - q.y);
  vec2 hp = 0.5 / LOGO_TILE;
  vec2 cl = clamp(uv, hp, 1.0 - hp);
  vec4 s = texture(uLogos, vec2(cl.x, (float(k) + cl.y) / float(uLogoCount)));
  return vec2(s.r + length((uv - cl) * vec2(LOGO_AR, 1.0)), s.g);
}

// The flat logo between stops: the two logos' fields blend, so one shape flows into the
// other, and the outline goes molten at the height of the change.
vec2 logoFlat(vec2 q) {
  float w = uMorphFx.z;
  vec2 f = logoField(int(uMorphFx.x), q);
  if (w > 0.001) {
    f = mix(f, logoField(int(uMorphFx.y), q), w);
    f.x += sin(PI * w) * 0.035 * sin(q.x * 13.0 + uT * 3.0) * sin(q.y * 11.0 - uT * 2.0);
  }
  return f;
}
// ...extruded into a slab
vec2 sdLogo(vec3 p) {
  vec2 f = logoFlat(p.xy);
  vec2 e = vec2(f.x, abs(p.z) - LOGO_DEPTH);
  return vec2(min(max(e.x, e.y), 0.0) + length(max(e, 0.0)), f.y);
}

// The logo turns to look at the pointer, and faces straight out when the pointer is in the
// middle of the screen. With no pointer (touch, or it has left the window) it sways gently
// instead. Between stops it makes one full spin while it morphs.
void logoTurn(out mat2 ry, out mat2 rx) {
  float s = uMorphFx.w, w = uMorphFx.z;
  vec2 look = clamp((uPtr.xy - uView * 0.5) / (uView * 0.5), -1.0, 1.0) * uPtr.z;
  float idle = 1.0 - uPtr.z;
  // turning the camera one way turns the logo the other: right of centre faces it right,
  // below faces it down
  float yaw = -look.x * 0.6 + idle * 0.3 * sin(s) + 2.0 * PI * w * uWipeDir * uMotion;
  float pitch = look.y * 0.4 + idle * 0.12 * sin(s * 0.7);
  ry = rot(yaw);
  rx = rot(pitch);
}

Ink renderLogo(vec2 P, ivec2 ic) {
  Ink o = Ink(0.0, 0.0, 0, -1);
  if (uMorph.w <= 0.0 || uLogoCount <= 0) return o;
  vec2 c = uMorph.xy;
  float size = max(uMorph.z, 1.0);
  vec2 uv = (P - c) / (0.5 * size);
  uv.y = -uv.y;
  if (abs(uv.x) > 1.0 || abs(uv.y) > 0.7) return o;
  float h = hash01(ic + ivec2(53, 19));
  if (h > uMorph.w) return o;                     // still assembling

  mat2 ry, rx;
  logoTurn(ry, rx);
  vec3 rov = vec3(0.0, 0.0, -CAM_DIST), rdv = normalize(vec3(uv, CAM_FOCAL));
  vec3 lv = normalize(vec3(-0.5, 0.65, -0.6));     // light: top left, in front
  // into the logo's own space
  vec3 ro = rov, rd = rdv, l = lv;
  ro.xz *= ry; rd.xz *= ry; l.xz *= ry;
  ro.yz *= rx; rd.yz *= rx; l.yz *= rx;

  float t = 0.0, near = 1e9;
  vec2 r = vec2(1e9, 0.0);
  bool hit = false;
  for (int i = 0; i < 80; i++) {
    r = sdLogo(ro + rd * t);
    near = min(near, r.x);
    if (r.x < 0.002) { hit = true; break; }
    t += r.x * 0.8;
    if (t > CAM_DIST + 2.5) break;
  }
  if (!hit) {
    // strokes thinner than a cell still show, faintly, as the ray grazes them
    float cell = uCell.y / (0.5 * size) * (CAM_DIST / CAM_FOCAL);
    if (near < cell * 0.25) { o.d = 0.3 * (1.0 - near / (cell * 0.25)); o.s = 0.8; return o; }
    // its shadow, cast on a wall just behind it, wipes the backdrop out
    vec3 x = rov + rdv * ((0.32 - rov.z) / rdv.z);
    x.xz *= ry; x.yz *= rx;
    float u = 0.02;
    for (int i = 0; i < 24; i++) {
      float d = sdLogo(x + l * u).x;
      if (d < 0.004) { o.glyph = 0; o.s = 0.001; break; }
      u += max(d, 0.01);
      if (u > 1.6) break;
    }
    return o;
  }

  vec3 p = ro + rd * t;
  const vec2 e = vec2(0.002, -0.002);
  vec3 n = normalize(e.xyy * sdLogo(p + e.xyy).x + e.yyx * sdLogo(p + e.yyx).x +
                     e.yxy * sdLogo(p + e.yxy).x + e.xxx * sdLogo(p + e.xxx).x);
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(reflect(-l, n), -rd), 0.0), 12.0);
  if (abs(n.z) > 0.7) {
    // the face: dense so the logo reads, brightening and dimming as it turns to the light;
    // rust where the logo is
    o.d = clamp(0.72 + 0.28 * diff + 0.25 * spec, 0.0, 1.0);
    o.tone = r.y > 0.5 ? 1 : 0;
  } else {
    // the extruded walls, in rust, light on the sides that face the light and dark on the rest
    o.d = clamp(0.1 + 0.6 * diff + 0.15 * spec, 0.0, 1.0);
    o.tone = 1;
  }
  o.s = 0.95;
  if (uMotion > 0.0) {
    if (uMorph.w < 0.999 && h > uMorph.w - 0.12) o.glyph = noiseGlyph(ic, 3);
    if (hash01(ic + ivec2(int(uT * 14.0) * 7, 41)) < 0.25 * sin(PI * uMorphFx.z)) o.glyph = noiseGlyph(ic, 9);
  }
  return o;
}

// One faint backdrop per stop, used in turn:
//   0 a drafting grid   1 ripples spreading from the logo   2 lanes of streaming bits   3 stars
Ink backdrop(int k, vec2 P, ivec2 ic) {
  Ink o = Ink(0.0, 0.0, 0, -1);
  if (k == 0) {
    ivec2 g = ivec2(ic.x % 10, ic.y % 5);
    if (g.x == 0 && g.y == 0) o = Ink(0.0, 0.42, 0, G_PLUS);
    else if (g.y == 0 && ic.x % 2 == 0) o = Ink(0.0, 0.15, 0, G_DASH);
    else if (g.x == 0) o = Ink(0.0, 0.15, 0, G_COLON);
    return o;
  }
  if (k == 1) {
    float r = length(P - uMorph.xy);
    float wave = fract(r / 64.0 - uT * 0.35);
    float fade = 1.0 - smoothstep(0.0, uView.x * 0.7, r);
    if (wave < 0.07 && r > uMorph.z * 0.3) { o.d = 0.5 * fade; o.s = 0.1 + 0.6 * fade; }
    return o;
  }
  if (k == 2) {
    float h = hash01(ivec2(ic.y, 31));
    if (h > 0.3) return o;
    float dir = ic.y % 2 == 0 ? 1.0 : -1.0;
    int x = ic.x - int(floor(uT * (3.0 + h * 14.0) * dir));
    if (hash01(ivec2(int(floor(float(x) / 8.0)), ic.y * 7 + 3)) < 0.55) return o;   // gaps between packets
    o.glyph = hash01(ivec2(x, ic.y)) > 0.5 ? G_ONE : G_ZERO;
    o.s = 0.12 + 0.3 * h;
    return o;
  }
  float h = hash01(ic + ivec2(7, 13));
  if (h < 0.014) {
    float tw = 0.5 + 0.5 * sin(uT * (1.0 + h * 90.0) + h * 400.0);
    o.glyph = h < 0.002 ? G_STAR : h < 0.006 ? G_PLUS : G_DOT;
    o.s = 0.2 + 0.5 * tw;
  }
  return o;
}

// Between stops the next backdrop sweeps across the way the logo travels, behind a
// scrambled rust edge.
Ink renderBackdrop(vec2 P, ivec2 ic, float th) {
  int a = int(uMorphFx.x) % ${BACKDROPS}, b = int(uMorphFx.y) % ${BACKDROPS};
  float w = uMorphFx.z;
  if (w <= 0.0 || a == b) return backdrop(a, P, ic);
  float u = uWipeDir > 0.0 ? P.x / uView.x : 1.0 - P.x / uView.x;
  float front = w * 1.5 - 0.25 + gnoise(vec2(P.y / 60.0, 4.2)) * 0.06 + (th - 0.5) * 0.04;
  if (uMotion > 0.0 && abs(u - front) < 0.018) return Ink(0.0, 0.7, 1, noiseGlyph(ic, 17));
  return backdrop(u < front ? b : a, P, ic);
}

// The skills ring round the logo. Its far half passes behind the logo; a ring cell
// without a letter still clears the backdrop, so the words sit on a clean ribbon.
bool renderOrbit(ivec2 ic, bool behind, inout Ink ink) {
  vec4 c = texelFetch(uRing, ic, 0);
  int flags = int(c.b * 255.0 + 0.5);
  if ((flags & ${RING_CELL}) == 0) return false;
  if (behind && (flags & ${RING_FAR}) != 0) return false;
  int glyph = int(c.r * 255.0 + 0.5);
  if ((flags & ${RING_GLYPH}) == 0 || glyph == 0) { ink.s = 0.0; ink.glyph = 0; return false; }
  ink = Ink(0.0, c.g, (flags & ${RING_RUST}) != 0 ? 1 : 0, glyph);
  return true;
}

// ---------------------------------------------------------------- work: the vista
// A landscape in depth, printed like a linocut (see VISTA_GLSL for its shape). The blit paints
// its flat tints per pixel; this pass places the characters on top: ridgelines that follow the
// slope, hatching on the shaded faces, snow, trees, grass, ripples, and the life in it: flocks
// crossing the sky, a sailboat on the lake, cabins with smoke curling from their chimneys, and
// after dark fireflies and shooting stars. Each project's print hangs in the sky.
${VISTA_GLSL}
const int G_SLASH = ${g("/")}, G_BSLASH = ${g("\\")}, G_US = ${g("_")}, G_BAR = ${g("|")}, G_CARET = ${g("^")};
const int G_TICK = ${g("'")}, G_COMMA = ${g(",")}, G_QUOTE = ${g('"')}, G_V = ${g("v")}, G_A = ${g("A")};
const int G_TILDE = ${g("~")}, G_LPAREN = ${g("(")}, G_RPAREN = ${g(")")};
${sprite("BOAT", ["  |\\", "  |:\\", "  |::\\", "__|___\\_", "\\______/"])}
${sprite("CABIN", ["  _||__", " /_____\\", " |_[]__|"])}
const float CABIN_EVERY = 760.0;   // world px between the cabins' slots along the hills

int gVista;   // 1: this cell is in the vista; 2: ...and holds a print, with only sky behind it

// Project k's print, slid sideways with its card and bobbing gently in the sky. A clear margin
// one character wide runs round the artwork, so it reads cleanly over the scenery.
Ink vistaPrint(int k, vec2 S) {
  Ink o = Ink(0.0, 0.0, 0, -1);
  if (k < 1 || k > uPrintCount) return o;
  vec4 box = uPrintBox[k];
  box.x += (float(k) - uDeck.z) * uVista.w;
  if (box.x > uView.x || box.x + box.z < 0.0) return o;
  box.y += sin(uT * 0.6 + float(k) * 1.7) * 6.0 * uMotion;
  vec2 tile = uPrintTile * uCell;
  float sc = min(min(box.z / tile.x, box.w / tile.y), 1.5);
  bool glyphs = sc > 0.78 && sc < 1.15;   // near full size, keep its own characters (it may overhang its box a little)
  if (glyphs) sc = 1.0;
  vec2 size = tile * sc;
  vec2 org = box.xy + (box.zw - size) * 0.5;
  if (glyphs) org = floor(org / uCell + 0.5) * uCell;
  vec2 q = (S - org) / (uCell * sc);
  if (q.x < -1.0 || q.y < -1.0 || q.x >= uPrintTile.x + 1.0 || q.y >= uPrintTile.y + 1.0) return o;
  float row = float(k - 1) * uPrintTile.y;
  ivec2 lim = ivec2(uPrintTile) - 1;
  float d;
  if (glyphs) {
    ivec2 c = ivec2(floor(q));
    int glyph = 0;
    if (c.x >= 0 && c.y >= 0 && c.x <= lim.x && c.y <= lim.y)
      glyph = int(texelFetch(uPrintGlyph, c + ivec2(0, int(row)), 0).r * 255.0 + 0.5);
    if (glyph == 0) {
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        ivec2 n = c + ivec2(x, y);
        if (n.x < 0 || n.y < 0 || n.x > lim.x || n.y > lim.y) continue;
        if (texelFetch(uPrintGlyph, n + ivec2(0, int(row)), 0).r > 0.5 / 255.0) return Ink(0.0, 0.001, 0, 0);
      }
      return o;
    }
    d = texelFetch(uPrintInk, c + ivec2(0, int(row)), 0).r;
    o = Ink(d, 0.62 + 0.38 * d, 0, glyph);
  } else {
    if (q.x < 0.0 || q.y < 0.0 || q.x >= uPrintTile.x || q.y >= uPrintTile.y) return o;
    vec2 uv = vec2(q.x / uPrintTile.x, (q.y + row) / (uPrintTile.y * float(uPrintCount)));
    float lod = max(0.0, log2(1.0 / sc));
    // averaging thins the ink out: give some back so the shapes still hold
    float soft = textureLod(uPrintInk, uv, lod + 1.5).r;
    d = clamp(textureLod(uPrintInk, uv, lod).r * (1.0 + 0.5 * min(lod, 1.0)), 0.0, 1.0);
    if (d < 0.05) {
      if (soft > 0.02) o = Ink(0.0, 0.001, 0, 0);
      return o;
    }
    o = Ink(d, 0.65 + 0.33 * d, 0, -1);
  }
  o.tone = d > 0.82 ? 1 : 0;
  // the pointer inks it rust where it passes
  float near = uPtr.z * (1.0 - smoothstep(40.0, 150.0, length(S + vec2(0.0, uDeck.x) - uPtr.xy)));
  if (near > 0.2 && d > 0.3) o.tone = 1;
  return o;
}

// The characters of one back layer: its ridge follows the slope; the faces turned from the sun
// are hatched; the snow is flecked; the hills carry pines along the top and scrub on their slopes.
// Inside the layer it returns true even with no character, so nothing behind shows through.
bool vistaLayer(int l, vec2 S, ivec2 ic, bool night, inout Ink ink) {
  float wx = S.x + layerPan(LAYERS[l].x);
  float ya = ridgeY(l, S.x - 0.5 * uCell.x), yb = ridgeY(l, S.x + 0.5 * uCell.x);
  float lo = min(ya, yb), hi = max(ya, yb);
  float top = S.y - 0.5 * uCell.y, bottom = S.y + 0.5 * uCell.y;
  int col = int(floor(wx / uCell.x));
  if (bottom < lo) {
    // a pine is two characters tall
    if (l != 2 || bottom < lo - 2.0 * uCell.y) return false;
    float h = hash01(ivec2(col, 71));
    bool upper = bottom < lo - uCell.y;
    if (h < 0.06 || (!upper && h < 0.16)) {
      ink = Ink(0.0, night ? 0.6 : 0.85, 0, upper ? G_CARET : (h < 0.06 ? G_A : G_CARET));
      return true;
    }
    return false;
  }
  float ridge = ridgeY(l, S.x);
  bool lit = faceLit(l, S.x, S.y, ridge);
  bool snow = isSnow(l, ridgeShare(l, ridge), (S.y - ridge) / uDeck.y);
  int tone = (lit || snow) && alpenglow(l) > 0.4 && !night ? 1 : 0;
  if (top <= hi) {
    float s = (yb - ya) / uCell.y;
    int glyph = abs(s) > 2.6 ? G_BAR : s < -0.35 ? G_SLASH : s > 0.35 ? G_BSLASH : (lo - top > 0.5 * uCell.y ? G_US : G_DASH);
    // light: the tint below already draws the edge, smoothly; these give it grain
    ink = Ink(0.0, l == 0 ? 0.32 : l == 1 ? 0.5 : 0.6, tone, glyph);
    return true;
  }
  ink = Ink(0.0, 0.0, 0, 0);
  if (!lit && !snow && (col + ic.y) % 3 == 0) {
    // hatching, in lines that run with the layer as it pans
    ink = Ink(0.0, night ? 0.22 : (l == 0 ? 0.32 : 0.5), 0, G_SLASH);
  } else if (snow && hash01(ivec2(col, ic.y)) < 0.25) {
    ink = Ink(0.0, 0.35, tone, G_DOT);
  } else if (l == 2 && lit && hash01(ivec2(col, ic.y * 5 + 3)) < 0.07) {
    ink = Ink(0.0, night ? 0.35 : 0.6, 0, G_COMMA);   // scrub on the sunny slopes
  }
  return true;
}

// The foreground: grass along its edge; stones picked out in the dark below.
bool vistaGround(vec2 S, ivec2 ic, inout Ink ink) {
  float wx = S.x + layerPan(LAYERS[3].x);
  float y = ridgeY(3, S.x);
  int col = int(floor(wx / uCell.x));
  if (S.y < y) {
    if (S.y < y - uCell.y) return false;
    float h = hash01(ivec2(col, 74));
    if (h > 0.55) return false;
    int glyph = h < 0.12 ? G_QUOTE : h < 0.3 ? G_TICK : G_COMMA;
    // the wind combs through it
    if (uMotion > 0.0 && h < 0.3 && sin(uT * 2.3 - wx * 0.031) > 0.55) glyph = G_SLASH;
    ink = Ink(0.0, 0.9, 0, glyph);
    return true;
  }
  ink = Ink(0.0, 0.0, 0, 0);
  float h = hash01(ivec2(col, ic.y * 3 + 11));
  if (h < 0.07) ink = Ink(0.0, 0.32, 0, h < 0.025 ? G_DOT : G_COMMA);
  return true;
}

// The lake: ripples drifting across it, closer together towards the near shore.
bool vistaWater(vec2 S, ivec2 ic, bool night, inout Ink ink) {
  float wy = waterY();
  if (S.y < wy) return false;
  ink = Ink(0.0, 0.0, 0, 0);
  float depth = (S.y - wy) / (uDeck.y - wy);
  float rx = S.x + layerPan(0.45) + uT * 7.0 * uMotion;
  if (hash01(ivec2(int(floor(rx / (uCell.x * 3.0))), ic.y)) < 0.05 + 0.08 * depth)
    ink = Ink(0.0, night ? 0.3 : 0.4, 0, depth > 0.5 ? G_TILDE : G_DASH);
  return true;
}

bool inCell(vec2 S, vec2 p) { return all(lessThan(abs(S - p), uCell * 0.5)); }

// A sailboat drifting across the lake under a rust sail, a broken reflection beneath its hull.
// It sails behind the hills, so it slips in and out of sight between them.
bool vistaBoat(vec2 S, bool night, inout Ink ink) {
  float span = uView.x + 420.0;
  float x = mod(uT * 11.0 + uView.x * 0.62 - layerPan(0.45), span) - 160.0;
  vec2 org = vec2(x, waterY() + 1.15 * uCell.y - float(BOAT_SIZE.y) * uCell.y);
  ivec2 q = ivec2(floor((S - org) / uCell));
  int gl = BOAT(q);
  if (gl >= 0) {
    ink = Ink(0.0, night ? 0.7 : 0.95, q.y < 3 && gl != G_BAR ? 1 : 0, gl);
    return true;
  }
  if (q.y == BOAT_SIZE.y && q.x >= 1 && q.x < BOAT_SIZE.x - 1 && hash01(ivec2(q.x, int(uT * 3.0))) < 0.6) {
    ink = Ink(0.0, 0.45, 0, G_TILDE);
    return true;
  }
  return false;
}

// The cabin in slot i along the hills, if it has one: its top left (stage px). It sits on the
// lower of the ground under its two ends, so it never floats off a slope.
bool cabinAt(int i, out vec2 org) {
  org = vec2(0.0);
  if (hash01(ivec2(i, 91)) > 0.55) return false;
  float sx = (float(i) + 0.15 + 0.6 * hash01(ivec2(i, 92))) * CABIN_EVERY - layerPan(LAYERS[2].x);
  if (sx > uView.x + 200.0 || sx < -300.0) return false;
  float ground = max(ridgeY(2, sx + uCell.x), ridgeY(2, sx + float(CABIN_SIZE.x - 1) * uCell.x));
  if (ground > uDeck.y * 0.865) return false;   // up on the hills, not down at the water
  org = vec2(sx, ground + 0.6 * uCell.y - float(CABIN_SIZE.y) * uCell.y);
  return true;
}
int cabinSlot(vec2 S) { return int(floor((S.x + layerPan(LAYERS[2].x)) / CABIN_EVERY)); }

// a cabin; after dark its window glows
bool vistaCabin(vec2 S, bool night, inout Ink ink) {
  vec2 org;
  if (!cabinAt(cabinSlot(S), org)) return false;
  ivec2 q = ivec2(floor((S - org) / uCell));
  int gl = CABIN(q);
  if (gl < 0) return false;
  bool win = night && q.y == 2 && (q.x == 3 || q.x == 4);
  ink = Ink(0.0, win ? 1.0 : night ? 0.6 : 0.95, win ? 1 : 0, gl);
  return true;
}

// smoke from the chimney: puffs that swell as they rise and drift off on the wind
bool vistaSmoke(vec2 S, bool night, inout Ink ink) {
  int i0 = cabinSlot(S);
  for (int j = -1; j <= 0; j++) {
    vec2 org;
    if (!cabinAt(i0 + j, org)) continue;
    vec2 base = org + vec2(3.5 * uCell.x, -0.5 * uCell.y);
    float seed = hash01(ivec2(i0 + j, 93));
    for (int k = 0; k < 7; k++) {
      float fk = float(k);
      float a = fract(uT * 0.2 + fk / 7.0 + seed);
      vec2 p = base + vec2(a * a * 52.0 + sin(uT * 1.1 + fk * 2.3) * 5.0 * a, -a * 96.0);
      if (!inCell(S, p)) continue;
      int gl = a < 0.16 ? G_DOT : a < 0.5 ? (k % 2 == 0 ? G_LPAREN : G_RPAREN) : a < 0.8 ? G_TILDE : G_DOT;
      ink = Ink(0.0, (1.0 - a * 0.8) * (night ? 0.5 : 0.7), 0, gl);
      return true;
    }
  }
  return false;
}

// Flocks crossing the sky in loose Vs, each bird beating its wings in its own time. The nearer
// a flock, the bigger and faster its birds and the more it moves with the scroll.
bool vistaBirds(vec2 S, inout Ink ink) {
  float H = uDeck.y, span = uView.x + 500.0;
  for (int f = 0; f < 3; f++) {
    float ff = float(f);
    float z = 0.35 + 0.32 * ff;                  // depth: far .. near
    float d = f == 1 ? -1.0 : 1.0;               // which way it flies
    float gap = mix(15.0, 30.0, z);
    vec2 c = vec2(mod(d * uT * mix(13.0, 30.0, z) + span * hash01(ivec2(f, 41)) - layerPan(0.04 + 0.2 * z), span) - 250.0,
                  max(H * (0.17 + 0.09 * ff), 120.0 + 40.0 * ff) + 9.0 * sin(uT * 0.37 + ff * 2.0));
    if (abs(S.x - c.x) > gap * 3.4 + uCell.x * 2.0 || abs(S.y - c.y) > gap * 2.0 + uCell.y) continue;
    for (int i = 0; i < 7; i++) {
      float fi = float(i), r = floor((fi + 1.0) * 0.5), side = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
      vec2 b = c + vec2(-d * r * gap, side * r * gap * 0.55)
                 + vec2(sin(uT * 0.9 + fi * 1.3), cos(uT * 0.7 + fi * 2.1)) * 3.0 * uMotion;
      vec2 q = (S - b) / uCell;
      if (abs(q.y) >= 0.5) continue;
      float beat = fract(uT * (2.0 + 0.5 * hash01(ivec2(f, i))) + fi * 0.27);
      int gl = -1;
      if (z > 0.8) {
        // near: a body and two wings, up, level, down, level
        int k = int(floor(q.x + 1.5));
        if (k < 0 || k > 2) continue;
        int frame = int(beat * 4.0);
        gl = k == 1 ? G_V : frame == 0 ? (k == 0 ? G_BSLASH : G_SLASH) : frame == 2 ? (k == 0 ? G_SLASH : G_BSLASH) : G_DASH;
      } else if (abs(q.x) < 0.5) {
        gl = beat < 0.5 ? G_V : G_CARET;
      }
      if (gl < 0) continue;
      ink = Ink(0.0, mix(0.55, 0.95, z), 0, gl);
      return true;
    }
  }
  return false;
}

// after dark, fireflies over the hills and the grass, wandering and winking
bool vistaFireflies(vec2 S, inout Ink ink) {
  float on = smoothstep(0.55, 0.85, uVista.x);
  if (on <= 0.0) return false;
  float H = uDeck.y, span = uView.x + 200.0;
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    vec2 h = vec2(hash01(ivec2(i, 61)), hash01(ivec2(i, 62)));
    vec2 p = vec2(mod(h.x * span + 30.0 * sin(uT * 0.31 + fi * 1.7) - layerPan(0.9), span) - 100.0,
                  H * (0.79 + 0.18 * h.y) + 14.0 * sin(uT * 0.47 + fi * 2.9));
    if (!inCell(S, p)) continue;
    float glow = 0.5 + 0.5 * sin(uT * (1.2 + h.y) + fi * 3.1);
    if (glow < 0.3) continue;
    ink = Ink(0.0, on * (0.45 + 0.55 * glow), 1, glow > 0.78 ? G_STAR : G_DOT);
    return true;
  }
  return false;
}

// The sky's characters: by day streaks of cloud; by night stars, and now and then one falling.
Ink vistaSky(vec2 S, ivec2 ic, bool night) {
  Ink o = Ink(0.0, 0.0, 0, -1);
  float H = uDeck.y;
  float cx = S.x + layerPan(0.18) + uT * 8.0 * uMotion;
  float c = fbm1(cx / 340.0, float(ic.y) * 0.29 + 41.0);
  bool cloud = S.y < H * 0.5 && c > 0.3;
  if (!night) {
    if (cloud) return Ink(0.0, 0.5, 0, c > 0.4 ? G_EQ : G_DASH);
    return o;
  }
  // a shooting star: a bright head and a tail that fades behind it
  float ep = floor(uT / 4.5), ph = fract(uT / 4.5) / 0.24;
  if (uMotion > 0.0 && ph < 1.0 && hash01(ivec2(int(ep), 51)) < 0.75) {
    float hx = hash01(ivec2(int(ep), 52)), side = hash01(ivec2(int(ep), 54)) < 0.5 ? 1.0 : -1.0;
    vec2 dir = normalize(vec2(side * 0.86, 0.5));
    vec2 a = vec2(uView.x * (0.15 + 0.7 * hx), H * (0.04 + 0.22 * hash01(ivec2(int(ep), 53))));
    vec2 rel = S - a;
    float t = dot(rel, dir), off = abs(dot(rel, vec2(-dir.y, dir.x)));
    float head = ph * 400.0, tail = 130.0;
    if (off < uCell.y * 0.42 && t > head - tail && t < head + uCell.x * 0.5) {
      float u = (head - t) / tail;
      return Ink(0.0, (1.0 - 0.7 * u) * (1.0 - smoothstep(0.7, 1.0, ph)), 0,
                 u < 0.06 ? G_STAR : u < 0.55 ? (side > 0.0 ? G_BSLASH : G_SLASH) : G_DOT);
    }
  }
  ivec2 sc2 = ivec2(floor((S + vec2(layerPan(0.02), 0.0)) / uCell));
  float h = hash01(sc2 + ivec2(7, 13));
  if (h < 0.016 && S.y < H * 0.7) {
    float tw = 0.5 + 0.5 * sin(uT * (1.0 + h * 90.0) + h * 400.0);
    return Ink(0.0, 0.3 + 0.65 * tw, 0, h < 0.002 ? G_STAR : h < 0.007 ? G_PLUS : G_DOT);
  }
  if (cloud && c > 0.36) return Ink(0.0, 0.3, 0, G_DASH);
  return o;
}

bool renderVista(vec2 P, ivec2 ic, inout Ink ink) {
  if (uDeck.z < -0.5) return false;
  vec2 S = P - vec2(0.0, uDeck.x);
  if (S.y < 0.0 || S.y >= uDeck.y) return false;
  vistaLook();
  gVista = 1;
  bool night = nightLine(S.y) > 0.0;
  if (night && vistaFireflies(S, ink)) return true;
  if (vistaGround(S, ic, ink)) return true;
  if (vistaCabin(S, night, ink)) return true;
  if (vistaLayer(2, S, ic, night, ink)) return true;
  int k = int(floor(uDeck.z));
  Ink pr = vistaPrint(k, S);
  if (pr.s <= 0.0) pr = vistaPrint(k + 1, S);
  if (pr.s > 0.0) { ink = pr; gVista = 2; return true; }
  if (vistaSmoke(S, night, ink)) return true;
  if (vistaBoat(S, night, ink)) return true;
  if (vistaWater(S, ic, night, ink)) return true;
  if (!night && vistaBirds(S, ink)) return true;
  if (vistaLayer(1, S, ic, night, ink)) return true;
  if (vistaLayer(0, S, ic, night, ink)) return true;
  ink = vistaSky(S, ic, night);
  return true;
}

// ---------------------------------------------------------------- main
void main() {
  ivec2 ic = ivec2(gl_FragCoord.xy);            // column, row from the top
  if (uRidgePass == 1) {
    // one texel per CSS px, one row per layer: the ridge's y, packed into two bytes
    vistaLook();
    float y = ridgeCalc(ic.y, gl_FragCoord.x - uRidgeMargin);
    float v = floor(clamp((y / uDeck.y + 0.5) * 0.5, 0.0, 1.0) * 65535.0 + 0.5);
    outCell = vec4(floor(v / 256.0) / 255.0, mod(v, 256.0) / 255.0, 0.0, 1.0);
    return;
  }
  vec2 P = (vec2(ic) + 0.5) * uCell;
  float th = bayer4(ic);

  // which section this cell is over; the seams are torn and dithered
  float jag = gnoise(vec2(P.x / 46.0, 2.7)) * 18.0 + (th - 0.5) * 14.0;
  int region = 0;
  for (int i = 1; i < 5; i++) if (P.y - jag >= uBounds[i]) region = i;
  bool inverted = region == 2;
  gVista = 0;

  Ink ink = Ink(0.0, 0.0, 0, -1);
  bool namePass = uNamePass == 1;
  if (namePass) {
    // no backdrop: this grid carries only the name, laid over the main one
  } else if (region == 2) {
    ink = renderBackdrop(P, ic, th);
    Ink logo = renderLogo(P, ic);
    if (logo.s > 0.0) ink = logo;                // the logo, or its shadow clearing the backdrop
    renderOrbit(ic, logo.s > 0.01, ink);
  }
  else if (region == 3 && renderVista(P, ic, ink)) {}
  else if (ic.x % 12 == 6 && ic.y % 6 == 3) ink = Ink(0.0, 0.14, 0, G_PLUS);  // registration marks

  for (int k = 0; k < 4; k++) {
    if ((k == 3) != namePass) continue;         // the name is drawn by its own, finer pass
    vec2 st = uObjState[k];
    if (st.x <= 0.0) continue;
    vec4 rect = uObjRect[k];
    // the name's descenders, overhangs and walls reach past its line box
    vec2 m = k == 3 ? vec2(rect.w * 0.6 + 20.0, rect.w * 0.45) : vec2(80.0, 20.0);
    if (P.x < rect.x - m.x || P.x > rect.x + rect.z + m.x ||
        P.y < rect.y - 460.0 * st.y - m.y || P.y > rect.y + rect.w + m.y) continue;
    float h1 = hash01(ic + ivec2(k * 131, 17));
    if (h1 > st.x) continue;                    // this cell has dissolved
    float h2 = hash01(ic + ivec2(29, k * 71));
    // leaving: characters lift off and drift, the lightest ones furthest
    vec2 Q = P + st.y * vec2((h2 - 0.5) * 160.0, 360.0 * (0.25 + h1));
    Ink o;
    if (k == 0) o = renderPortrait(Q, rect, ic);
    else if (k == 3) o = renderName(Q, rect, ic);
    else o = renderObject(k, Q, rect, k == 1 ? uLoc.x : uLoc.y);
    if (o.s <= 0.0) continue;
    if (uMotion > 0.0 && st.x < 0.999 && h1 > st.x - 0.12) o.glyph = noiseGlyph(ic, 0);
    ink = o;
    gVista = 0;
  }

  int glyph = ink.glyph >= 0 ? ink.glyph : RAMP_G[clamp(int(floor(ink.d * 12.0 + th * 0.98)), 0, 12)];
  if (ink.s <= 0.0) glyph = 0;
  // Alpha: 1 inverted, 0.25 the vista (the blit paints it per pixel), 0.375 a print in the vista
  // (only the sky behind it). The name's own grid has no sections to invert: its alpha carries the
  // density instead, for the wash the blit lays behind each of its glyphs.
  float a = gVista == 2 ? 0.375 : gVista == 1 ? 0.25 : inverted ? 1.0 : 0.0;
  outCell = vec4(float(glyph) / 255.0, float(ink.tone) / 255.0, ink.s, namePass ? ink.d : a);
}`;

export const BLIT_UNIFORMS = [
  "uField", "uAtlas", "uCellDev", "uDevH", "uPaper", "uInk", "uRust", "uRustInv", "uNameField", "uNameAtlas", "uNameCellDev",
  "uDeck", "uVista", "uRidge", "uRidgeMargin", "uPtr", "uView", "uT", "uMotion", "uCellCss", "uDpr",
] as const;

export const BLIT_FRAG = `#version 300 es
precision highp float;
precision highp int;

uniform highp sampler2D uField;
uniform highp sampler2D uAtlas;   // GLYPHS side by side, one cell each, white on transparent
uniform ivec2 uCellDev;           // cell size in device px
uniform int uDevH;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uRust;
uniform vec3 uRustInv;            // rust on the ink sections, a step lighter
uniform highp sampler2D uNameField; // the hero name's own pass, on half-size cells (same layout)
uniform highp sampler2D uNameAtlas; // GLYPHS again, at that size
uniform ivec2 uNameCellDev;       // its cell size in device px; 0 while the name is not drawn
uniform vec3 uPtr;                // pointer x, y (CSS px), strength 0..1
uniform vec2 uView;               // viewport, CSS px
uniform float uT;
uniform float uMotion;
uniform vec2 uCellCss;            // cell size, CSS px
uniform float uDpr;               // device px per CSS px

out vec4 outColor;

${NOISE_GLSL}
${VISTA_GLSL}

// ---------------------------------------------------------------- the work vista, per pixel
// Every edge is antialiased over a device pixel, so the ridges, the waterline and the fall of
// night are smooth curves rather than steps of whole cells.
float cover(float d) { return clamp(d * uDpr + 0.5, 0.0, 1.0); }   // d: CSS px inside the edge

vec3 layerColor(int l, vec2 S, float ridge, float n) {
  bool lit = faceLit(l, S.x, S.y, ridge);
  bool snow = isSnow(l, ridgeShare(l, ridge), (S.y - ridge) / uDeck.y);
  vec2 td = TINT_DAY[l], tn = TINT_NIGHT[l];
  float dt = lit ? td.x : td.y, nt = lit ? tn.x : tn.y;
  if (snow) { dt = 0.0; nt = 0.3; }
  vec3 day = mix(uPaper, uInk, dt);
  if (lit || snow) {
    float glow = alpenglow(l);
    day = mix(day, mix(uPaper, uRust, max(dt, (snow ? 0.1 : 0.17 - 0.05 * float(l)) * glow)), smoothstep(0.3, 0.5, glow));
  }
  return mix(day, mix(uInk, uPaper, nt), n);
}

vec3 waterColor(vec2 S, float wy, float n) {
  float depth = (S.y - wy) / (uDeck.y - wy);
  vec3 day = mix(uPaper, uInk, 0.04), night = mix(uInk, uPaper, 0.03);
  // the near range upside down, broken up by ripples
  float drift = uT * 7.0 * uMotion;
  if (2.0 * wy - S.y >= ridgeY(1, S.x) && gnoise(vec2((S.x + drift) / 26.0, S.y / 2.2)) > -0.35) {
    day = mix(uPaper, uInk, 0.12);
    night = mix(uInk, uPaper, 0.07);
  }
  // the sky's warmth low down, caught on the far half of the lake
  day = mix(day, uRust, (0.02 + 0.07 * uVista.y) * (1.0 - smoothstep(0.0, 0.5, depth)));
  return mix(day, night, n);
}

// P: CSS px on screen. clear: a print's cell, with only the sky behind it.
vec3 vistaColor(vec2 P, bool clear) {
  vec2 S = vec2(P.x, P.y - uDeck.x);
  float H = uDeck.y;
  float n = smoothstep(-0.012, 0.012, nightLine(S.y));
  // the sky: paper warming towards the horizon as the evening comes on; by night ink, a shade
  // lighter low down where the last of the light lingers
  float low = smoothstep(H * 0.15, H * WATER, S.y);
  vec3 day = mix(uPaper, uRust, (0.03 + 0.11 * uVista.y) * low);
  vec3 night = mix(uInk, uPaper, 0.06 * low);
  vec3 col = mix(day, night, n);
  if (clear) return col;
  // then the layers, back to front
  for (int l = 0; l < 2; l++) {
    float ridge = ridgeY(l, S.x);
    float a = cover(S.y - ridge);
    if (a > 0.0) col = mix(col, layerColor(l, S, ridge, n), a);
  }
  float wy = waterY();
  float a = cover(S.y - wy);
  if (a > 0.0) col = mix(col, waterColor(S, wy, n), a);
  float hills = ridgeY(2, S.x);
  a = cover(S.y - hills);
  if (a > 0.0) col = mix(col, layerColor(2, S, hills, n), a);
  a = cover(S.y - ridgeY(3, S.x));
  if (a > 0.0) col = mix(col, uInk, a);
  return col;
}

bool lit(vec4 cell) { return cell.r > 0.5 / 255.0 && cell.b > 0.0; }
// 1 where a cell of the work vista holds a print (alpha 0.375; see the field's main)
float clearAt(ivec2 c) { float a = texelFetch(uField, c, 0).a; return a > 0.31 && a < 0.45 ? 1.0 : 0.0; }

// a glyph in its colour, over a wash of the same colour across the whole cell
vec3 stamp(vec3 col, vec4 cell, highp sampler2D atlas, ivec2 cellDev, ivec2 o, bool inv, float wash) {
  int g = int(cell.r * 255.0 + 0.5);
  float m = max(texelFetch(atlas, ivec2(g * cellDev.x + o.x, o.y), 0).a, wash);
  bool rust = int(cell.g * 255.0 + 0.5) == 1;
  vec3 fg = rust ? (inv ? uRustInv : uRust) : (inv ? uPaper : uInk);
  return mix(col, fg, m * cell.b);
}

void main() {
  ivec2 f = ivec2(gl_FragCoord.xy);
  ivec2 px = ivec2(f.x, uDevH - 1 - f.y);
  ivec2 c = px / uCellDev;
  ivec2 o = px - c * uCellDev;
  vec4 cell = texelFetch(uField, c, 0);
  bool inv = cell.a > 0.5;
  vec3 col = inv ? uInk : uPaper;
  // the work vista: its tints painted per pixel, and its characters in whichever colour reads
  // against them
  if (cell.a > 0.2 && cell.a < 0.45) {
    vistaLook();
    // A print's cells have only sky behind them. Blending that between neighbouring cells
    // rounds the clearing off into a soft cut-out instead of a staircase of whole cells.
    vec2 cp = vec2(px) / vec2(uCellDev) - 0.5;
    ivec2 c0 = ivec2(floor(cp));
    vec2 cf = cp - floor(cp);
    ivec2 last = textureSize(uField, 0) - 1;
    float k00 = clearAt(clamp(c0, ivec2(0), last)), k10 = clearAt(clamp(c0 + ivec2(1, 0), ivec2(0), last));
    float k01 = clearAt(clamp(c0 + ivec2(0, 1), ivec2(0), last)), k11 = clearAt(clamp(c0 + ivec2(1, 1), ivec2(0), last));
    float m = smoothstep(0.3, 0.7, mix(mix(k00, k10, cf.x), mix(k01, k11, cf.x), cf.y));
    vec2 P = (vec2(px) + 0.5) / uDpr;
    col = m >= 1.0 ? vistaColor(P, true) : m <= 0.0 ? vistaColor(P, false) : mix(vistaColor(P, false), vistaColor(P, true), m);
    inv = dot(col, vec3(0.299, 0.587, 0.114)) < 0.42;
  }

  // Where the name draws anything inside a main cell, that cell's own glyph steps aside, so
  // no half-cut character shows between its letters.
  bool name = false;
  if (uNameCellDev.x > 0) {
    ivec2 last = textureSize(uNameField, 0) - 1;
    ivec2 a = (c * uCellDev) / uNameCellDev, b = min((c * uCellDev + uCellDev - 1) / uNameCellDev, last);
    for (int y = 0; y < 3; y++) for (int x = 0; x < 3; x++) {
      ivec2 q = a + ivec2(x, y);
      if (q.x <= b.x && q.y <= b.y && lit(texelFetch(uNameField, q, 0))) name = true;
    }
  }
  if (name) {
    ivec2 nc = min(px / uNameCellDev, textureSize(uNameField, 0) - 1);
    vec4 ncell = texelFetch(uNameField, nc, 0);
    // half-size glyphs cover too little of their cells to make solid letters on their own, so
    // each sits on a light wash of its colour: the letters read whole, the characters on top
    if (lit(ncell)) col = stamp(col, ncell, uNameAtlas, uNameCellDev, px - nc * uNameCellDev, inv, 0.3 * ncell.a);
  } else if (lit(cell)) {
    col = stamp(col, cell, uAtlas, uCellDev, o, inv, 0.0);
  }

  // paper tooth: a faint fixed speckle (lighter grain on the ink)
  uint s = uint(f.x) * 0x9E3779B1u ^ uint(f.y) * 0x85EBCA77u;
  s ^= s >> 15; s *= 0x2C1B3C6Du; s ^= s >> 13;
  col += (inv ? 1.0 : -1.0) * float(s & 255u) / 255.0 * 0.02;

  outColor = vec4(col, 1.0);
}`;
