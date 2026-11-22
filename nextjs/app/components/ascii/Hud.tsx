"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Asterisk, X } from "lucide-react";
import Scramble from "./Scramble";
import styles from "./site.module.css";

export type Act = { id: string; label: string };

const pad = (n: number) => String(n).padStart(2, "0");
const BAR = 18;

/** Fixed instrument panel: wordmark, current act, nav, scroll gauge and Singapore time. */
export default function Hud({ acts }: { acts: Act[] }) {
  const [active, setActive] = useState(0);
  const [time, setTime] = useState("--:--:--");
  const [menuOpen, setMenuOpen] = useState(false);
  const gauge = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Scroll gauge, written straight to the DOM so scrolling never re-renders React.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const filled = Math.round(p * BAR);
      if (gauge.current) gauge.current.textContent = `[${"#".repeat(filled)}${".".repeat(BAR - filled)}] ${String(Math.round(p * 100)).padStart(3, "0")}%`;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, []);

  // The act whose section crosses the middle of the screen.
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = acts.findIndex(act => act.id === entry.target.id);
        if (index >= 0) setActive(index);
      }
    }, { rootMargin: "-50% 0px -50% 0px" });
    for (const act of acts) {
      const el = document.getElementById(act.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [acts]);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    const tick = () => setTime(format.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const current = acts[active] ?? acts[0];

  return (
    <>
      <header
        className={styles.topbar}
        onKeyDown={event => {
          if (event.key === "Escape" && menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <a href={`#${acts[0].id}`} className={styles.wordmark} onClick={() => setMenuOpen(false)}>
          jovan<span>.work</span><Asterisk size={18} aria-hidden="true" />
        </a>
        <p className={styles.actLabel} aria-hidden="true">
          <b>[{pad(active + 1)}/{pad(acts.length)}]</b> <Scramble key={current.id} text={current.label} />
        </p>
        <button
          ref={menuButton}
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? <>close <X size={14} aria-hidden="true" /></> : "menu +"}
        </button>
        <nav id="site-nav" className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Main navigation">
          {acts.slice(1).map(act => (
            <a
              key={act.id}
              href={`#${act.id}`}
              aria-current={current.id === act.id ? "location" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {act.label}{act.id === "contact" && <ArrowUpRight size={13} aria-hidden="true" />}
            </a>
          ))}
        </nav>
      </header>
      <div className={styles.bottombar} aria-hidden="true">
        <span>scroll <span ref={gauge} /></span>
        <span>sgt {time} · 1.35°n 103.82°e</span>
      </div>
    </>
  );
}
