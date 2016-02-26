/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const system = require("sdk/system");
const {prefs} = require("sdk/simple-prefs");

const recommFileAddress = "prepilot001recommendations.json";

exports.main = function(options, callbacks){

  console.log("Hello World! I am alive :)");

  if (options.loadReason === "install")
    installRun();

  const isFirstRun = !prefs["isInitialized"];

  require("./self").init();
  require("./presentation/splitpage").init();  
  require("./presentation/doorhanger").init();
  require("./experiment").init();
  require("./timer").init();
  require("./logger").init();
  require("./sender").init();
  require("./debug").init();
  require("./feature-report").init();

  if (isFirstRun)
    firstRun();

  require('./logger').logLoad(options.loadReason);

  require('./controller').init();

}

function firstRun(){
  console.log("preparing first run");

  require("./controller").loadRecFile(recommFileAddress);
  
  require('./logger').logFirstRun();
  require('./self').setInitialized();
  require('./experiment').firstRun();
}

function installRun(){
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
}



