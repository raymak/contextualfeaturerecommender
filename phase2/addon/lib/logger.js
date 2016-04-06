/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {elapsedTime, elapsedTotalTime, onTick} = require("./timer");
const {merge} = require("sdk/util/object");
const override  = function() merge.apply(null, arguments);
const {PersistentObject} = require("./storage");
const self = require("./self");
const addonSelf = require("sdk/self");
const {dumpUpdateObject, handleCmd, isEnabled} = require("./debug");
const {send} = require("./sender");
const {prefs} = require("sdk/simple-prefs");
const {defer} = require("sdk/lang/functional");
const unload = require("sdk/system/unload").when;

const loggerDataAddress = "logger.data";
let loggerData;

const recentHistCount = prefs["logger.recent_hist_count"];

let recentMsgs;

function init(){
  return PersistentObject("simplePref", {address: loggerDataAddress})
  .then((obj)=> {
    loggerData = obj;
  }).then(_init);
}

function _init(){
  console.log("initializing logger");

  if (!("count" in loggerData))
    loggerData.count = 0;

  recentMsgs = {};

  onTick(periodicLog);

  debug.init();

  unload(onUnload);
}

function nextNumber(){
  loggerData.count = loggerData.count + 1;
  return loggerData.count;
}

function log(type, attrs, options){

  // asynchronous logging fails when unloading, that's why critical logs are reported immediately
  let immediate = options && options.immediate;

  if (!immediate)
    (defer(_log))(type, attrs, options);
  else
    _log(type, attrs, options); 
}

function _log(type, attrs){

  let OUT = {
    userid: require('./experiment').userId,
    number: nextNumber(),
    is_test: self.isTest,
    deb_cmd_used: prefs["debug.command.used"],
    ts: Date.now(),
    et: elapsedTime(),
    ett: elapsedTotalTime(),
    localeTime: (new Date(Date.now())).toLocaleString(),
    addon_id: addonSelf.id,
    addon_version: addonSelf.version,
    locale: self.locale,
    update_channel: self.updateChannel
  }

  OUT = override(OUT, self.sysInfo);
  OUT = override(OUT, require('./experiment').info);

  OUT = override(OUT, {type: type, attrs: attrs});

  console.log(OUT);
  send(OUT);

  require('./stats').event("log");

  recentMsgs[OUT.number] = OUT;
  if (recentMsgs[OUT.number - recentHistCount])
    delete recentMsgs[OUT.number - recentHistCount];

  debug.update();
}

function periodicLog(et, ett){
  if (Math.floor(et) % prefs["logger.periodic_log_period"] != 1) return;
  self.getPeriodicInfo(function(info){
    logPeriodicSelfInfo(info);
  });

}

function logRecommUpdate(id, oldStatus, newStatus){
  log("RECOMM_STATUS_UPDATE", {id: id, oldStatus: oldStatus, newStatus: newStatus});
}

function logFirstRun(){
  log("FIRST_RUN");
}

function logLoad(reason){
  log("LOAD", {reason: reason});
}

function logUnload(reason){
  log("UNLOAD", {reason: reason}, {immediate: true});
}

function logDisable(reason){
  log("DISABLE", {reason: reason}, {immediate: true});
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

function logLooseFeatureUse(info){
  log("LOOSE_FEATURE_USE", info);
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

function logMomentDelivery(info){
  log("MOMENT_DELIVERY", info);
}

function logMomentReport(info){
  log("MOMENT_REPORT", info);
}

function logSelfDestruct(info){
  log("SELF_DESTRUCT", info, {immediate: true});
}

function logError(info){
  log("ERROR", info, {immediate: true});
}

function logWarning(info){
  log("WARNING", info, {immediate: true});
}

function logSilenceEnd(info){
  log("SILENCE_END", info);
}

function logSilenceStart(info){
  log("SILENCE_START", info);
}

function logStatsReport(info){
  log("STATS_REPORT", info);
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

function onUnload(reason){
  if (reason == "uninstall" || reason == "disable")
    logDisable(reason);

  logUnload(reason);
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
exports.logLooseFeatureUse = logLooseFeatureUse;
exports.logBehavior = logBehavior;
exports.logContext = logContext;
exports.logDhPresent = logDhPresent;
exports.logLooseBehavior = logLooseBehavior;
exports.logFeatReport = logFeatReport;
exports.logExpStageAdvance = logExpStageAdvance;
exports.logMomentDelivery = logMomentDelivery;
exports.logMomentReport = logMomentReport;
exports.logSelfDestruct = logSelfDestruct;
exports.logSilenceEnd = logSilenceEnd;
exports.logSilenceStart = logSilenceStart;
exports.logWarning = logWarning;
exports.logError = logError;
exports.logStatsReport = logStatsReport;