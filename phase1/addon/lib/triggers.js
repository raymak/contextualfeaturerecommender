
var {getMostRecentBrowserWindow } = require("sdk/window/utils");
var {getTabBrowser} = require("sdk/tabs/utils");
var actions = require("./actions");
var logger = require("./logger");

actionTriggerMap = {onURIChange: actions.showOnToolbar}

function init(){
	listenForURIChange();

}

function listenForURIChange(){
	recentWindow = getMostRecentBrowserWindow();
	tabBrowser = getTabBrowser(recentWindow);
	tabBrowser.addTabsProgressListener({onLocationChange: actionTriggerMap.onURIChange});
	
}

exports.init = init;