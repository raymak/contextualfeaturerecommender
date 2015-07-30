"use strict";

const {PageMod} = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const sp = require("sdk/simple-prefs");

const {tryParseJSON} = require("./utils");

const HTML_URL = data.url("./debug.html");
const JS_URL = data.url("./debug.js");
const DEBUG_URL = "about:fr-d";
let workers = [];

function init(){
  console.log("initializing debug")
  tabs.on('ready', function(tab){
  	if (tab.url === DEBUG_URL) tab.url = HTML_URL;
  });
  registerPrefListeners();
  

  PageMod({
    include: HTML_URL,
    contentScriptFile: [JS_URL, data.url('./js/jquery.min.js'), data.url('./js/jquery.jsonview.js')],
    contentStyleFile: data.url('./css/jquery.jsonview.css'),
    contentScriptWhen: 'ready',
    onAttach: function(worker){
       workers.push(worker);
      worker.on('detach', function(){
        detachWorker(worker, workers);
      });
      worker.port.on("log", function(m){console.log(m);});
      worker.port.emit("create");
      printPrefs(worker);
    }
  });
}


function update(worker, type, lists, data){
	worker.port.emit("update", type, lists, data);
}

function printPrefs(worker){
  let recs = {};
  Object.keys(sp.prefs).sort().forEach(function(pref){
    recs[pref] = {};
    recs[pref].data = sp.prefs[pref];
    if (tryParseJSON(sp.prefs[pref]))
      recs[pref].type = 'json';
    else
      recs[pref].type = (typeof data[pref]);

    recs[pref].list = 'prefs';
  });
  update(worker, recs);
};

function registerPrefListeners(){
  Object.keys(sp.prefs).sort().forEach(function(pref){
    sp.on(pref, function(pref){
      let recs = {};
      recs[pref] = {};
      //does not update the type
      recs[pref].type = null;
      recs[pref].data = sp.prefs[pref];
      recs[pref].list = 'prefs';

      workers.forEach(function(worker){
        update(worker, recs);
      });
    });
  });
}

function detachWorker(worker, workerArray) {
  let index = workerArray.indexOf(worker);
  if(index != -1) {
    workerArray.splice(index, 1);
  }
}

exports.init = init;