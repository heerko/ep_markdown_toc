'use strict';

let tocContainer;
let tocTimeout = null;

let editorInfo = null;
// render function stub defined in postAceInit
let renderMarkdownTOC = () => { };

/**
 * Create or retrieve the TOC container element
 */
const createTocContainer = () => {
  tocContainer = document.getElementById('markdown-toc');
  if (!tocContainer) {
    tocContainer = document.createElement('div');
    tocContainer.id = 'markdown-toc';
    document.body.appendChild(tocContainer);
  }
};

/**
 * Updates the TOC content
 * @param {Array<{level: number, text: string, line: number}>} headings - Array of heading objects
 */
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

/**
 * Scrolls editor to the specified heading
 * @param {Object} h - Heading object containing line number
 */
const scrollEditorToLine = (h) => {
  const outer = document.querySelector('iframe[name="ace_outer"]');
  const inner = outer?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  const lineEl = inner?.contentDocument?.getElementById(`heading-${h.line}`);
  if (!lineEl) return;
  lineEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/**
 * Init TOC functionality on editor ready
 */
exports.postAceInit = (hook, context) => {
  // Store editor info when it's available
  const padOuter = document.querySelector('iframe[name="ace_outer"]');
  const padInner = padOuter?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  
  // if (padInner?.contentWindow) {
  //   editorInfo = padInner.contentWindow.editorInfo;
  //   console.log('Editor info stored:', !!editorInfo);
  // }
  
  updateTOC();
};

/**
 * Debounced handler for editor content changes
 */
exports.aceEditEvent = (hook, context) => {
  const callstack = context.callstack;
  if (callstack.type === 'handleKeyEvent' || callstack.type === 'idleWorkTimer') {
    clearTimeout(window.tocTimeout);
    window.tocTimeout = setTimeout(() => {
      updateTOC();
    }, 100);
  }
};

exports.aceAttribsToClasses = (hook, context) => {
  // console.log('aceAttribsToClasses called', {context});
  if (context.key.indexOf('heading') !== -1) {
    return ['heading', context.value];
  }
  return [];
};

exports.aceCreateDomLine = (hook, context) => {
  // console.log('aceCreateDomLine called', {context});
  const headingType = /(?:^| )heading:([1-6])/.exec(context.cls);
  if (headingType) {
    // console.log('Found heading:', headingType);
    const level = headingType[1];
    const modifier = {
      extraOpenTags: `<h${level} id="heading-${context.row}">`,
      extraCloseTags: `</h${level}>`,
      cls: context.cls
    };
    return [modifier];
  }
  return [];
};

const scrollToLine = (lineNumber) => {
  // Get the editor iframes
  const padOuter = document.querySelector('iframe[name="ace_outer"]');
  const padInner = padOuter?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  
  if (!padInner?.contentWindow?.document) {
    console.warn('Could not find inner frame document');
    return;
  }

  // Focus
  padInner.contentWindow.focus();
  // Then scroll
  const lineElement = padInner.contentWindow.document.querySelectorAll('div')[lineNumber];
  if (lineElement) {
    setTimeout(() => {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  } else {
    console.warn('Could not find line element');
  }
};

const updateTOC = () => {
  const container = document.getElementById('markdown-toc');
  if (!container) {
    const newContainer = document.createElement('div');
    newContainer.id = 'markdown-toc';
    document.body.appendChild(newContainer);
  }

  // Get pad outer and inner iframe
  const padOuter = document.querySelector('iframe[name="ace_outer"]');
  const padInner = padOuter?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  if (!padInner?.contentDocument) {
    return;
  }

  const innerDoc = padInner.contentDocument;
  const lines = Array.from(innerDoc.querySelectorAll('div'));
  const headings = [];

  lines.forEach((div, index) => {
    const text = div.textContent || '';
    const match = text.match(/^(#{1,6})\s+(.*)/);
    if (match) {
      const level = match[1].length;
      const headingText = match[2];
      headings.push({ level, text: headingText, lineNumber: index });
    }
  });

  // Update TOC content
  const tocContainer = document.getElementById('markdown-toc');
  if (!tocContainer) return;

  while (tocContainer.firstChild) {
    tocContainer.removeChild(tocContainer.firstChild);
  }

	// TODO, add styling to indicate heading level
  headings.forEach(h => {
    const link = document.createElement('a');
    link.textContent = `${'–'.repeat(h.level - 1)} ${h.text}`;
    link.href = '#';
    link.style.display = 'block';
    link.style.marginLeft = `${(h.level - 1) * 1.2}em`;
    link.dataset.line = h.lineNumber.toString();
    
    link.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      scrollToLine(h.lineNumber);
    };
    
    tocContainer.appendChild(link);
  });
};

let updateTimeout = null;

exports.acePostWriteDomLineHTML = (hook, context) => {
  // console.log('acePostWriteDomLineHTML called', {context});
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updateTOC, 100);
};

exports.aceRegisterBlockElements = () => {
  // console.log('aceRegisterBlockElements called');
  return ['heading'];
};

exports.aceInitialized = (hook, context) => {
  //console.log('aceInitialized', context);
  editorInfo = context.editorInfo;
  //console.log('editorInfo', editorInfo);
  updateTOC();
}; 

