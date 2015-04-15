"use strict";

var _taggedTemplateLiteral = function (strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); };

var total = 30;
var msg = passthru(_taggedTemplateLiteral(["The total is ", " (", " with tax)"], ["The total is ", " (", " with tax)"]), total, total * 1.05);

function passthru(literals) {
  var result = "";
  var i = 0;

  while (i < literals.length) {
    result += literals[i++];
    if (i < arguments.length) {
      result += arguments[i];
    }
  }

  return result;
}

msg;