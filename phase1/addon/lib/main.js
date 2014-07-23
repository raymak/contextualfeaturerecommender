/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

const STUDYLIFETIME = 7 * 86400 * 1000;  // microseconds

var triggers = require("./triggers");
var logger = require("./logger");
var button = require("./ui/button");
var info = require("./generalInfo");
var featuredata = require("./featuredata");
var {WindowTracker} = require("sdk/deprecated/window-utils");
var {isBrowser} = require("sdk/window/utils");
var config = require("./config");
var ui = require("./ui")

const REASON = [ 'unknown', 'startup', 'shutdown', 'enable', 'disable',
'install', 'uninstall', 'upgrade', 'downgrade' ];

function firstRun(){
	logger.log("Running for the first time...");
	info.registerFirstTimePrefs();
	info.sendInstallInfo();

	//setting the default notification
	info.setDefaultNotification();
	
}



//start listening when button is clicked
var main = exports.main = function (options, callbacks){
	
	// startButton.icon = {"16": "./ui/icons/lightbulb_gr.png"};

	//check if this is the first time 
	if (info.isThisFirstTime())
		firstRun();

	// death timer, re #71. backstopped by addon update to 'dead' addon.
	if (Date.now() - info.getStartDate() >= STUDYLIFETIME) {
		require("sdk/addon/installer").uninstall(require("self").id);
	};

	//start triggers
	triggers.init();
}


