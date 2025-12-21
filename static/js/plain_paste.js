// Force plain-text paste: intercept paste and insert text/plain only.
let bound = false;
let currentBody = null;
let currentHandler = null;

// Locate the inner editor window either from context or via DOM.
const getInnerWindow = (context) => {
  if (context?.editorInfo?.ace_innerWin) return context.editorInfo.ace_innerWin;
  const outer = document.querySelector('iframe[name="ace_outer"]');
  const inner = outer?.contentDocument?.querySelector('iframe[name="ace_inner"]');
  return inner?.contentWindow || null;
};

const install = (context) => {
  if (bound) return;

  const editor = context?.editorInfo?.editor;
  const callWithAce =
    editor && typeof editor.callWithAce === 'function'
      ? editor.callWithAce.bind(editor)
      : null;
  const innerWin = getInnerWindow(context);
  const body = innerWin?.document?.body;

  if (!callWithAce || !body) return;

  const handlePaste = (e) => {
    const clipboard = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
    const text = clipboard
      ? clipboard.getData('text/plain') || clipboard.getData('text')
      : '';
    if (!text) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    callWithAce((ace) => {
      if (!ace || typeof ace.ace_getRep !== 'function' || typeof ace.ace_replaceRange !== 'function') return;
      const rep = ace.ace_getRep();
      if (!rep || !rep.selStart || !rep.selEnd) return;
      ace.ace_replaceRange(rep.selStart, rep.selEnd, text);
    }, 'plain-paste', true);
  };

  body.addEventListener('paste', handlePaste, true);
  bound = true;
  currentBody = body;
  currentHandler = handlePaste;
};

exports.ensure = (context) => install(context);

exports.disable = () => {
  if (bound && currentBody && currentHandler) {
    currentBody.removeEventListener('paste', currentHandler, true);
  }
  bound = false;
  currentBody = null;
  currentHandler = null;
};
