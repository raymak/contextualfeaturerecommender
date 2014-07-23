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
var utils = require("./utils");

const REASON = [ 'unknown', 'startup', 'shutdown', 'enable', 'disable',
'install', 'uninstall', 'upgrade', 'downgrade' ];

function firstRun(){
	logger.log("Running for the first time...");
	info.registerFirstTimePrefs();
	info.sendInstallInfo();

	//setting the default notification
	info.setDefaultNotification();
	
}

function lastRun(reason){

	//send last call
	logger.log("lastRun called");
	utils.sendLastCallEvent(reason);
}



//start listening when button is clicked
var main = exports.main = function (options, callbacks){
	
	var reason = options.loadReason;

	//sending the load message to GA
	utils.sendLoadEvent(reason);

	

	//check if this is the first time 
	if (info.isThisFirstTime())
		firstRun();

	// death timer, re #71. backstopped by addon update to 'dead' addon.
	if (Date.now() - info.getStartDate() >= STUDYLIFETIME) {
		require("sdk/addon/installer").uninstall(require("sdk/self").id);
	};

	//start triggers
	triggers.init();
}

var onUnload = exports.onUnload = function (reason){
	utils.sendLoadEvent(reason);
	if (reason == 'uninstall' || reason == 'disable'){
		lastRun(reason);
	}

}


