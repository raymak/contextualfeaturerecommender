/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

buttons = require("sdk/ui/button/action");

var logger = require("./../logger");

function getButton(clickHandler){
	return buttons.ActionButton({
		id: "init-button",
		label: "Press Me!",
		icon: {
			"16": "./ui/icons/lightbulb_bw.png",
		},
		onClick: clickHandler
	});
}

exports.getButton = getButton;


