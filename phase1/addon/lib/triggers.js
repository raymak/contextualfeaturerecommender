
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
var newTabHotKey = false;


//maps events triggered by user to actions
actionTriggerMap = {
	onURIChange: actions.mapActiveURLToAction,
	onDownloadAdded: actions.recommendDLManager,
	onNewTabClicked: actions.recommendNewTabShortcut 
}

// initiate listeners
function init(){
	listenForURIChanges();
	listenForDownloads();
	listenForHotkeys();
	listenForNewTabButton();

}

function listenForURIChanges(){
	logger.log("URI Change");
	recentWindow = getMostRecentBrowserWindow();
	tabBrowser = getTabBrowser(recentWindow);
	tabBrowser.addTabsProgressListener({onLocationChange: actionTriggerMap.onURIChange});
	
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
//FLAWED: replaces the original functionlity of the hotkey 
function listenForHotkeys(){
 	var keyTracker = new WindowTracker({
		onTrack: function (window){
			if (!isBrowser(window)) return;		
			window.addEventListener("keydown", function(e) {if (e.keyCode == 'T'.charCodeAt(0) && e.metaKey == true) newTabHotKey = true;});


		}
	});
}

//listen for when new tab button is clicked
function listenForNewTabButton(){
	logger.log("listeningForNewTabButton");
	recentWindow = getMostRecentBrowserWindow();
	
	//NOTE: could be rewritten by new sdk (unstable)
	//getMostRecentWindow.document.getElementById("main-window")
	//isBrowser
	//etc
	// var newTabButtonTracker = new WindowTracker({
	// 	onTrack: function (window){
	// 		if (!isBrowser(window)) return;		
	// 		window.document.getElementById("new-tab-button").addEventListener("command", actionTriggerMap.onNewTabClicked);
	// 		// window.document.getElementById("tabbrowser-tabs").addEventListener("click", actionTriggerMap.onNewTabClicked);

	// 	}

	// });

	tabs.on("open", function (tab) { 
		console.log("yo");
		if (!newTabHotKey) 
			actionTriggerMap.onNewTabClicked();
		newTabHotKey = false;
	});


}


function onUnload(reason){
	if (downloadList) downloadList.removeView();
}

exports.init = init;
exports.onUnload = onUnload;