/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

data = require("sdk/self").data;


var init = function (){
	return require("sdk/panel").Panel({
	width: 300,
	height: 80,
	focus: false,
	//contentURL: data.url("mypanel.html"),
	content: "hello",
	contentScriptFile: data.url("./ui/mypanel.js"),
	position: {
		top: 0,    //negative numbers can be used
		left: 0 
		}
	});
}

function show(){
	panel.show();
}

function getPanel(){
	return init();
}

exports.init = init;
exports.show = show;
exports.getPanel = getPanel;




