/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var prefs = require("sdk/preferences/service");

const featureObjectAddress = "cfrexp.featureData.dataObject";



featuredata = {
	//featurename: dataobject
	closetabshortcut: {count: 0}
};

writeToPrefs();

function writeToPrefs(){
	prefs.set(featureObjectAddress , JSON.stringify(featuredata));
}

function getFromPrefs(){
	return JSON.parse(prefs.get(featureObjectAddress));
}

function get(feat, prop){
	
	featuredata = getFromPrefs();

	if (!featuredata.hasOwnProperty(feat))
		throw new Error("feature " + feat + " does not exist in featuredata");
	else
		return featuredata[feat][prop];
}

function set(feat, prop, val){

	if (!featuredata.hasOwnProperty(feat))
		throw new Error("feature " + feat + " does not exist in featuredata");
	else {
		featuredata[feat][prop] = val;
		writeToPrefs();
	}
		
}


// exports.writeToPrefs = writeToPrefs;
// exports.getFromPrefs = getFromPrefs;
exports.get = get;
exports.set = set;
