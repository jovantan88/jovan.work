"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLenis } from "lenis/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { PROJECTS, type Project } from "../../lib/content";
import artwork from "./projectPrints.json";
import styles from "./projectReel.module.css";

type Print = NonNullable<Project["print"]>;
const plates = {
  iris: { caption: "Iris scan", ink: "#ffa875" },
  reel: { caption: "Film reel", ink: "#efd19a" },
  globe: { caption: "Society graph", ink: "#a9d6c0" },
  stairs: { caption: "Career pathways", ink: "#a9cfe5" },
  garment: { caption: "Garment study", ink: "#eba9a6" },
  map: { caption: "Event atlas", ink: "#c5d58e" },
} satisfies Record<Print, { caption: string; ink: string }>;

const projects = PROJECTS.filter((p): p is Project & { print: Print } => p.print !== undefined);
const columns = 108;
const prints = projects.map(p => artwork[p.print].map(row => row.padEnd(columns)).join("\n"));
const blank = prints[0].replace(/[^\n]/g, " ");
const pad = (n: number) => String(n).padStart(2, "0");

// Give each cell a fixed place in a diagonal sweep. Scrolling backwards then
// recreates the same intermediate print, including the loose type at the seam.
const noise = "/+:.~*%=";
const sweep = Array.from({ length: prints[0].length }, (_, i) => {
  const x = (i % (columns + 1)) / columns;
  const y = Math.floor(i / (columns + 1)) / (artwork.iris.length - 1);
  const grain = (Math.imul(i + 1, 2654435761) >>> 0) / 4294967296;
  return 0.12 + x * 0.48 + y * 0.2 + grain * 0.14;
});

function developPrint(index: number, step: number) {
  const from = index < 0 ? blank : prints[index];
  if (step === 0) return from;
  const to = prints[index + 1];
  if (step === 48) return to;
  const t = step / 48;
  let frame = "";
  for (let i = 0; i < from.length; i++) {
    const edge = t - sweep[i];
    if (from[i] === "\n" || (from[i] === " " && to[i] === " ")) frame += from[i];
    else if (Math.abs(edge) < 0.07) frame += noise[(i + step) % noise.length];
    else frame += edge > 0 ? to[i] : from[i];
  }
  return frame;
}

function readingLine(plate: HTMLElement) {
  // On phones the print pins above the text. Use the middle of the remaining
  // reading area so the image matches the project beneath it.
  const top = parseFloat(getComputedStyle(plate).top) || 0;
  return window.matchMedia("(max-width: 700px)").matches
    ? (top + plate.offsetHeight + window.innerHeight) / 2
    : window.innerHeight * 0.52;
}

export default function ProjectReel() {
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const type = useRef<HTMLPreElement>(null);
  const articles = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const lenis = useLenis();

  useEffect(() => {
    const reel = root.current, sheet = plate.current, glyphs = type.current;
    if (!reel || !sheet || !glyphs) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, visible = false, previous = -1;

    function update() {
      frame = 0;
      if (!sheet || !glyphs) return;
      const line = readingLine(sheet);
      const centers = articles.current.map(article => {
        const rect = article!.getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
      let from = 0;
      while (from < centers.length - 1 && centers[from + 1] <= line) from++;
      const between = from + 1 < centers.length
        ? Math.max(0, (line - centers[from]) / (centers[from + 1] - centers[from]))
        : 0;
      const current = between < 0.5 ? from : from + 1;
      setActive(current);
      // Hold a finished print while its project is in reading position.
      const mix = Math.max(0, Math.min(1, (between - 0.26) / 0.48));
      const entrance = Math.max(0, (0.96 - sheet.getBoundingClientRect().top / window.innerHeight) / 0.45);
      const entering = !motion.matches && from === 0 && between === 0 && entrance < 1;
      const source = entering ? -1 : from;
      const progress = motion.matches ? Number(current !== from) : entering ? entrance : mix;
      const step = Math.round(progress * 48);
      const key = source * 49 + step;
      if (previous === key) return;
      previous = key;
      glyphs.textContent = developPrint(source, step);
    }
    function queue() {
      if (visible && !frame) frame = requestAnimationFrame(update);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      queue();
    }, { rootMargin: "160px 0px" });
    const sizes = new ResizeObserver(queue);
    observer.observe(reel);
    sizes.observe(reel);
    sizes.observe(sheet);
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    motion.addEventListener("change", queue);
    return () => {
      observer.disconnect();
      sizes.disconnect();
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      motion.removeEventListener("change", queue);
      cancelAnimationFrame(frame);
    };
  }, []);

  function goTo(index: number, keyboard: boolean) {
    const article = articles.current[index], sheet = plate.current;
    if (!article || !sheet) return;
    const rect = article.getBoundingClientRect();
    const target = window.scrollY + rect.top + rect.height / 2 - readingLine(sheet);
    const immediate = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (keyboard) article.focus({ preventScroll: true });
    if (lenis) lenis.scrollTo(target, { immediate, duration: 0.65 });
    else window.scrollTo({ top: target, behavior: immediate ? "instant" : "smooth" });
  }

  const print = plates[projects[active].print];
  return (
    <div className={styles.reel} ref={root}>
      <a className={styles.skip} href="#milestones">skip to milestones <ArrowDown size={14} aria-hidden="true" /></a>
      <div className={styles.viewer} ref={plate} style={{ "--print-ink": print.ink } as CSSProperties}>
        <figure className={styles.plate} aria-hidden="true">
          <div className={styles.register} />
          <pre ref={type} className={styles.glyphs}>{prints[0]}</pre>
          <figcaption className={styles.caption}>
            <span><i>Fig.</i> {pad(active + 1)}</span>
            <span>{print.caption}</span>
          </figcaption>
        </figure>
        <nav className={styles.index} aria-label="Project index">
          {projects.map((project, i) => (
            <button key={project.print} type="button" onClick={event => goTo(i, event.detail === 0)}
              aria-current={active === i ? "step" : undefined} aria-controls={`project-${project.print}`}
              aria-label={`Show ${project.title}`} title={project.title}>
              {pad(i + 1)}
            </button>
          ))}
        </nav>
      </div>
      <div className={styles.chapters}>
        {projects.map((project, i) => {
          const [name, subtitle] = project.title.split(" - ");
          return (
            <article key={project.print} tabIndex={-1} id={`project-${project.print}`} className={styles.chapter}
              ref={el => { articles.current[i] = el; }} aria-labelledby={`title-${project.print}`}>
              <div className={styles.copy}>
                <p className={styles.meta}>{project.category}</p>
                <h3 id={`title-${project.print}`}>{name}{subtitle && <> <em>{subtitle}</em></>}</h3>
                <p className={styles.description}>{project.summary ?? project.desc}</p>
                <ul className={styles.tools} aria-label="Technologies and topics">
                  {project.tags.map(tag => <li key={tag}>{tag}</li>)}
                </ul>
                <div className={styles.links}>
                  {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer" aria-label={`Try ${name}`}>try it <ArrowUpRight /></a>}
                  {project.code && <a href={project.code} target="_blank" rel="noopener noreferrer" aria-label={`${name} source code`}>code <ArrowUpRight /></a>}
                  {project.submission && <a href={project.submission} target="_blank" rel="noopener noreferrer" aria-label={`${name} Devpost submission`}>devpost <ArrowUpRight /></a>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
