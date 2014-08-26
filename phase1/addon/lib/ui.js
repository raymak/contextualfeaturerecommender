/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


/*jshint forin:true, noarg:false, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:false, browser:true,
  unused:true,
  indent:2, maxerr:50, devel:true, node:true, boss:true, white:true,
  globalstrict:true, nomen:false, newcap:true, moz: true */

/*global */

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

var button;
var panel;

function init(){
	let arm = info.getArm();
	console.log(arm);

    if (! arm) return;  // no arm defined yet, such as initial state.

	if (button) {
		button.destroy();
	}

    if (arm.ui == 'none') return;  // control arm

    button = getButton(buttonClick);
	panel = getPanel(button);

	updateButtonIconState();

	require("./buttonMove").init();
}

function getButton(clickHandler){
	return ActionButton({
		id: "panel-button",
		label: "Recommend Feature",
		icon: {
			"16": "./ui/icons/lightbulb_bw.png"
		},
		onClick: clickHandler
		// onChange: buttonChange
	});
}


function getPanel(button){
	return Panel({
	width: config.PANEL_SIZE_UNEXPLAINED.width,
	height: config.PANEL_SIZE_UNEXPLAINED.height,
	focus: false,
	contentURL: data.url("./ui/doorhanger.html"),
	contentScriptFile: data.url("./ui/doorhanger.js"),
	onShow: onPanelShow,
	onHide: onPanelHide
	});
}

function getLastRecommendationOptions(){
	let r = prefs["lastRecommendation"];
	if (!r || r === "") return null;
	return JSON.parse(r);
}

function setLastRecommendationOptions(options){
	prefs["lastRecommendation"] = JSON.stringify(options);
}


function showNotification(options){
	logger.log("starting to show notification");

	if (options.ignore) return;

	var panelSize;

	switch (info.getArm().explanation){
		case "explained":
			panelSize = config.PANEL_SIZE_EXPLAINED;
		break;
		case "unexplained":
			panelSize = config.PANEL_SIZE_UNEXPLAINED;
		break;
	}

	var lastRecommendationOptions = require("./utils").override({showCount: 0, reactionCount: 0,
	 panelSize: panelSize, arm: info.getArm(),
	 explanationHeader: config.PANEL_EXPLANATIONHEADER}, options);

	setLastRecommendationOptions(lastRecommendationOptions);


	switch (info.getArm().ui){
		case "doorhanger-passive":
			options.hidePanel = true;
			buttonOn();
			break;
		case "none":
			return;
			break;
	}

	if (options.buttonOff) buttonOff();

	populatePanel(lastRecommendationOptions);

	if (!options.hidePanel){
		require("sdk/timers").setTimeout(function (){
			panel.show({
				position: button
			});
		}, 0);
	}
}

function populatePanel(options){

	var panelSize;

	switch (options.arm.explanation){
		case "explained":
			panelSize = config.PANEL_SIZE_EXPLAINED;
		break;
		case "unexplained":
			panelSize = config.PANEL_SIZE_UNEXPLAINED;
		break;
	}

	panel.resize(panelSize.width, panelSize.height);


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
	setButtonIconState(true);
}

function buttonOff(){
	button.icon = "./ui/icons/lightbulb_bw.png";
	setButtonIconState(false);
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

	var timeLengthMs = (Date.now() - showStartTimeMs).toString();

	sendHideEvent(getLastRecommendationOptions(), timeLengthMs);
}

function updateButtonIconState(){
	var isOn = !!prefs["ui.isButtonOn"];

	if (isOn){
		buttonOn();
	}
}

function setButtonIconState(isOn){
	prefs["ui.isButtonOn"] = isOn;
}

//events

function sendShowEvent(options){
	var OUTtype = config.TYPE_PANEL_SHOW;
	var OUTval = {id: options.id, showcount: options.showCount, reactioncount: options.reactionCount, reactionType: options.reactionType};
	var OUTid = options.id;

	require("./utils.js").sendEvent(OUTtype, OUTval, OUTid);

}

function sendHideEvent(options, timeLengthMs){

	var OUTtype = config.TYPE_PANEL_HIDE;
	var OUTval = {id: options.id, timelengthms: timeLengthMs, showcount: options.showCount, reactioncount: options.reactionCount, reactionType: options.reactionType};
	var OUTid = options.id;

	require("./utils.js").sendEvent(OUTtype, OUTval, OUTid);
}

function sendReactionEvent(options){

	var OUTtype = config.TYPE_REACTION;
	var OUTval = {id: options.id, showcount: options.showCount, reactioncount: options.reactionCount, reactionType: options.reactionType};
	var OUTid = options.id;

	require("./utils.js").sendEvent(OUTtype, OUTval, OUTid);

}

// tangled with prefs, gross.
function remakeUI () {
	// reset last recommendation, hackish and gross!
	// also, relies on config by side effect
	init();
	let r = getLastRecommendationOptions();
	if (r) {
		let arm = r.arm = info.getArm();
		let panelSize;
		switch ( arm.explanation ) {
			case "explained":
				panelSize = config.PANEL_SIZE_EXPLAINED;
			break;
			case "unexplained":
				panelSize = config.PANEL_SIZE_UNEXPLAINED;
		 	break;
		}
		r.panelSize = panelSize;
		setLastRecommendationOptions(r);
	}
}

exports.updateButtonIconState = updateButtonIconState;
exports.showNotification = showNotification;
exports.getLastRecommendationOptions = getLastRecommendationOptions;
exports.init = init;

exports.remakeUI = remakeUI;
