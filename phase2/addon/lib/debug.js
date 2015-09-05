"use strict";

const {PageMod} = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const sp = require("sdk/simple-prefs");
const unload = require("sdk/system/unload").when;

const utils = require("./utils");

const HTML_URL = data.url("./debug.html");
const JS_URL = data.url("./debug.js");
const DEBUG_URL = "about:fr-d";

let workers = [];
let records = {};
let cmdHandlers = [];

function init(){
  if (!isEnabled()) return;

  console.log("initializing debug")
  tabs.on('ready', function(tab){
  	if (tab.url === DEBUG_URL) tab.url = HTML_URL;
  });
  loadPrefs();
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
      initWorker(worker);
    }
  });

  utils.handleCmd(handleCmd);

}

function isEnabled(){
  return sp.prefs["debug.enabled"];
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

function update(worker, recs, options){
	worker.port.emit("update", recs, options);
}

function updateAll(recs){
  updateRecords(recs);

  workers.forEach(function(worker){
    update(worker, records, {keys: Object.keys(recs)});
  });
}

function updateRecords(recs){
  for (let key in recs){
    if (!records[key])
      records[key] = {};

    records[key].data = recs[key].data;
    records[key].type = recs[key].type || records[key].type  ||  typeof recs[key].data || 'string';
    records[key].list = recs[key].list || records[key].list || 'default'; //problem: cannot modify the section of an existing item
  }
}

function initWorker(worker){
  update(worker, records);
}

function loadPrefs(){
  let recs = {};
  Object.keys(sp.prefs).sort().forEach(function(pref){
    recs[pref] = {};
    recs[pref].data = sp.prefs[pref];
    if (utils.tryParseJSON(sp.prefs[pref]))
      recs[pref].type = 'json';
    else
      recs[pref].type = (typeof recs[pref].data);

    recs[pref].list = 'prefs';
  });

  updateRecords(recs);
};

function registerPrefListeners(){
  let f = function(pref){
      let recs = {};
      recs[pref] = {};
      //does not update the type
      recs[pref].type = null;
      recs[pref].data = sp.prefs[pref];
      recs[pref].list = 'prefs';

      updateAll(recs);
  };
  Object.keys(sp.prefs).sort().forEach(function(pref){
    sp.on(pref, f);
    unload(function(){sp.removeListener(pref, f)});
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
      out = h(cmd);
      if (out !== undefined){
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
    worker.port.emit("cmdOut", "unrecognized: " + cmd);
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
exports.isEnabled = isEnabled;
exports.dumpUpdateObject = dumpUpdateObject;