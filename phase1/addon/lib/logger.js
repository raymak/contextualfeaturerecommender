
var enabled = true;
var consoleEnabled = true;
var fileEnabled = true;

const LOG_FILE_NAME  = "CFRLog.txt"

function log(message){
	logToC(message);
	logToF(message);
}


function logToC(message){
	if (enabled && consoleEnabled) console.log(message);
}

function logToF(message){
	if (enabled && fileEnabled) require("./utils.js").appendLineToFile(LOG_FILE_NAME, message);	
}

exports.log = log;
exports.logToC = logToC;
exports.logToF = logToF;
