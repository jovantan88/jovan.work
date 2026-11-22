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
 *   work                   -> a block city that rises out of the ground as the section arrives
 * On top, four objects sit where the page reserves room for them (DOM anchors):
 *   0 portrait of Jovan (from a cutout photo), 1 a puzzle cube that twists, 2 a waving hand,
 *   3 the hero name, in 3D (from nameField.ts). The name has a pass of its own on a grid of
 *     half-size cells (uNamePass), which the blit lays over the main grid, so its letters get
 *     twice the rows at the same size.
 * Each object assembles as it scrolls in and blows apart upward as it scrolls out; the
 * dissolving edge scrambles through random glyphs.
 *
 * Glyph indices are printable ASCII minus 32 (space = 0), so any text can be drawn.
 * Field texture: r = glyph index, g = tone (0 ink, 1 rust), b = strength 0..1, a = inverted.
 */

import { BACKDROPS, LOGO_CAM } from "./journeyMath";
import { LOGO_AR, LOGO_TILE_H, LOGO_TILE_W } from "./logoField";

export const GLYPHS = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
const RAMP = " .,:;-~=+*#%@";         // density, light to heavy
const NOISE = "01/\\<>[]{}?$&x";       // scramble
const g = (c: string) => c.charCodeAt(0) - 32;
const list = (s: string) => [...s].map(g).join(", ");

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

export const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FIELD_UNIFORMS = [
  "uCell", "uView", "uT", "uMotion", "uBounds", "uObjRect", "uObjState", "uName", "uNameFrame", "uNamePass",
  "uLoc", "uRise", "uPtr", "uIntro", "uPortraitAspect", "uPortrait",
  "uMorph", "uMorphFx", "uWipeDir", "uRing", "uLogos", "uLogoCount",
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
uniform vec4 uLoc;           // journey progress (eased, in stops), work, about (cube), contact (hand), in screens
uniform highp sampler2D uName; // hero name: r = signed distance (line heights), g = rust
uniform vec2 uNameFrame;     // that field's size in line heights; 0 until it is baked
uniform int uNamePass;       // 1: this pass draws only the name, on the half-size grid
uniform float uRise;         // how far the city has grown, 0..1
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

out vec4 outCell;

const float PI = 3.14159265;
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
uint hashU(uvec2 v) {
  v = v * uvec2(0x9E3779B1u, 0x85EBCA77u);
  uint h = v.x ^ (v.y + 0x7F4A7C15u);
  h ^= h >> 15; h *= 0x2C1B3C6Du;
  h ^= h >> 12; h *= 0x297A2D39u;
  h ^= h >> 15;
  return h;
}
float hash01(ivec2 p) { return float(hashU(uvec2(p + ivec2(1 << 20))) >> 8) / 16777216.0; }
int noiseGlyph(ivec2 ic, int salt) { return NOISE_G[int(hash01(ic + ivec2(int(uT * 12.0) + salt, 5)) * float(NOISE_COUNT))]; }
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

// ---------------------------------------------------------------- work: the city
const float LOT = 1.15;
float buildingHeight(vec2 id) {
  float n = gnoise(id * 0.31 + vec2(4.1, 7.3)) * 0.5 + 0.5;
  float h = 0.15 + 2.7 * n * n + 0.22 * sin(uT * 0.7 + id.x * 1.7 + id.y * 2.3) * uMotion;
  // they rise in a wave from the middle of the plot
  float r = length(id);
  float grow = clamp(uRise * 1.6 - r * 0.09, 0.0, 1.0);
  return h * grow * (1.0 - smoothstep(4.5, 7.0, r));
}
float sdCity(vec3 p, bool bounded) {
  vec2 id = floor(p.xz / LOT + 0.5);
  vec2 lp = p.xz - id * LOT;
  float h = max(buildingHeight(id), 0.001);
  float d = min(sdBox(vec3(lp.x, p.y - h * 0.5, lp.y), vec3(0.4, h * 0.5, 0.4)), p.y);
  if (bounded) {
    // never step past the edge of a lot into a taller neighbour
    vec2 edge = LOT * 0.5 - abs(lp);
    d = min(d, max(min(edge.x, edge.y), 0.0) + 0.04);
  }
  return d;
}
Ink renderCity(vec2 P) {
  Ink o = Ink(0.0, 0.0, 0, -1);
  // framed up and to the right, so it shows above the project grid and through it
  vec2 uv = (P - uView * vec2(0.62, 0.4)) / (0.5 * uView.y);
  uv.y = -uv.y;
  float yaw = 0.7 + uLoc.y * 0.9 + uT * 0.03;
  vec3 ta = vec3(0.0, 0.6, 0.0);
  vec3 ro = ta + vec3(cos(yaw) * 11.5, 7.2, sin(yaw) * 11.5);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 2.1 * fw);

  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 90; i++) {
    float d = sdCity(ro + rd * t, true);
    if (d < 0.003) { hit = true; break; }
    t += d;
    if (t > 45.0) break;
  }
  if (!hit) return o;
  vec3 p = ro + rd * t;
  float fog = exp(-max(t - 9.0, 0.0) * 0.07);
  // on a phone the text runs straight across it, so it stays faint there
  float faint = uView.x < 640.0 ? 0.45 : 1.0;
  if (p.y < 0.01) {
    // the ground: faint streets on a dotted plot
    vec2 lp = p.xz - floor(p.xz / LOT + 0.5) * LOT;
    float street = step(0.47, max(abs(lp.x), abs(lp.y)));
    float plot = 1.0 - smoothstep(4.0, 7.5, length(p.xz) / LOT);
    o.d = (0.1 + 0.18 * street) * plot * fog;
    o.s = 0.55 * faint;
    return o;
  }
  const vec2 e = vec2(0.002, -0.002);
  vec3 n = normalize(e.xyy * sdCity(p + e.xyy, false) + e.yyx * sdCity(p + e.yyx, false) +
                     e.yxy * sdCity(p + e.yxy, false) + e.xxx * sdCity(p + e.xxx, false));
  float lum = 0.12 + 0.85 * max(dot(n, normalize(vec3(0.45, 0.85, 0.3))), 0.0);
  o.d = clamp(mix(0.24, 1.0, 1.0 - lum), 0.0, 1.0) * fog;
  o.s = 0.9 * faint;
  // a few buildings are inked in rust: the projects
  vec2 id = floor(p.xz / LOT + 0.5);
  if (hash01(ivec2(id) + ivec2(41, 7)) < 0.09) o.tone = 1;
  return o;
}

// ---------------------------------------------------------------- main
void main() {
  ivec2 ic = ivec2(gl_FragCoord.xy);            // column, row from the top
  vec2 P = (vec2(ic) + 0.5) * uCell;
  float th = bayer4(ic);

  // which section this cell is over; the seams are torn and dithered
  float jag = gnoise(vec2(P.x / 46.0, 2.7)) * 18.0 + (th - 0.5) * 14.0;
  int region = 0;
  for (int i = 1; i < 5; i++) if (P.y - jag >= uBounds[i]) region = i;
  bool inverted = region == 2;

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
  else if (region == 3) ink = renderCity(P);
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
    else o = renderObject(k, Q, rect, k == 1 ? uLoc.z : uLoc.w);
    if (o.s <= 0.0) continue;
    if (uMotion > 0.0 && st.x < 0.999 && h1 > st.x - 0.12) o.glyph = noiseGlyph(ic, 0);
    ink = o;
  }

  int glyph = ink.glyph >= 0 ? ink.glyph : RAMP_G[clamp(int(floor(ink.d * 12.0 + th * 0.98)), 0, 12)];
  if (ink.s <= 0.0) glyph = 0;
  // the name's own grid has no sections to invert: its alpha carries the density instead,
  // for the wash the blit lays behind each of its glyphs
  outCell = vec4(float(glyph) / 255.0, float(ink.tone) / 255.0, ink.s, namePass ? ink.d : (inverted ? 1.0 : 0.0));
}`;

export const BLIT_UNIFORMS = [
  "uField", "uAtlas", "uCellDev", "uDevH", "uPaper", "uInk", "uRust", "uRustInv", "uNameField", "uNameAtlas", "uNameCellDev",
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

out vec4 outColor;

bool lit(vec4 cell) { return cell.r > 0.5 / 255.0 && cell.b > 0.0; }

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
