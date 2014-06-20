//https://blog.mozilla.org/addons/2014/03/13/new-add-on-sdk-australis-ui-features-in-firefox-29/


var ui = require('sdk/ui');
var data = require("sdk/self").data;

var frame;

function init() {
 
	frame = ui.Frame({
  		url: data.url("myframe.html"),
  		contentScriptFile: data.url("myframe.js")
	});
 
	var toolbar = ui.Toolbar({
	  title: "mytoolbar",
	  items: [frame]
	}); 
}

function getFrame() {
	return frame;
}

exports.init = init;
exports.getFrame = getFrame;
