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
]

function assignRandomArm(){
	//TODO randomly assign an arm
	return arms[1];  
}

exports.assignRandomArm = assignRandomArm;