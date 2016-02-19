"use strict";

const logger = require("./logger");
const timer = require("./timer");
const {merge} = require("sdk/util/object");
const {PersistentObject} = require("./utils");

const momentDataAddress = "moment.data";

const momentData = PersistentObject("simplePref", {address: momentDataAddress});

function init(){
  console.log("initializing moment report");

  //set up periodic logging
  timer.tickCallback(log);
}



function log(et, ett){
  if (Math.floor(ett) % 20 != 1) return;

  for (let moment of Object.keys(momentData)){
    console.log(moment);
    let data = momentData[moment];
    let info = merge({moment: moment}, data);
    logger.logMomentReport(info);
  }
  
  
}   


exports.init = init;
