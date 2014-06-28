

var ui = require('sdk/ui');
var data = require("sdk/self").data;
var logger = require("./../logger");


function init() {
	var frame = new ui.Frame({
  		url: data.url("./ui/myframe.html"),
  		onMessage: function(e) {
    	// message only the frame that pinged us
    	//e.source.postMessage("pong" + Math.floor((Math.random() * 10) + 1).toString() , e.origin); 
    	console.log("new message from" + e.source.toString())
    	}
	});
 
	var toolbar = new ui.Toolbar({
	  title: "mytoolbar",
	  items: [frame]
	}); 
	return frame;
}

function getFrame() {
	logger.logToC("in getFrame()");
	return init();
}

exports.init = init;
exports.getFrame = getFrame;
