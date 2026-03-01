import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function initTheme() {
  const saved = localStorage.getItem('ow_theme');
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);
  } else {
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  // Для live preview: якщо інструмент перемикає data-theme, синхронізуємо class="dark".
  const observer = new MutationObserver(() => {
    const dt = document.documentElement.getAttribute('data-theme');
    if (dt === 'dark' || dt === 'light') applyTheme(dt);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

initTheme();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
