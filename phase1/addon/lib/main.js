

var { modelFor } = require("sdk/view/core");
var { viewFor } = require("sdk/model/core");
var triggers = require("./triggers");
var logger = require("./logger");

var button = require("./ui/button");

	
button.getButton(start);

function start(state){
	logger.logToF("Button Clicked!");
	triggers.init();
}