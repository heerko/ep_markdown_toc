'use strict';

let _editorInfo = null; // Both no longer used atm, but leaving them for now.
let _ace;
const tags = ['h1', 'h2', 'h3', 'h4'];
let plainPasteEnabled = true;

/* Load the css in the editor iframe */
exports.aceEditorCSS = function() {
  return ["ep_markdown_toc/static/css/toc_editor.css"];
};

/**
 * Init TOC functionality on editor ready
 */
exports.postAceInit = (hook, context) => {
  // store a reference to the editor for later
  _ace = context.ace;
  // Initialize plain paste handler (if enabled).
  maybeInitPlainPaste(context);
  initShortcutBlocker(context);
  updateTOC();
};

/**
 * Debounced handler for editor content changes, to update the TOC
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

/* 
Detect markdown headings and add dynamic DOM classes for headings
*/
exports.acePostWriteDomLineHTML = (hook, context) => {
  try {
    // console.log(context);
    if (!context || !context.node) return;
    // Remove previous heading classes
    context.node.classList.remove('markdown-heading');
    context.node.className = context.node.className.replace(/\bmarkdown-heading-level-\d\b/g, '');
    
    // search for markdown # headings in the text
    const text = context.text || context.node.textContent || '';
    const match = text.match(/^(#{1,6})\s+/);
    if (match) {
      // console.log("matched!")
      const level = match[1].length;
      context.node.classList.add('markdown-heading');
      context.node.classList.add(`markdown-heading-level-${level}`);
    }
  } catch (e) {
    // Fail silently
  }
};

/*
Save reference to editorInfo, maybe remove?
*/
exports.aceInitialized = (hook, context) => {
  _editorInfo = context.editorInfo;
};

/* 
Setup the tool button and settings ui
*/
exports.postToolbarInit = () => {
  $('#markdown-cheat-toggle').on('click', () => {
    $('#markdown-cheat').toggleClass('popup-show');
  });

  const toggleToc = (event) => {
    if (event) event.preventDefault();
    $('#options-hideToc').click();
  };

  $('#markdown-toc-toggle').on('click', toggleToc);
  $('#markdown-toc-toggle-menu').on('click', toggleToc);

  initSettingsUI();
};

const scrollToLine = (lineNumber) => {
  // Get the editor iframes
  const padOuter = document.querySelector('iframe[name="ace_outer"]');
  const padInner = padOuter?.contentDocument?.querySelector('iframe[name="ace_inner"]');

  if (!padInner?.contentWindow?.document) {
    console.warn('Could not find inner frame document');
    return;
  }

  padInner.contentWindow.focus();
  const lineElement = padInner.contentWindow.document.querySelectorAll('div')[lineNumber];
  if (lineElement) {
    setTimeout(() => {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } else {
    console.warn('Could not find line element');
  }
};

const updateTOC = () => {
  const container = document.getElementById('markdown-toc');
  if (!container) return;

  // Get pad outer and inner iframe
  const padOuter = document.querySelector('iframe[name="ace_outer"]');
  const padInner = padOuter?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  if (!padInner?.contentDocument) {
    return;
  }

  const innerDoc = padInner.contentDocument;
  const lines = Array.from(innerDoc.querySelectorAll('.ace-line'));
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

  headings.forEach(h => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.textContent = `- ${h.text}`;//`${'–'.repeat(h.level - 1)} ${h.text}`;
    link.href = '#';
    link.style.marginLeft = `${(h.level - 1) * .75}em`;
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


/* getting and setting the preferences from the cookie.
TODO: hiding the text styling buttons with css for now, 
but it maybe possible to manipulate the list from settings.json? 
*/
function initSettingsUI() {
  const padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;
  const plainPaste = require('./plain_paste');

  let prefs = padcookie.getPref('userPrefs') || {};

  // defaults for first load
  if (typeof prefs.hideToc === 'undefined') {
    prefs.hideToc = false; // defaults to false
    padcookie.setPref('userPrefs', prefs);
  }
  if (typeof prefs.styleHeadings === 'undefined') {
    prefs.styleHeadings = true; // also true
    padcookie.setPref('userPrefs', prefs);
  }
  if (typeof prefs.plainPaste === 'undefined') {
    prefs.plainPaste = true; // default to on
    padcookie.setPref('userPrefs', prefs);
  }

  // apply the headings class to the inner iframe if set
  const padOuter = document.querySelector('iframe[name="ace_outer"]');
  const padInner = padOuter?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  const innerHtml = padInner?.contentDocument?.documentElement;
  if (innerHtml && prefs.styleHeadings !== false) {
    innerHtml.classList.add('style-md-headings');
  }

  function bindToggleSetting(optionId, className, prefKey) {
    const enabled = prefs[prefKey] === true;
    $(optionId).prop('checked', enabled);
    $('html').toggleClass(className, enabled);

    $(optionId).on('change', function () {
      const isChecked = $(this).is(':checked');
      prefs[prefKey] = isChecked;
      padcookie.setPref('userPrefs', prefs);
      $('html').toggleClass(className, isChecked);
      // we need the class on the inner iframe, so this ugliness:
      if (className === 'style-md-headings') {
        const padOuter = document.querySelector('iframe[name="ace_outer"]');
        const padInner = padOuter?.contentDocument?.querySelector('iframe[name="ace_inner"]');
        const innerHtml = padInner?.contentDocument?.documentElement;
        if (innerHtml) {
          innerHtml.classList.toggle('style-md-headings', isChecked);
        }
      }
    });
  }

  bindToggleSetting('#options-hideToc', 'hide-toc', 'hideToc');
  bindToggleSetting('#options-styleHeadings', 'style-md-headings', 'styleHeadings');

  // Plain paste toggle
  const plainPasteCheckbox = $('#options-plainPaste');
  plainPasteCheckbox.prop('checked', prefs.plainPaste === true);
  plainPasteEnabled = prefs.plainPaste === true;
  plainPasteCheckbox.on('change', function () {
    const isChecked = $(this).is(':checked');
    prefs.plainPaste = isChecked;
    plainPasteEnabled = isChecked;
    padcookie.setPref('userPrefs', prefs);
    if (isChecked) {
      plainPaste.ensure(context);
    } else {
      plainPaste.disable();
    }
  });
}

/* functions stolen from ep_headings2 */

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

/*
 Plain paste integration: init if enabled and available.
*/
function maybeInitPlainPaste(context) {
  if (!plainPasteEnabled) return;
  //const plainPaste = require('./plain_paste');
  //plainPaste.ensure(context);
}

// Disable common rich-text keyboard shortcuts (Ctrl/Cmd+B/I/U, etc.)
function initShortcutBlocker(context) {
  const padOuter = document.querySelector('iframe[name="ace_outer"]');
  const padInner = padOuter?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  const innerDoc = padInner?.contentDocument;
  if (!innerDoc) return;

  const handler = (e) => {
    const key = (e.key || '').toLowerCase();
    const meta = e.metaKey || e.ctrlKey;
    if (!meta) return;
    // Block common formatting combos:
    // b (bold), i (italic), u (underline), 5 (strike);
    // Shift+L (bullet), Shift+N (numbered list), Shift+1 (heading), Shift+C (color).
    const block =
      ['b', 'i', 'u', '5'].includes(key) ||
      (e.shiftKey && ['l', 'n', '1', 'c'].includes(key));
    if (block) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  if (!innerDoc._tocShortcutBlockerBound) {
    innerDoc.addEventListener('keydown', handler, true);
    innerDoc._tocShortcutBlockerBound = true;
  }
}
