"use strict";

const {PageMod} = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");

const HTML_URL = data.url("./debug.html");
const JS_URL = data.url("./debug.js");
const DEBUG_URL = "about:fr-d";

function init(){
  tabs.on('ready', function(tab){
  	if (tab.url === DEBUG_URL) tab.url = HTML_URL;
  });

  PageMod({
    include: HTML_URL,
    contentScriptFile: JS_URL,
    contentScriptWhen: 'ready',
    onAttach: function(worker){
    	update(worker);
    }
  });
}


function update(worker){
	worker.port.emit("update", {message: "Hello!"});
}

exports.init = init;