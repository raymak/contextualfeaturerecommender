var {setTimeout} = require("sdk/timers");
var {getBrowserForTab, getTabForId} = require("sdk/tabs/utils");
var tabs = require("sdk/tabs");
var {data} = require("sdk/self");
var logger = require("./logger");
var {URL} = require("sdk/url");

var URLToActionMapper = {"www.youtube.com": ytDetect, "www.gmail.com": gmailDetect, "mail.google.com": gmailDetect, "www.fifa.com": soccerDetect, "www.goal.com": soccerDetect};
var addonData = {
	"1click-yt-download": {name: "1-Click YouTube Video Download", link: "https://addons.mozilla.org/firefox/downloads/latest/13990/addon-13990-latest.xpi?src=search"},
	"gmail-notifier": {name: "Gmail Notifier", link: "https://addons.mozilla.org/firefox/downloads/latest/406178/addon-406178-latest.xpi?src=dp-btn-primary"}
}

function showNewURI(aBrowser, aWebProgress, aRequest, aLocation){
	console.log("show new URI");
	tab = tabs.activeTab;
	
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		
		setTimeout(function (){
  		panel = require("./ui/panel").getPanel();
 		panel.port.emit("message", URL(tab.url).hostname);
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
		
		frame.postMessage(URL(tab.url).hostname, frame.url);
	}	
}

function mapActiveURLToAction(aBrowser, aWebProgress, aRequest, aLocation){
	tab = tabs.activeTab;
	logger.log("mapActiveURLToAction");
	
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		
		var hostname = URL(tab.url).hostname;
		logger.log(hostname);

		if (hostname in URLToActionMapper) URLToActionMapper[hostname]();
	}	

}


function recommendAddon(options){
	setTimeout(function (){
  		panel = require("./ui/panel").getPanel();
 		panel.port.emit("updateinnerhtml", "Wanna try downloading " + addonData[options.addonID].name + " ?" + "<br>" + "<a href=\'" + addonData[options.addonID].link + "\'> Click here! </a>");
 		panel.port.on("openlinkinnewtab", function(link){
 			tabs.activeTab.url = link; //url reverts back again if it's an extension
 		});
 		panel.show();
  			}, 500);
}

function ytDetect(){
	logger.log("ytDetect");
	recommendAddon({addonID: "1click-yt-download"});
}

function gmailDetect(){
	recommendAddon({addonID: "gmail-notifier"});
}

function soccerDetect(){
	
}

exports.showNewURI = showNewURI;
exports.loadImageKiller = loadImageKiller;
exports.showOnToolbar = showOnToolbar;
exports.mapActiveURLToAction = mapActiveURLToAction;