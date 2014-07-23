/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


var {ToggleButton} = require("sdk/ui/button/toggle");
var {ActionButton} = require("sdk/ui/button/action");
var {Panel} = require("sdk/panel")
var logger = require("./logger");
var data = require("sdk/self").data;
var config = require("./config");
var {sendEvent} = require("./utils");
var prefs = require("sdk/simple-prefs").prefs
var tabs = require("sdk/tabs");



var button = getButton(buttonClick);
var panel = getPanel(button);

function getButton(clickHandler){
	return ActionButton({
		id: "init-button",
		label: "Press Me!",
		icon: {
			"16": "./ui/icons/lightbulb_bw.png"
		},
		onClick: buttonClick
		// onChange: buttonChange
	});
}


function getPanel(button){
	return Panel({
	width: 342,
	height: 183,
	focus: false,
	contentURL: data.url("./ui/doorhanger.html"),
	contentScriptFile: data.url("./ui/doorhanger.js"),
	onShow: onPanelShow,
	onHide: onPanelHide
	});
}


function showNotification(options){
	logger.log("starting to show notification");


	//store all parameters to prefs
	prefs["notification.showCount"] = 0;
	prefs["notification.reactionCount"] = 0;
	prefs["notification.lastId"] = options.id;
	prefs["notification.panel.message"] = options.message;
	prefs["notification.panel.header"] = options.header;
	prefs["notification.panel.buttonLabel"] = options.buttonLabel;
	prefs["notification.panel.reactionType"] = options.reactionType;
	prefs["notification.panel.reactionOptions"] = JSON.stringify(options.reactionOptions || {});
	

	populatePanel();

	if (!options.hidePanel){
		panel.show({
			position: button
		});
	}
}

function populatePanel(){
	var panelOptions = {
		message: prefs["notification.panel.message"],
		header: prefs["notification.panel.header"],
		buttonLabel: prefs["notification.panel.buttonLabel"],
		reactionType: prefs["notification.panel.reactionType"]
	};

	panel.port.removeListener("buttonClicked", reaction);

	panel.port.on("buttonClicked", reaction);
	
	panel.port.emit("options", panelOptions);
	

}

function reaction(){

	logger.log("panel button clicked");

	if (config.HIDE_PANEL_AFTER_REACTION == "true")
		panel.hide();

	prefs["notification.reactionCount"] += 1;

	sendReactionEvent();

	var reactionOptions = JSON.parse(prefs["notification.panel.reactionOptions"]);

	switch (prefs["notification.panel.reactionType"]){
		case "openlinkinnewtab":
			tabs.open(reactionOptions.url);
		break;
		case "openlinkinactivetab":
			tabs.activeTab.url = reactionOptions.url;
		break;
	}
}

function buttonClick(state){

	populatePanel();

	panel.show({
		position: button
	}
		);
}
function buttonChange(state){

}

function buttonOn(){
	button.icon = "./ui/icons/lightbulb_gr.png";
}

function buttonOff(){
	button.icon = "./ui/icons/lightbulb_bw.png";
}

function onPanelShow(event){
	buttonOn();
	prefs["notification.showCount"] += 1;
}

function onPanelHide(event){
	buttonOff();
}

//events

function sendReactionEvent(){

	var OUTtype = config.TYPE_REACTION;
	var OUTval = {id: prefs["notification.lastId"], showcount: prefs["notification.showCount"], reactioncount: prefs["notification.reactionCount"], reactionType: prefs["notification.panel.reactionType"]};
	var OUTid = prefs["notification.lastId"];

	require("./utils.js").sendEvent(OUTtype, OUTval, OUTid);

}


exports.showNotification = showNotification;
