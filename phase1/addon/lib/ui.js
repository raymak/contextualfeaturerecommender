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
var {override} = require("./utils");
var info = require("./generalInfo");

var showStartTimeMs;

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

function getLastRecommendationOptions(){
	return JSON.parse(prefs["lastRecommendation"]);
}

function setLastRecommendationOptions(options){
	prefs["lastRecommendation"] = JSON.stringify(options);
}


function showNotification(options){
	logger.log("starting to show notification");


	var lastRecommendationOptions = require("./utils").override({showCount: 0, reactionCount: 0}, options);

	setLastRecommendationOptions(lastRecommendationOptions);

	populatePanel(lastRecommendationOptions);

	switch (info.getArm().ui){
		case "doorhanger-passive":
			options.hidePanel = true;
			buttonOn();
			break;
		case "none":
			options.hidePanel = true;
			break;
	}

	if (!options.hidePanel){
		panel.show({
			position: button
		});
	}
}

function populatePanel(options){
	
	var panelOptions = options;

	panel.port.removeListener("buttonClicked", reaction);

	panel.port.on("buttonClicked", reaction);
	
	panel.port.emit("options", panelOptions);
	

}

function reaction(){

	logger.log("panel button clicked");

	var options = getLastRecommendationOptions();

	if (config.HIDE_PANEL_AFTER_REACTION)
		panel.hide();

	options.reactionCount ++;

	sendReactionEvent(options);

	var reactionOptions = options.reactionOptions;


	switch (options.reactionType){
		case "openlinkinnewtab":
			tabs.open(reactionOptions.url);
		break;
		case "openlinkinactivetab":
			tabs.activeTab.url = reactionOptions.url;
			break;
	}

	setLastRecommendationOptions(options);
}

function buttonClick(state){

	populatePanel(getLastRecommendationOptions());

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

	var options = getLastRecommendationOptions();
	options.showCount ++;
	setLastRecommendationOptions(options);

	showStartTimeMs = Date.now();

	sendShowEvent(getLastRecommendationOptions());
}

function onPanelHide(event){
	buttonOff();

	var timeIntervalMs = (Date.now() - showStartTimeMs).toString();

	sendHideEvent(getLastRecommendationOptions(), timeIntervalMs);
}

//events

function sendShowEvent(options){
	var OUTtype = config.TYPE_PANEL_SHOW;
	var OUTval = {id: options.id, showcount: options.showCount, reactioncount: options.reactionCount, reactionType: options.reactionType};
	var OUTid = options.id;

	require("./utils.js").sendEvent(OUTtype, OUTval, OUTid);

}

function sendHideEvent(options, intervalMs){
	
	var OUTtype = config.TYPE_PANEL_HIDE;
	var OUTval = {id: options.id, timeintervalms: intervalMs, showcount: options.showCount, reactioncount: options.reactionCount, reactionType: options.reactionType};
	var OUTid = options.id;

	require("./utils.js").sendEvent(OUTtype, OUTval, OUTid);
}

function sendReactionEvent(options){

	var OUTtype = config.TYPE_REACTION;
	var OUTval = {id: options.id, showcount: options.showCount, reactioncount: options.reactionCount, reactionType: options.reactionType};
	var OUTid = options.id;

	require("./utils.js").sendEvent(OUTtype, OUTval, OUTid);

}


exports.showNotification = showNotification;
