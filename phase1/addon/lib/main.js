var buttons = require("sdk/ui/button/action");
var ui = require('sdk/ui');
var tabs = require("sdk/tabs");
var notifications = require("sdk/notifications");
var timers = require("sdk/timers");

//initialize a toolbar
var mytoolbar = require("./toolbar");
mytoolbar.init();

//initialize a panel
var mypanel = require("./panel");
mypanel.init();

//initialize a widget
var mywidget = require("./widget");
mywidget.init();

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
	//console.log("button clicked!");
	
	var frame = mytoolbar.getFrame();
	
	//frame.postMessage("", frame.url);
	//frame.postMessage(tabs.activeTab.url, "*");

	 notifications.notify({ title: "TITLE",  text: "TEXT",  data: "DATA",  onClick: function (data) {console.log(data);}});

	//mypanel.show();

}

tabs.on('activate', function onOpen(tab) {
    timers.setTimeout(function (){
  	panel = mypanel.getPanel();
 	panel.port.emit("message", tab.url);
 	panel.show();
  }, 1000);
});

