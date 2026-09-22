(() => {
  document.documentElement.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.documentElement.setAttribute("data-reduced-motion", "");

  /* Theme toggle */
  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const getTheme = () => root.getAttribute("data-theme") === "dark" ? "dark" : "light";

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (_) {}
    if (themeMeta) themeMeta.setAttribute("content", theme === "dark" ? "#0b1220" : "#f4f6f9");
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
  };

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      applyTheme(getTheme() === "dark" ? "light" : "dark");
    });
  }

  applyTheme(getTheme());

  /* Mobile nav */
  const toggle = document.querySelector(".nav-toggle");
  const drawer = document.getElementById("nav-drawer");

  if (toggle && drawer) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      drawer.classList.toggle("is-open", open);
      drawer.hidden = !open;
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    drawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  }

  /* Reveal on scroll */
  const reveals = document.querySelectorAll("[data-reveal]");

  const markVisible = (el, index = 0) => {
    el.style.transitionDelay = `${Math.min(index % 5, 4) * 55}ms`;
    el.classList.add("is-visible");
  };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    reveals.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) {
        markVisible(el, index);
      }
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (el.classList.contains("is-visible")) {
            io.unobserve(el);
            return;
          }
          markVisible(el, [...reveals].indexOf(el));
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );
    reveals.forEach((el) => {
      if (!el.classList.contains("is-visible")) io.observe(el);
    });
  }

  /* Nav accent bar */
  const sectionIds = ["work", "experience", "skills", "about", "contact"];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  const navLinks = document.querySelectorAll(".nav-links a[data-section]");
  const indicator = document.querySelector(".nav-indicator");
  const navPrimary = document.querySelector(".nav-primary");

  const moveIndicator = (link) => {
    if (!indicator || !link || !navPrimary) return;
    const parentBox = navPrimary.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    indicator.style.width = `${linkBox.width * 0.5}px`;
    indicator.style.transform = `translateX(${linkBox.left - parentBox.left + linkBox.width * 0.25}px)`;
  };

  const setActive = (id) => {
    let activeLink = null;
    navLinks.forEach((link) => {
      const match = link.dataset.section === id;
      if (match) {
        link.setAttribute("aria-current", "true");
        activeLink = link;
      } else {
        link.removeAttribute("aria-current");
      }
    });
    if (activeLink) moveIndicator(activeLink);
  };

  if ("IntersectionObserver" in window && sections.length) {
    const sectionIo = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-32% 0px -50% 0px", threshold: [0.1, 0.25, 0.45] }
    );
    sections.forEach((s) => sectionIo.observe(s));
  }

  window.addEventListener("resize", () => {
    const current = document.querySelector('.nav-links a[aria-current="true"]');
    if (current) moveIndicator(current);
  });

  requestAnimationFrame(() => {
    const first = document.querySelector(".nav-links a[data-section='work']");
    if (first) moveIndicator(first);
  });
})();
