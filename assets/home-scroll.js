// 翻屏交互和入场节奏参考 Arcadi4/blog，授权见 arcadia-MIT.txt。
const root = document.documentElement;
const header = document.querySelector(".site-header");
const panels = [...document.querySelectorAll("[data-home-panel]")];

if (header && panels.length > 1 && root.classList.contains("home-page")) {
  const controls = [...document.querySelectorAll("[data-scene-target]")];
  const navigation = controls.filter((control) => control.hasAttribute("data-scene-nav"));
  const panelIndex = new Map(panels.map((panel, index) => [panel.id, index]));
  const status = document.getElementById("scene-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealed = new Set();
  const animations = new Set();
  let headerHeight = 0;
  let activeIndex = -1;
  let scrollFrame = 0;
  let transition = null;
  let unlockTimer = 0;
  let cooldownUntil = 0;
  let lastDirection = 0;

  const reveal = (index) => {
    if (revealed.has(index)) return;
    revealed.add(index);
    if (reducedMotion.matches || !Element.prototype.animate) return;
    const items = panels[index].querySelectorAll(".section-head, .card h3, .card .meta, .card .abstract, .card .chips, .contact-card, .contact-note, .about-visual, .id-kicker, .id-intro, .id-table");
    items.forEach((element, order) => {
      const animation = element.animate([
        { opacity: 0, transform: "translateY(2rem)", filter: "blur(4px)" },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ], { duration: 760, delay: Math.min(order * 80, 320), easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
      animations.add(animation);
      const forget = () => animations.delete(animation);
      animation.addEventListener("finish", forget, { once: true });
      animation.addEventListener("cancel", forget, { once: true });
    });
  };

  const targetTop = (index) => Math.max(0, Math.min(
    window.scrollY + panels[index].getBoundingClientRect().top - headerHeight,
    document.documentElement.scrollHeight - window.innerHeight,
  ));

  const releaseTransition = () => {
    transition = null;
    window.clearTimeout(unlockTimer);
    cooldownUntil = performance.now() + 180;
  };

  const updateScene = () => {
    scrollFrame = 0;
    const middle = headerHeight + (window.innerHeight - headerHeight) / 2;
    let nextIndex = 0;
    panels.forEach((panel, index) => {
      if (panel.getBoundingClientRect().top <= middle) nextIndex = index;
    });
    if (nextIndex !== activeIndex) {
      if (activeIndex < 0) revealed.add(nextIndex);
      else reveal(nextIndex);
      activeIndex = nextIndex;
      navigation.forEach((control) => {
        if (control.getAttribute("data-scene-target") === panels[activeIndex].id) {
          control.setAttribute("aria-current", control.tagName === "A" ? "location" : "step");
        } else control.removeAttribute("aria-current");
      });
      if (status) status.textContent = `第 ${nextIndex + 1} 屏，共 ${panels.length} 屏：${panels[nextIndex].getAttribute("data-scene-label") || ""}`;
    }
    if (transition && Math.abs(window.scrollY - targetTop(transition.index)) < 2) releaseTransition();
  };

  const selectScene = (index, behavior = reducedMotion.matches ? "instant" : "smooth") => {
    index = Math.max(0, Math.min(index, panels.length - 1));
    const distance = targetTop(index) - window.scrollY;
    if (Math.abs(distance) < 2) {
      if (transition) {
        window.scrollTo({ top: targetTop(index), behavior: "instant" });
        releaseTransition();
      }
      updateScene();
      return;
    }
    lastDirection = Math.sign(distance);
    transition = { index, direction: lastDirection };
    window.clearTimeout(unlockTimer);
    // 滚动中只接收反向手势，兜底释放避免浏览器中断动画后卡住。
    unlockTimer = window.setTimeout(releaseTransition, 1200);
    panels[index].scrollIntoView({ behavior, block: "start" });
  };

  const updateHeaderHeight = () => {
    headerHeight = header.getBoundingClientRect().height;
    root.style.setProperty("--header-height", `${headerHeight}px`);
    updateScene();
  };
  updateHeaderHeight();
  if ("ResizeObserver" in window) new ResizeObserver(updateHeaderHeight).observe(header);
  window.addEventListener("resize", updateHeaderHeight, { passive: true });
  window.addEventListener("scroll", () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScene);
  }, { passive: true });

  controls.forEach((control) => control.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const index = panelIndex.get(control.getAttribute("data-scene-target"));
    if (index === undefined) return;
    event.preventDefault();
    const hash = `#${panels[index].id}`;
    // 只为明确的导航点击写入历史；手动滚动仅更新高亮，避免返回键被每一屏占满。
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    selectScene(index);
  }));

  const followHash = () => {
    const index = window.location.hash ? panelIndex.get(window.location.hash.slice(1)) : 0;
    if (index !== undefined) selectScene(index, "instant");
  };
  window.addEventListener("popstate", followHash);
  window.addEventListener("hashchange", followHash);
  // defer 脚本测量完导航高度后校准深链接；没有锚点时保留浏览器恢复的阅读位置。
  if (window.location.hash) followHash();

  window.addEventListener("wheel", (event) => {
    const wheelStep = Math.abs(event.wheelDeltaY || 0);
    if (reducedMotion.matches || !event.cancelable || event.ctrlKey || event.shiftKey ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
      (event.deltaMode === 0 && (wheelStep < 120 || wheelStep % 120 !== 0))) return;
    if (!(event.target instanceof Element) || event.target.closest("input, textarea, select, [contenteditable]")) return;
    const direction = Math.sign(event.deltaY);
    // 可独立滚动的内容优先处理自己的滚轮。
    for (let element = event.target; element && element !== document.body; element = element.parentElement) {
      if (!/(auto|scroll)/.test(getComputedStyle(element).overflowY)) continue;
      const remaining = direction > 0 ? element.scrollHeight - element.clientHeight - element.scrollTop : element.scrollTop;
      if (remaining > 2) return;
    }
    if (transition) {
      event.preventDefault();
      if (transition.direction !== direction) {
        // 导航可以跨多屏；反向滚轮应回到当前位置附近，不继续朝远处的目标滚动。
        const candidates = panels.map((_, index) => index).filter((index) => direction > 0
          ? targetTop(index) >= window.scrollY - 2 : targetTop(index) <= window.scrollY + 2);
        selectScene(direction > 0 ? candidates[0] ?? panels.length - 1 : candidates.at(-1) ?? 0);
      }
      return;
    }
    if (performance.now() < cooldownUntil && direction === lastDirection) {
      event.preventDefault();
      return;
    }
    const panel = panels[activeIndex].getBoundingClientRect();
    // 超高场景内保留自然滚动，只有到达边缘才切换场景。
    if ((direction > 0 && panel.bottom > window.innerHeight + 2) ||
      (direction < 0 && panel.top < headerHeight - 2)) return;
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= panels.length) return;
    event.preventDefault();
    selectScene(nextIndex);
  }, { passive: false });

  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;
    animations.forEach((animation) => animation.cancel());
    window.scrollTo({ top: transition ? targetTop(transition.index) : window.scrollY, behavior: "instant" });
    releaseTransition();
    updateScene();
  });
  root.classList.add("home-ready");
}
