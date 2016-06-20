/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const system = require("sdk/system");
const {prefs} = require("sdk/simple-prefs");
const {defer, resolve} = require("sdk/core/promise")

const recommFileAddress = prefs["recomm_list_address"];

exports.main = function(options, callbacks){

  console.log("Hello World! I am alive :)");

  console.time("full load");
  console.time("initial load");

  let installRunPromise = resolve()
  .then(()=> {
    if (options.loadReason === "install" || prefs["clean_startup"])
      return installRun();
  });

  installRunPromise
  .then(()=> console.time("initializations"))
  .then(()=> require("./self").init())
  .then(()=> require("./presentation/doorhanger").init())
  .then(()=> require("./experiment").init())
  .then(()=> require("./route").init())
  .then(()=> require("./timer").init())
  .then(()=> require("./logger").init())
  .then(()=> require("./sender").init())
  .then(()=> require("./debug").init())
  .then(()=> require("./stats").init())
  .then(()=> require("./feature-report").init())
  .then(()=> require("./event").init())
  .then(isFirstRun)
  .then((first)=> {
    console.timeEnd("initializations");
    if (first)
      return firstRun();
  })
  .then(()=> require("./experiment").checkStage())
  .then(()=> {
    require('./logger').logLoad(options.loadReason);
    require('./stats').event("load", {collectInstance: true}, {reason: require('sdk/self').loadReason});
    return require('./controller').init();
  })
  .then(()=> require('./extra-listeners').init())
  .then(()=> console.timeEnd("full load"))
  .then(()=> require('./logger').logPrefs())
  .catch((e)=>{ 
    require('./utils').logErr("init", e);
    require('chrome').Cu.reportError(e);
  });

  console.timeEnd("initial load");
}

function firstRun(){
  console.time("first run");

  console.log("preparing first run");

  return resolve()
  .then(()=> require('./logger').logFirstRun())
  .then(()=> require('./self').setInitialized())
  .then(()=> require('./experiment').firstRun())
  .then(()=> {
    console.time("recomm list load");
    return require("./controller").loadRecFile(recommFileAddress);
  })
  .then(()=> console.timeEnd("recomm list load"))
  .then(()=> {
    console.time("route scaling");
    require("./controller").scaleRoutes(require("./route").coefficient(), "trigBehavior");
  })
  .then(()=> console.timeEnd("route scaling"))
  .then(()=> console.timeEnd("first run"));
}

function installRun(){
  console.time("install run")

  let clean = false;

  clean = !!prefs["clean_install"] || !!prefs["clean_startup"];

  return resolve()
  .then(()=> {
    if (clean)
      return require('./utils').cleanUp({reset: true});
  })
  .then(isFirstRun)
  .then((first)=> {
    if (first){
      try{require('./utils').overridePrefs("../prefs.json");}
      catch(e){console.log("skipped overriding preferences");}
    }
  })
  .then(()=> console.timeEnd("install run"));
}

function isFirstRun(){
  return require('./storage').PersistentObject('osFile', 'self.data')
  .then(data => !data.isInitialized) 
}

exports.onUnload = function(reason){

  console.log("unloading due to " + reason);

  require('./stats').event("unload", {collectInstance: true}, {reason: reason});

  require('./sender').flush();

  if (reason == "uninstall" && prefs["cleanup_on_death"])
    require('./utils').cleanUp({reset: true});

  console.log("end of unload");
}