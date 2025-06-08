'use strict';

let tocContainer;
let tocTimeout = null;

let editorInfo = null;
// render function stub defined in postAceInit
let renderMarkdownTOC = () => { };

const tags = ['h1', 'h2', 'h3', 'h4', 'code'];
exports.aceRegisterBlockElements = () => tags;

let _ace;

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
// const updateTOCContent = (headings) => {
//   tocContainer.innerHTML = '';
//   headings.forEach(h => {
//     const link = document.createElement('a');
//     link.textContent = `${'–'.repeat(h.level - 1)} ${h.text}`;
//     link.href = `#heading-${h.line}`;
//     link.style.display = 'block';
//     link.style.marginLeft = `${(h.level - 1) * 1.2}em`;
//     link.addEventListener('click', (e) => {
//       e.preventDefault();
//       document.querySelector('iframe[name="ace_outer"]')
//         ?.contentDocument?.querySelector('iframe[name="ace_inner"]')
//         ?.contentWindow?.focus();

//       scrollEditorToLine(h);
//     });
//     tocContainer.appendChild(link);
//   });
// };

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
  _ace = context.ace;
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

      // Add heading attribute to line in Etherpad?
      // using global ace instance?
      _ace.callWithAce((ace) => {
        ace.ace_doInsertHeading(level, index);
      }, 'insertheading', true);
    }
  });

  // Update TOC content
  const tocContainer = document.getElementById('markdown-toc');
  if (!tocContainer) return;

  while (tocContainer.firstChild) {
    tocContainer.removeChild(tocContainer.firstChild);
  }

  headings.forEach(h => {
    const li = document.createElement('li');
    
    const link = document.createElement('a');
    link.textContent = `${'–'.repeat(h.level - 1)} ${h.text}`;
    link.href = '#';
    link.style.marginLeft = `${(h.level - 1) * 1.2}em`;
    link.dataset.line = h.lineNumber.toString();
    
    link.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      scrollToLine(h.lineNumber);
    };
    
    li.appendChild(link);
    tocContainer.appendChild(li);
  });
};

let updateTimeout = null;

exports.acePostWriteDomLineHTML = (hook, context) => {
  // console.log('acePostWriteDomLineHTML called', {context});
  clearTimeout(updateTimeout);
  // updateTimeout = setTimeout(()=>updateTOC(context), 100);
};

exports.aceRegisterBlockElements = () => {
  // console.log('aceRegisterBlockElements called');
  return ['heading'];
};

exports.aceInitialized = (hook, context) => {
  //console.log('aceInitialized', context);
  editorInfo = context.editorInfo;
  //console.log('editorInfo', editorInfo);
  // updateTOC(context);

  // Passing a level >= 0 will set a heading on the selected lines, level < 0 will remove it.
  editorInfo.ace_doInsertHeading = (level, line) => {
    const {documentAttributeManager, rep} = context;
    if (!(rep.selStart && rep.selEnd)) return;
    if (level >= 0 && tags[level] === undefined) return;
    const firstLine = line;
    const lastLine = line; // can only be a single line right?

    range(firstLine, lastLine).forEach((line) => {
      if (level >= 0) {
        documentAttributeManager.setAttributeOnLine(line, 'heading', tags[level]);
      } else {
        documentAttributeManager.removeAttributeOnLine(line, 'heading');
      }
    });
  };
}; 

exports.postToolbarInit = () => {
  $('#markdown-cheat-toggle').on('click', () => {
    $('#markdown-cheat').toggleClass('popup-show');
  });

  const padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;

  let prefs = padcookie.getPref('userPrefs') || {};

  if (typeof prefs.tocPopup === 'undefined') {
    prefs.tocPopup = true;
    padcookie.setPref('userPrefs', prefs);
  }

  const enabled = prefs.tocPopup === true;

  $('#options-tocpopup').prop('checked', enabled);
  $('#toc-container').toggleClass('as-popup', enabled);
  $('html').toggleClass('has-toc', enabled);
  console.log($('html'));
  $('#options-tocpopup').on('change', function () {
    const isChecked = $(this).is(':checked');
    prefs.tocPopup = isChecked;
    padcookie.setPref('userPrefs', prefs);
    $('#toc-container').toggleClass('as-popup', isChecked);
    $('html').toggleClass('has-toc', isChecked);
  });
};

/* functions from ep_headings2 */

const range = (start, end) => Array.from(
    Array(Math.abs(end - start) + 1),
    (_, i) => start + i
);


// Our heading attribute will result in a heaading:h1... :h6 class
exports.aceAttribsToClasses = (hookName, context) => {
  if (context.key === 'heading') {
    return [`heading:${context.value}`];
  }
};

// Here we convert the class heading:h1 into a tag
exports.aceDomLineProcessLineAttributes = (hookName, context) => {
  const cls = context.cls;
  const headingType = /(?:^| )heading:([A-Za-z0-9]*)/.exec(cls);
  if (headingType) {
    let tag = headingType[1];

    // backward compatibility, we used propose h5 and h6, but not anymore
    if (tag === 'h5' || tag === 'h6') tag = 'h4';

    if (tags.indexOf(tag) >= 0) {
      const modifier = {
        preHtml: `<${tag}>`,
        postHtml: `</${tag}>`,
        processedMarker: true,
      };
      return [modifier];
    }
  }
  return [];
};