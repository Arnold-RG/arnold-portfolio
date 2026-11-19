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
      themeMeta.setAttribute("content", theme === "dark" ? "#080c12" : "#edf1f7");
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

  /* Letter stagger + brief scramble on the hero name (textContent only) */
  var scrambleRoot = document.querySelector("[data-scramble]");
  if (scrambleRoot && !motion.matches) {
    var glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var nodes = [];
    Array.prototype.forEach.call(scrambleRoot.childNodes, function (node) {
      if (node.nodeType !== 1) return;
      var text = node.textContent || "";
      node.textContent = "";
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var span = document.createElement("span");
        span.className = ch === " " ? "char char-space" : "char";
        span.setAttribute("aria-hidden", "true");
        span.textContent = ch === " " ? "\u00a0" : ch;
        span.style.animationDelay = (nodes.length * 0.028) + "s";
        node.appendChild(span);
        if (ch !== " ") nodes.push({ el: span, final: ch });
      }
    });
    scrambleRoot.setAttribute("aria-label", scrambleRoot.textContent.replace(/\s+/g, " ").trim());
    var frame = 0;
    var maxFrames = 18;
    function tick() {
      frame += 1;
      nodes.forEach(function (item, index) {
        var revealAt = 6 + Math.floor(index * 0.55);
        if (frame < revealAt) {
          item.el.textContent = glyphs.charAt(Math.floor(Math.random() * glyphs.length));
        } else {
          item.el.textContent = item.final;
        }
      });
      if (frame < maxFrames + nodes.length) {
        requestAnimationFrame(tick);
      } else {
        scrambleRoot.classList.add("is-ready");
      }
    }
    requestAnimationFrame(tick);
  } else if (scrambleRoot) {
    scrambleRoot.classList.add("is-ready");
  }

  /* Magnetic CTAs */
  var magnets = Array.prototype.slice.call(document.querySelectorAll(".magnetic"));
  if (magnets.length && !motion.matches && window.matchMedia("(pointer: fine)").matches) {
    magnets.forEach(function (btn) {
      var strength = 18;
      btn.addEventListener("pointermove", function (event) {
        var rect = btn.getBoundingClientRect();
        var x = event.clientX - rect.left - rect.width / 2;
        var y = event.clientY - rect.top - rect.height / 2;
        btn.style.transform = "translate(" + (x / strength) + "px, " + (y / strength) + "px)";
      });
      btn.addEventListener("pointerleave", function () {
        btn.style.transform = "";
      });
    });
  }

  var sectionIds = ["work", "skills", "experience", "certificates", "about", "contact"];
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

  var orbit = document.getElementById("orbit");
  var ring = document.getElementById("orbit-ring");
  var scene = orbit ? orbit.querySelector(".orbit-scene") : null;
  var status = document.getElementById("orbit-status");
  var live = document.getElementById("orbit-live");
  var prevBtn = document.getElementById("orbit-prev");
  var nextBtn = document.getElementById("orbit-next");

  if (orbit && ring && scene) {
    var cards = Array.prototype.slice.call(ring.querySelectorAll(".orbit-card"));
    var count = cards.length;
    var step = count ? 360 / count : 45;
    var angle = 0;
    var target = 0;
    var dragging = false;
    var lastX = 0;
    var moved = 0;
    var front = -1;
    var hovering = false;
    var focused = false;
    var inView = true;
    var wide = window.matchMedia("(min-width: 861px)");
    var raf = 0;

    function spinning() {
      return wide.matches && !motion.matches && count > 0;
    }

    function wrap(deg) {
      var a = ((deg % 360) + 360) % 360;
      if (a > 180) a -= 360;
      return a;
    }

    function indexAt(deg) {
      var best = 0;
      var bestAbs = 1e9;
      for (var i = 0; i < count; i++) {
        var dist = Math.abs(wrap(i * step + deg));
        if (dist < bestAbs) {
          bestAbs = dist;
          best = i;
        }
      }
      return best;
    }

    function labelFor(card) {
      var num = card.querySelector(".project-num");
      var title = card.getAttribute("data-title") || "";
      return (num ? num.textContent.trim() + "  " : "") + title;
    }

    function setFront(index) {
      if (!count) return;
      front = index;
      cards.forEach(function (card, n) {
        var face = !spinning() || n === index;
        card.classList.toggle("is-front", spinning() && n === index);
        if (spinning()) {
          var dist = Math.abs(wrap(n * step + angle));
          var t = Math.max(0, 1 - dist / 180);
          var depth = 0.38 + t * 0.62;
          var scale = 0.86 + t * 0.18;
          card.style.setProperty("--orbit-depth", depth.toFixed(3));
          card.style.setProperty("--orbit-scale", scale.toFixed(3));
          card.style.zIndex = String(Math.round(t * 20));
        } else {
          card.style.removeProperty("--orbit-depth");
          card.style.removeProperty("--orbit-scale");
          card.style.zIndex = "";
        }
        card.querySelectorAll("a, button").forEach(function (control) {
          if (face) control.removeAttribute("tabindex");
          else control.setAttribute("tabindex", "-1");
        });
      });
      if (status && cards[index]) status.textContent = labelFor(cards[index]);
    }

    function announce(index) {
      if (live && cards[index]) live.textContent = cards[index].getAttribute("data-title") || "";
    }

    function apply() {
      if (!spinning()) {
        ring.style.transform = "";
        if (front < 0) setFront(0);
        else setFront(front);
        return;
      }
      ring.style.transform = "rotateX(11deg) rotateY(" + angle.toFixed(2) + "deg)";
      setFront(indexAt(angle));
    }

    function frame() {
      raf = 0;
      if (!spinning()) {
        apply();
        return;
      }
      var idle = !dragging && !hovering && !focused && inView && document.visibilityState !== "hidden";
      if (idle) target -= 0.22;
      angle += (target - angle) * 0.16;
      apply();
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function go(dir) {
      if (!spinning()) {
        var index = front < 0 ? 0 : front;
        index = (index + dir + count) % count;
        setFront(index);
        cards[index].scrollIntoView({
          behavior: motion.matches ? "auto" : "smooth",
          inline: "center",
          block: "nearest"
        });
        announce(index);
        return;
      }
      var dest = (indexAt(target) + dir + count) % count;
      var base = -dest * step;
      var turns = Math.round((target - base) / 360);
      target = base + turns * 360;
      if (dir > 0 && target > angle - 0.5) target -= 360;
      if (dir < 0 && target < angle + 0.5) target += 360;
      announce(dest);
      wake();
    }

    scene.addEventListener("pointerdown", function (event) {
      if (!spinning() || event.button !== 0) return;
      dragging = true;
      moved = 0;
      lastX = event.clientX;
      if (scene.setPointerCapture) scene.setPointerCapture(event.pointerId);
    });

    scene.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var dx = event.clientX - lastX;
      lastX = event.clientX;
      moved += Math.abs(dx);
      target += dx * 0.28;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (moved > 8) announce(indexAt(target));
    }

    scene.addEventListener("pointerup", endDrag);
    scene.addEventListener("pointercancel", endDrag);
    scene.addEventListener("pointerenter", function () { hovering = true; });
    scene.addEventListener("pointerleave", function () { hovering = false; });

    cards.forEach(function (card, index) {
      card.addEventListener("click", function (event) {
        if (!spinning()) return;
        if (moved > 8) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!card.classList.contains("is-front")) {
          var link = event.target.closest("a");
          if (link) event.preventDefault();
          var base = -index * step;
          var turns = Math.round((target - base) / 360);
          target = base + turns * 360;
          wake();
        }
      }, true);
    });

    if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });

    orbit.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      var tag = event.target.tagName;
      if (tag === "A" || tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") {
        if (event.target !== scene && event.target !== prevBtn && event.target !== nextBtn) return;
      }
      event.preventDefault();
      go(event.key === "ArrowRight" ? 1 : -1);
    });

    orbit.addEventListener("focusin", function () { focused = true; });
    orbit.addEventListener("focusout", function (event) {
      if (!orbit.contains(event.relatedTarget)) focused = false;
    });

    scene.addEventListener("scroll", function () {
      if (spinning()) return;
      var mid = scene.getBoundingClientRect().left + scene.clientWidth / 2;
      var best = 0;
      var bestDist = 1e9;
      cards.forEach(function (card, index) {
        var rect = card.getBoundingClientRect();
        var dist = Math.abs(rect.left + rect.width / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      setFront(best);
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      var orbitIo = new IntersectionObserver(function (entries) {
        inView = entries.some(function (entry) { return entry.isIntersecting; });
        if (inView) wake();
      }, { threshold: 0.2 });
      orbitIo.observe(orbit);
    }

    wide.addEventListener("change", wake);
    motion.addEventListener("change", wake);
    setFront(0);
    wake();
  }
})();
