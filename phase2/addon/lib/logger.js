"use strict";

const {elapsedTime, elapsedTotalTime} = require("./timer");
const {merge} = require("sdk/util/object");
const override  = function() merge.apply(null, arguments);
const {PersistentObject} = require("./utils");
const self = require("./self");
const addonSelf = require("sdk/self");
const exp = require("./experiment");
const {dumpUpdateObject, handleCmd} = require("./debug");

const loggerDataAddress = "logger.data";
const recentHistCount = 5;
const loggerData = PersistentObject("simplePref", {address: loggerDataAddress});

let recentMsgs;

function init(){
  if (!loggerData.count)
    loggerData.count = 0;

  recentMsgs = {};

  debug.init();
}

function nextNumber(){
  loggerData.count = loggerData.count + 1;
  return loggerData.count;
}

function log(type, attrs){

  let OUT = {ts: Date.now(),
    et: elapsedTime(),
    ett: elapsedTotalTime(),  
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

  recentMsgs[OUT.number] = OUT;
  if (recentMsgs[OUT.number - recentHistCount])
    delete recentMsgs[OUT.number - recentHistCount];

  debug.update();
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

function logDhReport(info){
  log("DH_REPORT", info)
}

function logFeatureUse(info){
  log("FEATURE_USE", info)
}

function logBehavior(info){
  log("BEHAVIOR", info);
}

function logLooseBehavior(info){
  log("BEHAVIOR_LOOSE", info);
}

function logContext(info){
  log("CONTEXT", info);
}

function logDhPresent(info){
  log("DH_PRESENT", info);
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(){
    let updateObj = {};
    updateObj.count = loggerData.count;
    updateObj.recent = recentMsgs;
   
    dumpUpdateObject(updateObj, {list: "Logger"});
  },

  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){
      default: 
        return undefined;
    }

    return " ";
  }

}

exports.init = init;
exports.logRecommUpdate = logRecommUpdate;
exports.logFirstRun = logFirstRun;
exports.logLoad = logLoad;
exports.logPeriodicInfo = logPeriodicInfo;
exports.logDhReport = logDhReport;
exports.logFeatureUse = logFeatureUse;
exports.logBehavior = logBehavior;
exports.logContext = logContext;
exports.logDhPresent = logDhPresent;
exports.logLooseBehavior = logLooseBehavior;