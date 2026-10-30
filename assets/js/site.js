(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const motionOK = matchMedia("(prefers-reduced-motion: no-preference)").matches;
  document.documentElement.classList.add("js");

  // 헤더: 첫 화면을 벗어나면 배경 채우기
  const head = $("[data-head]");
  const hero = $(".hero");
  if (head && hero) {
    new IntersectionObserver(([e]) => head.classList.toggle("is-solid", !e.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    }).observe(hero);
  }

  // 데이터 절약 모드면 첫 화면 연출 끄기
  if (navigator.connection?.saveData) document.documentElement.classList.add("save-data");

  // 아래로 내리면 헤더 숨기고, 올리면 다시 보이기
  let lastY = scrollY, headTick = false;
  const setHeadHidden = (on) => {
    head.classList.toggle("is-hidden", on);
    document.documentElement.classList.toggle("head-hidden", on);
  };
  addEventListener("scroll", () => {
    if (headTick) return;
    headTick = true;
    requestAnimationFrame(() => {
      const y = scrollY, dy = y - lastY;
      if (y < 200 || document.documentElement.style.overflow === "hidden") setHeadHidden(false);
      else if (Math.abs(dy) > 6) setHeadHidden(dy > 0);
      lastY = y; headTick = false;
    });
  }, { passive: true });

  // 현재 보고 있는 메뉴 표시
  const navLinks = $$(".gnb a");
  const groups = { brand: ["brand", "variety", "reviews", "values"], edge: ["edge", "topping", "easy", "logistics", "ages"], benefit: ["benefit", "margin", "support", "marketing", "process"], cost: ["cost"], menu: ["menu"] };
  const toGroup = {};
  Object.entries(groups).forEach(([g, ids]) => ids.forEach((id) => (toGroup[id] = g)));
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const g = toGroup[e.target.id];
      navLinks.forEach((a) => a.classList.toggle("is-current", !!g && a.hash === "#" + g));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => secObs.observe(s));

  // 모바일 드로어
  const drawer = $("[data-drawer]");
  const openBtn = $("[data-drawer-open]");
  let lastFocus = null;
  const openDrawer = () => {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    openBtn.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
    $(".drawer-x", drawer).focus();
  };
  const closeDrawer = () => {
    drawer.classList.remove("is-open");
    openBtn.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
    setTimeout(() => (drawer.hidden = true), 380);
    if (lastFocus) lastFocus.focus();
  };
  openBtn?.addEventListener("click", openDrawer);
  $$("[data-drawer-close]", drawer).forEach((b) => b.addEventListener("click", closeDrawer));
  $$("a[href^='#']", drawer).forEach((a) => a.addEventListener("click", closeDrawer));
  document.addEventListener("keydown", (e) => {
    if (!drawer.classList.contains("is-open")) return;
    if (e.key === "Escape") closeDrawer();
    if (e.key === "Tab") {
      const f = $$("a[href], button, summary", drawer).filter((el) => el.offsetParent);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  const panel = $(".drawer-panel", drawer);
  let sx = 0, sy = 0, dx = 0, dragging = false;
  panel.addEventListener("touchstart", (e) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; dragging = false;
  }, { passive: true });
  panel.addEventListener("touchmove", (e) => {
    const mx = e.touches[0].clientX - sx, my = e.touches[0].clientY - sy;
    if (!dragging && mx > 10 && mx > Math.abs(my)) { dragging = true; panel.style.transition = "none"; }
    if (dragging) { dx = Math.max(0, mx); panel.style.transform = `translateX(${dx}px)`; }
  }, { passive: true });
  panel.addEventListener("touchend", () => {
    if (!dragging) return;
    panel.style.transition = ""; panel.style.transform = "";
    if (dx > panel.offsetWidth * 0.3) closeDrawer();
  });

  // 리뷰 가로 스크롤 진행 표시
  const track = $("[data-carousel]");
  const bar = $("[data-carousel-bar]");
  if (track && bar) {
    let ticking = false;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = track.clientWidth / track.scrollWidth;
      const p = max > 0 ? track.scrollLeft / max : 1;
      bar.style.width = Math.max(ratio * 100, 12) + "%";
      bar.style.transform = `translateX(${p * (100 / Math.max(ratio, 0.12) - 100)}%)`;
      track.parentElement.classList.toggle("at-end", p > 0.98);
      ticking = false;
    };
    track.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
    const prev = $("[data-carousel-prev]"), next = $("[data-carousel-next]");
    const step = () => (track.firstElementChild?.offsetWidth || 200) + 16;
    prev?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    const navState = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > max - 4;
    };
    track.addEventListener("scroll", navState, { passive: true });
    addEventListener("resize", navState);
    navState();
  }

  // 메뉴 분류 탭 (좌우 화살표로도 이동)
  const tabs = $$(".menu-tabs [role='tab']");
  const select = (t) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      $("#" + x.getAttribute("aria-controls")).hidden = !on;
    });
  };
  let tx = 0, ty = 0;
  $$(".menu-panel").forEach((pn) => {
    pn.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    pn.addEventListener("touchend", (e) => {
      const mx = e.changedTouches[0].clientX - tx, my = e.changedTouches[0].clientY - ty;
      if (Math.abs(mx) < 60 || Math.abs(mx) < Math.abs(my) * 1.5) return;
      const i = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
      const to = tabs[i + (mx < 0 ? 1 : -1)];
      if (to) select(to);
    }, { passive: true });
  });
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => {
      select(t);
      const pn = $("#" + t.getAttribute("aria-controls"));
      if (pn.getBoundingClientRect().top < 0) pn.scrollIntoView({ block: "start" });
    });
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      select(next); next.focus();
    });
  });

  // 하단 고정 바: 상담 영역·푸터가 보이면 숨김
  const dock = $("[data-dock]");
  if (dock) {
    const seen = new Set();
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      dock.classList.toggle("is-hidden", seen.size > 0);
    });
    [$("#contact"), $(".site-foot"), hero].forEach((el) => el && obs.observe(el));
    addEventListener("focusin", (e) => { if (e.target.matches("input, textarea, select")) dock.classList.add("is-typing"); });
    addEventListener("focusout", () => dock.classList.remove("is-typing"));
  }

  // 상담 신청 폼
  const form = $("[data-form]");
  if (form) {
    const msg = $("[data-form-msg]", form);
    const btn = $(".btn-submit", form);
    const setErr = (name, on) => {
      const input = form.elements[name];
      const err = $("#e-" + name, form);
      if (input && input.type !== "checkbox") input.setAttribute("aria-invalid", on ? "true" : "false");
      if (input) input.setAttribute("aria-describedby", on ? "e-" + name : "");
      if (err) err.hidden = !on;
    };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.textContent = ""; msg.className = "form-msg";
      const name = form.elements.name.value.trim();
      const phone = form.elements.phone.value.replace(/[^0-9]/g, "");
      const agree = form.elements.agree.checked;
      setErr("name", !name);
      setErr("phone", phone.length < 9);
      setErr("agree", !agree);
      const firstBad = (!name && form.elements.name) || (phone.length < 9 && form.elements.phone) || (!agree && form.elements.agree);
      if (firstBad) { firstBad.focus(); return; }

      btn.disabled = true; btn.textContent = "보내는 중";
      try {
        const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.message || "send");
        form.reset();
        msg.textContent = "상담 신청이 접수되었습니다. 확인 후 연락드리겠습니다.";
        msg.classList.add("is-ok");
      } catch (err) {
        msg.textContent = "접수되지 않았습니다. 잠시 후 다시 시도하거나 1800-6073으로 전화 주세요.";
        msg.classList.add("is-err");
      } finally {
        btn.disabled = false; btn.textContent = "문의하기";
      }
    });
  }

  // 스크롤 진행 표시 · 맨 위로 버튼 · 첫 화면 사진 느린 이동
  const sbar = $("[data-scroll-bar]");
  const toTop = $("[data-to-top]");
  const heroMedia = $(".hero-media");
  const parallax = motionOK && !document.documentElement.classList.contains("save-data");
  let fxTick = false;
  const fx = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    if (sbar) sbar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    toTop?.classList.toggle("is-on", y > innerHeight * 1.5);
    if (parallax && heroMedia && y < innerHeight * 1.2) heroMedia.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
    fxTick = false;
  };
  addEventListener("scroll", () => { if (!fxTick) { fxTick = true; requestAnimationFrame(fx); } }, { passive: true });
  addEventListener("resize", fx);
  fx();

  // 원본(아임웹) 페이지와 같은 등장 효과 [선택자, 효과, 지연(초), 길이(초), 같은 항목끼리 간격]
  // right = 오른쪽에서, left = 왼쪽에서, jack = 튀어나오며 커짐, flip = 뒤집기, bounce = 커졌다 작아짐
  const ANIMS = [
    [".he-1", "up", 0, .9], [".he-2", "up", .1, .9], [".he-3", "up", .3, .9], [".he-4", "up", .4, .9], [".he-5", "up", .5, .9],
    [".hl-1", "right", 0, .7], [".hl-2", "left", .2, .7], [".intro-logo", "jack", .5, .7], [".intro .hero-cta", "up", .7, .7],
    [".intro-dish", "bounce", .2, 1.2],
    [".stats-grid li", "jack", .2, .7, .12],
    [".fresh-photo", "left", 0, .7], [".fresh-point > div", "right", .2, .7, .2], [".fp-meat", "bounce", .4, 1, .3],
    [".variety .sec-title", "right", .2, .7], [".variety .sec-desc", "left", .2, .7],
    [".vr-a", "jack", .5, .7], [".vr-b", "jack", 1, .7], [".variety-close", "left", .5, .7],
    [".sis .sec-title", "right", 0, .7], [".sis .sec-desc", "left", 0, .7], [".sis .pop", "jack", .5, .7],
    [".sis-col:not(.is-ours)", "up", .6, .7], [".sis-vs", "bounce", .9, 1], [".sis-col.is-ours", "up", 1, .7],
    [".topping .sec-title", "right", 0, .7], [".topping .sec-desc", "left", 0, .7], [".topping-row", "up", .3, .9],
    [".reviews .sec-title", "jack", 0, .7], [".reviews .sec-desc", "up", .3, .7], [".reviews-store", "jack", .3, .7],
    [".reviews-track li", "jack", .2, .7, .12],
    [".values .ta", "right", 0, .7], [".values .tb", "left", 0, .7], [".values .sec-desc", "jack", .5, .7],
    [".value:nth-child(1)", "up", 1, .7], [".value:nth-child(2)", "up", .5, .7], [".value:nth-child(3)", "up", 1, .7],
    [".easy .sec-title", "right", 0, .7], [".easy .sec-desc", "left", 0, .7], [".easy-big", "jack", .5, .7],
    [".ed-a", "up", 1, .7], [".ed-b", "up", .5, .7],
    [".logi-tag", "right", 0, .7, .2], [".logi-title", "right", 0, 1, .2], [".logi-key", "flip", .5, .7, .2], [".logi-body", "flip", 1, .7, .2],
    [".ages-pill", "up", 0, .7], [".ages-rule", "up", .2, .7], [".ages-title", "right", .3, .7], [".ages-big span", "left", .5, .7, .2],
    [".ages-list li", "up", 1, .7, .1],
    [".benefit-lead", "right", 0, .7], [".benefit-title", "jack", .2, .7], [".benefit-note", "left", .4, .7], [".fee", "up", .2, .6, .08],
    [".cost .ages-lead", "right", 0, .7], [".cost .sec-title", "left", 0, .7], [".cost .sec-desc", "up", .3, .7],
    [".cost-photo", "left", .2, .7], [".cost-bars", "up", .4, .7], [".cost-table-wrap", "right", .2, .8],
    [".margin .sec-head", "jack", .5, .7], [".pl:not(.is-top)", "up", 1, 1], [".pl.is-top", "up", 1, .7],
    [".support .ages-lead", "right", 0, .7], [".support .ta", "left", 0, .7], [".support .tb", "jack", .5, .7],
    [".support-photo", "up", .5, .7], [".support-list li", "up", 1, .7, .06],
    [".marketing .ages-lead", "right", 0, .7], [".marketing .sec-title", "left", 0, .7], [".mk-total", "jack", .5, .7],
    [".mk-list li", "up", .3, .6, .08],
    [".process .ages-lead", "right", 0, .7], [".process .sec-title", "left", 0, .7], [".steps li", "up", .2, .6, .1],
    [".menu .sec-head", "up", 0, .7], [".menu-tabs", "up", .2, .7], [".menu-sig li", "jack", .3, .7, .2],
    [".menu-grid li", "up", .2, .6, .06],
    [".contact-copy", "left", 0, .7], [".inquiry", "right", .2, .7],
  ];
  const animEls = [];
  ANIMS.forEach(([sel, kind, delay, dur, step = 0]) => {
    $$(sel).forEach((el, i) => {
      el.dataset.anim = kind;
      // 원본 지연·길이를 그대로 쓰면 늦게 느껴져서 순서는 유지하고 시간만 압축
      el.style.setProperty("--delay", (delay * 0.6 + Math.min(step, .12) * (i % 10)).toFixed(2) + "s");
      el.style.setProperty("--dur", Math.min(dur, .85).toFixed(2) + "s");
      animEls.push(el);
    });
  });
  // 화면에 들어올 때마다 다시 재생: 위치를 스크롤마다 직접 계산해서 빠르게 내리거나 메뉴로 이동해도 놓치지 않게
  let animTick = false;
  const checkAnims = () => {
    // 등장 효과가 transform을 바꾸므로 getBoundingClientRect 대신 원래 자리(offsetTop)로 판단
    const vh = innerHeight, y = scrollY;
    for (const el of animEls) {
      const h = el.offsetHeight;
      if (!h) continue;
      let top = 0, n = el;
      while (n) { top += n.offsetTop; n = n.offsetParent; }
      const t = top - y, b = t + h;
      if (t < vh * 0.95 && b > 0) el.classList.add("is-in");
      else if (t > vh || b < 0) el.classList.remove("is-in");
    }
    animTick = false;
  };
  const queueAnims = () => { if (!animTick) { animTick = true; requestAnimationFrame(checkAnims); } };
  addEventListener("scroll", queueAnims, { passive: true });
  addEventListener("resize", queueAnims);
  addEventListener("load", queueAnims);
  document.addEventListener("click", () => setTimeout(queueAnims, 50));
  checkAnims();

  // 숫자 올라가기
  const nums = $$("[data-count]");
  const fmt = (v, dec) => dec ? v.toFixed(dec) : Math.round(v).toLocaleString("ko-KR");
  const runCount = (el) => {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    cancelAnimationFrame(el._raf);
    const t0 = performance.now(), dur = 1200;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(to * ease, dec);
      if (k < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  };
  if (motionOK) {
    const nObs = new IntersectionObserver((entries) => entries.forEach((e) => {
      const el = e.target;
      if (e.intersectionRatio >= 0.3 && !el._counted) { el._counted = true; runCount(el); }
      else if (!e.isIntersecting) {
        el._counted = false; cancelAnimationFrame(el._raf); el.textContent = fmt(0, +(el.dataset.dec || 0));
      }
    }), { threshold: [0, 0.3] });
    nums.forEach((n) => { n.textContent = fmt(0, +(n.dataset.dec || 0)); nObs.observe(n); });
  }
})();
