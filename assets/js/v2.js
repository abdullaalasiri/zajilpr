/* Zajil PR — v2 interactions: sticky header, mobile menu, contact form, footer year.
   No content is hidden by script. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* header + mobile menu */
  const header = $(".header");
  const onScroll = () => header && header.classList.toggle("is-stuck", window.scrollY > 12);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const nav = $("#main-nav");
  const toggle = $(".nav-toggle");
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  /* contact form: validate, then open the visitor's e-mail app (static hosting) */
  const form = $(".contact-form");
  if (form) {
    const msg = $(".form-msg", form);
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
      e.preventDefault();
      const ok = $$(".field", form).map(validate).every(Boolean);
      if (!ok) {
        msg.className = "form-msg is-err";
        msg.textContent = "Please complete the required fields before sending.";
        const first = $(".field.is-invalid input, .field.is-invalid textarea", form);
        first && first.focus();
        return;
      }
      msg.className = "form-msg";
      msg.textContent = "";
      const val = (n) => ((form.elements[n] || {}).value || "").trim();
      const subject = val("topic") || "Zajil PR";
      const key = form.dataset.formKey;

      // No Web3Forms key: open the visitor's e-mail app (static fallback)
      if (!key) {
        const body = [val("message"), "", val("name"), val("company"), val("email")].filter((l, i) => i < 2 || l).join("\n");
        location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        return;
      }

      // Web3Forms: the message is e-mailed to the company; the visitor stays on the page
      const btn = $("button[type=submit]", form);
      const label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = form.dataset.sending || "Sending…";
      const fail = () => {
        msg.className = "form-msg is-err";
        msg.textContent = (form.dataset.error || "Sorry, the message could not be sent.") + " ";
        const a = document.createElement("a");
        a.href = `mailto:${form.dataset.mailto}`;
        a.textContent = form.dataset.mailto;
        msg.appendChild(a);
      };
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: key,
          subject: `Website enquiry: ${subject}`,
          from_name: val("name") || "Website visitor",
          name: val("name"),
          email: val("email"),
          company: val("company"),
          topic: val("topic"),
          message: val("message"),
          page: location.href,
          botcheck: form.elements.botcheck && form.elements.botcheck.checked,
        }),
      })
        .then((r) => r.json().catch(() => ({})).then((data) => ({ ok: r.ok && data.success !== false })))
        .then(({ ok }) => {
          if (!ok) return fail();
          form.reset();
          msg.className = "form-msg is-ok";
          msg.textContent = form.dataset.sent || "Thank you — your message has been sent.";
        })
        .catch(fail)
        .finally(() => {
          btn.disabled = false;
          btn.innerHTML = label;
        });
    });
  }

  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
