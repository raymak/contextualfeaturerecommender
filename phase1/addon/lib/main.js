var buttons = require("sdk/ui/button/action");
var ui = require('sdk/ui');
var tabs = require("sdk/tabs");

//initialize a toolbar
mytoolbar = require("./toolbar");
mytoolbar.init();

var buton = buttons.ActionButton({
	id: "init-button",
	label: "Press Me!",
	icon: {
		"16": "./icon-16.png",
		"32": "./icon-32.png",
		"64": "./icon-64.png"
	},
	onClick: handleClick
});

function handleClick(state){
//	console.log("button clicked!");
	var frame = mytoolbar.getFrame();
	frame.postMessage("Firefox Rocks!", frame.url);
}
