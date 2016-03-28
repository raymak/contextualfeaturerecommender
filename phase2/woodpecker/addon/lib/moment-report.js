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

const momentData = PersistentObject("simplePref", {address: momentDataAddress});

function init(){
  console.log("initializing moment report");

  //set up periodic logging
  timer.onTick(log);
}

function log(et, ett){
  if (Math.floor(et) % 60 != 1) return;

  for (let moment of Object.keys(momentData)){
    console.log(moment);
    let data = momentData[moment];
    let info = merge({moment: moment}, data);
    logger.logMomentReport(info);
  } 
}   


exports.init = init;
exports.log = log;
