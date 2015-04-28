"use strict";

const {PageMod} = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {PersistentObject} = require("utils");
const {extractPresentationData} = require("recommendation");

const HTML_URL = data.url("./presentation/splitpage.html");
const JS_URL = data.url("./presentation/splitpage.js");
const PAGE_URL = "about:fr-sp";

const spDataAddress = "presentation.spData";

const spData = PersistentObject("simplePref", {address: spDataAddress});


function init(){
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
}

function postEntries(worker){
	spData.recList.forEach(function(aRecommendation){
		worker.port.emit("postEntry", extractPresentationData.call(aRecommendation, "splitpage"));
	});
}

function present(aRecommendation){
	//TODO: just store a pointer to recommendation
	spData.recList = spData.recList.concat([aRecommendation]);
}


exports.init = init;
exports.present = present;