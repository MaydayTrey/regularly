/* Regularly smoke page. Toggle, source tagging, contact email. Nothing else. */
(function () {
  "use strict";

  /* Paste the real address here. It fills every "email us" link on the site. */
  var CONTACT_EMAIL = "hello@example.com";

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

  /* 3. Local preview only. Live Server cannot take a POST, so on localhost
     we skip the submit and jump straight to the thanks page. On Netlify this
     block never runs and Netlify Forms handles the real submission. */
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  var waitlist = document.querySelector('form[name="regularly-waitlist"]');
  if (isLocal && waitlist) {
    waitlist.addEventListener("submit", function (event) {
      if (!waitlist.checkValidity()) return;
      event.preventDefault();
      window.location.assign(waitlist.getAttribute("action"));
    });
  }

  /* 4. Contact links. */
  var links = document.querySelectorAll("[data-mailto]");
  for (var j = 0; j < links.length; j++) {
    links[j].setAttribute("href", "mailto:" + CONTACT_EMAIL);
    if (links[j].getAttribute("data-mailto") === "text") {
      links[j].textContent = CONTACT_EMAIL;
    }
  }
})();
