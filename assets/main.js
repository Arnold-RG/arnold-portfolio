(function () {
  var root = document.documentElement;
  root.classList.add("js");

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var themeToggle = document.getElementById("theme-toggle");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var explicit = false;

  try {
    var stored = localStorage.getItem("theme");
    explicit = stored === "dark" || stored === "light";
  } catch (e) {
    explicit = false;
  }

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist) {
      explicit = true;
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {}
    }
    if (themeMeta) {
      themeMeta.setAttribute("content", theme === "dark" ? "#101820" : "#f7f3ec");
    }
    if (themeToggle) {
      var dark = theme === "dark";
      themeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
      themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  applyTheme(currentTheme(), false);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  }

  var scheme = window.matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", function () {
    if (!explicit) applyTheme(scheme.matches ? "dark" : "light", false);
  });

  var toggle = document.querySelector(".nav-toggle");
  var drawer = document.getElementById("nav-drawer");
  var label = toggle ? toggle.querySelector(".nav-toggle-label") : null;
  var main = document.querySelector("main");
  var footer = document.querySelector(".site-footer");
  var header = document.querySelector(".site-header");

  function setHeaderHeight() {
    if (!header) return;
    root.style.setProperty("--header-h", header.offsetHeight + "px");
  }

  setHeaderHeight();

  function focusableIn(container) {
    if (!container) return [];
    return Array.prototype.slice.call(
      container.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) {
      return !el.closest("[hidden]");
    });
  }

  function setMenu(open) {
    if (!toggle || !drawer) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (label) label.textContent = open ? "Close" : "Menu";
    drawer.hidden = !open;
    root.classList.toggle("menu-open", open);
    if (main) main.inert = open;
    if (footer) footer.inert = open;
    setHeaderHeight();
    if (open) {
      var first = drawer.querySelector("a");
      if (first) first.focus();
    }
  }

  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      setMenu(!open);
      if (open) toggle.focus();
    });

    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (drawer.hidden) return;
      if (event.key === "Escape") {
        setMenu(false);
        toggle.focus();
        return;
      }
      if (event.key !== "Tab") return;
      var items = focusableIn(header);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  window.addEventListener("resize", function () {
    setHeaderHeight();
    if (window.innerWidth >= 1120 && toggle && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
    }
  });

  var reveals = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  function showAll() {
    reveals.forEach(function (el) {
      el.classList.remove("is-waiting");
      el.classList.add("is-in");
    });
  }

  if (motion.matches || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    reveals.forEach(function (el, index) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add("is-in");
      } else {
        el.style.transitionDelay = (index % 3) * 70 + "ms";
        el.classList.add("is-waiting");
      }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        entry.target.classList.remove("is-waiting");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    reveals.forEach(function (el) {
      if (!el.classList.contains("is-in")) io.observe(el);
    });
  }

  motion.addEventListener("change", function () {
    if (motion.matches) showAll();
  });

  var sectionIds = ["work", "experience", "skills", "certificates", "about", "contact"];
  var sections = sectionIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));

  function setActive(id) {
    navLinks.forEach(function (link) {
      if (id && link.getAttribute("data-section") === id) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var sectionIo = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-38% 0px -48% 0px", threshold: [0.1, 0.25, 0.5] });
    sections.forEach(function (section) { sectionIo.observe(section); });
  }

  var copyBtn = document.getElementById("copy-email");
  var emailLink = document.getElementById("email-link");
  if (copyBtn && emailLink) {
    var copyLabel = "Copy address";
    var copyTimer = 0;
    copyBtn.addEventListener("click", function () {
      var address = emailLink.textContent.trim();
      var done = function (ok) {
        copyBtn.textContent = ok ? "Copied" : "Select the address";
        window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(function () {
          copyBtn.textContent = copyLabel;
        }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(function () {
          done(true);
        }).catch(function () {
          done(false);
        });
      } else {
        done(false);
      }
    });
  }
})();
