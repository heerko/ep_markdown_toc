'use strict';

// Hide editbar
exports.eejsBlock_styles = (hook, context, cb) => {
  context.content += `
    <style>
      #editorcontainer { margin-left: 200px; }
      #editbar { display: none; }
    </style>
  `;
  cb();
};