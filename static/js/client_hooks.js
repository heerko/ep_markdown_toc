'use strict';

let tocContainer;
let tocTimeout = null;

// stub voor renderfunctie
let renderMarkdownTOC = () => { };

const createTocContainer = () => {
  tocContainer = document.getElementById('markdown-toc');
  if (!tocContainer) {
    tocContainer = document.createElement('div');
    tocContainer.id = 'markdown-toc';
    document.body.appendChild(tocContainer);
  }
};

const updateTOCContent = (headings) => {
  tocContainer.innerHTML = '';
  headings.forEach(h => {
    const link = document.createElement('a');
    link.textContent = `${'–'.repeat(h.level - 1)} ${h.text}`;
    link.href = `#heading-${h.line}`;
    link.style.display = 'block';
    link.style.marginLeft = `${(h.level - 1) * 1.2}em`;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('iframe[name="ace_outer"]')
        ?.contentDocument?.querySelector('iframe[name="ace_inner"]')
        ?.contentWindow?.focus();

      scrollEditorToLine(h);
    });
    tocContainer.appendChild(link);
  });
};

const scrollEditorToLine = (h) => {
  const outer = document.querySelector('iframe[name="ace_outer"]');
  const inner = outer?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  const lineEl = inner?.contentDocument?.getElementById(`heading-${h.line}`);
  if (!lineEl) return;
  lineEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

exports.postAceInit = () => {
  renderMarkdownTOC = () => {
    const outerFrame = document.querySelector('iframe[name="ace_outer"]');
    const innerFrame = outerFrame?.contentDocument?.querySelector('iframe[name="ace_inner"]');
    if (!innerFrame) return;

    const innerBody = innerFrame.contentDocument.body;
    const lines = [...innerBody.querySelectorAll('div')];

    const headings = [];

    lines.forEach((div, index) => {
      const match = div.innerText.match(/^(#{1,6})\s+(.*)/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const line = index + 1;
        div.setAttribute('id', `heading-${line}`);
        headings.push({ level, text, line });
      }
    });

    createTocContainer();
    updateTOCContent(headings);
  };

  renderMarkdownTOC();
};

exports.aceEditEvent = () => {
  clearTimeout(tocTimeout);
  tocTimeout = setTimeout(() => {
    renderMarkdownTOC();
  }, 100);
};

