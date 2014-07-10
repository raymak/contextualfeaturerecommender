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
