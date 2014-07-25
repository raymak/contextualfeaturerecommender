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
	"1click-yt-download": {name: "1-Click YouTube Video Download", link: "https://addons.mozilla.org/firefox/downloads/latest/13990/addon-13990-latest.xpi"},
	"gmail-notifier": {name: "Gmail Notifier", link: "https://addons.mozilla.org/firefox/downloads/latest/406178/addon-406178-latest.xpi"},
	"flashgot": {name: "FlashGot Mass Downloader", link: "https://addons.mozilla.org/firefox/downloads/latest/220/addon-220-latest.xpi"},
	"googletranslator": {name: "Google™ Translator", link: "https://addons.mozilla.org/firefox/downloads/latest/493406/addon-493406-latest.xpi"},
	"redditenhancement": {name: "Reddit Enhancement Suite", link: "https://addons.mozilla.org/firefox/downloads/latest/387429/addon-387429-latest.xpi"},
	"amazonwishlistbutton": {name: "Amazon \"Add to Wish List\" Button", link: "https://addons.mozilla.org/firefox/downloads/latest/257015/addon-257015-latest.xpi"},
	"quickmark": {name: "Quick Mark", link: "https://addons.mozilla.org/firefox/downloads/latest/462572/addon-462572-latest.xpi"}
}



//carries out right action based on (hostname of) current website
function mapActiveURLToAction(aBrowser, aWebProgress, aRequest, aLocation){
	
	var tab = tabs.activeTab;
	logger.log("mapActiveURLToAction");

	// if (tab.id == activeTab.id)
	if (getBrowserForTab(getTabForId(tab.id)) == aBrowser) {
		
		var hostname = URL(tab.url).hostname;
		logger.log(hostname);

		if (hostname in URLToActionMapper) URLToActionMapper[hostname]({hostname: hostname});
	}	

}

function minorTriggerCount(featurename){
	var count = featuredata.get(featurename, "count");
	count ++;
	featuredata.set(featurename, "count", count);

	utils.sendMinorTriggerEvent({count: count}, featurename);
	
	return count;
}

// recommends installing a DL manager to user
function recommendDLManager(download){
	
	var count = minorTriggerCount("download");

	var triggerId = "newdownload";
	var name = "newdownload";

	var options = {explanationMessage: "you are a frequent downloader"};

	if (count == config.DOWNLOAD_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);

		recommendAddon({addonID: "flashgot", triggerId: triggerId, extraOptions: options});
	}
}

// recommends a specific addon to user
function recommendAddon(options){
	
	logger.log("recommending addon");

	var explanationMessage = options.extraOptions.explanationMessage || ("you visited " + options.hostname);

	ui.showNotification({
		message: "Wanna try downloading " + addonData[options.addonID].name + " ?",
		header: "A Cool Addon",
		reactionType: "openlinkinactivetab",
		reactionOptions: {url: addonData[options.addonID].link},
		buttonLabel: "Install Addon",
		id: options.triggerId,
		explanationMessage: explanationMessage
		});


	utils.sendOfferingEvent(config.TYPE_OFFERING_ADDON, options, options.triggerId);

}

function ytDetected(options){
	
	logger.log("ytDetect");

	var count = minorTriggerCount("youtube");

	var triggerId = "youtube";
	var name = "youtube";

	if (count == config.YOUTUBE_COUNT_THRESHOLD){
		
		utils.sendTriggerEvent({name: name, count: count}, triggerId);
		
		recommendAddon({addonID: "1click-yt-download", triggerId: triggerId, extraOptions: options});
	}
}

function gmailDetected(options){
	var count = minorTriggerCount("gmail");

	var triggerId = "gmail";
	var name = "gmail";

	if (count == config.GMAIL_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);

		recommendAddon({addonID: "gmail-notifier", triggerId: triggerId, extraOptions: options});
	}
}

function soccerDetected(options){
	
}

//TODO
function recommendTranslator(options){
	var count = minorTriggerCount("translator");

	var triggerId = "foreignpage";
	var name = "foreignpage";

	//TODO
	var options = require("./utils").override(options, {explanationMessage: ""});

	if (count == config.TRANSLATOR_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		recommendAddon({addonID: "googletranslator", triggerId: triggerId, extraOptions: options});
	}
}

function redditDetected(options){
	var count = minorTriggerCount("reddit");

	var triggerId = "reddit";
	var name = "reddit";

	if (count == config.REDDIT_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		recommendAddon({addonID: "redditenhancement", triggerId: triggerId, extraOptions: options});
	}
}

function amazonDetected(options){
	var count = minorTriggerCount("amazon");

	var triggerId = "amazon";
	var name = "amazon";

	if (count == config.AMAZON_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);
	

		recommendAddon({addonID: "amazonwishlistbutton", triggerId: triggerId, extraOptions: options});
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

function recommendPinTab(){

	ui.showNotification({
		message: "It seems that you frequently visit this page. You might want to pin its tab!",
		header: "App Page",
		reactionType: "openlinkinnewtab",
		reactionOptions: {url: "https://support.mozilla.org/en-US/kb/pinned-tabs-keep-favorite-websites-open"},
		buttonLabel: "Show Me How",
		id: options.triggerId
		});

		var options = {};


		utils.sendOfferingEvent(config.TYPE_OFFERING_PINTAB, options, options.triggerId);

}

function facebookDetected(options){

	var count = minorTriggerCount("facebook");

	var triggerId = "facebook";
	var name = "facebook";

	if (count == config.FACEBOOK_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		recommendPinTab({triggerId: triggerId});
	}	
}

function recommendPrivateWindow(options){

	var explanationMessage = options.extraOptions.explanationMessage || ("you visited " + options.hostname);
	
	ui.showNotification({
	message: "You might want to view this page in a private window.",
	header: "Private Page",
	reactionType: "openlinkinnewtab",
	reactionOptions: {url: "https://support.mozilla.org/en-US/kb/private-browsing-browse-web-without-saving-info#w_how-do-i-open-a-new-private-window"},
	buttonLabel: "Show Me How",
	id: options.triggerId,
	explanationMessage: explanationMessage
	});

	utils.sendOfferingEvent(config.TYPE_OFFERING_PRIVATEWINDOW, options, triggerId);
}


function blushyPageDetected(options){
	
	if (!require("sdk/private-browsing").isPrivate(tabs.activeTab)){

		var count = minorTriggerCount("blushypage");

		var triggerId = "blushypage";
		var name = "blushypage";

		if (count == config.BLUSHYPAGE_COUNT_THRESHOLD){

			utils.sendTriggerEvent({name: name, count: count}, triggerId);

			recommendPrivateWindow({triggerId: triggerId, extraOptions: options});
			

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

	var count = minorTriggerCount("newtabshortcut");

	var triggerId = "newtab";
	var name = "newtab";

	var explanationMessage = "you frequently close tabs";

	if (count == config.NEW_TAB_SHORTCUT_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		ui.showNotification({
		message: "You can also use " + info.getMetakeyStr() + "+T to open a new tab! Why don't you give it a try?",
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

	var count = minorTriggerCount("closetabshortcut");

	var triggerId = "closetab";
	var name = "closetab";

	var explanationMessage = "you frequently open new tabs";

	if (count == config.CLOSE_TAB_SHORTCUT_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);

		ui.showNotification({
		message: "You can also use " + info.getMetakeyStr() + "+W to close a tab!",
		header: "Close Tab",
		reactionType: "noreaction",
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
	var count = minorTriggerCount("newbookmark");

	var triggerId = "newbookmark";
	var name = "newbookmark";

	var options = {explanationMessage: "you are a frequent bookmark user"};

	if (count == config.BOOKMARK_MANAGER_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);		
		
		recommendAddon({addonID: "quickmark", triggerId: triggerId, extraOptions: options});
	}
}

function recommendNewBookmarkShortcut(){
	var count = minorTriggerCount("newbookmark");

	var triggerId = "newbookmarknoshortcut";
	var name = "newbookmarknoshortcut";

	var explanationMessage = "you frequently add new bookmarks";

	if (count == config.BOOKMARK_SHORTCUT_COUNT_THRESHOLD){

		utils.sendTriggerEvent({name: name, count: count}, triggerId);


		ui.showNotification({
		message: "You can also use " + info.getMetakeyStr() + "+D to to bookmark a page! Why don't you give it a try?",
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