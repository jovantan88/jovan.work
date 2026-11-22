"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { EXPERIENCES } from "../../lib/content";
import { INTRO_SPAN, NARROW, P_START, cardSpot, dwell, journeyHeightSvh, journeyProgress, scrollForStop, sideOf } from "./journeyMath";
import styles from "./site.module.css";

/**
 * Experience as a pinned section that transforms as you scroll. The cards alternate sides:
 * each swings in on its outer edge like a door, holds while you read, then swings away as the
 * next comes in on the other side. Opposite each card the stage draws that company's logo in
 * ASCII, and morphs one logo into the next as it crosses over (see journeyMath.ts).
 */

const pad = (n: number) => String(n).padStart(2, "0");
const yearOf = (period: string) => period.match(/\d{4}/)?.[0] ?? "";
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t); };

export default function Journey({ head }: { head: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const count = EXPERIENCES.length;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-stop]"));
    const rail = Array.from(section.querySelectorAll<HTMLElement>("[data-rail]"));
    const fill = section.querySelector<HTMLElement>("[data-rail-fill]");
    const intro = section.querySelector<HTMLElement>("[data-journey-intro]");
    const counter = section.querySelector<HTMLElement>("[data-journey-count]");
    const railBox = section.querySelector<HTMLElement>("[data-journey-rail]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced;
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let active = -1;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const r = section.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 2) return;
      // narrow screens hang each card from its bottom edge (see cardSpot)
      const anchorY = vw < NARROW ? "-100%" : "-50%";
      const p = journeyProgress(r.top, r.height, vh, count);
      const pe = dwell(p);
      tilt.x += (tilt.tx - tilt.x) * 0.08;
      tilt.y += (tilt.ty - tilt.y) * 0.08;

      cards.forEach((card, i) => {
        const d = pe - i;
        const side = sideOf(i);
        const spot = cardSpot(i, vw, vh);
        let x = spot.x - vw / 2, y = spot.y - vh / 2, swing = 0, rx = 0, ry = 0;
        const o = 1 - smooth((Math.abs(d) - 0.26) / 0.24);
        if (!reduced) {
          // hinged on its outer edge: swings open as it arrives, shut as it leaves, rising with the scroll
          const away = smooth((Math.abs(d) - 0.04) / 0.46);
          swing = -side * away * 78;
          x += side * away * vw * 0.05;
          y -= d * vh * 0.3;
          const here = 1 - away;
          rx = fine ? -tilt.y * 4 * here : 0;
          ry = fine ? tilt.x * 6 * here : 0;
        }
        card.style.transform =
          `translate(-50%, ${anchorY}) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotateY(${(swing + ry).toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
        card.style.opacity = o.toFixed(3);
        card.style.pointerEvents = o > 0.6 ? "auto" : "none";
      });

      const index = Math.max(0, Math.min(count - 1, Math.round(pe)));
      if (index !== active) {
        active = index;
        rail.forEach((item, i) => item.toggleAttribute("data-active", i === index));
        if (counter) counter.textContent = `${pad(index + 1)} / ${pad(count)}`;
      }
      if (fill) fill.style.transform = `scaleX(${clamp01((pe + 1) / count).toFixed(4)})`;
      if (intro) {
        const gone = smooth((p - P_START) / INTRO_SPAN);
        intro.style.opacity = (1 - gone).toFixed(3);
        intro.style.transform = `translateY(${(-gone * 70).toFixed(1)}px)`;
        // the rail and counter take over once the title has gone
        if (railBox) railBox.style.opacity = gone.toFixed(3);
        if (counter?.parentElement) counter.parentElement.style.opacity = gone.toFixed(3);
      }
    };

    const onPointer = (event: PointerEvent) => {
      tilt.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      tilt.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    // Tabbing into a card that hasn't arrived yet scrolls straight to it.
    const onFocus = (event: FocusEvent) => {
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-stop]") : null;
      const i = card ? cards.indexOf(card) : -1;
      if (i < 0) return;
      const r = section.getBoundingClientRect();
      const top = scrollForStop(i, r.top + window.scrollY, r.height, window.innerHeight, count);
      if (Math.abs(top - window.scrollY) > 4) window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
    };

    raf = requestAnimationFrame(frame);
    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
    section.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      section.removeEventListener("focusin", onFocus);
    };
  }, [count]);

  return (
    <section
      ref={sectionRef}
      id="experience"
      data-act
      className={styles.experience}
      style={{ height: `${journeyHeightSvh(count).toFixed(1)}svh` }}
      aria-labelledby="experience-title"
    >
      <div className={styles.journey} data-journey>
        {head}
        <div className={styles.journeyIntro} data-journey-intro>
          <h2 id="experience-title" className={styles.display}>where i&apos;ve been <em>building.</em></h2>
          <p className={styles.journeyHint}>scroll to travel <ArrowDown size={13} aria-hidden="true" /></p>
        </div>

        <div className={styles.rail} data-journey-rail aria-hidden="true">
          <span className={styles.railTrack}><span className={styles.railFill} data-rail-fill /></span>
          <ol>
            {EXPERIENCES.map((experience, index) => (
              <li key={experience.company} data-rail>
                <span><b>{pad(index + 1)}</b> {yearOf(experience.period)}</span>
                <span>{experience.company.toLowerCase()}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className={styles.journeyCount} aria-hidden="true">stop <span data-journey-count>{pad(1)} / {pad(count)}</span></p>

        <ol className={styles.stops}>
          {EXPERIENCES.map((experience, index) => (
            <li key={experience.company}>
              <article
                className={styles.stopCard}
                data-stop
                data-side={sideOf(index) < 0 ? "left" : "right"}
                data-logo={experience.company}
                data-skills={experience.skills.join(" * ")}
              >
                <div className={styles.stopMeta}><span>stop {pad(index + 1)}</span><span>{experience.period}</span></div>
                <h3>{experience.company}</h3>
                <p className={styles.role}>{experience.role}</p>
                <p>{experience.desc}</p>
                <ul className={styles.tags}>{experience.skills.map(skill => <li key={skill}>{skill}</li>)}</ul>
                {experience.link && (
                  <a className={styles.stopLink} href={experience.link.href} target="_blank" rel="noopener noreferrer">
                    {experience.link.label} <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                )}
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
