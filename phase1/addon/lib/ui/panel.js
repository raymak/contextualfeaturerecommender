

data = require("sdk/self").data;



var init = function (){
	return require("sdk/panel").Panel({
	width: 300,
	height: 300,
	//contentURL: data.url("mypanel.html"),
	content: "hello",
	contentScriptFile: data.url("./ui/mypanel.js"),
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
	return init();
}

exports.init = init;
exports.show = show;
exports.getPanel = getPanel;




