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
  * Request to Google Analytics Enabled Page
  *
  * note: called mostly by sendEvent.
  *
  * args:
  *    dataObject:  POJO with event related keys
  *
  * returns:
  *	   null / sideffect
  */
function sendToGA(dataObject){
	function requestCompleted(response){
		console.log("GA REQUEST COMPLETE", response.status);
	}

	//stringifying the object
	var str = stringify(dataObject);
	let url = config.GA_URL;
	console.log(url+"?"+str);
	console.log(JSON.stringify(dataObject,null,2));

	if (config.SEND_REQ_TO_GA){
		console.log("sending to GA");
		var XMLReq = new request.Request({
			url: url,
			onComplete: requestCompleted,
			content: dataObject
		});
		XMLReq.get();
	} else {
		console.log("not sending to GA");
	}
}

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

	
	OUT = override(OUT, {type: messType, value: messVal, id: messId});

	sendToGA(OUT);

}

function sendTriggerEvent(value, triggerId){
	
	var OUTtype = config.TYPE_TRIGGER;
	var OUTval = value;
	var OUTid = triggerId;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendMinorTriggerEvent(value, featurename){
	

	var OUTtype = config.TYPE_MINOR_TRIGGER;
	var OUTval = value;
	var OUTid = config.ID_NA;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendOfferingEvent(offeringType, value, triggerId){
	var OUTtype = config.TYPE_OFFERING;
	var OUTval = override({offeringType: offeringType}, value);
	var OUTid = triggerId;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendLoadEvent(reason){
	var OUTtype = config.TYPE_LOAD;
	var OUTval = {reason: reason};
	var OUTid = config.ID_NA;

	sendEvent(OUTtype, OUTval, OUTid);
}

function sendLastCallEvent(reason){
	var OUTtype = config.TYPE_LAST_CALL;
	var OUTval = {reason: reason};
	var OUTid = config.ID_NA;

	sendEvent(OUTtype, OUTval, OUTid);
}

var override  = function() merge.apply(null, arguments);




exports.getLanguage = getLanguage;
exports.appendLineToFile = appendLineToFile;
exports.sendToGA = sendToGA;
exports.override = override;
exports.sendEvent = sendEvent;
exports.sendOfferingEvent = sendOfferingEvent;
exports.sendTriggerEvent = sendTriggerEvent;
exports.sendLoadEvent = sendLoadEvent;
exports.sendLastCallEvent = sendLastCallEvent;
exports.sendMinorTriggerEvent = sendMinorTriggerEvent;
