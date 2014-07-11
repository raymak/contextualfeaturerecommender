
var prefs = require("sdk/preferences/service");

const featureObjectAddress = "cfrexp.featureData.dataObject";


featuredata = {
	//featurename: dataobject
	closetabshortcut: {count: 0}
}

function writeToPrefs(){
	prefs.set(featureObjectAddress , JSON.stringify(featuredata));
}

function getFromPrefs(){
	return JSON.parse(prefs.get(featureObjectAddress));
}


exports.writeToPrefs = writeToPrefs;
exports.getFromPrefs = getFromPrefs;
