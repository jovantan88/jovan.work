"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import styles from "./loader.module.css";

/**
 * The first-load screen: a small ASCII valley, like the one over the work section, where a flock
 * crosses the sky as the stage gets ready (it is as far along as the loading is), smoke curls
 * from a cabin and clouds drift by, with a bar and the step under way. Once the stage has
 * drawn its first frame the screen lifts like a sheet off a press. It never holds the page for
 * long: without the stage (no WebGL) it lets go at once, and it gives up after FAILSAFE_MS.
 */

const W = 46, H = 13;
const BAR = 24;
const FAILSAFE_MS = 12000;
const HOLD_MS = 260;

// a fixed ridge, in rows from the top
const RIDGE = Array.from({ length: W }, (_, x) => {
  const h = 2.2 * Math.sin(x * 0.29 + 0.6) + 1.4 * Math.sin(x * 0.71 + 2.1) + 0.8 * Math.sin(x * 1.37);
  return Math.round(9.2 - Math.max(-1.5, h));
});

// a cabin down in the valley (the same one that sits on the hills over the work section)
const CABIN = ["  _||__", " /_____\\", " |_[]__|"];
const CABIN_X = 11;
const CABIN_BASE = Math.max(...RIDGE.slice(CABIN_X + 1, CABIN_X + 7));
const CLOUDS = [
  { row: 1, text: "-=====-", at: 6, speed: 0.9 },
  { row: 2, text: "--===--", at: 30, speed: 0.6 },
];

// how each character is inked
const PLAIN = 0, RUST = 1, FAINT = 2;

function scene(progress: number, t: number) {
  const ch: string[][] = Array.from({ length: H }, () => Array(W).fill(" "));
  const ink: number[][] = Array.from({ length: H }, () => Array(W).fill(PLAIN));
  const put = (x: number, y: number, c: string, k = PLAIN) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    ch[y][x] = c; ink[y][x] = k;
  };
  // the ridge, hatched on its shaded faces
  for (let x = 0; x < W; x++) {
    const ridge = RIDGE[x], s = RIDGE[Math.min(W - 1, x + 1)] - RIDGE[Math.max(0, x - 1)];
    put(x, ridge, s < 0 ? "/" : s > 0 ? "\\" : "_");
    for (let y = ridge + 1; y < H; y++) put(x, y, s < 0 && (x + y) % 3 === 0 ? "/" : y === H - 1 ? "_" : " ");
  }
  // clouds drifting across
  for (const c of CLOUDS) {
    const x0 = ((c.at + t * c.speed) % (W + 10)) - 8;
    [...c.text].forEach((k, i) => { if (c.row < (RIDGE[Math.round(x0 + i)] ?? 0)) put(x0 + i, c.row, k, FAINT); });
  }
  // the cabin, and smoke curling from its chimney
  CABIN.forEach((line, r) => [...line].forEach((k, i) => { if (k !== " ") put(CABIN_X + i, CABIN_BASE - 2 + r, k); }));
  for (let k = 0; k < 5; k++) {
    const a = (t * 0.32 + k / 5) % 1;
    const glyph = a < 0.2 ? "." : a < 0.5 ? (k % 2 ? ")" : "(") : a < 0.8 ? "~" : ".";
    put(CABIN_X + 3.5 + a * a * 6 + Math.sin(t * 1.3 + k) * 0.6 * a, CABIN_BASE - 3 - a * 6, glyph, FAINT);
  }
  // a flock crossing the sky in a loose V, as far along as the loading is
  const lead = -1 + progress * (W + 7), height = Math.round(4.2 + Math.sin(t * 0.8) * 0.7);
  for (let i = 0; i < 7; i++) {
    const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    const x = lead - rank * 2, y = height + side * rank;
    const beat = (t * (2.2 + (i % 3) * 0.3) + i * 0.37) % 1;
    if (y < (RIDGE[Math.round(x)] ?? H)) put(x, y, beat < 0.5 ? "v" : "^", RUST);
  }
  let html = "";
  for (let y = 0; y < H; y++) {
    let open = PLAIN;
    for (let x = 0; x < W; x++) {
      if (ink[y][x] !== open) {
        if (open !== PLAIN) html += open === RUST ? "</b>" : "</i>";
        if (ink[y][x] !== PLAIN) html += ink[y][x] === RUST ? "<b>" : "<i>";
        open = ink[y][x];
      }
      html += ch[y][x];
    }
    if (open !== PLAIN) html += open === RUST ? "</b>" : "</i>";
    if (y < H - 1) html += "\n";
  }
  return html;
}

// the first frame, rendered with the page so the scene is there before any script runs
const FIRST = { __html: scene(0, 0) };

export default function Loader({ done, step }: { done: number; step: string }) {
  const [gone, setGone] = useState(false);
  const [lifting, setLifting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLPreElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const target = useRef(done);
  const lenis = useLenis();
  useEffect(() => { target.current = done; }, [done]);

  // hold the page still while it loads
  useEffect(() => {
    if (gone || !lenis) return;
    lenis.stop();
    return () => { lenis.start(); };
  }, [lenis, gone]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let shown = 0, raf = 0, finishedAt = 0, last = "";
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const goal = now - t0 > FAILSAFE_MS ? 1 : target.current;
      // ease towards the real progress, creeping a little past it so it never sits still
      const creep = goal >= 1 ? 1 : Math.min(goal + 0.06, 0.97);
      shown += (creep - shown) * (reduced ? 1 : goal >= 1 ? 0.14 : 0.05);
      if (goal >= 1 && shown > 0.995) {
        shown = 1;
        if (!finishedAt) finishedAt = now;
        if (now - finishedAt > (reduced ? 0 : HOLD_MS)) { cancelAnimationFrame(raf); setLifting(true); }
      }
      const filled = Math.round(shown * BAR);
      const text = `${"#".repeat(filled)}${"-".repeat(BAR - filled)}`;
      if (bar.current && text !== last) { bar.current.textContent = text; last = text; }
      if (pct.current) pct.current.textContent = String(Math.round(shown * 100)).padStart(3, " ");
      if (art.current) art.current.innerHTML = scene(reduced ? 0.6 : 1 - Math.pow(1 - shown, 2), reduced ? 0 : (now - t0) / 1000);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;
  return (
    <div
      ref={root}
      className={styles.loader}
      data-lifting={lifting ? "" : undefined}
      onAnimationEnd={event => { if (event.target === root.current && lifting) setGone(true); }}
      role="status"
      aria-live="polite"
      aria-label={lifting ? "Loaded" : "Loading"}
    >
      <div className={styles.inner}>
        <p className={styles.kicker}>[ jovan.work ] <span>{"// printing v6"}</span></p>
        <pre ref={art} className={styles.art} aria-hidden="true" dangerouslySetInnerHTML={FIRST} />
        <div className={styles.meter} aria-hidden="true">
          <span>[</span><span ref={bar} className={styles.bar}>{"-".repeat(BAR)}</span><span>]</span>
          <span ref={pct} className={styles.pct}>  0</span><span>%</span>
        </div>
        <p className={styles.step} aria-hidden="true">&gt; {step}<span className={styles.caret}>_</span></p>
      </div>
    </div>
  );
}
