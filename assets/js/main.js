/* Zajil Press — interactions (no dependencies) */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: stuck state + mobile nav ---------- */
  const header = $(".header");
  const nav = $("#main-nav");
  const toggle = $(".nav-toggle");
  const onScroll = () => {
    header && header.classList.toggle("is-stuck", window.scrollY > 24);
    toTop && toTop.classList.toggle("is-visible", window.scrollY > 600);
  };
  const toTop = $(".to-top");
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  toTop && toTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- Headline word reveal (skipped for Arabic: connected script clips badly in per-word masks) ---------- */
  const isArabic = document.documentElement.lang === "ar";
  $$(".words").forEach((el) => {
    if (isArabic) { el.classList.add("in-view"); return; }
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span"); w.className = "w";
            const i = document.createElement("span"); i.textContent = part; w.appendChild(i);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    let delay = 0;
    $$(".w > span", el).forEach((s) => { s.style.transitionDelay = `${delay}s`; delay += 0.06; });
  });

  /* ---------- Scroll reveal ---------- */
  // stagger grids: observe each child so long grids reveal row by row; delay by column position
  $$("[data-stagger]").forEach((grid) => {
    [...grid.children].forEach((child, i) => { child.style.transitionDelay = `${(i % 4) * 0.09}s`; });
  });
  const revealTargets = $$("[data-reveal], [data-stagger] > *, .words, .skills, .process");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        // reveal when entering, or if the element is already above the viewport (anchor links, restored scroll)
        if (en.isIntersecting || en.boundingClientRect.bottom < 0) { en.target.classList.add("in-view"); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    revealTargets.forEach((t) => io.observe(t));
  } else {
    revealTargets.forEach((t) => t.classList.add("in-view"));
  }

  /* ---------- Animated counters ---------- */
  const fmt = new Intl.NumberFormat("en-US");
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const dur = 1800;
    if (reduceMotion) { el.textContent = fmt.format(target) + suffix; return; }
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt.format(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const counters = $$("[data-count]");
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { animateCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
  } else counters.forEach(animateCount);

  /* ---------- Accordion ---------- */
  $$(".accordion").forEach((acc) => {
    $$(".acc__btn", acc).forEach((btn) => {
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        $$(".acc__btn", acc).forEach((b) => {
          b.setAttribute("aria-expanded", "false");
          $("#" + b.getAttribute("aria-controls")).classList.remove("is-open");
        });
        if (!open) {
          btn.setAttribute("aria-expanded", "true");
          $("#" + btn.getAttribute("aria-controls")).classList.add("is-open");
        }
      });
    });
  });

  /* ---------- Marquee: duplicate once for a seamless loop ---------- */
  $$(".marquee__track").forEach((track) => {
    if (reduceMotion) return;
    track.append(...[...track.children].map((n) => { const c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); return c; }));
  });

  /* ---------- Process diagram: auto-advance the active step ---------- */
  $$(".process").forEach((proc) => {
    const steps = $$(".step", proc);
    if (!steps.length) return;
    let i = 0, timer;
    const setActive = (n) => { steps.forEach((s, k) => s.classList.toggle("is-active", k === n)); proc.style.setProperty("--p", `${(n / (steps.length - 1)) * 100}%`); };
    setActive(0);
    const play = () => { if (reduceMotion) return; timer = setInterval(() => { i = (i + 1) % steps.length; setActive(i); }, 2600); };
    steps.forEach((s, k) => s.addEventListener("mouseenter", () => { clearInterval(timer); i = k; setActive(k); }));
    proc.addEventListener("mouseleave", play);
    play();
  });

  /* ---------- Contact form: client-side validation, then native submit ---------- */
  const form = $(".contact-form");
  if (form) {
    const msg = $(".form-msg", form);
    // back from a successful Netlify submission
    if (new URLSearchParams(location.search).get("sent") === "1") {
      msg.className = "form-msg is-ok";
      msg.textContent = form.dataset.sentMsg || "Thank you — your message has been sent.";
      form.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      history.replaceState(null, "", location.pathname);
    }
    const validate = (field) => {
      const input = $("input, textarea", field);
      if (!input || !input.required) return true;
      let ok = input.value.trim().length > 0;
      if (ok && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      field.classList.toggle("is-invalid", !ok);
      return ok;
    };
    $$(".field", form).forEach((f) => {
      const input = $("input, textarea", f);
      input && input.addEventListener("input", () => f.classList.contains("is-invalid") && validate(f));
    });
    form.addEventListener("submit", (e) => {
      const fields = $$(".field", form);
      const allOk = fields.map(validate).every(Boolean);
      if (!allOk) {
        e.preventDefault();
        msg.className = "form-msg is-err";
        msg.textContent = form.dataset.errorMsg || "Please complete the required fields before sending.";
        const first = $(".field.is-invalid input, .field.is-invalid textarea", form);
        first && first.focus();
        return;
      }
      msg.className = "form-msg";
      msg.textContent = "";
      // Static hosting: open the visitor's e-mail app with the message filled in.
      if (form.dataset.mailto) {
        e.preventDefault();
        const val = (n) => ((form.elements[n] || {}).value || "").trim();
        const subject = val("topic") || "Zajil PR";
        const body = [
          val("message"), "",
          `${val("name")}`,
          val("company"),
          val("email"),
        ].filter((line, i) => i < 2 || line).join("\n");
        location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        return;
      }
      const btn = $("button[type=submit]", form);
      if (btn) { btn.disabled = true; btn.textContent = form.dataset.sendingMsg || "Sending…"; }
    });
  }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach((y) => { y.textContent = new Date().getFullYear(); });
})();
