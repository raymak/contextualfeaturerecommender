"use strict";

const {PageMod} = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const sp = require("sdk/simple-prefs");

const {tryParseJSON} = require("./utils");

const HTML_URL = data.url("./debug.html");
const JS_URL = data.url("./debug.js");
const DEBUG_URL = "about:fr-d";

function init(){
  tabs.on('ready', function(tab){
  	if (tab.url === DEBUG_URL) tab.url = HTML_URL;
  });

  PageMod({
    include: HTML_URL,
    contentScriptFile: [JS_URL, data.url('./js/jquery.min.js'), data.url('./js/jquery.jsonview.js')],
    contentStyleFile: data.url('./css/jquery.jsonview.css'),
    contentScriptWhen: 'ready',
    onAttach: function(worker){
      worker.port.emit("create");
      printPrefs(worker);
      registerPrefListeners(worker);
      worker.port.on("view-prefs", function(){
        tabs.open("http://www.bodurov.com/JsonFormatter/view.aspx?json=" + JSON.stringify(sp.prefs));
      });
    }
  });
}


function update(worker, type, data){
	worker.port.emit("update", type, data);
}

function printPrefs(worker){
  let data = {};
  let types = {};
  Object.keys(sp.prefs).sort().forEach(function(pref){
    data[pref] = sp.prefs[pref];
    if (tryParseJSON(sp.prefs[pref]))
      types[pref] = 'json';
    else
      types[pref] = (typeof data[pref]);{}
  });
  update(worker, types, data);
};

function registerPrefListeners(worker){
  Object.keys(sp.prefs).sort().forEach(function(pref){
    sp.on(pref, function(pref){
      let types = {}, data = {};
      //does not update the type
      types[pref] = null;
      data[pref] = sp.prefs[pref];
      update(worker, types, data);
    });
  });
}

exports.init = init;