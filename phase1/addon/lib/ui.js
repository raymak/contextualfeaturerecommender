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



var button = getButton(buttonClick);
var panel = getPanel(button);
var lastReactionCallback;
var lastId;
var showCount;
var reactionCount;

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
	width: 352,
	height: 193,
	focus: false,
	contentURL: data.url("./ui/doorhanger.html"),
	contentScriptFile: data.url("./ui/doorhanger.js"),
	onShow: onPanelShow,
	onHide: onPanelHide
	});
}


function showNotification(options){
	logger.log("starting to show notification");

	var panelOptions = {message: options.message, header: options.header, buttonLabel: options.buttonLabel};
	
	panel.port.emit("options", panelOptions);

	panel.port.removeListener("buttonClicked", lastReactionCallback);

	switch (options.reactionType){
		case "openlinkinnewtab":
			panel.port.on("buttonClicked", reaction);
		break;
	}

	lastReactionCallback = options.reactionCallback;
	lastId = options.id;

	showCount = 0;
	reactionCount = 0;

	if (!options.hidePanel){
		panel.show({
			position: button
		});
	}
}

function reaction(){
	
	if (config.HIDE_PANEL_AFTER_REACTION == "true")
		panel.hide();

	reactionCount++;

	sendReactionEvent();
	lastReactionCallback();
}

function buttonClick(state){
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
	showCount ++;
}

function onPanelHide(event){
	buttonOff();
}

//events

function sendReactionEvent(){
	var OUTtype = config.TYPE_REACTION;
	var OUTval = {id: lastId, showcount: showCount, reactioncount: reactionCount};
	var OUTid = lastId;

	require("./utils.js").sendEvent(OUTtype, OUTval, OUTid);

}

function show(){
	panel.show({
		position: button
	});
}



exports.show = show;
exports.showNotification = showNotification;
