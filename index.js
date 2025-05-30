'use strict';

console.log("[ep_markdown_toc] STARTED");

exports.eejsBlock_styles = (hook, context) => {
  context.content += '<link href="../static/plugins/ep_markdown_toc/static/css/toc.css" rel="stylesheet">';
};

