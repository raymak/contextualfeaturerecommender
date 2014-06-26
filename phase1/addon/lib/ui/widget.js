var widgets = require("sdk/widget")
var data = require("sdk/self").data

function init(){
  widget = widgets.Widget({
  id: "mywidget",
  width: 72,
  label: "My Widget",
  contentURL: data.url("./ui/mywidget.html"),
  contentScriptFile: data.url("./ui/mywidget.js")
});
}

exports.init = init;