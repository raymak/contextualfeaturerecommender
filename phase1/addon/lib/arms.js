/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var arms = [
	{basis: "contextual", explanation: "unexplained", ui: "doorhanger-active"},
	{basis: "contextual", explanation: "unexplained", ui: "doorhanger-passive"},
	{basis: "contextual", explanation: "explained", ui: "doorhanger-active"},
	{basis: "contextual", explanation: "explained", ui: "doorhanger-passive"},
]

function assignRandomArm(){
	//TODO randomly assign an arm
	return arms[0];  
}

exports.assignRandomArm = assignRandomArm;