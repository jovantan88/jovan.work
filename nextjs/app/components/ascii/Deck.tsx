"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { PROJECTS, type Project } from "../../lib/content";
import { DECK_MAX_SHEETS, deckHeightSvh, deckProgress, dwell, scrollForSheet, sheetShift, skyAt } from "./deckMath";
import styles from "./site.module.css";

/**
 * Work as a pinned landscape the projects travel through. The cover (the section's title)
 * comes first, then one card per project; the stage draws each project's print in the sky
 * beside its card, and scrolling pans the whole scene sideways in parallax (see deckMath.ts).
 * Card and print move together, at the speed of their layer.
 */

type Printed = Project & { print: NonNullable<Project["print"]> };
const projects = PROJECTS.filter((p): p is Printed => p.print !== undefined).slice(0, DECK_MAX_SHEETS - 1);
const SHEETS = projects.length + 1;
const pad = (n: number) => String(n).padStart(2, "0");
const smooth = (n: number) => { const t = n < 0 ? 0 : n > 1 ? 1 : n; return t * t * (3 - 2 * t); };

export default function Deck({ head, title }: { head: ReactNode; title: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const stage = track.firstElementChild as HTMLElement | null;
    const sheets = Array.from(track.querySelectorAll<HTMLElement>("[data-sheet]"));
    const rail = Array.from(track.querySelectorAll<HTMLElement>("[data-deck-rail]"));
    const counter = track.querySelector<HTMLElement>("[data-deck-count]");
    const chrome = Array.from(track.querySelectorAll<HTMLElement>("[data-deck-chrome]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, active = -1, night = false;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const r = track.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 2 || !stage) return;
      const vw = stage.clientWidth;
      const pe = dwell(deckProgress(r.top, r.height, vh, SHEETS));

      sheets.forEach((el, i) => {
        const d = i - pe;
        const o = 1 - smooth((Math.abs(d) - 0.3) / 0.35);
        const x = reduced ? 0 : sheetShift(i, pe, vw);
        // a little lean into the direction of travel
        const lean = reduced ? 0 : Math.max(-1, Math.min(1, d)) * -3;
        el.style.opacity = o.toFixed(3);
        el.style.transform = Math.abs(d) < 0.001 ? "" : `translate3d(${x.toFixed(1)}px, 0, 0) rotate(${lean.toFixed(2)}deg)`;
        el.style.visibility = o > 0.002 ? "visible" : "hidden";
        el.style.pointerEvents = o > 0.6 ? "auto" : "none";
      });

      const index = Math.max(0, Math.min(SHEETS - 1, Math.round(pe)));
      if (index !== active) {
        active = index;
        rail.forEach((item, i) => item.toggleAttribute("data-active", i + 1 === index));
        if (counter) counter.textContent = `${pad(Math.max(1, index))} / ${pad(SHEETS - 1)}`;
      }
      // once night has fallen, the head, rail and counter switch to ink
      const dark = skyAt(pe, SHEETS).night > 0.6;
      if (dark !== night) { night = dark; stage.toggleAttribute("data-night", dark); }
      // the rail and counter come in once the cover starts to turn
      const on = Math.min(1, Math.max(0, (pe - 0.3) / 0.4)).toFixed(3);
      chrome.forEach(el => { el.style.opacity = on; });
    };

    // Tabbing into a sheet that isn't on top scrolls straight to it.
    const onFocus = (event: FocusEvent) => {
      const el = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-sheet]") : null;
      const i = el ? sheets.indexOf(el) : -1;
      if (i < 0) return;
      const r = track.getBoundingClientRect();
      const top = scrollForSheet(i, r.top + window.scrollY, r.height, window.innerHeight, SHEETS);
      if (Math.abs(top - window.scrollY) > 4) window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
    };

    raf = requestAnimationFrame(frame);
    track.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("focusin", onFocus);
    };
  }, []);

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    const top = scrollForSheet(i, r.top + window.scrollY, r.height, window.innerHeight, SHEETS);
    const immediate = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (lenis) lenis.scrollTo(top, { immediate, duration: 1.1 });
    else window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
  }

  return (
    <div ref={trackRef} className={styles.deckTrack} style={{ height: `${deckHeightSvh(SHEETS).toFixed(1)}svh` }}>
      <div className={styles.deck} data-deck>
        {head}
        {/* where the stage prints each project's artwork */}
        <div className={styles.deckPrint} data-deck-print aria-hidden="true" />

        {/* sheet 0, the cover */}
        <div className={styles.deckCover} data-sheet>
          {title}
          <p className={styles.journeyHint}>scroll to explore <ArrowDown size={13} aria-hidden="true" /></p>
        </div>

        <ol className={styles.deckSheets}>
          {projects.map((project, i) => {
            const [name, subtitle] = project.title.split(" — ");
            return (
              <li key={project.print}>
                <article className={styles.sheetCard} data-sheet data-print={project.print} aria-labelledby={`sheet-${project.print}`}>
                  <div className={styles.sheetMeta}><span>fig. {pad(i + 1)}</span><span>{project.category}</span></div>
                  <h3 id={`sheet-${project.print}`}>{name}{subtitle && <em>{subtitle}</em>}</h3>
                  <p>{project.summary ?? project.desc}</p>
                  <ul className={styles.sheetTags} aria-label="Technologies and topics">
                    {project.tags.map(tag => <li key={tag}>{tag}</li>)}
                  </ul>
                  <div className={styles.sheetLinks}>
                    {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer" aria-label={`Try ${name}`}>try it <ArrowUpRight size={13} aria-hidden="true" /></a>}
                    {project.code && <a href={project.code} target="_blank" rel="noopener noreferrer" aria-label={`${name} source code`}>code <ArrowUpRight size={13} aria-hidden="true" /></a>}
                    {project.submission && <a href={project.submission} target="_blank" rel="noopener noreferrer" aria-label={`${name} Devpost submission`}>devpost <ArrowUpRight size={13} aria-hidden="true" /></a>}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        <nav className={styles.deckRail} data-deck-chrome aria-label="Projects">
          {projects.map((project, i) => (
            <button key={project.print} type="button" data-deck-rail onClick={() => goTo(i + 1)} aria-label={`Show ${project.title}`}>
              <b>{pad(i + 1)}</b> {project.title.split(" — ")[0].toLowerCase()}
            </button>
          ))}
        </nav>
        <p className={styles.deckCount} data-deck-chrome aria-hidden="true">fig. <span data-deck-count>{pad(1)} / {pad(SHEETS - 1)}</span></p>
      </div>
    </div>
  );
}
