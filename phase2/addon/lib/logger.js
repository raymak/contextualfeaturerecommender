"use strict";

const {elapsedTime} = require("./timer");
const {merge} = require("sdk/util/object");
const override  = function() merge.apply(null, arguments);
const {PersistentObject} = require("./utils");
const self = require("./self");
const addonSelf = require("sdk/self");
const exp = require("./experiment");

const loggerDataAddress = "logger.data";
const loggerData = PersistentObject("simplePref", {address: loggerDataAddress});


function init(){
  if (!loggerData.count)
    loggerData.count = 0;
}

function nextNumber(){
  loggerData.count = loggerData.count + 1;
  return loggerData.count;
}

function log(type, attrs){

  let OUT = {ts: Date.now(),
    et: elapsedTime(),
    number: nextNumber(),
    experiment_version: 1,
    addon_version: addonSelf.version,
    is_test: self.isTest,
    userid: self.userId,
    locale: self.locale,
    update_channel: self.updateChannel
  }

  OUT = override(OUT, self.sysInfo);
  OUT = override(OUT, exp.info);

  OUT = override(OUT, {type: type, attrs: attrs});

  console.log(OUT);
}


function logRecommUpdate(oldStatus, newStatus){
  log("RECOMM_STATUS_UPDATE", {oldStatus: oldStatus, newStatus: newStatus});
}

function logFirstRun(){
  log("FIRST_RUN");
}

function logLoad(reason){
  log("LOAD", {reason: reason});
}

function logPeriodicInfo(info){
  log("PERIODIC_INFO", info);
}

exports.init = init;
exports.logRecommUpdate = logRecommUpdate;
exports.logFirstRun = logFirstRun;
exports.logLoad = logLoad;
exports.logPeriodicInfo = logPeriodicInfo;

