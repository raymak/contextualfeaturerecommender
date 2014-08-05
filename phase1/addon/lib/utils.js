/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


var request = require("sdk/request");
var logger = require("./logger");
var config = require("./config");
var info = require("./generalInfo");
var {merge, extend} = require("sdk/util/object");
var {stringify, parse, escape, unescape} = require("sdk/querystring");
var {appendToFile, appendLineToFile} = require("./file");


//LANGUAGE API
function getLanguage(urlStr, callback){
	
	function requestCompleted(response){
		var lang = response.json.language || "unknown";
		logger.log("language: " + lang);
		console.log(response.text);
		callback(lang);
	}

	var XMLReq = new request.Request({
		url: "http://access.alchemyapi.com/calls/url/URLGetLanguage",
		onComplete: requestCompleted ,
		content: {url: urlStr, apikey: "5e2845660844aaaf84fb3ba9be486800ef63eb3f", outputMode: "json"}
	});

	XMLReq.get();
}

/**
  * Request to Google Analytics Enabled Page (and to Test Pilot!)
  *
  * note: called mostly by sendEvent.
  *
  * args:
  *    dataObject:  POJO with event related keys
  *
  * returns:
  *	   null / sideffect
  *
  * Google analytics account managed by Gareth Cull (garethc)
  *
  * documentation for using GA to post events:
  * https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide
  *
  * parameter documentation:
  * https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#hit
  *
  * Note: payloads limited to 2048 bytes
  *
  * Note: also sends to TestPilot / bagheera re #188
  **/
function sendToGA(dataObject){
	function requestCompleted(which, response) {
		console.log("REQUEST COMPLETE", which, response.status);
	}

	var gaFields = {
					"userid": dataObject.userid, // for easy sorting at TP
					"v": 1, //static
					"tid": "UA-35433268-28", //id of ga account for mozillalabs
					"cid": "be74c5a0-143a-11e4-8c21-0800200c9a66", //randomly generated uuid
					"t": "pageview", //type of hit. keep static
					"dh": "caravela.mozillalabs.com", //subpage of mozillalabs account to get data
					"dp": JSON.stringify(dataObject), //subpage to register pageview. required for view
					}

	if (info.getSendData()){
		console.log("GA and TP REQUESTS");
		console.log(JSON.stringify(gaFields,null,2));

		var XMLReqGA = new request.Request({
			url: "http://www.google-analytics.com/collect",
			onComplete: requestCompleted.bind(null,"GA"),
			content: gaFields
		});

		XMLReqGA.get();

		/** TP packet
		  * - special url
		  * - POST instead of get
		  * - explicit about content type.
		  * - will autogen a record at /bagheera end
		  */
		let TP_URL = "https://testpilot.mozillalabs.com/submit/" + "contextfeaturerecommender";

		// belt and suspenders here #184
		var XMLReqTP = new request.Request({
			url: TP_URL,
			headers: {},
			onComplete: requestCompleted.bind(null,"TP"),
			content: JSON.stringify(gaFields),
			contentType: "application/json",
		});

		XMLReqTP.post();

	} else {
		console.log("not sending to GA");
	}
};


//to add common fields such as timestamp, userid, etc. to event data
function sendEvent(messType, messVal, messId){

	var OUT = {ts: Date.now(),
			 experiment: config.EXPERIMENT_NAME,
			 experiment_version: config.EXPERIMENT_VERSION,
			 addon_version: info.getAddonVersion(),
			 test_mode: info.getTestMode(),
			 userid: info.getUserId(), 
			 arm: info.getArm(),
			 locale: info.getLocale()
			};

	OUT = override(OUT, info.getSystemInfo());

	
	OUT = override(OUT, {type: messType, value: messVal, triggerid: messId});

	sendToGA(OUT);

}

function sendTriggerEvent(value, triggerId){
	
	var OUTtype = config.TYPE_TRIGGER;
	var OUTval = value;
	var OUTid = triggerId;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendMinorTriggerEvent(value, triggerId){
	

	var OUTtype = config.TYPE_MINOR_TRIGGER;
	var OUTval = value;
	var OUTid = triggerId;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendOfferingEvent(offeringType, value, triggerId){
	var OUTtype = config.TYPE_OFFERING;
	var OUTval = override({offeringType: offeringType}, value);
	var OUTid = triggerId;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendSecondaryListenerEvent(value, triggerId){
	var OUTtype = config.TYPE_SECONDARY_LISTENER;
	var OUTval = value;
	var OUTid = triggerId;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendAddonInstallEvent(value){
	var OUTtype = config.TYPE_ADDON_INSTALL;
	var OUTval = value;
	var OUTid = config.ID_NA;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendLoadEvent(reason){
	var OUTtype = config.TYPE_LOAD;
	var OUTval = {reason: reason};
	var OUTid = config.ID_NA;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendLastCallEvent(reason, lastTriggerId){
	var OUTtype = config.TYPE_LAST_CALL;
	var OUTval = {reason: reason};
	var OUTid = lastTriggerId;

	sendEvent(OUTtype, OUTval, OUTid);
}

function weightedRandomInt(weightsArr){
	var sum = weightsArr.reduce(function(pv, cv) { return pv + cv; }, 0);

	var randInt = Math.floor(Math.random() * sum);

	var index = 0;
	var cummWeight = weightsArr[0];

	for (var i = 0; i < sum; i++){
		while (i == cummWeight) {index++; cummWeight += weightsArr[index];}
		if (randInt == i) return index;
	}
	
}

var override  = function() merge.apply(null, arguments);



exports.getLanguage = getLanguage;
exports.appendLineToFile = appendLineToFile;
exports.sendToGA = sendToGA;
exports.override = override;
exports.sendEvent = sendEvent;
exports.sendOfferingEvent = sendOfferingEvent;
exports.sendTriggerEvent = sendTriggerEvent;
exports.sendAddonInstallEvent = sendAddonInstallEvent;
exports.sendLoadEvent = sendLoadEvent;
exports.sendLastCallEvent = sendLastCallEvent;
exports.sendMinorTriggerEvent = sendMinorTriggerEvent;
exports.weightedRandomInt = weightedRandomInt;
exports.sendSecondaryListenerEvent = sendSecondaryListenerEvent;
