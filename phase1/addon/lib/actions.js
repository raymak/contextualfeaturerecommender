var {setTimeout} = require("sdk/timers");
var {getBrowserForTab, getTabForId} = require("sdk/tabs/utils");
var tabs = require("sdk/tabs");
var {data} = require("sdk/self");
var logger = require("./logger");
var {URL} = require("sdk/url");
var notifications = require("sdk/notifications");
windows = require("sdk/windows");

//stores what action each webpage should map to 
var URLToActionMapper = {
	"www.youtube.com": ytDetected, 
	"www.gmail.com": gmailDetected, "mail.google.com": gmailDetected, 
	"www.fifa.com": soccerDetected, 
	"www.goal.com": soccerDetected,
	"www.reddit.com": redditDetected,
	"www.amazon.com": amazonDetected, "www.amazon.ca": amazonDetected,
	"stoppornculture.org": pornDetected
};

//stores basic information needed when recommending addons
var addonData = {
	"1click-yt-download": {name: "1-Click YouTube Video Download", link: "https://addons.mozilla.org/firefox/downloads/latest/13990/addon-13990-latest.xpi?src=search"},
	"gmail-notifier": {name: "Gmail Notifier", link: "https://addons.mozilla.org/firefox/downloads/latest/406178/addon-406178-latest.xpi?src=dp-btn-primary"},
	"flashgot": {name: "FlashGot Mass Downloader", link: "https://addons.mozilla.org/firefox/downloads/latest/220/addon-220-latest.xpi?src=search"},
	"googletranslator": {name: "Google™ Translator", link: "https://addons.mozilla.org/firefox/downloads/latest/493406/addon-493406-latest.xpi?src=search"},
	"redditenhancement": {name: "Reddit Enhancement Suite", link: "https://addons.mozilla.org/firefox/downloads/latest/387429/addon-387429-latest.xpi?src=search"},
	"amazonwishlistbutton": {name: "Amazon \"Add to Wish List\" Button", link: "https://addons.mozilla.org/firefox/downloads/latest/257015/addon-257015-latest.xpi?src=dp-btn-primary"},
	"quickmark": {name: "Quick Mark", link: "https://addons.mozilla.org/firefox/downloads/latest/462572/addon-462572-latest.xpi?src=dp-btn-primary"}
}


//shows URI of a tab in a panel
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

// removes all images in a webpage
function loadImageKiller(aBrowser, aWebProgress, aRequest, aLocation){
	

	tab = tabs.activeTab;
	
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		tab.on("ready", function (){
		tab.attach({
			contentScriptFile: data.url("./ui/imagekiller.js")
		}); } );


	}

}

//TODO
function showOnToolbar(aBrowser, aWebProgress, aRequest, aLocation){
	tab = tabs.activeTab;
	
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		
		frame.postMessage(URL(tab.url).hostname, frame.url);
	}	
}

//carries out right action based on (hostname of) current website
function mapActiveURLToAction(tab){
	activeTab = tabs.activeTab;
	logger.log("mapActiveURLToAction");
	
	if (tab.id == activeTab.id) {
		
		var hostname = URL(tab.url).hostname;
		logger.log(hostname);

		if (hostname in URLToActionMapper) URLToActionMapper[hostname]();
	}	

}

// recommends installing a DL manager to user
function recommendDLManager(download){
	recommendAddon({addonID: "flashgot"});
}

// recommends a specific addon to user
function recommendAddon(options){
	setTimeout(function (){
  		var panel = require("./ui/panel").getPanel();
 		panel.port.emit("updateinnerhtml", "Wanna try downloading " + addonData[options.addonID].name + " ?" + "<br>" + "<a href=\'" + addonData[options.addonID].link + "\'> Click here! </a>");
 		panel.port.on("openlinkinnewtab", function(link){
 			tabs.activeTab.url = link; //url reverts back again if it's an extension
 		});
 		panel.show();
  			}, 500);
}

function ytDetected(){
	logger.log("ytDetect");
	recommendAddon({addonID: "1click-yt-download"});
}

function gmailDetected(){
	recommendAddon({addonID: "gmail-notifier"});
}

function soccerDetected(){
	
}

function recommendTranslator(){
	recommendAddon({addonID: "googletranslator"});
}

function redditDetected(){
	recommendAddon({addonID: "redditenhancement"});
}

function amazonDetected(){
	recommendAddon({addonID: "amazonwishlistbutton"});
}

function pornDetected(){
	
	logger.log("pornDetected");
	setTimeout(function (){
  		var panel = require("./ui/panel").getPanel();
 		panel.port.emit("updateinnerhtml", "You might want to try opening this page in a new private window if you don't want it to be stored in your history. <br> <a href='' class='privatewindow'>open in a private window</a>");
 		panel.port.on("movelinktoprivatewindow", function(){
 			// open in a private window
 			windows.browserWindows.open({
 				url: tabs.activeTab.url,
 				isPrivate: true
 			});
 			tabs.activeTab.close();
 		});
 		panel.show();
  			}, 500);
}

//recommends using a keyboard shortcut to open a  new tab
function recommendNewTabShortcut(event){
	logger.log("recommendNewTabShortcut");

		notifications.notify({
  		title: "CTRL + T",
  		text: "'You can also use CTRL+T to open a new tab! Why don't you give it a try!?",
  		data: "",
  		onClick: function (data) {
    	console.log(data);
    	// console.log(this.data) would produce the same result.
  		}
		});
	// setTimeout(function () {
	// 	var panel = require("./ui/panel").getPanel();
	// 	panel.port.emit("updateinnerhtml", "You can also use CTRL+T to open a new tab! Why don't you give it a try!?");
	// 	panel.show();
	// }, 500);

}

function recommendBookmarkManager(){
	recommendAddon({addonID: "quickmark"});
}

function recommendNewBookmarkShortcut(event){
	notifications.notify({
  		title: "CTRL + D",
  		text: "'You can also use CTRL+D to bookmark a page! Why don't you give it a try!?",
  		data: "",
  		onClick: function (data) {
    	console.log(data);
    	// console.log(this.data) would produce the same result.
    	}	
  		});

}

exports.showNewURI = showNewURI;
exports.loadImageKiller = loadImageKiller;
exports.showOnToolbar = showOnToolbar;
exports.mapActiveURLToAction = mapActiveURLToAction;
exports.recommendDLManager = recommendDLManager;
exports.recommendNewTabShortcut = recommendNewTabShortcut;
exports.recommendTranslator = recommendTranslator;
exports.recommendNewBookmarkShortcut = recommendNewBookmarkShortcut;
exports.recommendBookmarkManager = recommendBookmarkManager;