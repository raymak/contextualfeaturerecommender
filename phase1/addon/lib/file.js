/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {Cu} = require("chrome");
Cu.import("resource://gre/modules/osfile.jsm");
const { Buffer, TextEncoder, TextDecoder } = require('sdk/io/buffer');

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


exports.appendLineToFile = appendLineToFile;