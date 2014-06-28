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


exports.writeToFile = writeToFile;
exports.appendToFile = appendToFile;
exports.appendLineToFile = appendLineToFile;