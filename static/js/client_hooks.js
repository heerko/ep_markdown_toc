'use strict';

let renderMarkdownTOC = () => {}; // stub

exports.postAceInit = () => {
  // Build TOC
  renderMarkdownTOC = () => {
    const outerFrame = document.querySelector('iframe[name="ace_outer"]');
    const innerFrame = outerFrame?.contentDocument?.querySelector('iframe[name="ace_inner"]');
    if (!innerFrame) return;

    const innerBody = innerFrame.contentDocument.body;
    const lines = [...innerBody.querySelectorAll('div')].map(div => div.innerText);
    const text = lines.join('\n');

    const headings = text.split('\n').map((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.*)/);
      if (match) {
        return {
          level: match[1].length,
          text: match[2],
          line: index + 1,
        };
      }
      return null;
    }).filter(Boolean);

    let tocContainer = document.getElementById('markdown-toc');
    if (!tocContainer) {
      tocContainer = document.createElement('div');
      tocContainer.id = 'markdown-toc';
      tocContainer.style.position = 'fixed';
      tocContainer.style.left = '0';
      tocContainer.style.top = '0';
      tocContainer.style.padding = '1em';
      tocContainer.style.background = '#f0f0f0';
      tocContainer.style.zIndex = 1000;
      tocContainer.style.fontSize = '0.9em';
      tocContainer.style.maxHeight = '100vh';
      tocContainer.style.overflowY = 'auto';
      document.body.appendChild(tocContainer);
    }

    tocContainer.innerHTML = '';
    headings.forEach(h => {
      const link = document.createElement('a');
      link.textContent = `${'–'.repeat(h.level - 1)} ${h.text}`;
      link.href = `#L${h.line}`; // werkt met sommige plugins/viewers
      link.style.display = 'block';
      link.style.marginLeft = `${(h.level - 1) * 1.2}em`;
      tocContainer.appendChild(link);
    });
  };

  // Eerste keer renderen
  renderMarkdownTOC();
};

exports.aceEditEvent = (hookName, context) => {
  // Negeer muisselectie en scrolls
  if (context.callstack.type !== 'handleKeyEvent' &&
      context.callstack.type !== 'handlePaste' &&
      context.callstack.type !== 'handleCut') return;
  // Debounce TOC-opbouw
  if (window._markdownTocTimeout) clearTimeout(window._markdownTocTimeout);
  window._markdownTocTimeout = setTimeout(() => {
    renderMarkdownTOC();
  }, 200);
};


// exports.postAceInit = () => {
//   const getMarkdownText = () => {
//     const innerFrame = document.querySelector('iframe[name="ace_outer"]')
//       ?.contentDocument?.querySelector('iframe[name="ace_inner"]');
//     if (!innerFrame) return null;

//     const innerBody = innerFrame.contentDocument.body;
//     const lines = [...innerBody.querySelectorAll('div')].map(div => div.innerText);
//     return lines.join('\n');
//   };

//   const renderTOC = () => {
//     const text = getMarkdownText();
//     if (!text) return;

//     const lines = text.split('\n');

//     const headings = lines.map((line, index) => {
//       const match = line.match(/^(#{1,6})\s+(.*)/);
//       if (match) {
//         return {
//           level: match[1].length,
//           text: match[2],
//           line: index + 1,
//         };
//       }
//       return null;
//     }).filter(Boolean);

//     const tocContainer = document.getElementById('markdown-toc');
//     if (!tocContainer) return;

//     tocContainer.innerHTML = '';
//     headings.forEach(h => {
//       const link = document.createElement('a');
//       link.textContent = `${'–'.repeat(h.level - 1)} ${h.text}`;
//       link.href = `#L${h.line}`;
//       link.style.display = 'block';
//       link.style.marginLeft = `${(h.level - 1) * 1.2}em`;
//       tocContainer.appendChild(link);
//     });
//   };

//   // Maak TOC-container aan als die nog niet bestaat
//   if (!document.getElementById('markdown-toc')) {
//     const toc = document.createElement('div');
//     toc.id = 'markdown-toc';
//     toc.style.position = 'fixed';
//     toc.style.left = '0';
//     toc.style.top = '0';
//     toc.style.padding = '1em';
//     toc.style.background = '#f0f0f0';
//     toc.style.zIndex = 1000;
//     toc.style.fontSize = '0.9em';
//     toc.style.maxHeight = '100vh';
//     toc.style.overflowY = 'auto';
//     document.body.appendChild(toc);
//   }

//   // Initieel renderen
//   renderTOC();
//   console.log(pad);

//   pad.collabClient.setOnClientMessage((msg) => {
//     console.log('[ep_markdown_toc] ontvangen client message:', msg);

//     if (msg.type === 'COLLABROOM' && msg.data?.type === 'EDIT') {
//       console.log('[ep_markdown_toc] EDIT gedetecteerd');
//       setTimeout(renderTOC, 100);
//     }
//   });

// };

// if (!pad.plugins) pad.plugins = {};
// if (!pad.plugins.ep_markdown_toc) pad.plugins.ep_markdown_toc = {};
// pad.plugins.ep_markdown_toc.ace = {
//   callWithAce: (fn, label) => {
//     window.ace.callWithAce(fn, label);
//   }
// };

// exports.aceEditEvent = (hookName, context) => {
//   // Voorkom onnodige calls bij selectie
//   if (context.callstack.type !== 'handleKeyEvent' &&
//       context.callstack.type !== 'handlePaste' &&
//       context.callstack.type !== 'handleCut') return;

//   // Debounce de TOC update
//   if (window._markdownTocTimeout) clearTimeout(window._markdownTocTimeout);
//   window._markdownTocTimeout = setTimeout(() => {
//     window.renderMarkdownTOC?.();
//   }, 200);
// };