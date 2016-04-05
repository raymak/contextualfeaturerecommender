/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {PageMod} = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {PersistentObject} = require("../storage");

const HTML_URL = data.url("./presentation/splitpage.html");
const JS_URL = data.url("./presentation/splitpage.js");
const PAGE_URL = "about:fr-sp";

const spDataAddress = "presentation.splitpage.data";

let spData;

function init(){

	return PersistentObject("simplePref", {address: spDataAddress})
	.then((obj)=> {
		spData = obj;
	}).then(_init);
}

function _init(){

	console.log("initializing splitpage");

	console.time("splitpage init");

	tabs.on('ready', function(tab){
		// if (tab.url === HTML_URL) loadPage(tab);
		if (tab.url === PAGE_URL) tab.url = HTML_URL;
	});


	PageMod({
	  include: HTML_URL,
	  contentScriptFile: JS_URL,
	  contentScriptWhen: 'ready',
	  onAttach: function(worker){
	  	worker.port.on("fetchEntries", function(){
	  		postEntries(worker);
	  	});
	  	postEntries(worker);
	  }
	});

	if (!spData.recList)
		spData.recList = [];
	
	console.timeEnd("splitpage init");
}

function postEntries(worker){
	spData.recList.forEach(function(aRecommendation){
		worker.port.emit("postEntry", require("../recommendation").extractPresentationData.call(aRecommendation, "splitpage"));
	});
}

function present(aRecommendation){
	//TODO: just store a pointer to recommendation
	spData.recList = spData.recList.concat([aRecommendation]);
}


exports.init = init;
exports.present = present;