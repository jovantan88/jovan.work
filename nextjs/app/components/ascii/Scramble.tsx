"use client";

import { useEffect, useRef } from "react";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789#%&*+=/<>?";

/**
 * Mono text that decodes from random characters the first time it scrolls into view.
 * Meant for monospaced labels only, so the line never changes width while it runs.
 * Screen readers get the final text; the animated copy is aria-hidden.
 */
export default function Scramble({ text, duration = 700 }: { text: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const settle = [...text].map((_, i) => (i / Math.max(text.length, 1)) * 0.6 + Math.random() * 0.4);
      const tick = (now: number) => {
        const p = (now - start) / duration;
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          out += ch === " " || p >= settle[i] ? ch : CHARS[(Math.random() * CHARS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) raf = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.2 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text, duration]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true">{text}</span>
    </>
  );
}
