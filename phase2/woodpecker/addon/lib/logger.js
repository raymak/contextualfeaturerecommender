"use strict";

const {elapsedTime, elapsedTotalTime, tickCallback} = require("./timer");
const {merge} = require("sdk/util/object");
const override  = function() merge.apply(null, arguments);
const {PersistentObject} = require("./utils");
const self = require("./self");
const addonSelf = require("sdk/self");
const exp = require("./experiment");
const {dumpUpdateObject, handleCmd, isEnabled} = require("./debug");
const {send} = require("./sender");
const {prefs} = require("sdk/simple-prefs");

const loggerDataAddress = "logger.data";
const loggerData = PersistentObject("simplePref", {address: loggerDataAddress});

const recentHistCount = prefs["logger.recent_hist_count"];

let recentMsgs;

function init(){
  if (!loggerData.count)
    loggerData.count = 0;

  recentMsgs = {};

  tickCallback(periodicLog);

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
  send(OUT);

  recentMsgs[OUT.number] = OUT;
  if (recentMsgs[OUT.number - recentHistCount])
    delete recentMsgs[OUT.number - recentHistCount];

  debug.update();
}

function periodicLog(et, ett){
      if (et % 20 != 1) return;
      self.getPeriodicInfo(function(info){
        logPeriodicSelfInfo(info);
      });

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

function logUnload(reason){
  log("UNLOAD", {reason: reason});
}

function logDisable(reason){
  log("DISABLE", {reason: reason});
}

function logPeriodicSelfInfo(info){
  log("PERIODIC_SELF_INFO", info);
}

function logDhReport(info){
  log("DH_REPORT", info)
}

function logFeatureUse(info){
  if (info.count && info.count == 1){

  }
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

function logFeatReport(info){
  log("FEAT_REPORT", info);
}

function logExpStageAdvance(info){
  log("EXP_STAGE_ADVANCE", info);
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(){
    if (!isEnabled()) return;

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
exports.logUnload = logUnload;
exports.logDisable = logDisable;
exports.logPeriodicSelfInfo = logPeriodicSelfInfo;
exports.logDhReport = logDhReport;
exports.logFeatureUse = logFeatureUse;
exports.logBehavior = logBehavior;
exports.logContext = logContext;
exports.logDhPresent = logDhPresent;
exports.logLooseBehavior = logLooseBehavior;
exports.logFeatReport = logFeatReport;
exports.logExpStageAdvance = logExpStageAdvance;