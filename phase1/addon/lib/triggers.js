
var {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
var {getTabBrowser, getBrowserForTab, getTabForId, getTabBrowserForTab} = require("sdk/tabs/utils");
var hotkeys = require("sdk/hotkeys");
var tabs = require("sdk/tabs");
var actions = require("./actions");
var logger = require("./logger");
var chrome = require("chrome");
var {WindowTracker} = require("sdk/deprecated/window-utils");
const {Cu} = require("chrome");
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");

var downloadList; 



actionTriggerMap = {
	onURIChange: actions.mapActiveURLToAction,
	onDownloadAdded: actions.recommendDLManager,
	onNewTabClicked: actions.recommendNewTabShortcut 
}

function init(){
	listenForURIChanges();
	listenForDownloads();
	// listenForHotkeys();
	listenForNewTabButton();

}

function listenForURIChanges(){
	logger.log("URI Change");
	recentWindow = getMostRecentBrowserWindow();
	tabBrowser = getTabBrowser(recentWindow);
	tabBrowser.addTabsProgressListener({onLocationChange: actionTriggerMap.onURIChange});
	
}

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

function listenForHotkeys(){
	var newTab = hotkeys.Hotkey({
    combo: "accel-t",
    onPress: function() {
    	logger.log("New Tab hotkey pressed");
    	tabs.open("about:newtab");
 	}
	});
}

function listenForNewTabButton(){
	logger.log("listeningForNewTabButton");
	recentWindow = getMostRecentBrowserWindow();
	
	//TODO: could be rewritten by new sdk (unstable)
	//getMostRecentWindow.document.getElementById("main-window")
	//isBrowser
	//etc
	var newTabButtonTracker = new WindowTracker({
		onTrack: function (window){
			if (!isBrowser(window)) return;		
			window.document.getElementById("new-tab-button").addEventListener("click", actionTriggerMap.onNewTabClicked);

		}

	});


}


function onUnload(reason){
	if (downloadList) downloadList.removeView();
}

exports.init = init;
exports.onUnload = onUnload;