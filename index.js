'use strict';

console.log("[ep_markdown_toc] STARTED");

exports.eejsBlock_styles = (hookName, args, cb) => {
  args.content +=
  "<link href='../static/plugins/ep_markdown_toc/static/css/toc.css' rel='stylesheet'>";
  return cb();
};

