/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const logger = require("./logger");
const timer = require("./timer");
const {merge} = require("sdk/util/object");
const {PersistentObject} = require("./storage");

const momentDataAddress = "moment.data";

let momentData;

function init(){

  console.log("initializing moment report");

  return PersistentObject("osFile", {address: momentDataAddress})
  .then((obj)=> {
    momentData = obj;
  }).then(_init);
}

function _init(){
  //set up periodic logging
  timer.onTick(log);
}

function log(){

  for (let moment of Object.keys(momentData)){
    console.log(moment);
    let data = momentData[moment];
    let info = merge({moment: moment}, data);
    logger.logMomentReport(info);
  } 
}   

function periodicLog(et, ett){
  if (Math.floor(et) % 180 != 10) return;

  log();
}


exports.init = init;
exports.log = log;
