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
let records = {};
let cmdHandlers = [];

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
      worker.port.on("cmd", function(cmd){processCommand(worker, cmd);});
      worker.port.emit("init");
      printPrefs(worker);
    }
  });
}

function dumpUpdateObject(obj, options){
  let recs = {};
  for (let k in obj){
    if (typeof obj[k] === "object"){
      recs[k] = {
        data: JSON.stringify(obj[k]),
        list: options && options.list,
        type: "json"
      };
    }
    else
    {
      recs[k] = {
        data: obj[k],
        list: options && options.list,
        type: typeof obj[k]
      };
    }
  }
  updateAll(recs);
}

function update(worker, recs){
	worker.port.emit("update", recs);
}

function updateAll(recs){
  workers.forEach(function(worker){
    update(worker, recs);
  });
}

function printPrefs(worker){
  let recs = {};
  Object.keys(sp.prefs).sort().forEach(function(pref){
    recs[pref] = {};
    recs[pref].data = sp.prefs[pref];
    if (tryParseJSON(sp.prefs[pref]))
      recs[pref].type = 'json';
    else
      recs[pref].type = (typeof recs[pref].data);

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

      updateAll(recs);
    });
  });
}

function detachWorker(worker, workerArray) {
  let index = workerArray.indexOf(worker);
  if(index != -1) {
    workerArray.splice(index, 1);
  }
}

function processCommand(worker, cmd){
  let handled = false;
  let out;
  cmdHandlers.forEach(function(h){
    if (h){
      if (out = h(cmd)){
        handled = true;
        worker.port.emit("cmdOut", out);
      }
    }
    else 
    {
      console.log("warning: null debug command handler");
    }
  });

  if (!handled){
    //TODO: flash message
    console.log("warning: unrecognized debug command");
  }
}

function handleCmd(handler){
  for (let h in cmdHandlers){
    if (handler === cmdHandlers[h])
      return;
  }

  cmdHandlers.push(handler);
}

exports.init = init;
exports.handleCmd = handleCmd;
exports.update = updateAll;
exports.dumpUpdateObject = dumpUpdateObject;