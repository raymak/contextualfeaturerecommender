/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var triggers = require("./triggers");
var logger = require("./logger");
var button = require("./ui/button");
var info = require("./generalInfoCollector");
var featuredata = require("./featuredata");
var {WindowTracker} = require("sdk/deprecated/window-utils");
var {isBrowser} = require("sdk/window/utils");
var config = require("./config");

var startButton = button.getButton(start);
// start();

//start listening when button is clicked
function start(state){
	logger.logToF("Button Clicked!");
	startButton.icon = {"16": "./ui/icons/lightbulb_gr.png"};
	triggers.init();
}

info.getAddons(function (addons) {
	for (var i = 0; i < addons.length; i++)
		console.log(addons[i].name);
});

console.log(info.getStartDate());

console.log(config.NEW_TAB_SHORTCUT_COUNT_THRESHOLD);

