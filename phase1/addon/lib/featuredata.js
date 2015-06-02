/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


var config = require("./config");

const featureObjectAddress = "featureData.dataObject";





function firstTimeInitialize(){
	
	var featuredata = {
	//featurename: dataobject
	closetabshortcut: {count: 0, triggered: false},
	newbookmark: {count: 0, triggered: false},
	newtabshortcut: {count: 0, triggered: false},
	newbookmarkshortcut: {count: 0, triggered: false},
	blushypage: {count: 0, triggered: false},
	facebook: {count: 0, triggered: false},
	amazon: {count: 0, triggered: false},
	translator: {count: 0, triggered: false},
	youtube: {count: 0, triggered: false},
	download: {count: 0, triggered: false},
	gmail: {count: 0, triggered: false},
	reddit: {count: 0, triggered: false}

	};

	for (var featurename in featuredata)
		featuredata[featurename]["threshold"] = config.COUNT_THRESHOLDS[featurename];

	writeToPrefs(featuredata);
}


function writeToPrefs(featuredata){
	prefs[featureObjectAddress] = JSON.stringify(featuredata);
}

function getFromPrefs(){
	return JSON.parse(prefs[featureObjectAddress]);
}

function get(feat, prop){
	
	var featuredata = getFromPrefs();

	if (!featuredata.hasOwnProperty(feat))
		throw new Error("feature " + feat + " does not exist in featuredata");
	else
		return featuredata[feat][prop];
}

function set(feat, prop, val){

	var featuredata = getFromPrefs();

	if (!featuredata.hasOwnProperty(feat))
		throw new Error("feature " + feat + " does not exist in featuredata");
	else {
		featuredata[feat][prop] = val;
		writeToPrefs(featuredata);
	}
		
}


// exports.writeToPrefs = writeToPrefs;
// exports.getFromPrefs = getFromPrefs;
exports.get = get;
exports.set = set;
exports.firstTimeInitialize = firstTimeInitialize;
