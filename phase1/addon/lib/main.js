

var { modelFor } = require("sdk/view/core");
var { viewFor } = require("sdk/model/core");
var triggers = require("./triggers");
var logger = require("./logger");
var button = require("./ui/button");
var info = require("./generalInfoCollector");
var featuredata = require("./featuredata");

button.getButton(start);

//start listening when button is clicked
function start(state){
	logger.logToF("Button Clicked!");
	triggers.init();
}

info.getAddons(function (addons) {
	for (var i = 0; i < addons.length; i++)
		console.log(addons[i].name);
});

console.log(info.getStartDate());

require("sdk/timers").setTimeout(function(){console.log(info.getStartDate())}, 5000);

featuredata.writeToPrefs();
obj = featuredata.getFromPrefs();
logger.log(obj.closetabshortcut.count);