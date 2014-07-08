const {Cu} = require("chrome");
Cu.import("resource://gre/modules/AddonManager.jsm");
var {prefs} = require("sdk/simple-prefs");

function getAddons(callback){
	AddonManager.getAllAddons(function(aAddons) {
	callback(aAddons);
	});
}

function getStartDate(){
	// prefs["expStartDate"] = Date.now().toString();
	if (prefs["expStartDate"] != "")
		return prefs["expStartDate"];
	else	{
		prefs["expStartDate"] = Date.now().toString(); //set for the first time
		return prefs["expStartDate"];
	}
}

exports.getAddons = getAddons;
exports.getStartDate = getStartDate;
