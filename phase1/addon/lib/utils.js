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

//FILE SYSTEM

function writeToFile(fileName, message, options){
	var file = require("sdk/io/file");
	var dirPath = require("sdk/system").pathFor("TmpD");
	var filePath = file.join(dirPath, fileName);
	var filePromise = OS.File.open(filePath, options);
	filePromise.then(function onFullFill(aFile){
		var encoder = new TextEncoder();  // This encoder can be reused for several writes
		var array = encoder.encode(message); 
		aFile.write(array);
	}).then(null, Cu.reportError);
	
}

function appendToFile(fileName, message){
	writeToFile(fileName, message, {write: true, append: true});
}

function appendLineToFile(fileName, message){
	appendToFile(fileName, message + "\n");
}


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




exports.writeToFile = writeToFile;
exports.appendToFile = appendToFile;
exports.appendLineToFile = appendLineToFile;
exports.getLanguage = getLanguage;