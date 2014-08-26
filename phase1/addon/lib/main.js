/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

const STUDYLIFETIME = 14 * 86400 * 1000;  // milliseconds

var triggers = require("./triggers");
var logger = require("./logger");
var info = require("./generalInfo");
var featuredata = require("./featuredata");
var {WindowTracker} = require("sdk/deprecated/window-utils");
var {isBrowser} = require("sdk/window/utils");
var config = require("./config");
var ui = require("./ui")
var utils = require("./utils");
var {blushiness} = require("./blush");
var system = require("sdk/system");
var prefs = require("sdk/simple-prefs").prefs;

require("./prefs-listeners");

const REASON = [ 'unknown', 'startup', 'shutdown', 'enable', 'disable',
'install', 'uninstall', 'upgrade', 'downgrade' ];

function firstRun(){
	logger.log("Running for the first time...");
	info.registerFirstTimePrefs();
	info.sendInstallInfo();

	//setting the default notification
	info.setDefaultNotification();
	
}

function lastRun(reason, lastTriggerId){

	//send last call
	logger.log("lastRun called");
	utils.sendLastCallEvent(reason, lastTriggerId);
}


//start listening when button is clicked
var main = exports.main = function (options, callbacks){
	console.log(require("sdk/self").data.url());
	
	var reason = options.loadReason;

	//check if this is the first time 
	if (info.isThisFirstTime()) {
		firstRun();
	}

	ui.init();
	//sending the load message to GA
	utils.sendLoadEvent(reason);

	// die, unless live
	prefs.liveforever = !(options.staticArgs || {}).liveforever;
	if (!(options.staticArgs || {}).liveforever) {
		// death timer, re #71. backstopped by addon update to 'dead' addon.
		if (Date.now() - Number(info.getStartTimeMs()) >= STUDYLIFETIME) {
			require("sdk/addon/installer").uninstall(require("sdk/self").id);
		}
	}

	//start triggers
	triggers.init();
};

var onUnload = exports.onUnload = function (reason){
	utils.sendLoadEvent(reason);
	if (reason == 'uninstall' || reason == 'disable'){
		lastRun(reason, ui.getLastRecommendationOptions().id);
	}

};

