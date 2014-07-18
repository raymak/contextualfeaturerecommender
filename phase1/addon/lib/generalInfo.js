/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {Cu} = require("chrome");
Cu.import("resource://gre/modules/AddonManager.jsm");
var config = require("./config");
var {sendToGA, sendEvent, override} = require("./utils");
var prefs = require("sdk/preferences/service");
var system = require("sdk/system");
var logger = require("./logger");
var arms = require("./arms");


function getAddons(callback){
	AddonManager.getAllAddons(function(aAddons) {
	callback(aAddons);
	});
}


function setIsFirstTime(){
	prefs.set("cfrexp.general.isFirstTime", "false");
}

function isThisFirstTime(){
	// return !prefs.has("cfrexp.general.expStartDate");
	return !prefs.has("cfrexp.general.isFirstTime");
}
// also sets start date when called for the first time
function getStartDate(){
	// prefs["expStartDate"] = Date.now().toString();
	if (!isThisFirstTime()) //TODO: change this, isThisFirstTime is not a reliable method
		return prefs.get("cfrexp.general.expStartDate");
	else	{
		prefs.set("cfrexp.general.expStartDate", Date.now().toString()); //set for the first time
		return prefs.get("cfrexp.general.expStartDate");
	}
}

function getUserId(){
	if (!isThisFirstTime()) //TODO: change this, isThisFirstTime is not a reliable method
		return prefs.get("cfrexp.general.userId");
	else	{

		prefs.set("cfrexp.general.userId", require("sdk/util/uuid").uuid().toString()); //set for the first time
		return prefs.get("cfrexp.general.userId");
	}

}

function getTestMode(){
	//test mode
	if (system.staticArgs.test_mode && (system.staticArgs.test_mode == "true" || system.staticArgs.test_mode == "false"))
		prefs.set("cfrexp.config.test_mode", system.staticArgs.test_mode);
	else
		if (!prefs.has("cfrexp.config.test_mode")){
			// throw Error("test_mode state not specified properly. use --static-args to define set .test_mode to either \"true\" or \"false\"");
			prefs.set("cfrexp.config.test_mode", "true");
		}

	logger.log("TEST_MODE = " + prefs.get("cfrexp.config.test_mode"));	
	
	return prefs.get("cfrexp.config.test_mode");

}

function getArm(){

	console.log("in getArm");

	if (!isThisFirstTime())
		return prefs.get("cfrexp.config.arm");
		
	else {
		prefs.set("cfrexp.config.arm", JSON.stringify(arms.assignRandomArm()));
		return prefs.get("cfrexp.config.arm");
		
	}
}

function registerFirstTimePrefs(){
	getUserId();
	getTestMode();
	getStartDate();
	getArm();
	setIsFirstTime();

}

function sendInstallInfo(){
	var OUTtype = config.TYPE_INSTALL;
	var OUTval = {};
	var OUTid = config.ID_NA;

	//addon info
	var addonNames = [];
	var addonIds = [];
	var addonTypes = [];
	var arr = [];

	var locale = prefs.get("general.useragent.locale");

	AddonManager.getAddonsByTypes(['extension'], function (addons) {
	
		for (var i = 0; i < addons.length; i++){
			// console.addons[i].type);
			addonNames.push(addons[i].name);
			addonIds.push(addons[i].id);
			addonTypes.push(addons[i].type);
		}

		AddonManager.getAddonsByTypes(['theme'], function (addons) {
			

			for (var i = 0; i < addons.length; i++){

				addonNames.push(addons[i].name);
				addonIds.push(addons[i].id);
				addonTypes.push(addons[i].type);
			}
			
			try {
			OUTval = require("./utils").override(OUTval, {addonnames: addonNames, addonids: addonIds, addontypes: addonTypes});						
			OUTval.expstartdate = getStartDate();
			OUTval.locale = locale;
			}
			catch (e){
				console.log(e.message);
			}


			try {
			require("./utils").sendEvent(OUTtype, OUTval, OUTid);			
		}
		catch (e){
			console.log(e.message);
		}
			

			});

		
	}); 
	
	
	
}

exports.registerFirstTimePrefs = registerFirstTimePrefs;
exports.getAddons = getAddons;
exports.getStartDate = getStartDate;
exports.isThisFirstTime = isThisFirstTime;
exports.sendInstallInfo = sendInstallInfo;
exports.getUserId = getUserId;
exports.getTestMode = getTestMode;
exports.getArm = getArm;