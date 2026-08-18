(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const savedTheme = localStorage.getItem('neon-theme');
  if (savedTheme) root.dataset.theme = savedTheme;

  function updateThemeIcon() {
    const dark = root.dataset.theme === 'dark';
    themeToggle.querySelector('.sun').style.display = dark ? 'none' : 'inline';
    themeToggle.querySelector('.moon').style.display = dark ? 'inline' : 'none';
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  updateThemeIcon();

  themeToggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('neon-theme', root.dataset.theme);
    updateThemeIcon();
  });

  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.main-nav');
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));

  const energy = document.querySelector('#energy');
  const radius = document.querySelector('#radius');
  const energyValue = document.querySelector('#energyValue');
  const radiusValue = document.querySelector('#radiusValue');
  const radiusToken = document.querySelector('#radiusToken');
  const stage = document.querySelector('#demoStage');

  function syncRange() {
    const energyAmount = `${energy.value}%`;
    document.documentElement.style.setProperty('--energy', energyAmount);
    energyValue.value = energy.value;
    energyValue.textContent = energy.value;
    radiusValue.textContent = `${radius.value}px`;
    radiusToken.textContent = radius.value;
    stage.style.setProperty('--demo-radius', `${radius.value}px`);
    stage.style.setProperty('--demo-energy', energyAmount);
  }
  energy.addEventListener('input', syncRange);
  radius.addEventListener('input', syncRange);
  syncRange();

  document.querySelectorAll('.swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(item => item.classList.remove('active'));
      swatch.classList.add('active');
      document.documentElement.style.setProperty('--accent', swatch.dataset.accent);
      document.documentElement.style.setProperty('--accent-soft', `${swatch.dataset.accent}42`);
    });
  });

  document.querySelectorAll('.state-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.state-button').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      stage.dataset.state = button.dataset.state;
      stage.classList.remove('state-rest', 'state-hover', 'state-pressed');
      stage.classList.add(`state-${button.dataset.state}`);
    });
  });

  const demoCta = document.querySelector('.demo-cta');
  demoCta.addEventListener('click', () => {
    demoCta.innerHTML = 'Canvas opened <span>✓</span>';
    demoCta.style.background = 'var(--accent-strong)';
    setTimeout(() => { demoCta.innerHTML = 'Open canvas <span>↗</span>'; }, 1800);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: .14 });
  document.querySelectorAll('.neo-card,.reference-card,.feature-art,.contact-panel').forEach(item => {
    item.classList.add('reveal');
    observer.observe(item);
  });
})();
