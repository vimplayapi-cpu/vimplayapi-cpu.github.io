(() => {
  const body = document.body;
  body.classList.add('neon-demo');
  const saved = localStorage.getItem('lv2-demo-theme');
  if (saved === 'dark') body.classList.add('nm-dark');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nm-theme-toggle';
  toggle.setAttribute('aria-label', 'Switch to dark mode');
  toggle.title = 'Toggle light and dark mode';
  document.body.appendChild(toggle);

  const update = () => {
    const dark = body.classList.contains('nm-dark');
    toggle.textContent = dark ? '☼' : '◐';
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  };
  update();
  toggle.addEventListener('click', () => {
    body.classList.toggle('nm-dark');
    localStorage.setItem('lv2-demo-theme', body.classList.contains('nm-dark') ? 'dark' : 'light');
    update();
  });

  document.querySelectorAll('form').forEach(form => form.classList.add('nm-card'));
})();
