/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

// var {appendLineToFile} = require("./utils");

var enabled = true;
var consoleEnabled = true;
var fileEnabled = true;

const LOG_FILE_NAME  = "CFRLog.txt";

function log(message){
	logToC(message);
	logToF(message);
}


function logToC(message){
	if (enabled && consoleEnabled) console.log(message);
}

function logToF(message){
	if (enabled && fileEnabled) require("./file").appendLineToFile(LOG_FILE_NAME, message);	
}

exports.logToC = logToC;
exports.logToF = logToF;
exports.log = log;
