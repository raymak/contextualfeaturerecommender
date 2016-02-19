/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const system = require("sdk/system");
const {prefs} = require("sdk/simple-prefs");

const recommFileAddress = "mozlando-recommendations.json";

exports.main = function(options, callbacks){

  console.log("Hello World! Woodpecker is alive :)");

  const isFirstRun = !prefs["isInitialized"]
  const frLog = !!prefs["experiment.fr_usage_logging.enabled"];

  if (options.loadReason === "install")
    installRun(isFirstRun);

  require("./self").init();
  require("./experiment").init();
  require("./timer").init();
  require("./logger").init();
  require("./sender").init();
  require("./debug").init();
  require("./moment-report").init();
  
  if (frLog)
    require("./fr/feature-report").init();


  if (isFirstRun)
    firstRun();

  require('./logger').logLoad(options.loadReason);

  require('./controller').init();

  if (frLog)
    require("./fr/controller").init();


}

function firstRun(){
  if (prefs["experiment.fr_usage_logging.enabled"])
    require("./fr/controller").loadRecFile(recommFileAddress);

  require('./logger').logFirstRun();
  require('./self').setInitialized();
  require('./experiment').firstRun();
}

function installRun(isFirstRun){
  let clean = false;

  //static args have precedence over default preferences
  if (system.staticArgs && system.staticArgs["clean_install"])
    clean = true;
  else
    if (system.staticArgs && system.staticArgs["clean_install"] === false)
      clean = false;
    else
      clean = prefs["clean_install"];

  if (clean)
    require('./utils').cleanUp({reset: true});


  if (clean || isFirstRun){
    try{require('./utils').overridePrefs("../prefs.json");}
    catch(e){console.log("skipped overriding preferences");}
  }
}


exports.onUnload = function(reason){
  console.log("unloading due to " + reason);
  require('./logger').logUnload(reason);

  if (reason == "uninstall" || reason == "disable")
    logger.logDisable(reason);
}
