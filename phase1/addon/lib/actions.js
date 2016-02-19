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
var utils = require("./utils");
var notifications = require("sdk/notifications");
var featuredata = require("./featuredata");
var config = require("./config");
var windows = require("sdk/windows");
var {sendEvent, sendToGA, override}  = require("./utils");
var ui = require("./ui");
var info = require("./generalInfo");

// let { blushiness } = require("blush");

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
	"1click-yt-download": {
		header: "Download Videos Easily",
		icon: "https://addons.cdn.mozilla.net/img/uploads/addon_icons/13/13990-64.png?modified=1393302027",
		name: "1-Click YouTube Video Download",
		link: "https://addons.mozilla.org/en-US/firefox/addon/1-click-youtube-video-downl/?src=featurerecommender",
		directlink: "https://addons.mozilla.org/firefox/downloads/latest/13990/addon-13990-latest.xpi",
		id: "YoutubeDownloader@PeterOlayev.com",
		featurename: "youtube"
	},
	"gmail-notifier": {
		header: "Make Gmail Easier",
		name: "Gmail Notifier",
		link: "https://addons.mozilla.org/en-US/firefox/addon/gmail-notifier-restartless/?src=featurerecommender",
		directlink: "https://addons.mozilla.org/firefox/downloads/latest/406178/addon-406178-latest.xpi",
		id: "jid0-GjwrPchS3Ugt7xydvqVK4DQk8Ls@jetpack",
		featurename: "gmail"
	},
	"flashgot": {
		header: "Downloads Made Easy",
		name: "FlashGot Mass Downloader",
		link: "https://addons.mozilla.org/en-US/firefox/addon/flashgot/?src=featurerecommender",
		directlink: "https://addons.mozilla.org/firefox/downloads/latest/220/addon-220-latest.xpi",
		id: "{19503e42-ca3c-4c27-b1e2-9cdb2170ee34}",
		featurename: "download"
	},
	"googletranslator": {
		header: "Translate It",
		name: "Google™ Translator",
		link: "https://addons.mozilla.org/en-US/firefox/addon/google-translator/?src=featurerecommender",
		directlink: "https://addons.mozilla.org/firefox/downloads/latest/493406/addon-493406-latest.xpi",
		id: "jid1-dgnIBwQga0SIBw@jetpack",
		featurename: "translator"
	},
	"redditenhancement": {
		header: "Awesome Up Reddit",
		name: "Reddit Enhancement Suite",
		link: "https://addons.mozilla.org/en-US/firefox/addon/reddit-enhancement-suite/?src=featurerecommender",
		directlink: "https://addons.mozilla.org/firefox/downloads/latest/387429/addon-387429-latest.xpi",
		id: "jid1-xUfzOsOFlzSOXg@jetpack",
		featurename: "reddit"
	},
	"amazonwishlistbutton": {
		header: "Wish List Everywhere",
		name: "Amazon \"Add to Wish List\" Button",
		link: "https://addons.mozilla.org/en-US/firefox/addon/add-to-amazon-wish-list-button/?src=featurerecommender",
		directlink: "https://addons.mozilla.org/firefox/downloads/latest/257015/addon-257015-latest.xpi",
		id: "amznUWL2@amazon.com",
		featurename: "amazon"
	},
	"quickmark": {
		header: "Easier Bookmarking",
		name: "Quick Mark",
		link: "https://addons.mozilla.org/en-US/firefox/addon/quickmark/?src=featurerecommender",
		directlink: "https://addons.mozilla.org/firefox/downloads/latest/462572/addon-462572-latest.xpi",
		id: "jid0-QT2VXewB9xzbRlyapSJjA4ebwoU@jetpack",
		featurename: "newbookmark"
	}
};

function getAddonDataById(id){
	for (var prop in addonData) 
    if (addonData.hasOwnProperty(prop))
        if (addonData[prop].hasOwnProperty("id"))
			if (addonData[prop].id == id) return addonData[prop];

	return null;

}


//carries out right action based on (hostname of) current website
function mapActiveURLToAction(aBrowser, aWebProgress, aRequest, aLocation){
	
	var tab = tabs.activeTab;
	logger.log("mapActiveURLToAction");

	// if (tab.id == activeTab.id)
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		
		var hostname = URL(tab.url).hostname;
		logger.log(hostname);

		if (!hostname) return;  //to handle new tabs and blank pages

		if (hostname in URLToActionMapper) {
			URLToActionMapper[hostname]({hostname: hostname});
		}

		let blushcat = blushiness(hostname).category;
		console.log('after', hostname, blushcat);

		if (blushcat && (['adult'].indexOf(blushcat)>=0)) {
			pornDetected({});
		}
	}	

}

function minorTriggerCount(featurename){
	var count = featuredata.get(featurename, "count");
	count ++;
	featuredata.set(featurename, "count", count);

	var isrecommended = featuredata.get(featurename, "triggered");

	if (isrecommended)
		if (count > featuredata.get(featurename, "threshold") + 10)
			if ((count - featuredata.get(featurename, "threshold")) % 10 != 0)
				return;

	utils.sendMinorTriggerEvent({count: count, isrecommended: isrecommended}, featurename);
	
	return count;
}

// recommends installing a DL manager to user
function recommendDLManager(download){
	
	var featurename = "download";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename;
	var name = featurename;

	var options = {explanationMessage: "you download a lot of files."};

	if (count == featuredata.get(featurename, "threshold")){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);

		recommendAddon({addonID: "flashgot", triggerId: triggerId, featurename: featurename, extraOptions: options});
	}
}

// recommends a specific addon to user
function recommendAddon(options){
	
	logger.log("recommending addon");

	featuredata.set(options.featurename, "triggered", true);

	var explanationMessage = options.extraOptions.explanationMessage || ("you visit " + options.extraOptions.hostname);

	info.userHasAddonById(addonData[options.addonID].id, function (alreadyHasAddon){

		let info = addonData[options.addonID];

	 	ui.showNotification({
		 	message: '<span id="addonname">'+info.name+'</span>' + " can help you.",
			header: info.header || "Make Firefox Yours",
			reactionType: "openlinkinnewtab",
			reactionOptions: {url: addonData[options.addonID].link},
			buttonLabel: "Show More",
			icon: addonData[options.addonID].icon,
			id: options.triggerId,
			explanationMessage: explanationMessage,
			ignore: alreadyHasAddon
		});


		var type = alreadyHasAddon ? config.TYPE_OFFERING_ADDON_IGNORED : config.TYPE_OFFERING_ADDON;
		utils.sendOfferingEvent(type, options, options.triggerId);

	});

	

}

function ytDetected(options){
	
	logger.log("ytDetect");

	var featurename = "youtube";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename;
	var name = featurename;

	if (count == featuredata.get(featurename, "threshold")){
		
		utils.sendTriggerEvent({name: name, count: count}, triggerId);
		
		recommendAddon({addonID: "1click-yt-download", triggerId: triggerId, featurename: featurename, extraOptions: options});
	}
}

function gmailDetected(options){

	var featurename = "gmail";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename;
	var name = featurename;

	if (count == featuredata.get(featurename, "threshold")){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);

		recommendAddon({addonID: "gmail-notifier", triggerId: triggerId, featurename: featurename, extraOptions: options});
	}
}

function soccerDetected(options){
	
}

//TODO
function recommendTranslator(options){
	
	var featurename = "translator";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename; // "foreignpage"
	var name = featurename;

	//TODO
	var options = require("./utils").override(options, {explanationMessage: ""});

	if (count == featuredata.get(featurename, "threshold")){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		recommendAddon({addonID: "googletranslator", triggerId: triggerId, featurename: featurename, extraOptions: options});
	}
}

function redditDetected(options){
	
	var featurename = "reddit";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename;
	var name = featurename;

	if (count == featuredata.get(featurename, "threshold")){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		recommendAddon({addonID: "redditenhancement", triggerId: triggerId, featurename: featurename, extraOptions: options});
	}
}

function amazonDetected(options){
	var featurename = "amazon";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename;
	var name = featurename;

	if (count == featuredata.get(featurename, "threshold")){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);
	

		recommendAddon({addonID: "amazonwishlistbutton", triggerId: triggerId, featurename: featurename, extraOptions: options});
	}

	extractSearchQuery("amazon");
}

function googleDetected(options){

	extractSearchQuery("google");
}

function bingDetected(options){
	extractSearchQuery("bing");
}

function yahooDetected(options){
	extractSearchQuery("yahoo");
}

function wikipediaDetected(options){
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

function recommendPinTab(options){

	var explanationMessage = "You visit Facebook a lot."

	featuredata.set(options.featurename, "triggered", true);
	
	ui.showNotification({
		message: "Use Pinned Tabs to keep your favorite sites just a click away.",
		header: "App Page",
		reactionType: "openlinkinnewtab",
		reactionOptions: {url: "https://support.mozilla.org/en-US/kb/pinned-tabs-keep-favorite-websites-open"},
		buttonLabel: "Show Me How",
		id: options.triggerId,
		explanationMessage: explanationMessage
		});

		
		utils.sendOfferingEvent(config.TYPE_OFFERING_PINTAB, options, options.triggerId);

}

function facebookDetected(options){

	var featurename = "facebook";

	var count = minorTriggerCount(featurename);

	var explanationMessage = "you frequently visit " + options.hostname;

	var triggerId = featurename;
	var name = featurename;

	if (count == featuredata.get(featurename, "threshold")){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		recommendPinTab({triggerId: triggerId, featurename: featurename, extraOptions: {explanationMessage: explanationMessage}});
	}	
}

function recommendPrivateWindow(options){

	featuredata.set(options.featurename, "triggered", true);

	// var explanationMessage = options.extraOptions.explanationMessage || ("you visited " + options.extraOptions.hostname);
	var explanationMessage = "you visit adult websites a lot."
	
	ui.showNotification({
	message: "Viewing pages in a Private Window lets you avoid saving information about them.",
	header: "Private Page",
	reactionType: "openlinkinnewtab",
	reactionOptions: {url: "https://support.mozilla.org/en-US/kb/private-browsing-browse-web-without-saving-info#w_how-do-i-open-a-new-private-window"},
	buttonLabel: "Show Me How",
	id: options.triggerId,
	explanationMessage: explanationMessage
	});

	utils.sendOfferingEvent(config.TYPE_OFFERING_PRIVATEWINDOW, options, options.triggerId);
}


function blushyPageDetected(options){
	
	if (!require("sdk/private-browsing").isPrivate(tabs.activeTab)){

		var featurename = "blushypage";

		var count = minorTriggerCount(featurename);

		var triggerId = "blushypage";
		var name = "blushypage";

		if (count == featuredata.get(featurename, "threshold")){

			utils.sendTriggerEvent({name: name, count: count}, triggerId);

			recommendPrivateWindow({triggerId: triggerId, featurename: featurename, extraOptions: options});
			

		}

	}

}

// TODO: create a recommendPrivateWindow function 
function pornDetected(options){

	logger.log("pornDetected"); 

	blushyPageDetected(options);

}

function recommendKeyboardShortcut(){
	//TODO
}

//recommends using a keyboard shortcut to open a  new tab
function recommendNewTabShortcut(){
	logger.log("recommendNewTabShortcut");

	var featurename = "newtabshortcut";

	var count = minorTriggerCount(featurename);


	var triggerId = featurename;
	var name = featurename;

	var explanationMessage = "you open tabs a lot";

	if (count == featuredata.get(featurename, "threshold")){

		featuredata.set(featurename, "triggered", true);

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		ui.showNotification({
		message: "You can also use <strong>" + info.getCommandkeyStr() + "+T</strong> to open a new tab. It's faster!",
		header: "New Tab",
		reactionType: "openlinkinnewtab",
		reactionOptions: {url: "https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly#w_windows-tabs"},
		buttonLabel: "Show More",
		id: triggerId,
		explanationMessage: explanationMessage
		});

		var options = {};

		utils.sendOfferingEvent(config.TYPE_OFFERING_KEYBOARDSHORTCUT, options, triggerId);

	}
	

}

function recommendCloseTabShortcut(){
	logger.log("recommendCloseTabShortcut");

	var featurename = "closetabshortcut";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename;
	var name = featurename;

	var explanationMessage = "you close tabs a lot.";

	if (count == featuredata.get(featurename, "threshold")){

		featuredata.set(featurename, "triggered", true);

		utils.sendTriggerEvent({name: name, count: count}, triggerId);

		ui.showNotification({
		message: "You can also use <strong>" + info.getCommandkeyStr() + "+W</strong> to close a tab. It's faster!",
		header: "Close Tab",
		reactionType: "openlinkinnewtab",
		reactionOptions: {url: "https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly#w_windows-tabs"},
		buttonLabel: "Show More",
		id: triggerId,
		explanationMessage: explanationMessage
		});

		var options = {};

		utils.sendOfferingEvent(config.TYPE_OFFERING_KEYBOARDSHORTCUT, options, triggerId);

	}
}

function recommendBookmarkManager(){

	var featurename = "newbookmark";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename;
	var name = featurename;

	var options = {explanationMessage: "you use bookmarks a lot."};

	if (count == featuredata.get(featurename, "threshold")){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);		
		
		recommendAddon({addonID: "quickmark", triggerId: triggerId, featurename: featurename, extraOptions: options});
	}
}

function recommendNewBookmarkShortcut(){
	
	var featurename = "newbookmarkshortcut";

	var count = minorTriggerCount(featurename);

	var triggerId = featurename;
	var name = featurename;

	var explanationMessage = "you bookmark a lot.";

	if (count == featuredata.get(featurename, "threshold")){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);

		featuredata.set(featurename, "triggered", true);

		ui.showNotification({
		message: "You can also use <strong>" + info.getCommandkeyStr() + "+D</strong> to bookmark a page. It's faster!",
		header: "New Bookmark",
		reactionType: "openlinkinnewtab",
		reactionOptions: {url: "https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly#w_bookmarks"},
		buttonLabel: "Show More",
		id: triggerId,
		explanationMessage: explanationMessage
		});

		var options = {};

		utils.sendOfferingEvent(config.TYPE_OFFERING_KEYBOARDSHORTCUT, options, triggerId);
	}	

}

exports.mapActiveURLToAction = mapActiveURLToAction;
exports.recommendDLManager = recommendDLManager;
exports.recommendNewTabShortcut = recommendNewTabShortcut;
exports.recommendTranslator = recommendTranslator;
exports.recommendNewBookmarkShortcut = recommendNewBookmarkShortcut;
exports.recommendBookmarkManager = recommendBookmarkManager;
exports.recommendCloseTabShortcut = recommendCloseTabShortcut;
exports.getAddonDataById = getAddonDataById;