/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {PageMod} = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const sp = require("sdk/simple-prefs");
const unload = require("sdk/system/unload").when;
const {Cu, Cc, Ci} = require("chrome");
const { Buffer, TextEncoder, TextDecoder } = require('sdk/io/buffer');
Cu.import("resource://gre/modules/osfile.jsm");

const HTML_URL = data.url("./debug.html");
const JS_URL = data.url("./debug.js");
const DEBUG_URL = "about:fr-d";

let workers = [];
let records = {};
let cmdHandlers = [];

let cmdQueue = {};

function init(){
  if (!isEnabled()) return;

  console.time("debug init");

  console.log("initializing debug")
  
  // TODO: proper way to register about: pages
  // https://dev.mozilla.jp/localmdc/localmdc_1781.html
  // https://developer.mozilla.org/en-US/docs/Custom_about:_URLs#Firefox_4_and_Later_-_BootstrapRestartless
  // http://kb.mozillazine.org/Dev_:_Extending_the_Chrome_Protocol
  // http://stackoverflow.com/questions/34789910/creating-a-chrome-page-for-my-firefox-add-on
  // https://developer.mozilla.org/en/docs/Chrome_Registration
  // http://stackoverflow.com/questions/23748077/firefox-extension-differences-of-the-chrome-and-resource-protocols
  // https://developer.mozilla.org/en-US/Add-ons/SDK/Guides/XUL_Migration_Guide
  tabs.on('ready', function(tab){
  	if (tab.url === DEBUG_URL) tab.url = HTML_URL;
  });
  

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
      loadPrefs();
      registerPrefListeners();
      initWorker(worker);
    }
  });

  handleCmd(parseCmd);

  console.timeEnd("debug init");

}

function isEnabled(){
  return sp.prefs["debug.enabled"];
}

//http://stackoverflow.com/a/20392392/4015333
const tryParseJSON  = function(jsonString){
  try {
      var o = JSON.parse(jsonString);

      // Handle non-exception-throwing cases:
      // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
      // but... JSON.parse(null) returns 'null', and typeof null === "object", 
      // so we must check for that, too.
      if (o && typeof o === "object" && o !== null) {
          return o;
      }
  }
  catch (e) { }

  return false;
};

function removeList(list){
  for (let k in records){
    if (records[k].list == list)
      delete records[k];
  }

  workers.forEach(function(worker){
    worker.port.emit("refresh");
  });
}

function dumpUpdateObject(obj, options){

  if (!isEnabled) return;

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

let loadPrefs = (function(){  // can be executed only once
  let executed = false;
  return function(){
    if (executed) return;

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

    updateRecords(recs);
    executed = true;
  }
})();

let registerPrefListeners = (function(){ // can be executed only once
  let executed = false;
  return function(){
    if (executed) return;

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
    executed = true;
  }
})();

function detachWorker(worker, workerArray) {
  let index = workerArray.indexOf(worker);
  if(index != -1) {
    workerArray.splice(index, 1);
  }
}

function recordToEntry(rec){

  let result;

  if (rec.type == 'json')
    result = JSON.parse(rec.data);
  else
    result = rec.data;

  return result;
}

function exportData(options){

  let recordsObj = {};

  let lists = options && options.lists;

  if (lists)
    lists = lists.map(function(v){
      return v.toUpperCase();
    });

  console.log(lists);

  for (let k in records){
    let rec = records[k];

    if (lists && !~lists.indexOf(rec.list.toUpperCase()))
      continue;

    if (!recordsObj[rec.list])
      recordsObj[rec.list] = {};

    recordsObj[rec.list][k] = recordToEntry(rec);
  }

  const nsIFilePicker = Ci.nsIFilePicker;

  let writeToFile = function(path, message, options){

  let onFulFill = function(aFile){
    let encoder = new TextEncoder();  // This encoder can be reused for several writes
    let array = encoder.encode(message); 
    aFile.write(array).then(function(){aFile.close();});
  }

  let filePromise = OS.File.open(path, options);
  return filePromise.then(onFulFill)
             .then(null, Cu.reportError);
}

  let fp = Cc["@mozilla.org/filepicker;1"]
             .createInstance(Ci.nsIFilePicker);

  fp.init(require("sdk/window/utils").getMostRecentBrowserWindow(), "Export to...", fp.modeSave);

  fp.defaultExtension = "json";
  fp.defaultString = "fr-debug-snapshot.json";
  fp.appendFilter("All", "*.*");

  fp.open({
    done: function(rt){
      if (rt == fp.returnCancel)
        return;
      
      let dataStr = JSON.stringify(recordsObj);

      writeToFile(fp.file.path, dataStr, {write: true, append: false, trunc: true});
    }
  });
}

// TOTHINK: ideally something like gcli is wanted
// https://github.com/joewalker/gcli/blob/master/docs/index.md
function processCommand(worker, cmd){
  let handled = false;
  let out;
  cmdHandlers.forEach(function(h){
    if (h){
      out = h(cmd, worker);
      if (out !== undefined){
        handled = true;
        worker.port.emit("cmdOut", out, cmd);
        sp.prefs["debug.command.used"] = true;
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
    worker.port.emit("cmdOut", "<span class='outunrecognized'>unrecognized</span>", cmd);
  }
}

function handleCmd(handler, worker){

  if (!isEnabled()) return;

  for (let h in cmdHandlers){
    if (handler === cmdHandlers[h])
      return;
  }

  cmdHandlers.push(handler);
}

function parseCmd(cmd, worker){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);

    let subArgs;
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){

      case "debug":

        let cmdObj = require("./utils").extractOpts(params);

        switch(cmdObj.header){
          case "export":
            if (!cmdObj.l)
              exportData();
            else
            {
              console.log(cmdObj.l);
              let lists;
              try{
                lists = JSON.parse(cmdObj.l);
              }
              catch(e){
                return "warning: incorrect use of the -l option";
              }

              if (lists.constructor !== Array)
                return "warning: incorrect use of the -l option";

              console.log(lists);
              exportData({lists: lists});
            }
            break;

        case "delay":
          if (!cmdObj.d || !cmdObj.c){
            return "warning: incorrect use of the delay command";
          }

          cmdQueue[cmdObj.c] = require('sdk/timers').setTimeout(function(){
            processCommand(worker, cmdObj.c);
            delete cmdQueue[cmdObj.c];
          }, cmdObj.d);

          return "command \"" + cmdObj.c + "\" will be executed in " + cmdObj.d + " ms.";
          break;

        case "cancel all":

          for (let k in cmdQueue){
            require('sdk/timers').clearTimeout(cmdQueue[k]);
            delete cmdQueue[k];
          }

          return "all queued commands cancelled";
          break;

          default:
            return "warning: incorrect use of the debug command";
        }
        break;

      default:
        return undefined;
    }

    return " ";
}



exports.init = init;
exports.handleCmd = handleCmd;
exports.update = updateAll;
exports.isEnabled = isEnabled;
exports.removeList = removeList;
exports.dumpUpdateObject = dumpUpdateObject;