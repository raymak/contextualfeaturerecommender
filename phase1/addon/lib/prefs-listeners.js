/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*jshint forin:true, noarg:false, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:false, browser:true,
  unused:true,
  indent:2, maxerr:50, devel:true, node:true, boss:true, white:true,
  globalstrict:true, nomen:false, newcap:true, moz: true */

/*global */

"use strict";

let sp = require("sdk/simple-prefs");

// helpers
const tabs = require("sdk/tabs");
const base64 = require("sdk/base64");

const arms = require("./arms");
const generalInfo = require("./generalInfo");
const ui = require("./ui");

// changes the arm, from the int.
sp.on("config.armnumber", function (pref) {
	console.log("switching arm", sp.prefs[pref]);
	let which = Number(sp.prefs[pref],10);
	let arm = arms.arms[which];
	sp.prefs['config.arm'] = JSON.stringify(arm);
	ui.remakeUI();
});


sp.on("action-resetaddon", function (pref) {
	console.log("resetting addon");
  generalInfo.registerFirstTimePrefs();
  generalInfo.setDefaultNotification();
});


let deparseCollectedData = function (data) {
	[	"lastRecommendation",
		"config.arm",
		"featureData.dataObject"].forEach(function (k) {
		console.log("key",k);
		data[k] = JSON.parse(data[k]);
	});
	return data;
};

sp.on("action-showdata", function (pref) {
	let d = deparseCollectedData(JSON.parse(JSON.stringify(sp.prefs)));
	let encodedData = base64.encode(JSON.stringify(d, null, 2));
	tabs.open("data:text/plain;charset=utf-8;base64,"+encodedData);
});
