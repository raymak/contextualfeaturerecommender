
var {getMostRecentBrowserWindow } = require("sdk/window/utils");
var {getTabBrowser} = require("sdk/tabs/utils");
var hotkeys = require("sdk/hotkeys");
var tabs = require("sdk/tabs");
var actions = require("./actions");
var logger = require("./logger");
const {Cu} = require("chrome");
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");

var downloadList; 

actionTriggerMap = {onURIChange: actions.mapActiveURLToAction, onDownloadAdded: actions.recommendDLManager}

function init(){
	listenForURIChanges();
	listenForDownloads();
	listenForHotkeys();

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


function onUnload(reason){
	if (downloadList) downloadList.removeView();
}

exports.init = init;
exports.onUnload = onUnload;