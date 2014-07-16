/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {Cu} = require("chrome");
Cu.import("resource://gre/modules/AddonManager.jsm");
// var {prefs} = require("sdk/simple-prefs");
var prefs = require("sdk/preferences/service");

function getAddons(callback){
	AddonManager.getAllAddons(function(aAddons) {
	callback(aAddons);
	});
}

// also sets start date when called for the first time
function getStartDate(){
	// prefs["expStartDate"] = Date.now().toString();
	if (prefs.has("cfrexp.general.expStartDate") != "")
		return prefs.get("cfrexp.general.expStartDate");
	else	{
		prefs.set("cfrexp.general.expStartDate", Date.now().toString()); //set for the first time
		return prefs.get("cfrexp.general.expStartDate");
	}
}

exports.getAddons = getAddons;
exports.getStartDate = getStartDate;
