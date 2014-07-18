/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {Cu} = require("chrome");
Cu.import("resource://gre/modules/osfile.jsm");
const { Buffer, TextEncoder, TextDecoder } = require('sdk/io/buffer');
var request = require("sdk/request");
var logger = require("./logger");
var {merge, extend} = require("sdk/util/object");
var config = require("./config");
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

function sendToGA(dataObject){
	
	function requestCompleted(response){
			// console.log(response.text);
			logger.log("HTTP REQUEST COMPLETE");
			appendLineToFile("httpresponse", response.text);
		}

	

	//stringifying the object
	var str = stringify(dataObject);
	appendLineToFile("GA.txt", str);
	console.log(unescape(parse(str).value));

	 if (config.SEND_REQ_TO_GA == "true"){

		logger.log("sending to GA");

		var newstr = "https://addons.allizom.org/?" + "POST=true&" + "THISISAFAKEMESSAGE=true&" + str;
		console.log(newstr);

		var XMLReq = new request.Request({

			url: newstr,
			onComplete: requestCompleted
			// content:
		});

		XMLReq.post();
	}
	

}

//to add common fields such as timestamp, userid, etc. to event data
function sendEvent(messType, messVal, messId){

	var OUT = {ts: Date.now(), experiment: config.EXPERIMENT_NAME, experiment_version: config.EXPERIMENT_VERSION, addon_version: config.ADDON_VERSION,  test_mode: config.TEST_MODE, userid: config.USER_ID, arm: config.ARM};

	OUT = override(OUT, {type: messType, value: escape(JSON.stringify(messVal)), id: messId});

	sendToGA(OUT);

}

function sendTriggerEvent(value, triggerId){
	
	var OUTtype = config.TYPE_TRIGGER;
	var OUTval = value;
	var OUTid = triggerId;

	sendEvent(OUTtype, OUTval, OUTid);
}

var override  = function() merge.apply(null, arguments);




exports.getLanguage = getLanguage;
exports.appendLineToFile = appendLineToFile;
exports.sendToGA = sendToGA;
exports.override = override;
exports.sendEvent = sendEvent;
exports.sendTriggerEvent = sendTriggerEvent;