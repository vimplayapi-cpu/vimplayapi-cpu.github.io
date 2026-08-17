(() => {
  'use strict';

  const CONFIG = {
    frameStep: 12,                 // Scroll pixels per frame; tune the overall tour length here.
    mobileBreakpoint: 768,
    mobileSkip: 2,                 // 15fps playback from a 30fps source.
    maxDecodedFrames: 42,          // Sliding decoded window for large sequences.
    batchSize: 8,
    easing: 0.14,
    defaultFrameCount: 180,
    paths: { desktop: 'frames/1920w/frame_', mobile: 'frames/960w/frame_' }
  };

  const root = document.documentElement;
  const hero = document.querySelector('[data-scrolly]');
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas?.getContext('2d', { alpha: false, desynchronized: true });
  if (!hero || !canvas || !ctx) return;

  const progressText = document.querySelector('[data-progress]');
  const progressBar = document.querySelector('[data-progress-bar]');
  const loader = document.querySelector('[data-loader]');
  const readout = document.querySelector('[data-frame-readout]');
  const scrollHint = document.querySelector('[data-scroll-hint]');
  const header = document.querySelector('[data-header]');
  const overlays = {
    headline: document.querySelector('[data-overlay="headline"]'),
    unlock: document.querySelector('[data-overlay="unlock"]'),
    cta: document.querySelector('[data-overlay="cta"]')
  };

  const state = {
    count: CONFIG.defaultFrameCount,
    fps: 30,
    width: 1920,
    height: 1080,
    set: 'desktop',
    skip: 1,
    frames: new Map(),
    loaded: new Set(),
    requested: new Set(),
    firstReady: false,
    current: 0,
    target: 0,
    raf: 0,
    active: false,
    initialized: false,
    loading: false,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  const isMobile = () => matchMedia(`(max-width:${CONFIG.mobileBreakpoint - 1}px)`).matches;
  const pad = (value) => String(value).padStart(4, '0');
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const ease = (v) => v * v * (3 - 2 * v);
  const framePath = (index) => `${CONFIG.paths[state.set]}${pad(index + 1)}.webp`;

  function setCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(state.frames.get(Math.round(state.current)) || state.frames.get(0));
  }

  function drawFrame(image) {
    if (!image) return; // Never clear or draw an undecoded frame.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const iw = image.width;
    const ih = image.height;
    const scale = Math.max(width / iw, height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, dx, dy, dw, dh);
  }

  async function decode(url) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Frame ${url} returned ${response.status}`);
    const blob = await response.blob();
    if ('createImageBitmap' in window) return createImageBitmap(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(blob);
    });
  }

  async function loadOne(index) {
    if (index < 0 || index >= state.count || state.loaded.has(index) || state.requested.has(index)) return;
    state.requested.add(index);
    try {
      const image = await decode(framePath(index));
      state.frames.set(index, image);
      state.loaded.add(index);
      if (index === 0) {
        state.firstReady = true;
        drawFrame(image);
      }
    } catch (error) {
      console.warn('[Aurelia] Could not load frame', index + 1, error);
    }
  }

  async function preload() {
    if (state.loading) return;
    state.loading = true;
    await loadOne(0);
    if (!state.firstReady) {
      loader?.classList.add('loaded');
      return;
    }
    loader?.classList.add('loaded');
    const indices = [];
    for (let i = 1; i < state.count; i += state.skip) indices.push(i);
    let completed = 0;
    const updateProgress = () => {
      const percent = Math.round((completed / Math.max(indices.length, 1)) * 100);
      if (progressText) progressText.textContent = `${percent}%`;
      if (progressBar) progressBar.style.width = `${percent}%`;
    };
    for (let i = 0; i < indices.length; i += CONFIG.batchSize) {
      const batch = indices.slice(i, i + CONFIG.batchSize);
      await Promise.all(batch.map(async (index) => { await loadOne(index); completed += 1; updateProgress(); }));
      if ('requestIdleCallback' in window) await new Promise((resolve) => requestIdleCallback(resolve, { timeout: 100 }));
    }
    updateProgress();
    state.loading = false;
  }

  function evictFarFrames(center) {
    if (state.frames.size <= CONFIG.maxDecodedFrames) return;
    const keep = new Set();
    for (let offset = -CONFIG.maxDecodedFrames / 2; offset <= CONFIG.maxDecodedFrames / 2; offset += state.skip) {
      const index = Math.round(center + offset);
      if (index >= 0 && index < state.count) keep.add(index);
    }
    state.frames.forEach((image, index) => {
      if (!keep.has(index) && index !== 0) {
        image.close?.();
        state.frames.delete(index);
      }
    });
  }

  function visibleIndex(progress) {
    const raw = Math.round(progress * (state.count - 1));
    return Math.min(state.count - 1, Math.max(0, Math.round(raw / state.skip) * state.skip));
  }

  function updateOverlays(progress) {
    const show = (node, start, end, offset = 24) => {
      if (!node) return;
      const fade = Math.min(.12, (end - start) * .3);
      const opacity = progress < start || progress > end ? 0 : progress < start + fade ? (progress - start) / fade : progress > end - fade ? (end - progress) / fade : 1;
      const movement = (1 - ease(clamp(opacity))) * offset;
      node.style.opacity = opacity.toFixed(3);
      node.style.transform = `translateY(${movement}px)`;
    };
    show(overlays.headline, 0, .22, 28);
    show(overlays.unlock, .5, .72, 22);
    show(overlays.cta, .86, 1, 22);
    if (scrollHint) scrollHint.style.opacity = progress > .035 ? '0' : '1';
  }

  function updateTarget() {
    const rect = hero.getBoundingClientRect();
    const scrollable = Math.max(1, hero.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / scrollable);
    state.target = visibleIndex(progress);
    updateOverlays(progress);
    if (readout) readout.textContent = `${String(state.target + 1).padStart(2, '0')} / ${state.count}`;
  }

  function render() {
    state.current += (state.target - state.current) * CONFIG.easing;
    if (Math.abs(state.target - state.current) < .08) state.current = state.target;
    const nearest = Math.round(state.current / state.skip) * state.skip;
    const image = state.frames.get(nearest) || state.frames.get(0);
    drawFrame(image);
    evictFarFrames(nearest);
    state.raf = requestAnimationFrame(render);
  }

  async function loadManifest() {
    try {
      const response = await fetch('frames/manifest.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('manifest missing');
      const manifest = await response.json();
      state.count = manifest.frameCount || state.count;
      state.fps = manifest.fps || state.fps;
      state.width = manifest.width || state.width;
      state.height = manifest.height || state.height;
    } catch { /* Defaults keep the page usable before frames are generated. */ }
  }

  async function initialize() {
    if (state.initialized) return;
    state.initialized = true;
    state.set = isMobile() ? 'mobile' : 'desktop';
    state.skip = isMobile() ? CONFIG.mobileSkip : 1;
    if (state.reducedMotion) {
      hero.classList.add('reduced-motion');
      await loadOne(0);
      return;
    }
    await loadManifest();
    hero.style.height = `${state.count * CONFIG.frameStep}px`;
    setCanvasSize();
    await preload();
    state.active = true;
    if (!state.raf) state.raf = requestAnimationFrame(render);
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      initialize();
      observer.disconnect();
    }
  }, { rootMargin: '300px 0px' });
  observer.observe(hero);

  addEventListener('scroll', () => {
    updateTarget();
    header?.classList.toggle('scrolled', scrollY > 30);
  }, { passive: true });
  addEventListener('resize', () => {
    const nextSet = isMobile() ? 'mobile' : 'desktop';
    if (nextSet !== state.set && state.initialized && !state.reducedMotion) {
      state.set = nextSet;
      state.skip = isMobile() ? CONFIG.mobileSkip : 1;
      state.frames.forEach((image) => image.close?.());
      state.frames.clear(); state.loaded.clear(); state.requested.clear(); state.firstReady = false; state.loading = false;
      preload();
    }
    setCanvasSize();
  }, { passive: true });

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  menuToggle?.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  });
  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }));

  updateTarget();
})();
