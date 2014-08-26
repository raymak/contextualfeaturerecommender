/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


var arms = [
	{basis: "contextual", explanation: "unexplained", ui: "doorhanger-active"}, //0
	{basis: "contextual", explanation: "unexplained", ui: "doorhanger-passive"},//1
	{basis: "contextual", explanation: "explained", ui: "doorhanger-active"},   //2
	{basis: "contextual", explanation: "explained", ui: "doorhanger-passive"},  //3
	{basis: "contextual", explanation: "explained", ui: "none"}                 //4
];

function assignRandomArm(weightsArr) {
	return arms[require("./utils").weightedRandomInt(weightsArr)];  
}

exports.arms = arms;
exports.assignRandomArm = assignRandomArm;