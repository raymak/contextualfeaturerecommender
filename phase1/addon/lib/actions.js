var {setTimeout} = require("sdk/timers");
var {getBrowserForTab, getTabForId} = require("sdk/tabs/utils");
var tabs = require("sdk/tabs");
var {data} = require("sdk/self");
var logger = require("./logger");


function showNewURI(aBrowser, aWebProgress, aRequest, aLocation){
	console.log("show new URI");
	tab = tabs.activeTab;
	
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		
		setTimeout(function (){
  		panel = require("./ui/panel").getPanel();
 		panel.port.emit("message", tab.url);
 		panel.show();
  			}, 500);
	}
}

function loadImageKiller(aBrowser, aWebProgress, aRequest, aLocation){
	

	// tab = tabs.activeTab;
	
	// if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
	// 	tab.on("ready", function (){
	// 	tab.attach({
	// 		contentScriptFile: data.url("./ui/imagekiller.js")
	// 	}); } );


	// }

}

function showOnToolbar(aBrowser, aWebProgress, aRequest, aLocation){
	tab = tabs.activeTab;
	
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		
		frame.postMessage(tab.url, frame.url);
	}	
}

exports.showNewURI = showNewURI;
exports.loadImageKiller = loadImageKiller;
exports.showOnToolbar = showOnToolbar;