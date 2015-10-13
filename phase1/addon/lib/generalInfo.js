/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {Cu} = require("chrome");
Cu.import("resource://gre/modules/AddonManager.jsm");
var config = require("./config");
var {sendToGA, sendEvent, override} = require("./utils");
var genPrefs = require("sdk/preferences/service");
var prefs = require("sdk/simple-prefs").prefs;
var system = require("sdk/system");
var logger = require("./logger");
var arms = require("./arms");
var ui = require("./ui");
var tabs = require("sdk/tabs");
var FHR = require("./FHR");
var featuredata = require("./featuredata");


function getAddons(callback){
	AddonManager.getAllAddons(function(aAddons) {
	callback(aAddons);
	});
}

function userHasAddonById(id, callback){
	AddonManager.getAllAddons(function(aAddons) {
		
		for (var i = 0; i < aAddons.length; i++)
			if (aAddons[i].id == id) {callback(true); return;}

		callback(false);
	});
}

function setIsFirstTime(value){
	prefs["general.isFirstTime"] = value;
}

function isThisFirstTime(){

	return (prefs["general.isFirstTime"] || !("general.isFirstTime" in prefs));
}
// also sets start date when called for the first time
function getStartTimeMs(){
	
	if (prefs["general.expStartTimeMs"]) 
		return prefs["general.expStartTimeMs"];
	else	{
		prefs["general.expStartTimeMs"] = Date.now().toString(); //set for the first time
		return prefs["general.expStartTimeMs"];
	}
}

function getUserId(){
	if (prefs["general.userId"]) 
		return prefs["general.userId"];
	else {

		prefs["general.userId"] = require("sdk/util/uuid").uuid().toString().slice(1,-1); //set for the first time
		return prefs["general.userId"];
	}

}

function getTestMode(){
	//test mode
	if ("test_mode" in system.staticArgs)
		prefs["config.test_mode"] =  system.staticArgs.test_mode;
	else
		if (!( "config.test_mode" in prefs)){
			// throw Error("test_mode state not specified properly. use --static-args to define set .test_mode to either \"true\" or \"false\"");
			prefs["config.test_mode"] = true;  //true by default
		}

	logger.log("TEST_MODE = " + prefs["config.test_mode"]);	
	
	return prefs["config.test_mode"];

}

function getSendData(){
	if ("send_data" in system.staticArgs)
		prefs["config.send_data"] = system.staticArgs.send_data;
	else
		if (!("config.send_data" in prefs)){
			prefs["config.send_data"] = false;   //false by default 
	}

	logger.log("SEND_DATA = " + prefs["config.send_data"]);

	return prefs["config.send_data"];
}

function getLocale(){
	return genPrefs.get("general.useragent.locale");
}

function getUpdateChannel(){
	return genPrefs.get("app.update.channel");
}

function getSystemInfo(){
	var info = {
		systemname: system.name,
		systemversion: system.version,
		os: system.platform

	};
	return info;
}

function getAddonVersion(){
	return require("sdk/self").version;
}


function setArm (weights) {
	weights = weights || system.staticArgs.arm_weights || config.DEFAULT_ARM_WEIGHTS;
	let armint = require("./utils").weightedRandomInt(weights);
	let arm = arms.arms[armint];
	prefs["config.armnumber"] = armint;
	prefs["config.arm"] = JSON.stringify(arm);
	return arm;
}

/**
  * Returns existing arm or null.  No side effects.
  */
function getArm () {
	console.log("in getArm");
	if (prefs["config.arm"]) {
		return JSON.parse(prefs["config.arm"]);
	} else {
		return null;
	}
};

function setDefaultNotification(){

	var triggerId = "defaultmessage";

	ui.showNotification({
		message: config.DEFAULT_MESSAGE,
		header: config.DEFAULT_HEADER,
		reactionType: "openlinkinnewtab",
		reactionOptions: {url: config.DEFAULT_MESSAGE_URL},
		
		buttonLabel: config.DEFAULT_BUTTON_LABEL,
		id: "defaultmessage",
		hidePanel: true,
		explanationHide: true,
		buttonOff: true
		});
}
function registerFirstTimePrefs(){
    console.log("running first time sequence");
	getUserId();
	getTestMode();
	getSendData();
	getStartTimeMs();
	setArm();
	featuredata.firstTimeInitialize();
	setIsFirstTime(false);

}

function getCommandkeyStr(){
	return (getSystemInfo().os == "darwin" ? "Command" : "CTRL");
}

function isAddonInstalled(addonId, callback){
	
	AddonManager.getAllAddons(function(aAddons) {
		for (var i = 0; i < aAddons.length; i++)
			if (aAddons[i].id == addonId) callback(true);

		callback(false);
	});
}

function getFHRdata(callback){

	console.log("starting to get FHR data");

	if (!FHR.reporter) return;

	console.log("getting FHR data");

  	FHR.reporter.onInit().then(function() {
    	return FHR.reporter.collectAndObtainJSONPayload(true)
    }).then(function(data) {
    	parseFHRpayload(data, callback);
    });
}

// parses the fhr 'data' object and calls the callback function when the result is ready.
// callback(profileAgeDays, sumMs)
// https://github.com/raymak/contextualfeaturerecommender/issues/136

function parseFHRpayload(data, callback){
	console.log("parsing FHR payload");

	var days = data.data.days;

	var nowDate = new Date();
	
	var todayDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0 ,0, 0);
	console.log(todayDate.toString());

	var aMonthAgoDate = new Date(todayDate.getTime() - 30 * 24 * 3600 * 1000);
	console.log(aMonthAgoDate.toString());

	var sumMs = 0;
	
	var profileAgeDays = Date.now()/(86400*1000) - data.data.last["org.mozilla.profile.age"].profileCreation;

	for (var key in days){
		if (days.hasOwnProperty(key)){

			var dateRegExp = new RegExp("(.*)-(.*)-(.*)");
			var allQs = dateRegExp.exec(key);
			// console.log(allQs[1], allQs[2], allQs[3]);

			let tmpDate = new Date(days[key]);
			let date = new Date(parseInt(allQs[1], 10), parseInt(allQs[2] - 1, 10), parseInt(allQs[3], 10), 0, 0, 0, 0);
			// console.log(date.toString());

			if (date >= aMonthAgoDate && date < todayDate)
				if (days[key]["org.mozilla.appSessions.previous"])
					if (days[key]["org.mozilla.appSessions.previous"].cleanActiveTicks)
						days[key]["org.mozilla.appSessions.previous"].cleanActiveTicks.forEach(function (elm){
									sumMs = sumMs + elm * 5 * 1000;
						});


		}
	}
	console.log("sumMs", sumMs);

	callback(profileAgeDays, sumMs);

    // console.log(JSON.stringify(data.data, null, 2));
    // return usage statistic
}

function sendInstallInfo(){
	var OUTtype = config.TYPE_INSTALL;
	var OUTval = {};
	var OUTid = config.ID_NA;

	//addon info
	var addonNames = [];
	var addonIds = [];
	var addonTypes = [];
	var addonActivities = [];
	var arr = [];
	var searchenginename = genPrefs.get("browser.search.defaultenginename");
	var isdntenabled = genPrefs.get("privacy.donottrackheader.enabled");
	var dntvalue = genPrefs.get("privacy.donottrackheader.value");
	var ishistoryenabled = genPrefs.get("places.history.enabled");
	var browsertabsremote = genPrefs.get("browser.tabs.remote");
	var browsertabsremoteautostart = genPrefs.get("browser.tabs.remote.autostart");

	// var uiclutter = JSON.parse(genPrefs.get("browser.uiCustomization.state"));
	var activeThemeId = "none";
	var activeThemeName = "none";

	AddonManager.getAddonsByTypes(['extension'], function (addons) {
	
		for (var i = 0; i < addons.length; i++){
			// console.addons[i].type);
			addonNames.push(addons[i].name);
			addonIds.push(addons[i].id);
			addonTypes.push(addons[i].type);
			addonActivities.push(addons[i].isActive);

		}

		AddonManager.getAddonsByTypes(['theme'], function (addons) {
			

			for (var i = 0; i < addons.length; i++){

				addonNames.push(addons[i].name);
				addonIds.push(addons[i].id);
				addonTypes.push(addons[i].type);
				addonActivities.push(addons[i].isActive);
				if (addons[i].isActive) {activeThemeId = addons[i].id; activeThemeName = addons[i].name;}
			}

			//fhr
			getFHRdata(function (profileAgeDays, totalActiveMs){
				
				try 
{					
					OUTval = require("./utils").override(OUTval, 
						{addonnames: addonNames, addonids: addonIds, addontypes: addonTypes,
						 activeThemeId: activeThemeId, activeThemeName: activeThemeName,
						 searchenginename: searchenginename, isdntenabled: isdntenabled, dntvalue: dntvalue, ishistoryenabled: ishistoryenabled,
						 profileAgeDays: profileAgeDays, totalActiveMs: totalActiveMs,
						 browsertabsremote: browsertabsremote, browsertabsremoteautostart: browsertabsremoteautostart
						});	

					OUTval.expStartTimeMs = getStartTimeMs();
				}
				catch (e){
					console.log(e.message);
				}


				try {

					//Actually sending the GA Message

					require("./utils").sendEvent(OUTtype, OUTval, OUTid);			
				}
				catch (e){
					console.log(e.message);
				}

			});
			

		});

		
	}); 
	
	
	
}

exports.registerFirstTimePrefs = registerFirstTimePrefs;
exports.getAddons = getAddons;
exports.userHasAddonById = userHasAddonById;
exports.getStartTimeMs = getStartTimeMs;
exports.isThisFirstTime = isThisFirstTime;
exports.sendInstallInfo = sendInstallInfo;
exports.getUserId = getUserId;
exports.getTestMode = getTestMode;
exports.getSendData = getSendData;
exports.getLocale = getLocale;
exports.getUpdateChannel = getUpdateChannel;
exports.getSystemInfo = getSystemInfo;
exports.getAddonVersion = getAddonVersion;
exports.getCommandkeyStr = getCommandkeyStr;
exports.setDefaultNotification = setDefaultNotification;
exports.setIsFirstTime = setIsFirstTime;
exports.getArm = getArm;