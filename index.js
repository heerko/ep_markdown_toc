'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');

// console.log("[ep_markdown_toc] STARTED");

exports.eejsBlock_styles = (hook, context) => {
  context.content += '<link href="../static/plugins/ep_markdown_toc/static/css/toc.css" rel="stylesheet">';
  context.content += '<link href="../static/plugins/ep_markdown_toc/static/css/popup.css" rel="stylesheet">';
};

// exports.eejsBlock_afterEditbar = (hookName, args, cb) => {
//   args.content += eejs.require('ep_markdown_toc/templates/markdown.ejs');
//   return cb();
// };

exports.eejsBlock_editbarMenuRight = (hookName, args, cb) => {
  // console.log("MENU RIGHT");
  args.content = eejs.require('ep_markdown_toc/templates/markdownButton.ejs') + args.content;
  return cb();
};

exports.eejsBlock_afterEditbar = (hookName, args, cb) => {
  args.content += eejs.require('ep_markdown_toc/templates/tocContainer.ejs');
  args.content += eejs.require('ep_markdown_toc/templates/markdownPopup.ejs');
  return cb();
};

exports.eejsBlock_mySettings = (hookName, args, cb) => {
  args.content += eejs.require('ep_markdown_toc/templates/tocSettings.ejs');
  return cb();
};