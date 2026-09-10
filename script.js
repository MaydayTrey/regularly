/* Regularly smoke page. Toggle, source tagging, contact email. Nothing else. */
(function () {
  "use strict";

  /* Fills every "email us" link on the site. */
  var CONTACT_EMAIL = "hello@regularly.us";

  var COPY = {
    owner: {
      h1: "Your regulars keep the lights on. Give them the priority they've earned.",
      sub: "Held slots, first access when a spot opens, and one place to reach every regular at once.",
      emailPlaceholder: "you@yourbusiness.com",
      businessLabel: "What kind of business do you run?",
      businessPlaceholder: "Barbershop, salon, gym, cafe...",
      button: "Notify me at launch",
      note: "Under development. Enter your email to be notified at launch and get in as an early adopter."
    },
    regular: {
      h1: "You're a regular. You should be treated like one.",
      sub: "Your slot, held. First dibs when something opens up. No rebooking from scratch every time.",
      emailPlaceholder: "you@email.com",
      businessLabel: "Where are you a regular?",
      businessPlaceholder: "My barber, my gym, the coffee shop on...",
      button: "Get on the list",
      note: "Under development. Enter your email to be notified at launch and get in early."
    }
  };

  /* 1. Source tagging: ?src=fb-owner or ?src=fb-regular, else "direct". */
  var sourceField = document.querySelector('input[name="source"]');
  if (sourceField) {
    var src = "";
    try {
      src = (new URLSearchParams(window.location.search).get("src") || "").trim();
    } catch (e) { /* very old browser, fall through to direct */ }
    src = src.replace(/[^\w.-]/g, "").slice(0, 80);
    sourceField.value = src || "direct";
  }

  /* 2. Audience toggle: slide the thumb, swap hidden field and copy, no reload. */
  var toggle = document.querySelector("[data-toggle]");
  var audienceField = document.querySelector('input[name="audience"]');
  var swapTimer = null;

  /* Move and size the thumb to sit exactly under the pressed button. */
  function placeThumb() {
    if (!toggle) return;
    var thumb = toggle.querySelector(".toggle-thumb");
    var current = toggle.querySelector('button[aria-pressed="true"]');
    if (!thumb || !current) return;
    thumb.style.width = current.offsetWidth + "px";
    thumb.style.transform = "translateX(" + current.offsetLeft + "px)";
  }

  if (toggle) {
    placeThumb();
    /* Enable the slide animation only after the first placement. */
    requestAnimationFrame(function () { toggle.classList.add("is-ready"); });
    /* Re-measure once the web font arrives and whenever the width changes. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);
    window.addEventListener("resize", placeThumb);
    window.addEventListener("orientationchange", placeThumb);
    if (window.ResizeObserver) new ResizeObserver(placeThumb).observe(toggle);
  }

  function setText(key, value) {
    var el = document.querySelector('[data-copy="' + key + '"]');
    if (el) el.textContent = value;
  }

  function writeCopy(audience) {
    var c = COPY[audience];
    setText("h1", c.h1);
    setText("sub", c.sub);
    setText("businessLabel", c.businessLabel);
    setText("button", c.button);
    setText("note", c.note);
    var email = document.getElementById("email");
    if (email) email.placeholder = c.emailPlaceholder;
    var business = document.getElementById("business");
    if (business) business.placeholder = c.businessPlaceholder;
  }

  function applyAudience(audience) {
    if (!COPY[audience]) return;
    if (audienceField) audienceField.value = audience;
    document.body.setAttribute("data-audience", audience);

    /* Each side lands on its own thanks page so submissions are easy to tell apart. */
    var form = document.querySelector('form[name="regularly-waitlist"]');
    if (form) form.setAttribute("action", "/thanks/" + audience + "s/");

    if (toggle) {
      toggle.setAttribute("data-selected", audience);
      var buttons = toggle.querySelectorAll("button[data-audience]");
      for (var i = 0; i < buttons.length; i++) {
        var on = buttons[i].getAttribute("data-audience") === audience;
        buttons[i].setAttribute("aria-pressed", on ? "true" : "false");
      }
      placeThumb();
    }

    /* Fade the copy out, swap it, fade back in. */
    document.body.classList.add("is-swapping");
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () {
      writeCopy(audience);
      document.body.classList.remove("is-swapping");
    }, 180);
  }

  if (toggle) {
    toggle.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-audience]");
      if (!btn) return;
      var next = btn.getAttribute("data-audience");
      if (toggle.getAttribute("data-selected") === next) return;
      applyAudience(next);
    });
  }

  /* 3. Submit handling. The form has novalidate so we can show an accessible
     error message instead of the browser bubble. On localhost (Live Server
     cannot take a POST) we skip the submit and jump straight to the thanks
     page; on Netlify the real POST goes through and Netlify Forms stores it. */
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  var waitlist = document.querySelector('form[name="regularly-waitlist"]');
  var emailInput = document.getElementById("email");
  var emailError = document.getElementById("email-error");

  function setEmailError(message) {
    if (emailError) emailError.textContent = message;
    if (emailInput) emailInput.setAttribute("aria-invalid", message ? "true" : "false");
  }

  if (waitlist && emailInput) {
    emailInput.addEventListener("input", function () {
      if (emailInput.getAttribute("aria-invalid") === "true" && emailInput.validity.valid) {
        setEmailError("");
      }
    });

    waitlist.addEventListener("submit", function (event) {
      var value = emailInput.value.trim();
      if (!value) {
        event.preventDefault();
        setEmailError("Enter your email address.");
        emailInput.focus();
        return;
      }
      if (!emailInput.validity.valid) {
        event.preventDefault();
        setEmailError("That email address doesn't look right.");
        emailInput.focus();
        return;
      }
      setEmailError("");
      if (isLocal) {
        event.preventDefault();
        window.location.assign(waitlist.getAttribute("action"));
      }
    });
  }

  /* 4. Meta Pixel micro-conversions: PageView -> ScrollToAbout -> CTAClick -> Lead.
     Every call is guarded so an ad blocker can never cause an error. */
  function track(name, params) {
    try {
      if (typeof window.fbq === "function") window.fbq("trackCustom", name, params);
    } catch (e) { /* pixel blocked or broken, ignore */ }
  }
  var pageSlug = window.location.pathname.replace(/^\/|\/$/g, "").split("/")[0] || "root";
  var isLanding = pageSlug === "owners" || pageSlug === "regulars";

  /* ScrollToAbout: once per page load, when the About heading is half in view.
     The heading, not the whole section, so this works on short phone screens
     where the section itself is taller than the viewport. */
  var about = document.getElementById("about-heading") || document.querySelector(".about");
  if (isLanding && about && window.IntersectionObserver) {
    var seen = false;
    var observer = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].isIntersecting && !seen) {
          seen = true;
          observer.disconnect();
          track("ScrollToAbout", { page: pageSlug });
        }
      }
    }, { threshold: 0.5 });
    observer.observe(about);
  }

  /* CTAClick: once per page load, on the tap itself, whether or not the form validates. */
  var cta = document.querySelector('form[name="regularly-waitlist"] button[type="submit"]');
  if (isLanding && cta) {
    var ctaFired = false;
    cta.addEventListener("click", function () {
      if (ctaFired) return;
      ctaFired = true;
      track("CTAClick", {
        page: pageSlug,
        audience: audienceField ? audienceField.value : ""
      });
    });
  }

  /* 5. Contact links. */
  var links = document.querySelectorAll("[data-mailto]");
  for (var j = 0; j < links.length; j++) {
    links[j].setAttribute("href", "mailto:" + CONTACT_EMAIL);
    if (links[j].getAttribute("data-mailto") === "text") {
      links[j].textContent = CONTACT_EMAIL;
    }
  }
})();
