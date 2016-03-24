/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const system = require("sdk/system");
const {prefs} = require("sdk/simple-prefs");

const recommFileAddress = prefs["recomm_list_address"];

exports.main = function(options, callbacks){

  console.log("Hello World! Woodpecker is alive :)");

  const isFirstRun = !prefs["isInitialized"]
  const frLog = !!prefs["experiment.fr_usage_logging.enabled"];

  if (options.loadReason === "install")
    installRun();

  require("./self").init();
  require("./experiment").init();
  require("./timer").init();
  require("./logger").init();
  require("./sender").init();
  require("./debug").init();
  require("./stats").init();
  require("./moment-report").init();
  if (frLog)
    require("./fr/feature-report").init();

  if (isFirstRun)
    firstRun();

  require('./logger').logLoad(options.loadReason);

  require('./controller').init();

  if (frLog)
    require("./fr/controller").init();

  require('./stats').event("startup", {collectInstance: true}, {reason: require('sdk/self').loadReason});
}

function firstRun(){
  console.log("preparing first run");

  if (prefs["experiment.fr_usage_logging.enabled"])
    require("./fr/controller").loadRecFile(recommFileAddress);

  require('./logger').logFirstRun();
  require('./self').setInitialized();
  require('./experiment').firstRun();
}

function installRun(){
  console.time("install run")

  let clean = false;

  clean = !!prefs["clean_install"];

  if (clean)
    require('./utils').cleanUp({reset: true});

  const isFirstRun = !prefs["isInitialized"];

  if (isFirstRun){
    try{require('./utils').overridePrefs("../prefs.json");}
    catch(e){console.log("skipped overriding preferences");}
  }
}


exports.onUnload = function(reason){

  console.log("unloading due to " + reason);
  require('./logger').logUnload(reason);

  if (reason == "uninstall" || reason == "disable")
    logger.logDisable(reason);

  if (reason == "shutdown")
  require('./stats').event("shutdown", {collectInstance: true});

  require('./sender').flush();
}
