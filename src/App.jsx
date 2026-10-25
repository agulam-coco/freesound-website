import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  aboutFreesound,
  clients,
  eventPosters,
  freesoundHistory,
  images,
  journals,
  managerProfiles,
  managers,
  projects,
  footerNav,
  routes,
  services,
  site,
  socials
} from "./siteData.js";
import { pages as seoPages } from "./seo.js";

function cleanPath(pathname = typeof window === "undefined" ? "/" : window.location.pathname) {
  const path = pathname.replace(/\/+$/, "");
  return path || "/";
}

function parseHref(href) {
  const url = new URL(href, window.location.origin);
  return { path: cleanPath(url.pathname), hash: url.hash };
}

function scrollToHash(hash, behavior = "smooth") {
  if (!hash) return;
  const target = document.querySelector(hash);
  if (target) {
    target.scrollIntoView({ behavior, block: "start" });
  }
}

function slugTitle(slug) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function useBrowserPath() {
  const [path, setPath] = useState(cleanPath());

  useEffect(() => {
    const onPopState = () => setPath(cleanPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (href) => {
    const { path: nextPath, hash } = parseHref(href);
    const currentPath = cleanPath();
    const nextUrl = `${nextPath}${hash}`;

    if (nextPath !== currentPath) {
      window.history.pushState({}, "", nextUrl);
      setPath(nextPath);
      if (hash) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => scrollToHash(hash));
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (hash) {
      window.history.pushState({}, "", nextUrl);
      scrollToHash(hash);
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return [path, navigate];
}

const SmartLink = React.forwardRef(function SmartLink(
  { href, navigate, children, className, ...props },
  ref
) {
  const external = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");

  return (
    <a
      href={href}
      className={className}
      ref={ref}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      onClick={(event) => {
        if (external || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        navigate(href);
      }}
      {...props}
    >
      {children}
    </a>
  );
});

function useMotionSystem(path) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealEls = [...document.querySelectorAll("[data-reveal]")];

    if (reduceMotion) {
      revealEls.forEach((element) => {
        element.classList.add("is-visible");
        element.setAttribute("data-reveal-finished", "true");
      });
      return undefined;
    }

    revealEls.forEach((element, index) => {
      element.removeAttribute("data-reveal-finished");
      element.classList.remove("is-visible");
      element.style.setProperty("--reveal-delay", `${Math.min(index * 55, 420)}ms`);
    });

    const revealTimers = [];
    const finishReveal = (element) => {
      const delay = Number.parseFloat(element.style.getPropertyValue("--reveal-delay")) || 0;
      const charCount = element.querySelectorAll(".char").length;
      const characterDelay = Math.min(charCount * 32, 640);
      const timer = window.setTimeout(() => {
        element.setAttribute("data-reveal-finished", "true");
      }, delay + characterDelay + 920);
      revealTimers.push(timer);
    };
    const revealElement = (element) => {
      if (element.classList.contains("is-visible")) return;
      element.classList.add("is-visible");
      finishReveal(element);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealElement(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    revealEls.forEach((element) => observer.observe(element));

    let frame = 0;
    const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
    const revealVisibleNow = () => {
      revealEls.forEach((element) => {
        if (element.classList.contains("is-visible")) return;
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          revealElement(element);
          observer.unobserve(element);
        }
      });
    };
    const updateParallax = () => {
      frame = 0;
      revealVisibleNow();
      parallaxEls.forEach((element) => {
        const speed = Number(element.dataset.parallax) || 0.08;
        const rect = element.getBoundingClientRect();
        const centerDelta = rect.top + rect.height / 2 - window.innerHeight / 2;
        const offset = Math.max(-90, Math.min(90, centerDelta * speed * -1));
        element.style.setProperty("--parallax-offset", `${offset.toFixed(2)}px`);
      });
    };
    const requestParallax = () => {
      if (!frame) frame = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    const revealTimer = window.setTimeout(revealVisibleNow, 80);
    const revealBackupTimer = window.setTimeout(revealVisibleNow, 500);
    window.addEventListener("scroll", requestParallax, { passive: true });
    window.addEventListener("resize", requestParallax);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestParallax);
      window.removeEventListener("resize", requestParallax);
      window.clearTimeout(revealTimer);
      window.clearTimeout(revealBackupTimer);
      revealTimers.forEach((timer) => window.clearTimeout(timer));
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [path]);
}

function useTiltMotion(max = 10) {
  const ref = useRef(null);

  const onPointerMove = (event) => {
    if (window.matchMedia("(hover: none)").matches) return;
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.setProperty("--tilt-x", `${(-y * max).toFixed(2)}deg`);
    element.style.setProperty("--tilt-y", `${(x * max).toFixed(2)}deg`);
    element.style.setProperty("--spot-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    element.style.setProperty("--spot-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const onPointerLeave = () => {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
    element.style.setProperty("--spot-x", "50%");
    element.style.setProperty("--spot-y", "50%");
  };

  return { ref, onPointerMove, onPointerLeave };
}

function AnimatedText({ as: Tag = "span", children, className = "", ...props }) {
  const words = String(children).split(" ");
  let charIndex = 0;

  return (
    <Tag className={`split-text ${className}`.trim()} aria-label={String(children)} {...props}>
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="word" style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          {Array.from(word).map((char, i) => {
            const index = charIndex++;
            return (
              <span
                className="char"
                key={`${char}-${index}`}
                style={{ "--char-index": index }}
              >
                {char}
              </span>
            );
          })}
          {wordIdx < words.length - 1 && (
            <span
              className="char space"
              key={`space-${wordIdx}`}
              style={{ "--char-index": charIndex++ }}
            >
              {"\u00a0"}
            </span>
          )}
        </span>
      ))}
    </Tag>
  );
}

function Counter({ value }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);
  const match = String(value).match(/^(\d+)(.*)$/);
  const target = Number(match?.[1] || 0);
  const suffix = match?.[2] || "";

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const element = ref.current;
    if (!element) return undefined;

    if (reduceMotion) {
      setCurrent(target);
      return undefined;
    }

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1200;
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCurrent(Math.round(target * eased));
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.35 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);

  return <span ref={ref}>{current}{suffix}</span>;
}

function App() {
  const [path, navigate] = useBrowserPath();
  const route = useMemo(() => resolveRoute(path), [path]);
  useMotionSystem(path);

  useEffect(() => {
    const page = seoPages.find((p) => p.path === path);
    document.title = page ? page.title : `${route.title} | FreeSound Grinnell`;
  }, [path, route.title]);

  return (
    <Shell path={path} navigate={navigate}>
      {route.render(navigate)}
    </Shell>
  );
}

function resolveRoute(path) {
  if (path === "/") return { title: "FreeSound Grinnell | Where Student Music Lives", render: (navigate) => <HomePage navigate={navigate} /> };
  // Single-page site. The old /about, /projects, /journal and /contact-us pages are not used.
  return { title: "Not Found", render: (navigate) => <NotFound navigate={navigate} /> };
}

function Shell({ children, path, navigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  return (
    <>
      <header className="site-header" aria-label="Site header">
        <SmartLink href="/" navigate={navigate} className="brand-mark" aria-label="Go to home">
          <img src={images.logo} alt="" />
          <span>{site.name}</span>
        </SmartLink>
        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </header>

      <div className={`menu-panel ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="menu-panel-inner">
          <p className="eyebrow">Menu</p>
          {routes.map((route) => (
            <SmartLink key={route.href} href={route.href} navigate={navigate}>
              <span>{route.label}</span>
              {route.count ? <small>({route.count})</small> : null}
            </SmartLink>
          ))}
          <div className="menu-socials">
            {socials.map((item) => (
              <SmartLink key={item.label} href={item.href} navigate={navigate}>
                {item.label}
              </SmartLink>
            ))}
          </div>
        </div>
      </div>

      <main className="page-stage" key={path}>{children}</main>
    </>
  );
}

function HomePage({ navigate }) {
  return (
    <>
      <Hero navigate={navigate} />
      <ProjectsSection navigate={navigate} preview />
      <ManagersShowcase />
      <ManagerProfilesSection />
      <AboutBand />
      <AboutFreesoundContent />
      <ServicesSection />
      <Footer navigate={navigate} />
    </>
  );
}

function Hero({ navigate }) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  return (
    <section
      id="top"
      className="hero-shell"
      aria-label="FreeSound introduction"
      style={{ "--hero-x": pointer.x, "--hero-y": pointer.y }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3),
          y: ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3)
        });
      }}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
    >
      <div className="hero-media" data-parallax="0.045">
        <picture>
          <source srcSet={images.hero} media="(max-width: 809px)" />
          <img src={images.hero} alt="Student band performing on stage at a FreeSound show at Grinnell College" fetchpriority="high" />
        </picture>
      </div>
      <div className="hero-content">
        <div>
          <AnimatedText as="h1" className="mega-title" data-reveal="">
            {site.name}
          </AnimatedText>
          <p className="mono-label" data-reveal="">{site.tagline}</p>
        </div>
        <p className="hero-copy" data-reveal="">
          A student-run music organization at Grinnell College keeping rehearsal space, shared gear,
          sound training, and campus shows moving for anyone trying to make noise.
        </p>
      </div>
    </section>
  );
}

function ProjectsSection({ navigate, preview = false }) {
  const items = preview ? projects.slice(0, 4) : projects;

  return (
    <section id="events" className="section projects-section">
      <SectionIntro
        kicker="Events | Resources"
        title="What we keep alive"
        copy="FreeSound is part venue crew, part rehearsal home, part archive, and part invitation for students to find each other through music."
      />
      <div className="project-grid">
        {items.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}

function ProjectCard({ project }) {
  const tilt = useTiltMotion(8);

  return (
    <div
      className="project-card"
      data-reveal=""
      ref={tilt.ref}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <img loading="lazy" decoding="async" src={project.image} alt={project.title} />
      <div className="project-card-copy">
        {/* <span className="project-category mono-label">{project.category}</span> */}
        <AnimatedText as="h3">{project.title}</AnimatedText>
      </div>
    </div>
  );
}

function AboutBand() {
  return (
    <section id="about" className="about-band" data-reveal="">
      <div className="about-band-media" data-parallax="0.035">
        <img loading="lazy" decoding="async" src={images.about} alt="Crowd at a FreeSound student show at Grinnell College" />
      </div>
      <div className="about-band-panel" data-reveal="">
        <p className="mono-label">about freesound</p>
        <AnimatedText as="h2">A home for student sound</AnimatedText>
        <p>
          FreeSound supports Grinnell musicians by caring for a shared room, training students on
          gear, helping events sound better, and making space for bands, solo sets, and odd
          experiments to begin.
        </p>
      </div>
      <div className="client-strip" aria-label="Client names">
        <div className="client-track">
          {[...clients, ...clients].map((client, index) => (
            <span key={`${client}-${index}`}>{client}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  const [active, setActive] = useState(services[0]);

  return (
    <section id="services" className="section services-section">
      <SectionIntro
        kicker=""
        title="Access, gear, shows"
        copy="FreeSound helps students learn the tools, use the space respectfully, and build events that make campus feel alive."
      />

      <div className="services-layout">
        <div className="service-image">
          <img loading="lazy" decoding="async" key={active.name} src={active.image} alt={active.name} data-parallax="0.025" />
        </div>
        <div className="service-list" role="tablist" aria-label="Services">
          {services.map((service) => (
            <button
              key={service.name}
              type="button"
              className={service.name === active.name ? "active" : ""}
              onClick={() => setActive(service)}
              onPointerEnter={() => setActive(service)}
            >
              <span>{service.number}</span>
              <strong>{service.name}</strong>
            </button>
          ))}
        </div>
        <div className="service-copy">
          <p className="mono-label">{active.name}</p>
          <h3>{active.name}</h3>
          <p>{active.copy}</p>
        </div>
      </div>

      <div className="metrics-row">
        <Metric value="1999" label="Student music roots at Grinnell" />
        <Metric value="2+" label="Major showcase traditions each year" />
      </div>
    </section>
  );
}

function Metric({ value, label }) {
  return (
    <div className="metric" data-reveal="">
      <strong><Counter value={value} /></strong>
      <span>{label}</span>
    </div>
  );
}

function JournalSection({ navigate, preview = false }) {
  const items = preview ? journals.slice(0, 3) : journals;

  return (
    <section className="section journal-section">
      <SectionIntro
        kicker="Archive"
        title="Stories from the room"
        copy="A public archive for FreeSound traditions, campus shows, shared gear culture, and the student musicians who keep the scene moving."
        light
      />
      <div className="journal-grid">
        {items.map((article) => (
          <JournalCard key={article.slug} article={article} navigate={navigate} />
        ))}
      </div>
      {preview ? (
        <div className="section-action">
          <SmartLink href="/journal" navigate={navigate} className="text-link light">
            Open the archive
          </SmartLink>
        </div>
      ) : null}
    </section>
  );
}

function JournalCard({ article, navigate }) {
  const tilt = useTiltMotion(5);

  return (
    <SmartLink
      href={`/journal/${article.slug}`}
      navigate={navigate}
      className="journal-card"
      data-reveal=""
      ref={tilt.ref}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <img loading="lazy" decoding="async" src={article.image} alt={article.title} />
      <div>
        <AnimatedText as="h3">{article.title}</AnimatedText>
        <p>{article.category}</p>
      </div>
    </SmartLink>
  );
}

function ContactCta({ navigate }) {
  return (
    <section className="contact-cta" data-reveal="">
      <img loading="lazy" decoding="async" src={images.contact} alt="FreeSound event from the stage" data-parallax="0.03" />
      <div data-reveal="">
        <p className="mono-label">Connect</p>
        <AnimatedText as="h2">Start with the sound</AnimatedText>
        <p>
          Looking for rehearsal space, sound training, event help, or a way into the Grinnell music
          scene? Tell FreeSound what you are trying to make.
        </p>
        <SmartLink href="/contact-us" navigate={navigate} className="round-action light">
          Connect
        </SmartLink>
      </div>
    </section>
  );
}

function Footer({ navigate }) {
  return (
    <footer className="site-footer" data-reveal="">
      <div className="footer-top">
        <p className="mono-label">Stay connected.</p>
        <a className="footer-email" href={`mailto:${site.email}`}>
          {site.emailLabel}
        </a>
      </div>
      <div className="footer-grid">
        <div>
          <p className="footer-heading">Menu</p>
          <nav className="footer-nav" aria-label="Footer navigation">
            {footerNav.map((item) => (
              <SmartLink key={item.href} href={item.href} navigate={navigate} className="footer-nav-link">
                {item.label}
              </SmartLink>
            ))}
          </nav>
        </div>
        <div>
          <p className="footer-heading">Social Media</p>
          <nav className="footer-nav" aria-label="Social media links">
            {socials.map((item) => (
              <SmartLink key={item.label} href={item.href} navigate={navigate} className="footer-nav-link">
                {item.label}
              </SmartLink>
            ))}
          </nav>
        </div>
      </div>
      <p className="copyright">{site.footerNote}</p>
    </footer>
  );
}

function SectionIntro({ kicker, title, copy, light = false }) {
  return (
    <div className={`section-intro ${light ? "light" : ""}`} data-reveal="">
      <p className="mono-label">{kicker}</p>
      <AnimatedText as="h2">{title}</AnimatedText>
      <p>{copy}</p>
    </div>
  );
}

function AboutPage({ navigate }) {
  return (
    <>
      <PageHero
        kicker="about freesound"
        title="About"
        image={images.about}
        copy="FreeSound is a student-run music community at Grinnell College, centered on shared space, shared gear, training, shows, and care for the campus scene."
      />
      <AboutBand />
      <AboutFreesoundContent />
      <ServicesSection />
      <ManagersShowcase />
      <ManagerProfilesSection />
      <Footer navigate={navigate} />
    </>
  );
}

function ManagersShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fading, setFading] = useState(false);

  // NEW: State to show controls if iOS blocks autoplay (e.g., Low Power Mode)
  const [fallbackControls, setFallbackControls] = useState(false);

  const isInViewRef = useRef(false);
  const videoRef = useRef(null);
  const sectionRef = useRef(null);
  const fadeTimer = useRef(null);

  const switchTo = useCallback((index) => {
    if (index === activeIndex) return;
    setFading(true);
    setFallbackControls(false); // Reset controls on swap
    clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      setActiveIndex(index);
      setTimeout(() => setFading(false), 150);
    }, 180);
  }, [activeIndex]);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isInViewRef.current) return;

    const p = video.play();
    if (p !== undefined) {
      p.catch((err) => {
        if (err.name === "AbortError") {
          setTimeout(() => videoRef.current?.play().catch(() => { }), 300);
        } else if (err.name === "NotAllowedError") {
          // iOS hard-blocks autoplay in Low Power Mode or under strict data constraints.
          // Enable native controls so the user can tap to play manually.
          setFallbackControls(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          tryPlay();
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(section);

    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      isInViewRef.current = true;
    }

    return () => observer.disconnect();
  }, [tryPlay]);

  // NEW: Trigger tryPlay() immediately after load(). 
  // This breaks the onCanPlay deadlock during Low Power Mode.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    if (isInViewRef.current) {
      tryPlay();
    }
  }, [activeIndex, tryPlay]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  const handleEnded = useCallback(() => {
    switchTo((activeIndex + 1) % managers.length);
  }, [activeIndex, switchTo]);

  const handleCanPlay = useCallback(() => {
    tryPlay();
  }, [tryPlay]);

  // NEW: Callback ref to forcefully attach iOS-required DOM attributes immediately
  const bindVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (el) {
      el.defaultMuted = true;
      el.muted = true;
      el.setAttribute("muted", "");
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
    }
  }, []);

  return (
    <section id="managers" ref={sectionRef} className="managers-showcase">
      <div className="managers-intro" data-reveal="">
        <p className="mono-label">Managers | People</p>
        <AnimatedText as="h2">Meet the managers</AnimatedText>
      </div>

      <div className="managers-stage">
        <div className={`managers-video-frame ${fading ? "is-fading" : ""}`}>
          <video
            ref={bindVideoRef}
            src={managers[activeIndex].video}
            muted
            playsInline
            preload="metadata"
            controls={fallbackControls}
            disablePictureInPicture
            disableRemotePlayback
            onCanPlay={handleCanPlay}
            onEnded={handleEnded}
            style={{ pointerEvents: fallbackControls ? "auto" : "none" }}
            onPlay={() => setFallbackControls(false)}
          />
        </div>

        <div className="managers-meta">
          <span className="managers-name" style={{ opacity: fading ? 0 : 1 }}>
            {managers[activeIndex].name}
          </span>
          <div className="managers-dots" role="tablist" aria-label="Manager selector">
            {managers.map((mgr, i) => (
              <button
                key={mgr.name}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`View ${mgr.name}`}
                className={`managers-dot ${i === activeIndex ? "active" : ""}`}
                onClick={() => switchTo(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ManagerProfilesSection() {
  return (
    <section className="manager-profiles">
      <div className="manager-profiles-inner" data-reveal="">
        <div className="manager-profiles-header">
          <div className="manager-profiles-rule" />
          <h2>Current Freesound Managers</h2>
        </div>
        <div className="manager-profiles-grid">
          {managerProfiles.map((mgr) => (
            <div className="manager-profile-card" key={mgr.name}>
              <div className="manager-profile-photo">
                <img loading="lazy" decoding="async" src={mgr.photo} alt={`${mgr.name}, FreeSound manager`} />
              </div>
              <h3>{mgr.name} {mgr.classYear}</h3>
              <p className="manager-profile-bio">{mgr.bio}</p>
              {mgr.social && <p className="manager-profile-social">{mgr.social}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutFreesoundContent() {
  return (
    <section className="about-freesound-section">
      <div className="about-freesound-inner" data-reveal="">
        <div className="about-freesound-top">
          <div className="about-freesound-info">
            <h2>About Freesound</h2>
            <ul>
              <li><strong>WHAT:</strong> {aboutFreesound.what}</li>
              <li><strong>WHY:</strong> {aboutFreesound.why}</li>
              <li><strong>WHERE:</strong> {aboutFreesound.where}</li>
              <li><strong>WHEN:</strong> {aboutFreesound.when}</li>
            </ul>
          </div>
          <div className="about-freesound-image">
            <img loading="lazy" decoding="async" src={images.liveBand} alt="Live student band at a FreeSound show" />
          </div>
        </div>

        <div className="about-freesound-divider" />

        <div className="poster-gallery">
          {eventPosters.map((poster) => (
            <div className="poster-item" key={poster.alt}>
              <img loading="lazy" decoding="async" src={poster.image} alt={poster.alt} />
            </div>
          ))}
        </div>

        <div className="freesound-history">
          <h2>{freesoundHistory.title}</h2>
          <div className="freesound-history-content">
            <img loading="lazy" decoding="async" src={freesoundHistory.image} alt="Collage of FreeSound history since 1998" />
            <p>{freesoundHistory.text}</p>
          </div>
          <div className="freesound-history-rule" />
        </div>
      </div>
    </section>
  );
}


function ProjectsPage({ navigate }) {
  return (
    <>
      <PageHero
        kicker="Events | Resources"
        title="Events"
        image={projects[0].image}
        copy="Showcases, rehearsal resources, sound support, and public-facing pieces of FreeSound's campus music work."
      />
      <ProjectsSection navigate={navigate} />
      <ContactCta navigate={navigate} />
      <Footer navigate={navigate} />
    </>
  );
}

function ProjectDetail({ project, slug, navigate }) {
  if (!project) {
    return (
      <>
        <PageHero
          kicker="FreeSound"
          title={slugTitle(slug)}
          image={images.hero}
          copy="This route is ready for a future FreeSound event or resource page."
        />
        <Footer navigate={navigate} />
      </>
    );
  }

  const index = projects.findIndex((item) => item.slug === project.slug);
  const next = projects[(index + 1) % projects.length];

  return (
    <>
      <PageHero kicker={project.category} title={project.title} image={project.image} copy={project.summary} />
      <section className="detail-section" data-reveal="">
        <div>
          <p className="mono-label">Public note</p>
          <AnimatedText as="h2">A public-facing snapshot of FreeSound's student music work.</AnimatedText>
        </div>
        <div className="detail-copy">
          <p>
            FreeSound supports student musicians by keeping practical resources available and by
            creating low-pressure ways for people to perform, collaborate, and learn basic sound.
          </p>
          <p>
            This page intentionally leaves out internal operating details from the handbook and
            focuses on what students, performers, and the broader campus community should know.
          </p>
          <SmartLink href={`/projects/${next.slug}`} navigate={navigate} className="text-link">
            Next: {next.title}
          </SmartLink>
        </div>
      </section>
      <Footer navigate={navigate} />
    </>
  );
}

function JournalPage({ navigate }) {
  return (
    <>
      <PageHero
        kicker="Archive / History"
        title="Archive"
        image={images.crowd}
        copy="A public archive structure for FreeSound history, event traditions, room culture, and student music memory."
      />
      <JournalSection navigate={navigate} />
      <Footer navigate={navigate} />
    </>
  );
}

function ArticlePage({ article, slug, navigate }) {
  if (!article) {
    return (
      <>
        <PageHero
          kicker="Archive"
          title={slugTitle(slug)}
          image={images.heroAlt}
          copy="This archive route is ready for a future FreeSound story."
        />
        <Footer navigate={navigate} />
      </>
    );
  }

  return (
    <>
      <PageHero kicker={article.category} title={article.title} image={article.image} copy={article.excerpt} />
      <article className="article-body" data-reveal="">
        <p>
          FreeSound has always worked as more than a gear room. It is a place where students learn
          from each other, start bands, organize shows, and keep the informal music scene visible.
        </p>
        <p>
          The source handbook contains useful history and operations knowledge, but this public
          archive only surfaces details that help people understand the community, its traditions,
          and how to get involved.
        </p>
        <p>
          To add a real story here, edit the matching archive object in <code>src/siteData.js</code>
          and replace this placeholder body with approved public copy.
        </p>
        <SmartLink href="/journal" navigate={navigate} className="text-link">
          Back to archive
        </SmartLink>
      </article>
      <Footer navigate={navigate} />
    </>
  );
}

function ContactPage({ navigate }) {
  return (
    <>
      <PageHero
        kicker="connect"
        title="Get involved"
        image={images.contact}
        copy="Ask about sound training, rehearsals, event support, or ways to join the student music community."
      />
      <section className="contact-page" data-reveal="">
        <ContactForm />
        <div className="contact-card" data-reveal="">
          <p className="mono-label">What to ask about</p>
          <a href="/projects/rehearsal-room" onClick={(event) => {
            event.preventDefault();
            navigate("/projects/rehearsal-room");
          }}>Room access</a>
          <a href="/projects/sound-support" onClick={(event) => {
            event.preventDefault();
            navigate("/projects/sound-support");
          }}>Sound support</a>
          <p>
            Current students should use official Grinnell channels to reach the active managers for
            the latest room, training, and event support information.
          </p>
        </div>
      </section>
      <Footer navigate={navigate} />
    </>
  );
}

function ContactForm() {
  const [status, setStatus] = useState("");

  return (
    <form
      className="contact-form"
      data-reveal=""
      onSubmit={(event) => {
        event.preventDefault();
        setStatus("Thanks. This demo inquiry is ready to connect to the official FreeSound contact flow.");
      }}
    >
      <label>
        First name
        <input name="firstName" autoComplete="given-name" required />
      </label>
      <label>
        Last name
        <input name="lastName" autoComplete="family-name" required />
      </label>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        Group or affiliation
        <input name="group" autoComplete="organization" />
      </label>
      <label className="wide">
        What are you hoping to do?
        <textarea name="message" rows="5" />
      </label>
      <button type="submit">Send</button>
      {status ? <p className="form-status">{status}</p> : null}
    </form>
  );
}

function PageHero({ kicker, title, image, copy }) {
  return (
    <section className="page-hero">
      <img loading="lazy" decoding="async" src={image} alt={title} data-parallax="0.035" />
      <div data-reveal="">
        <p className="mono-label">{kicker}</p>
        <AnimatedText as="h1">{title}</AnimatedText>
        <p>{copy}</p>
      </div>
    </section>
  );
}

function NotFound({ navigate }) {
  return (
    <>
      <PageHero
        kicker="404"
        title="Page not found"
        image={images.hero}
        copy="This route is not part of the FreeSound site structure yet."
      />
      <section className="section">
        <SmartLink href="/" navigate={navigate} className="text-link">
          Return home
        </SmartLink>
      </section>
    </>
  );
}

export { App };
export default App;


