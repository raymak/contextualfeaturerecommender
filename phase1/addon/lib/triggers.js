/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
var {getTabBrowser, getBrowserForTab, getTabForId, getTabBrowserForTab} = require("sdk/tabs/utils");
var hotkeys = require("sdk/hotkeys");
var tabs = require("sdk/tabs");
var actions = require("./actions");
var logger = require("./logger");
var windows = require("sdk/windows");
var chrome = require("chrome");
var {WindowTracker} = require("sdk/deprecated/window-utils");
var utils = require("./utils");
var featuredata = require("./featuredata");
var info = require("./generalInfo");
const {Cu, Cc, Ci} = require("chrome");
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

var downloadList; 
var newTabHotkey = false; //used for detecting new tab initiations without keyboard shortcuts	
var newBookmarkHotkey = false;
var bookmarksObserver;
var closeTabHotkey = false;


//maps events triggered by user to actions
var actionTriggerMap = {
	onURIChange: actions.mapActiveURLToAction,
	onDownloadAdded: actions.recommendDLManager,
	onNewTabClicked: actions.recommendNewTabShortcut,
	onCloseTabClicked: actions.recommendCloseTabShortcut,
	onForeignPageDetected: actions.recommendTranslator, 
	onNewBookmarkNoShortcut: actions.recommendNewBookmarkShortcut,
	onNewBookmark: actions.recommendBookmarkManager
}

// initiate listeners
function init(){
	listenForURIChanges();
	listenForDownloads();
	listenForHotkeys();
	listenForNewTabButton();
	listenForCloseTabButton();
	// listenForForeignPages();
	// listenForBookmarks();
	listenForBookmarksButton();

	//listenForPrivateWindows(); //blush pages
	listenForPinnedTabs();
	listenForAddonInstalls();

}

// secondary reaction listeners

function listenForPrivateWindows(){
	windows.browserWindows.on('open', function (window){
		if (require("sdk/private-browsing").isPrivate(window)){
			var name = "blushypage";
			var isrecommended = featuredata.get(name, "triggered");
			var count = featuredata.get(name, "count");
			utils.sendSecondaryListenerEvent({name: name, recommended: isrecommended, count: count}, name);
		}
	});
}

function listenForPinnedTabs(){
	var windowTracker = new WindowTracker({
		onTrack: function (window){

			if (!isBrowser(window)) return;

			var tabBrowser = window.gBrowser;
			tabBrowser.tabContainer.addEventListener("TabPinned", function(event){
				var name = "facebook";
				var isrecommended = featuredata.get(name, "triggered");
				var count = featuredata.get(name, "count");
				utils.sendSecondaryListenerEvent({name: name, recommended: isrecommended, count: count}, name);
			}, false);
		}
	});
}


function listenForAddonInstalls(){
	var installListener = {
		onInstallEnded: function (install, addon){

			console.log("new addon installed");

			utils.sendAddonInstallEvent({id: addon.id});

			var matchedAddonData = actions.getAddonDataById(addon.id);

			if (matchedAddonData){
				var name = matchedAddonData.featurename;
				var isrecommended = featuredata.get(name, "triggered");
				var count = featuredata.get(name, "count");
				utils.sendSecondaryListenerEvent({name: name, recommended: isrecommended, count: count}, name);
			}
		}
	}

	AddonManager.addInstallListener(installListener);
}

function listenForURIChanges(){
	logger.log("listening forURI Change");
	// tabs.on("ready", actionTriggerMap.onURIChange);
	
	var windowTracker = new WindowTracker({
		onTrack: function (window){

			if (!isBrowser(window)) return;

			var tabBrowser = window.gBrowser;
			tabBrowser.addTabsProgressListener({onLocationChange: actionTriggerMap.onURIChange});
		}
	});

	
}

//listen for changes in downloads
function listenForDownloads(){
	
	let view = {
	  onDownloadAdded: function(download) { 
	    logger.log("Download Added")
	    actionTriggerMap.onDownloadAdded(download);
	  },
	  onDownloadChanged: function(download) {
	    logger.log("Download Changed");
	  },
	  onDownloadRemoved: function(download) {
	   logger.log("Download Removed");
	  }	
	};

	Task.spawn(function() {
	  try {
	    downloadList = yield Downloads.getList(Downloads.ALL);
	    yield downloadList.addView(view);
	  } catch (ex) {
	    console.error(ex);
	  }
	});
}

//listen for when specific hotkeys are pressed
function listenForHotkeys(){
 	var keyTracker = new WindowTracker({
		onTrack: function (window){
			if (!isBrowser(window)) return;		
			
			// CTRL + T (new tab)
			window.addEventListener("keydown", function(e) {
				if (e.keyCode == 'T'.charCodeAt(0) && (info.getSystemInfo().os == "darwin" && e.metaKey == true || info.getSystemInfo().os != "darwin" && e.ctrlKey == true)){
					newTabHotkey = true;
					var name = "newtabshortcut";
					var isrecommended = featuredata.get(name, "triggered");
					var count = featuredata.get(name, "count");
					utils.sendSecondaryListenerEvent({name: name, recommended: isrecommended, count: count}, name);
				}
			});
			// CTRL + W  (close tab)
			window.addEventListener("keydown", function(e) {
				if (e.keyCode == 'W'.charCodeAt(0) && (info.getSystemInfo().os == "darwin" && e.metaKey == true || info.getSystemInfo().os != "darwin" && e.ctrlKey == true)) {
					closeTabHotkey = true;
					var name = "closetabshortcut";
					var isrecommended = featuredata.get(name, "triggered");
					var count = featuredata.get(name, "count");
					utils.sendSecondaryListenerEvent({name: name, recommended: isrecommended, count: count}, name);
				}
			});
			// CTRL + D (new bookmark)
			window.addEventListener("keydown", function(e) {
				if (e.keyCode == 'D'.charCodeAt(0) && (info.getSystemInfo().os == "darwin" && e.metaKey == true || info.getSystemInfo().os != "darwin" && e.ctrlKey == true)){
					newBookmarkHotkey = true;
					var name = "newbookmarkshortcut";
					var isrecommended = featuredata.get(name, "triggered");
					var count = featuredata.get(name, "count");
					utils.sendSecondaryListenerEvent({name: name, recommended: isrecommended, count: count}, name);
					actionTriggerMap.onNewBookmark();
				}
			});


		}
	});
}

//listen for when new tab button is clicked
function listenForNewTabButton(){
	logger.log("listeningForNewTabButton");
	var windowTracker = new WindowTracker({
		onTrack: function (window){

			if (!isBrowser(window)) return;

			let tabbar = window.document.getElementById("tabbrowser-tabs");
			tabbar.addEventListener("click", (e) => {
	 			if (e.originalTarget.classList.contains("tabs-newtab-button") || e.originalTarget.getAttribute("anonid") == "tabs-newtab-button") {
		   			console.log("new tab button click");
		   			actionTriggerMap.onNewTabClicked();
 				}
 			});
 		}
	});

}

function listenForCloseTabButton(){
	logger.log("listeningForCloseTabButton");

	var windowTracker = new WindowTracker({
		onTrack: function (window){

			if (!isBrowser(window)) return;

			let tabbar = window.document.getElementById("tabbrowser-tabs");
            tabbar.addEventListener("click", function(evt){
                if (evt.originalTarget.getAttribute("anonid") == "close-button"){
                    console.log("close tab button click");  // do something.
                    actionTriggerMap.onCloseTabClicked();
 
                }
            });

 		}
	});

}

function listenForBookmarksButton(){
	var windowTracker = new WindowTracker({
		onTrack: function (window){

			if (!isBrowser(window)) return;

			let tabbar = window.document.getElementById("bookmarks-menu-button");
            tabbar.addEventListener("click", function(evt){

                if (evt.originalTarget.getAttribute("anonid") == "button"){
                    console.log("new bookmark button click");  // do something.
                    actionTriggerMap.onNewBookmarkNoShortcut();
                    actionTriggerMap.onNewBookmark();
 
                }
            });

 		}
	});
}

function listenForBookmarks(){

	logger.log("listeningForBookmarks");

	// Create a bookmark observer
	var bookmarksObserver = {
	  onBeginUpdateBatch: function() {
	    // This method is notified when a batch of changes are about to occur.
	    // Observers can use this to suspend updates to the user-interface, for example
	    // while a batch change is occurring.
	  },
	  onEndUpdateBatch: function() {
	    this._inBatch = false;
	  },
	  onItemAdded: function(id, folder, index) {

	  	actionTriggerMap.onNewBookmark();

	  },

	  onItemRemoved: function(id, folder, index) {
	  },
	  onItemChanged: function(id, property, isAnnotationProperty, value) {
	    // isAnnotationProperty is a boolean value that is true of the changed property is an annotation.
	    // You can access a bookmark item's annotations with the <code>nsIAnnotationService</code>.
	  },
	  onItemVisited: function(id, visitID, time) {
	    // The visit id can be used with the History service to access other properties of the visit.
	    // The time is the time at which the visit occurred, in microseconds.
	  },
	  onItemMoved: function(id, oldParent, oldIndex, newParent, newIndex) {
	    // oldParent and newParent are the ids of the old and new parent folders of the moved item.
	  },
	  QueryInterface: function(iid) {
	    if (iid.equals(Ci.nsINavBookmarkObserver) ||
	        iid.equals(Ci.nsISupports)) {
	      return this;
	    }
	    throw Cr.NS_ERROR_NO_INTERFACE;
	  },
	};

	
	// Register the observer with the bookmarks service
	var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
	            .getService(Ci.nsINavBookmarksService);
	bmsvc.addObserver(bookmarksObserver, false);

	//Un-register when done

}

//listen for a non-english page
function listenForForeignPages(){
	
	logger.log("listeningForForeignPage");

	tabs.on("ready", function (tab){

		console.log("tab ready");
		
		utils.getLanguage(tab.url, function (lang){
			if (lang != "english" && lang != "unknown")
				actionTriggerMap.onForeignPageDetected();
		});
	});
			
}


function onUnload(reason){
	if (downloadList) downloadList.removeView();
	// Un-register the observer when done.
	bmsvc.removeObserver(observer);
}

exports.init = init;
exports.onUnload = onUnload;