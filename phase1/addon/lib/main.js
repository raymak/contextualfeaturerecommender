/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

var triggers = require("./triggers");
var logger = require("./logger");
var button = require("./ui/button");
var info = require("./generalInfo");
var featuredata = require("./featuredata");
var {WindowTracker} = require("sdk/deprecated/window-utils");
var {isBrowser} = require("sdk/window/utils");
var config = require("./config");

var { ToggleButton } = require("sdk/ui/button/toggle");

var button = ToggleButton({
    id: "my-button",
    label: "my button",
    icon: {
      "16": "./icons/lightbulb_bw.png",
    },
    onChange: function(state) {
      console.log(state.label + " checked state: " + state.checked);
    }
  });

function firstRun(){
	logger.log("Running for the first time...");
	info.registerFirstTimePrefs();
	info.sendInstallInfo();
}

//start listening when button is clicked
var main = exports.main = function (options, callbacks){
	
	// startButton.icon = {"16": "./ui/icons/lightbulb_gr.png"};

	//check if this is the first time 
	if (info.isThisFirstTime())
		firstRun();

	//start triggers
	triggers.init();
}


// require("./ui").show();