/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const system = require("sdk/system");
const {prefs} = require("sdk/simple-prefs");

const recommFileAddress = prefs["recomm_list_address"];

exports.main = function(options, callbacks){

  console.log("Hello World! I am alive :)");

  console.time("full load");

  if (options.loadReason === "install")
    installRun();

  const isFirstRun = !prefs["isInitialized"];

  console.time("initializations");
  require("./self").init();
  require("./presentation/splitpage").init();  
  require("./presentation/doorhanger").init();
  require("./experiment").init();
  require("./timer").init();
  require("./logger").init();
  require("./sender").init();
  require("./debug").init();
  require("./stats").init();
  require("./feature-report").init();
  console.timeEnd("initializations");

  if (isFirstRun)
    firstRun();

  require('./logger').logLoad(options.loadReason);

  require('./controller').init();

  require('./stats').event("startup", {collectInstance: true});

  console.timeEnd("full load");

}

function firstRun(){
  console.time("first run");

  console.log("preparing first run");

  console.time("recomm list load");
  require("./controller").loadRecFile(recommFileAddress);
  console.timeEnd("recomm list load");

  
  require('./logger').logFirstRun();
  require('./self').setInitialized();
  require('./experiment').firstRun();

  //scaling routes
  require("./controller").scaleRoutes(require("./route").coefficient(), "trigBehavior");

  console.timeEnd("first run");
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

  console.timeEnd("install run");
}


exports.onUnload = function(reason){

  if (reason == "shutdown")
    require('./stats').event("shutdown", {collectInstance: true});
  
  console.log("unloading due to " + reason);
  require('./logger').logUnload(reason);

  if (reason == "uninstall" || reason == "disable")
    logger.logDisable(reason);

  require('./sender').flush();
}



