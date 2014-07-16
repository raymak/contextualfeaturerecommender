/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

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