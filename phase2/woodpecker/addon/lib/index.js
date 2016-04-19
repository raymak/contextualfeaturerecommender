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

  console.log("Hello World! Woodpecker is alive :)");

  const frLog = !!prefs["experiment.fr_usage_logging.enabled"];

  let installRunPromise = resolve()
  .then(()=> {
    if (options.loadReason === "install")
      return installRun();
  });

  installRunPromise
  .then(()=> require("./self").init())
  .then(()=> require("./experiment").init())
  .then(()=> require("./route").init())
  .then(()=> require("./timer").init())
  .then(()=> require("./logger").init())
  .then(()=> require("./sender").init())
  .then(()=> require("./debug").init())
  .then(()=> require("./stats").init())
  .then(()=> require("./moment-report").init())
  .then(()=> require("./event").init())
  .then(()=> {
    if (frLog)
      return require("./fr/feature-report").init();
  })
  .then(isFirstRun)
  .then((first)=> {
    if (first)
      return firstRun();
  })
  .then(()=> require("./experiment").checkStage())
  .then(()=> {
    require('./logger').logLoad(options.loadReason);
    require('./stats').event("load", {collectInstance: true}, {reason: require('sdk/self').loadReason});
    return require('./controller').init();
  })
  .then(()=> require('./presentation/doorhanger').init())
  .then(()=> require('./extra-listeners').init())
  .then(()=> require('./controller').init())
  .then(()=> {
    if (frLog)
      return require("./fr/controller").init();
  })
  .catch((e)=>{ 
    require('./logger').logError({
                                 type: "init",
                                 name: e.name,
                                 message: e.message,
                                 fileName: e.fileName,
                                 lineNumber: e.lineNumber,
                                 stack: e.stack
                               });
    require('chrome').Cu.reportError(e);
  });
}

function firstRun(){
  console.log("preparing first run");

  return resolve()
  .then(()=> require('./logger').logFirstRun())
  .then(()=> require('./self').setInitialized())
  .then(()=> require('./experiment').firstRun())
  .then(()=> {
    if (prefs["experiment.fr_usage_logging.enabled"]){
      return resolve()
      .then(()=> require("./fr/controller").loadRecFile(recommFileAddress))
      .then(()=> require("./fr/controller").scaleRoutes(require("./fr/route").coefficient(), "trigBehavior"));
    }
  });
}

function installRun(){
  console.time("install run")

  let clean = false;

  clean = !!prefs["clean_install"];

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