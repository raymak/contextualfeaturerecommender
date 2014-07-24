/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

/*
var frame = mytoolbar.getFrame();
	
frame.postMessage("", frame.url);
frame.postMessage(tabs.activeTab.url, "*");

notifications.notify({ title: "TITLE",  text: "TEXT",  data: "DATA",  onClick: function (data) {console.log(data);}});

mypanel.show();

for each (var tab in tabs)  //finding the tab hosting a specific browser //TODO: put in a module


//initialize a toolbar
var mytoolbar = require("./toolbar");
mytoolbar.init();

//initialize a widget
var mywidget = require("./widget");
mywidget.init();

// gBrowser.contentDocument.body.innerHTML = "Hello";

//console.log(gWindow.document.getElementById("main-window"));
window.document.getElementById("file-menu").addEventListener("click", function (){console.log("file menu clicked");});
			window.document.getElementById("new-tab-button").addEventListener("click", function (){logger.log("new tab button clicked");}, false);			
			window.document.getElementById("nav-bar").addEventListener("click", function (){logger.log("nav bar clicked");}, false);
			window.document.getElementById("urlbar-container").addEventListener("click", function (){logger.log("url bar clicked");}, false);
			window.document.getElementById("identity-box").addEventListener("click", function (){logger.log("identity box clicked");}, false);
			window.document.getElementById("forward-button").addEventListener("click", function (){logger.log("forward button clicked");}, false);
			window.document.getElementsByClassName("tabbrowser-tab")[0].addEventListener("click", function (){console.log("first tab clicked");});
			window.document.getElementById("TabsToolbar").addEventListener("click", function (){logger.log("Tabs Toolbar clicked");}, false);
			console.log(window.document.getElementsByClassName("tabbrowser-tab").length);
			for (var i=0; i < window.document.getElementById("TabsToolbar").childNodes.length; i++)
				window.document.getElementById("TabsToolbar").childNodes[i].addEventListener("click", function (evt){logger.log("general" + evt.target.id)});


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

	// open in a private window
	 		/*	windows.browserWindows.open({
	 				url: tabs.activeTab.url,
	 				isPrivate: true
	 			});
	 			tabs.activeTab.close(); */


	 				// setTimeout(function (){
 //  		var panel = require("./ui/panel").getPanel();
 // 		panel.port.emit("updateinnerhtml", "Wanna try downloading " + addonData[options.addonID].name + " ?" + "<br>" + "<a href=\'" + addonData[options.addonID].link + "\'> Click here! </a>");
 // 		panel.port.on("openlinkinnewtab", function(link){
 // 			tabs.activeTab.url = link; //url reverts back again if it's an extension
 // 		});
 // 		panel.show();
 //  			}, 500);

				

*/