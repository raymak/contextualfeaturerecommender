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

  if (options.loadReason === "install")
    installRun();

  const isFirstRun = !prefs["isInitialized"];

  console.time("initializations");
  resolve()
  .then(()=> require("./self").init())
  .then(()=> require("./presentation/doorhanger").init())
  .then(()=> require("./experiment").init())
  .then(()=> require("./timer").init())
  .then(()=> require("./logger").init())
  .then(()=> require("./sender").init())
  .then(()=> require("./debug").init())
  .then(()=> require("./stats").init())
  .then(()=> require("./feature-report").init())
  .then(()=> {
    console.timeEnd("initializations");
    if (isFirstRun)
      return firstRun();
  }).then(()=> {
    require('./logger').logLoad(options.loadReason);
    require('./stats').event("load", {collectInstance: true}, {reason: require('sdk/self').loadReason});
    return require('./controller').init();

    console.timeEnd("full load");
  });

  console.timeEnd("initial load");
}

function firstRun(){
  console.time("first run");

  console.log("preparing first run");

  require('./logger').logFirstRun();
  require('./self').setInitialized();
  require('./experiment').firstRun();


  console.time("recomm list load");
  require("./controller").loadRecFile(recommFileAddress);
  console.timeEnd("recomm list load");

  console.time("route scaling");
  //scaling routes
  require("./controller").scaleRoutes(require("./route").coefficient(), "trigBehavior");
  console.timeEnd("route scaling");

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

  console.log("unloading due to " + reason);

  require('./stats').event("unload", {collectInstance: true}, {reason: reason});

  require('./sender').flush();

  console.log("end of unload");
}



