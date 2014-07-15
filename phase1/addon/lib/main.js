

var triggers = require("./triggers");
var logger = require("./logger");
var button = require("./ui/button");
var info = require("./generalInfoCollector");
var featuredata = require("./featuredata");
var {WindowTracker} = require("sdk/deprecated/window-utils");
var {isBrowser} = require("sdk/window/utils");

var startButton = button.getButton(start);
// start();

//start listening when button is clicked
function start(state){
	logger.logToF("Button Clicked!");
	startButton.icon = {"16": "./ui/icons/lightbulb_gr.png"};
	triggers.init();
}

info.getAddons(function (addons) {
	for (var i = 0; i < addons.length; i++)
		console.log(addons[i].name);
});

console.log(info.getStartDate());

var track = new WindowTracker({
	onTrack: function (window){
		if (!isBrowser(window)) return;
		var keys = Object.keys(window).sort();
		// console.log(Object.keys(window.URLBar));
		// for (var i = 0; i < keys.length; i++)
		// 	console.log(keys[i]);
	}
});

require("sdk/timers").setTimeout(function(){console.log(info.getStartDate())}, 5000);

