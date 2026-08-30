"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";

const projects = [
  {
    no: "01",
    eyebrow: "DATA / OPERATIONS",
    title: "U.S. Airline Operations & Delay Intelligence",
    desc: "A 2024 operational reliability study focused on on-time performance, delay causes and airline comparisons.",
    meta: "TABLEAU · ANALYTICS · 10K FLIGHTS",
    image: "/airline.webp",
    href: "https://github.com/rizalhp"
  },
  {
    no: "02",
    eyebrow: "DATA / COMMERCE",
    title: "E-commerce Sales Intelligence",
    desc: "A million-row retail analysis built to move from raw transactions to customer, revenue and retention decisions.",
    meta: "PYTHON · SQL · TABLEAU · 1M+ ROWS",
    image: null,
    href: "https://github.com/rizalhp"
  },
  {
    no: "03",
    eyebrow: "BUILD / INTERACTIVE",
    title: "Kang Parkir Simulator",
    desc: "A systems-heavy Roblox simulation with progression loops, economy, combat, monetization and cross-device UI.",
    meta: "LUAU · GAME SYSTEMS · PRODUCT",
    image: null,
    href: "https://github.com/rizalhp"
  }
];

const stats = [
  ["1M+", "ROWS ANALYZED"],
  ["10K", "FLIGHTS STUDIED"],
  ["20+", "EVENTS BUILT"],
  ["3.52", "GPA"]
];

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.9
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    lenis.on("scroll", ScrollTrigger.update);

    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
      intro
        .from(".hero-word span", { yPercent: 115, duration: 1.3, stagger: 0.08 })
        .from(".hero-portrait", { y: 80, opacity: 0, scale: 0.96, duration: 1.2 }, "-=1")
        .from(".hero-meta > *", { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 }, "-=0.7");

      gsap.to(".hero-portrait", {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 70,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%" }
        });
      });

      gsap.utils.toArray<HTMLElement>(".project-card").forEach((card) => {
        gsap.from(card, {
          y: 90,
          opacity: 0,
          duration: 1.05,
          scrollTrigger: { trigger: card, start: "top 85%" }
        });
      });

      gsap.to(".marquee-track", {
        xPercent: -50,
        ease: "none",
        scrollTrigger: {
          trigger: ".marquee",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.3
        }
      });
    }, root);

    return () => {
      ctx.revert();
      lenis.destroy();
    };
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div ref={root} className="site-shell">
      <header className="nav">
        <button className="brand" onClick={() => scrollTo("#top")} aria-label="Back to top">
          ASPIK<span className="brand-dot">.</span>
        </button>
        <div className="nav-center">DATA · AI · BUILD</div>
        <button className="menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
          {menuOpen ? "CLOSE" : "MENU"}
        </button>
      </header>

      <div className={`menu-overlay ${menuOpen ? "is-open" : ""}`}>
        <button onClick={() => scrollTo("#work")}>WORK <span>01</span></button>
        <button onClick={() => scrollTo("#about")}>ABOUT <span>02</span></button>
        <button onClick={() => scrollTo("#contact")}>CONTACT <span>03</span></button>
        <p>aspik.dev — Bandung / Indonesia</p>
      </div>

      <main>
        <section className="hero" id="top">
          <div className="hero-kicker">RIZAL HIDAYAT PUTRA · PORTFOLIO 2026</div>
          <h1 className="hero-word" aria-label="Rizal">
            {"RIZAL".split("").map((letter, i) => <span key={i}>{letter}</span>)}
          </h1>

          <div className="portrait-frame">
            <div className="portrait-glow" />
            <img className="hero-portrait" src="/rizal.webp" alt="Portrait of Rizal Hidayat Putra" />
          </div>

          <div className="hero-meta">
            <div>
              <span className="eyebrow">CURRENT MODE</span>
              <strong>ANALYZE / BUILD</strong>
            </div>
            <p>From raw code<br />to pure vision.</p>
            <div className="hero-scroll">
              <span>SCROLL TO EXPLORE</span>
              <span className="arrow">↓</span>
            </div>
          </div>
        </section>

        <section className="statement section-pad">
          <p className="section-index">01 — MANIFESTO</p>
          <h2 data-reveal>
            I TURN <span>MESSY SIGNALS</span><br />
            INTO THINGS PEOPLE<br />
            CAN <em>SEE, USE &amp; DECIDE ON.</em>
          </h2>
          <div className="statement-foot" data-reveal>
            <p>Data science, analytics, machine learning and interactive systems — built with the same obsession: make complexity feel obvious.</p>
            <div className="orbit-mark">A<span>+</span></div>
          </div>
        </section>

        <section className="duality" id="work">
          <article className="duality-panel data-panel">
            <div className="panel-top"><span>01</span><span>THE ANALYTICAL SIDE</span></div>
            <h3>DATA</h3>
            <p>Questions → evidence → decisions.</p>
          </article>
          <article className="duality-panel build-panel">
            <div className="panel-top"><span>02</span><span>THE MAKER SIDE</span></div>
            <img src="/chibi.webp" alt="Aspik character artwork" />
            <h3>BUILD</h3>
            <p>Ideas → systems → experiences.</p>
          </article>
        </section>

        <section className="projects section-pad">
          <div className="projects-heading">
            <p className="section-index">02 — SELECTED WORK</p>
            <h2 data-reveal>BUILT TO<br /><span>MOVE SOMETHING.</span></h2>
          </div>

          <div className="project-list">
            {projects.map((project, idx) => (
              <a className={`project-card project-${idx + 1}`} href={project.href} target="_blank" rel="noreferrer" key={project.title}>
                <div className="project-topline">
                  <span>{project.no}</span>
                  <span>{project.eyebrow}</span>
                  <span>↗</span>
                </div>
                <div className="project-visual">
                  {project.image ? (
                    <img src={project.image} alt={project.title} />
                  ) : idx === 1 ? (
                    <div className="commerce-art" aria-hidden="true">
                      <div className="big-number">69.78%</div>
                      <span>CHAMPIONS&apos; SHARE OF CUSTOMER VALUE</span>
                      <div className="bars"><i/><i/><i/><i/><i/></div>
                    </div>
                  ) : (
                    <div className="game-art" aria-hidden="true">
                      <div className="parking-p">P</div>
                      <div className="road-line" />
                      <span>SIMULATION / ECONOMY / COMBAT / UI</span>
                    </div>
                  )}
                </div>
                <div className="project-copy">
                  <h3>{project.title}</h3>
                  <p>{project.desc}</p>
                  <span>{project.meta}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="marquee" aria-hidden="true">
          <div className="marquee-track">
            <span>PYTHON · SQL · TABLEAU · MACHINE LEARNING · PRODUCT THINKING · LUAU · </span>
            <span>PYTHON · SQL · TABLEAU · MACHINE LEARNING · PRODUCT THINKING · LUAU · </span>
          </div>
        </section>

        <section className="numbers section-pad">
          <div className="numbers-intro">
            <p className="section-index">03 — SIGNALS</p>
            <h2 data-reveal>NUMBERS ARE<br />ONLY USEFUL WHEN<br /><span>THEY MEAN SOMETHING.</span></h2>
          </div>
          <div className="stats-grid">
            {stats.map(([value, label]) => (
              <div className="stat" key={label} data-reveal>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about section-pad" id="about">
          <div className="about-image-wrap" data-reveal>
            <img src="/rizal.webp" alt="Rizal Hidayat Putra" />
            <span>RHP / 2026</span>
          </div>
          <div className="about-copy">
            <p className="section-index">04 — ABOUT</p>
            <h2 data-reveal>CURIOUS<br />BY DEFAULT.</h2>
            <p data-reveal>
              Informatics graduate focused on data and intelligent systems. I like the point where analysis stops being a report and starts becoming a product, a decision, or a system people can actually use.
            </p>
            <div className="experience-lines" data-reveal>
              <div><span>2024</span><strong>DATA SCIENCE INTERN</strong><span>NEURAL TECHNOLOGIES INDONESIA</span></div>
              <div><span>2025—26</span><strong>GAME DEVELOPER</strong><span>INDEPENDENT / CONTRACT</span></div>
              <div><span>NOW</span><strong>DATA · AI · ANALYTICS</strong><span>OPEN TO THE NEXT CHALLENGE</span></div>
            </div>
          </div>
        </section>

        <section className="contact" id="contact">
          <p>05 — LET&apos;S BUILD SOMETHING USEFUL</p>
          <a href="https://github.com/rizalhp" target="_blank" rel="noreferrer" className="contact-title">
            MAKE IT<br /><span>REAL ↗</span>
          </a>
          <div className="contact-bottom">
            <strong>ASPIK.DEV</strong>
            <span>RIZAL HIDAYAT PUTRA</span>
            <span>© 2026</span>
          </div>
        </section>
      </main>
    </div>
  );
}
