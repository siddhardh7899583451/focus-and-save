import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

(() => {
  'use strict';

  const ROOT_ID = 'focus-reader-root';
  const previousOverflow = document.body?.style.overflow ?? '';

  // Re-injection toggles the reader off instead of leaving a stale overlay.
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    existing.remove();
    document.body.style.overflow = existing.dataset.previousOverflow ?? '';
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = ROOT_ID;
  overlay.dataset.previousOverflow = previousOverflow;
  overlay.setAttribute('data-theme', 'light');

  let title = document.title || 'Untitled Article';
  let html = '';
  try {
    const parsed = new Readability(document.cloneNode(true)).parse();
    if (parsed?.content) {
      title = parsed.title || title;
      html = parsed.content;
    }
  } catch (error) {
    console.warn('Focus & Save: article extraction failed.', error);
  }

  if (!html) {
    const fallback = document.createElement('div');
    for (const element of document.querySelectorAll('main p, article p, main h1, article h1, main h2, article h2, main blockquote, article blockquote')) {
      fallback.append(element.cloneNode(true));
    }
    html = fallback.innerHTML || '<p>Unable to extract readable text from this page.</p>';
  }

  const cleanArticle = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'svg', 'math'],
    FORBID_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
  });

  const safeTitle = document.createElement('span');
  safeTitle.textContent = title;
  const safeHost = document.createElement('span');
  safeHost.textContent = location.hostname;

  overlay.innerHTML = `
    <header class="reader-toolbar">
      <div class="reader-brand"><button id="fr-exit" type="button">✕ Exit</button><strong>Focus &amp; Save</strong></div>
      <div class="reader-controls">
        <select id="fr-theme" aria-label="Theme"><option value="light">Light</option><option value="dark">Dark</option><option value="sepia">Sepia</option></select>
        <select id="fr-font" aria-label="Font"><option value="Georgia, serif">Serif</option><option value="-apple-system, sans-serif">Sans-serif</option><option value="monospace">Monospace</option></select>
        <select id="fr-size" aria-label="Font size"><option>14px</option><option>16px</option><option selected>18px</option><option>20px</option><option>22px</option><option>24px</option></select>
        <select id="fr-line" aria-label="Line height"><option>1.4</option><option selected>1.6</option><option>1.8</option><option>2.0</option></select>
        <select id="fr-width" aria-label="Content width"><option>600px</option><option selected>720px</option><option>850px</option></select>
        <select id="fr-align" aria-label="Text alignment"><option value="left">Left</option><option value="justify">Justify</option></select>
        <select id="fr-spacing" aria-label="Paragraph spacing"><option value="16px">Normal spacing</option><option value="24px" selected>Relaxed spacing</option><option value="32px">Loose spacing</option></select>
        <button id="fr-save" type="button">Save page</button>
      </div>
    </header>
    <main class="reader-scroll" id="fr-scroll">
      <article class="reader-article" id="fr-article">
        <h1 id="fr-title"></h1><p class="reader-source" id="fr-source"></p>
        <div id="fr-body"></div>
      </article>
    </main>`;
  overlay.querySelector('#fr-title').textContent = title;
  overlay.querySelector('#fr-source').textContent = `Source: ${location.hostname}`;
  overlay.querySelector('#fr-body').innerHTML = cleanArticle;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const scroll = overlay.querySelector('#fr-scroll');
  const article = overlay.querySelector('#fr-article');
  const exit = () => {
    overlay.remove();
    document.body.style.overflow = overlay.dataset.previousOverflow ?? '';
  };
  overlay.querySelector('#fr-exit').addEventListener('click', exit);
  overlay.querySelector('#fr-theme').addEventListener('change', e => overlay.setAttribute('data-theme', e.target.value));
  overlay.querySelector('#fr-font').addEventListener('change', e => scroll.style.fontFamily = e.target.value);
  overlay.querySelector('#fr-size').addEventListener('change', e => scroll.style.fontSize = e.target.value);
  overlay.querySelector('#fr-line').addEventListener('change', e => scroll.style.lineHeight = e.target.value);
  overlay.querySelector('#fr-width').addEventListener('change', e => article.style.maxWidth = e.target.value);
  overlay.querySelector('#fr-align').addEventListener('change', e => article.style.textAlign = e.target.value);
  overlay.querySelector('#fr-spacing').addEventListener('change', e => {
    article.querySelectorAll('p').forEach(p => p.style.marginBottom = e.target.value);
  });
  overlay.querySelector('#fr-save').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'SAVE_BOOKMARK_FROM_CONTENT',
      payload: { title, url: location.href, domain: location.hostname }
    }, response => {
      if (chrome.runtime.lastError) alert(chrome.runtime.lastError.message);
      else alert(response?.success ? 'Bookmark saved.' : `Could not save bookmark: ${response?.error || 'Unknown error'}`);
    });
  });
})();