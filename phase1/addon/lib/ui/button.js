buttons = require("sdk/ui/button/action");

var logger = require("./../logger");

function getButton(clickHandler){
	return buttons.ActionButton({
		id: "init-button",
		label: "Press Me!",
		icon: {
			"16": "./ui/icons/lightbulb_bw.png",
		},
		onClick: clickHandler
	});
}

exports.getButton = getButton;


