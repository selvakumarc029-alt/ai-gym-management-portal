(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealSelector = [
    ".dashboard-hero", ".metric-grid-with-quick", ".card", ".quick-card", ".metric",
    ".feature-card", ".action-subcard", ".auth-card", ".attendance-card",
    ".hero-copy > *", ".hero-visual", ".section-heading"
  ].join(",");

  const progress = document.createElement("div");
  progress.className = "premium-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);

  const updateProgress = () => {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0}%`;
  };
  document.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  const observer = reducedMotion ? null : new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: "0px 0px -6%" });

  const hydrate = (root = document) => {
    root.querySelectorAll?.(revealSelector).forEach((element, index) => {
      if (element.dataset.premiumReady) return;
      element.dataset.premiumReady = "true";
      element.classList.add("premium-reveal");
      element.style.setProperty("--premium-delay", `${Math.min(index % 7, 6) * 55}ms`);
      if (reducedMotion) element.classList.add("is-visible");
      else observer.observe(element);
    });
  };

  hydrate();
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) hydrate(node);
  }))).observe(document.body, { childList: true, subtree: true });

  document.addEventListener("pointerdown", (event) => {
    const target = event.target.closest("button, .button, .wide-action, .logout-link");
    if (!target || reducedMotion) return;
    const bounds = target.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "premium-ripple";
    ripple.style.left = `${event.clientX - bounds.left}px`;
    ripple.style.top = `${event.clientY - bounds.top}px`;
    target.append(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });

  if (window.bootstrap) {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => new bootstrap.Tooltip(element));
  }
})();
