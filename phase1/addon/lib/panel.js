

data = require("sdk/self").data;

var panel;

var init = function (){
	panel = require("sdk/panel").Panel({
	width: 300,
	height: 300,
	//contentURL: data.url("mypanel.html"),
	content: "hello",
	contentScriptFile: data.url("mypanel.js"),
	position: {
		top: 0,    //negative numbers can be used
		left: 0 
		}
	});
}

function show(){
	panel.show();
}

function getPanel(){
	return panel;
}

exports.init = init;
exports.show = show;
exports.getPanel = getPanel;




