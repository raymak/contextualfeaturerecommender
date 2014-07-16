/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


var {setTimeout} = require("sdk/timers");
var {getBrowserForTab, getTabForId} = require("sdk/tabs/utils");
var tabs = require("sdk/tabs");
var {data} = require("sdk/self");
var logger = require("./logger");
var {URL} = require("sdk/url");
var notifications = require("sdk/notifications");
var featuredata = require("./featuredata");
windows = require("sdk/windows");

//stores what action each webpage should map to 
var URLToActionMapper = {
	"www.youtube.com": ytDetected, 
	"www.gmail.com": gmailDetected, "mail.google.com": gmailDetected, 
	"www.fifa.com": soccerDetected, 
	"www.goal.com": soccerDetected,
	"www.reddit.com": redditDetected,
	"www.amazon.com": amazonDetected, "www.amazon.ca": amazonDetected,
	"stoppornculture.org": pornDetected,
	"www.facebook.com": facebookDetected,
	"www.google.com": googleDetected, "www.google.ca": googleDetected,  "www.bing.com": bingDetected, "www.bing.ca": bingDetected,
	"en.wikipedia.org": wikipediaDetected, "search.yahoo.com": yahooDetected, "search.yahoo.ca": yahooDetected
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
function mapActiveURLToAction(aBrowser, aWebProgress, aRequest, aLocation){
	tab = tabs.activeTab;
	logger.log("mapActiveURLToAction");

	// if (tab.id == activeTab.id)
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		
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
	// recommendAddon({addonID: "amazonwishlistbutton"});
	extractSearchQuery("amazon");
}

function googleDetected(){
	extractSearchQuery("google");
}

function bingDetected(){
	extractSearchQuery("bing");
}

function yahooDetected(){
	extractSearchQuery("yahoo");
}

function wikipediaDetected(){
	extractSearchQuery("wikipedia");
}

function extractSearchQuery(engine){
	logger.log(URL(tabs.activeTab.url).search);

	var qSeparator;
	var qKeyword;

	var autoSeparator = true; //if set, checks both + and space (ignores qSeparator)


	switch (engine){
		case "google":
			qSeparator = "+";
			qKeyword = "q";
		break;
		case "bing":
			qSeparator = "+";
			qKeyword = "q";
		break;
		case "wikipedia":
			qSeparator = "+";
			qKeyword = "search";

		break;
		case "yahoo":
			qSeparator = "+";
			qKeyword = "p";

		break;
		case "amazon":
			qSeparator = "+";
			qKeyword = "field-keywords";

		break;

	}

	var queryRegExp = new RegExp(".*(?:\\?|\\#|&)" + qKeyword + "=(.*?)(?:\\&|$)", "i");

	var allQs = queryRegExp.exec(URL(tabs.activeTab.url).search + URL(tabs.activeTab.url).hash);

	if (allQs){
		logger.log("matched a " + engine + " search query: " + allQs[1]);
		
		if (autoSeparator){
			var queries = allQs[1].split(/\W(?:\d|\W)*/i);
			// if (allQs[1].search(/ /i) != -1)
			// 	qSeparator = " ";
			// else
			// 	qSeparator = "+";
		} 
		else 
			var queries = allQs[1].split(qSeparator);

		queries.map(function (elm){
			logger.log(elm);
		});
	}
}

function facebookDetected(){
	setTimeout(function (){
  		var panel = require("./ui/panel").getPanel();
 		panel.port.emit("updateinnerhtml", "You might want to pin this page. <br> <a href='' class='pintab'>pin this tab</a>");
 		panel.port.on("pintab", function(){
 			// open in a private window
 			tabs.activeTab.pin();
 		});
 		panel.show();
  			}, 500);
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
  		text: "You can also use CTRL+T to open a new tab! Why don't you give it a try!?",
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

function recommendCloseTabShortcut(event){
	logger.log("recommendCloseTabShortcut");

	var count = featuredata.get("closetabshortcut", "count");
	count++;

	featuredata.set("closetabshortcut", "count", count);

	if (count == 4){

		notifications.notify({
			title: "CTRL + W",
			text: "You can also use CTRL+W to close a tab!",
			data: "",
			onClick: function (data){
				console.log(data);
			}
			});
	}
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
exports.recommendCloseTabShortcut = recommendCloseTabShortcut;