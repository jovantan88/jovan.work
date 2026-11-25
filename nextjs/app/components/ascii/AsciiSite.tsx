"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight } from "lucide-react";
import { ABOUT, CAPABILITIES, SITE, STATS } from "../../lib/content";
import AsciiStage from "./AsciiStage";
import Hud, { type Act } from "./Hud";
import Journey from "./Journey";
import Loader from "./Loader";
import Deck from "./Deck";
import Scramble from "./Scramble";
import styles from "./site.module.css";

// Order matters: the stage reads [data-act] sections in this order.
const ACTS: Act[] = [
  { id: "hello", label: "hello" },
  { id: "about", label: "about" },
  { id: "experience", label: "experience" },
  { id: "work", label: "work" },
  { id: "contact", label: "say hi" },
];

const SIDES = [
  {
    label: "developer",
    file: "developer.txt",
    text: "i took up computing in sec 3 and ever since then i've been pursuing this field. i also love spamming hackathons and building side projects, hopefully these get me into MANGO (iykyk) one day.",
    skills: CAPABILITIES[0].items,
  },
  {
    label: "ai tinkerer",
    file: "ai-tinkerer.txt",
    text: (
      <>
        whoaa ai is moving so fast, it&apos;s hard to keep up sometimes but i try to stay updated with the latest ai tools and
        techniques. purchased huggingface&apos;s{" "}
        <a href="https://pollen-robotics.com/microduck/" target="_blank" rel="noopener noreferrer">microduck</a>{" "}
        recently and i hope to do something cool with it!
      </>
    ),
    skills: [...CAPABILITIES[1].items, ...CAPABILITIES[2].items.slice(0, 3)],
  },
  {
    label: "human",
    file: "human.txt",
    text: "you'd never know but i got rejected from all the unis i applied for during my first year. after that, i've been grinding my ass off and building my portfolio. now i'm in NUS! okay on a more chill note, outside of coding, i've been trying to get myself into different stuff like running and cooking. i hope to run a marathon someday!",
    skills: ["Singapore", "NUS Business AI Systems", "hackathons", "side quests", "larping"],
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

function SectionHead({ index, title, note }: { index: number; title: string; note: string }) {
  return (
    <div className={styles.sectionHead}>
      <span><b>[ {pad(index)} ]</b> <Scramble text={title} /></span>
      <span>{"// "}<Scramble text={note} /></span>
    </div>
  );
}

export default function AsciiSite({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [stageOn, setStageOn] = useState(false);
  const [load, setLoad] = useState({ done: 0, step: "waking the printer" });
  const [side, setSide] = useState(0);
  const current = SIDES[side];

  // Blocks marked [data-reveal] rise in once, the first time they come into view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.dataset.js = "";
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(styles.in);
        io.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    el.querySelectorAll("[data-reveal]").forEach(node => io.observe(node));
    return () => io.disconnect();
  }, []);

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % SIDES.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + SIDES.length) % SIDES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = SIDES.length - 1;
    else return;
    event.preventDefault();
    setSide(next);
    tabs.current[next]?.focus();
  }

  return (
    <div ref={root} className={`${styles.site} ${className ?? ""}`} data-stage={stageOn ? "on" : undefined}>
      <Loader done={load.done} step={load.step} />
      <AsciiStage className={styles.stage} onReady={setStageOn} onProgress={(done, step) => setLoad({ done, step })} />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Hud acts={ACTS} />

      <main id="main-content" className={styles.main} tabIndex={-1}>
        {/* 01 hello: the portrait is drawn by the stage into the anchor */}
        <section id="hello" data-act className={`${styles.section} ${styles.hero}`} aria-labelledby="hello-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><Scramble text="[ 01 ] // hello, world" /></p>
            <h1 id="hello-title" className={styles.heroTitle} data-reveal>
              <span>hey, i&apos;m</span>
              {/* drawn by the stage in 3D ASCII; the text itself stays for readers and selection */}
              <span className={styles.heroName} data-anchor="name"><em>Jovan</em> Tan.</span>
            </h1>
            <p className={styles.lede} data-reveal>
              a developer turning complex ai and data into products people actually use.
              welcome to my little larp corner of the internet.
            </p>
            <div className={styles.ctas} data-reveal>
              <a href="#work" className={styles.btnInk}>see the work <ArrowDown size={15} aria-hidden="true" /></a>
              <a href="#contact" className={styles.btnLine}>say hi <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
          <div className={styles.portrait} data-anchor="portrait" role="img" aria-label="Jovan, drawn in text characters" />
          <div className={styles.heroMeta}>
            <span>{SITE.location} · NUS Business AI Systems</span>
            <span>portfolio v6 · 2026</span>
            <span>scroll<span className={styles.caret}>_</span></span>
          </div>
        </section>

        {/* 02 about: a puzzle cube twists a layer at a time as you scroll */}
        <section id="about" data-act className={styles.section} aria-labelledby="about-title">
          <SectionHead index={2} title="about" note="a little introduction" />
          <div className={styles.aboutGrid}>
            <div>
              <h2 id="about-title" className={styles.display} data-reveal>i build to learn, and learn to <em>build better.</em></h2>
              <div className={styles.terminal} data-reveal>
                <div className={styles.termTabs} role="tablist" aria-label="Get to know Jovan">
                  {SIDES.map((s, index) => (
                    <button
                      key={s.label}
                      ref={el => { tabs.current[index] = el; }}
                      id={`side-tab-${index}`}
                      type="button"
                      role="tab"
                      aria-selected={side === index}
                      aria-controls="side-panel"
                      tabIndex={side === index ? 0 : -1}
                      onClick={() => setSide(index)}
                      onKeyDown={event => onTabKey(event, index)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div id="side-panel" role="tabpanel" aria-labelledby={`side-tab-${side}`} tabIndex={0} className={styles.termBody}>
                  <p className={styles.prompt}>$ cat {current.file}</p>
                  <p>{current.text}</p>
                  <ul className={styles.chips} aria-label="Skills and interests">
                    {current.skills.map(skill => <li key={skill}>{skill}</li>)}
                  </ul>
                </div>
              </div>
            </div>
            <div className={styles.aboutSide}>
              <div className={styles.cube} data-anchor="cube" aria-hidden="true" />
              <dl className={styles.stats}>
                {STATS.map(stat => (
                  <div key={stat.label}>
                    <dt>{stat.label.toLowerCase()}</dt>
                    <dd>{pad(stat.value)}{stat.suffix}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* 03 experience: pinned flythrough down the tunnel, one gate per stop */}
        <Journey head={<SectionHead index={3} title="experience" note="the journey so far" />} />

        {/* 04 work: a pinned stack of prints; each turns like a page to uncover the next */}
        <section id="work" data-act className={styles.work} aria-labelledby="work-title">
          <Deck
            head={<SectionHead index={4} title="work" note="made with curiosity" />}
            title={<>
              <h2 id="work-title" className={styles.display}>things i&apos;ve put <em>into the world.</em></h2>
              <p className={styles.deckLede}>big brain ideas, weekend experiments, and a few sleepless nights.</p>
            </>}
          />
          <div id="milestones" tabIndex={-1} className={styles.log} data-reveal>
            <p className={styles.prompt}>$ git log --milestones</p>
            <ul>
              {ABOUT.achievements.map(item => (
                <li key={item.title}>
                  <span>{item.year}</span>
                  {item.href
                    ? <a href={item.href} target="_blank" rel="noopener noreferrer">{item.title} <ArrowUpRight size={13} aria-hidden="true" /></a>
                    : <span>{item.title}</span>}
                </li>
              ))}
            </ul>
            <a className={styles.more} href={SITE.github} target="_blank" rel="noopener noreferrer">more on github <ArrowUpRight size={13} aria-hidden="true" /></a>
          </div>
        </section>

        {/* 05 contact: a hand waves hello */}
        <section id="contact" data-act className={`${styles.section} ${styles.contact}`} aria-labelledby="contact-title">
          <SectionHead index={5} title="contact" note="good things start with a hello" />
          <div className={styles.contactInner}>
            <div className={styles.hand} data-anchor="hand" aria-hidden="true" />
            <h2 id="contact-title" className={styles.contactTitle} data-reveal>say <em>hello.</em></h2>
            <p data-reveal>want to do a hackathon? recruiting? or just want to chat? i&apos;m always open to new opportunities!</p>
            <a className={styles.email} href={`mailto:${SITE.email}`}>{SITE.email} <ArrowUpRight size={17} aria-hidden="true" /></a>
            <ul className={styles.socials}>
              <li><a href={SITE.github} target="_blank" rel="noopener noreferrer">github <ArrowUpRight size={13} aria-hidden="true" /></a></li>
              <li><a href={SITE.linkedin} target="_blank" rel="noopener noreferrer">linkedin <ArrowUpRight size={13} aria-hidden="true" /></a></li>
              <li><a href={`mailto:${SITE.email}`}>email <ArrowUpRight size={13} aria-hidden="true" /></a></li>
            </ul>
          </div>
          <footer className={styles.footer}>
            <span>© {new Date().getFullYear()} jovan tan</span>
            <span>built with a packet of milo at 2am</span>
            <a href="#hello">back to top <ArrowUp size={13} aria-hidden="true" /></a>
          </footer>
        </section>
      </main>
    </div>
  );
}
