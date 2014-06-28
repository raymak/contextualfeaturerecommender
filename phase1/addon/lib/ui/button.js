buttons = require("sdk/ui/button/action");

var logger = require("./../logger");

function getButton(clickHandler){
	return buttons.ActionButton({
		id: "init-button",
		label: "Press Me!",
		icon: {
			"16": "./ui/icons/icon-16.png",
			"32": "./ui/icons/icon-32.png",
			"64": "./ui/icons/icon-64.png"
		},
		onClick: clickHandler
	});
}

exports.getButton = getButton;


