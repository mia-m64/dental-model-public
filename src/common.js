// Shared by every page: bundled fonts (no third-party font requests) and base styles.
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './base.css';

// Fade out the loading screen (markup in each page, styles in public/first-paint.css)
// once this page's styles are applied and its fonts are ready (or after a short wait).
const loader = document.getElementById('page-loader');
if (loader) {
  const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]);
  window.addEventListener('DOMContentLoaded', async () => {
    await fonts;
    loader.classList.add('done');
    setTimeout(() => loader.remove(), 400);
  });
}
