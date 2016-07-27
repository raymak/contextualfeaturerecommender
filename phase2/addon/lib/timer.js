/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {setInterval, clearInterval} = require("sdk/timers");
const sp = require("sdk/simple-prefs");
const prefs = sp.prefs;
const {Cc, Ci} = require("chrome");
const {isFocused, getMostRecentBrowserWindow} = require("sdk/window/utils");
const unload = require("sdk/system/unload").when;
const {dumpUpdateObject, handleCmd, isEnabled} = require("./debug");
const observerService = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);

const timerDataAddress = "timer.data";
let timerData;

const tickHandlers = [];
const userActiveHandlers = [];

let activityObs;
let activity;
let tickInterval;

let startTimeMs;

const init = function(){
  return require('./storage').PersistentObject("osFile", {address: timerDataAddress})
  .then((obj)=> {
    timerData = obj;
  }).then(_init);
}

const _init = function(){
  console.log("initializing timer");

  console.time("timer init");

  startTimeMs = Number(require('./experiment').info.startTimeMs);
  
  if (!("elapsedTime" in timerData))
  timerData.elapsedTime = 0;

  timerData.elapsedTotalTime = elapsedTotalTime();

  if (!("silenceStart" in timerData))
    timerData.silenceStart = -1;

  silenceLeft(); //to update the silence status;

  watchActivity();

  tickInterval = setInterval(tick, prefs["timer.tick_length_s"]*1000);

  let f = function(pref){
    clearInterval(tickInterval);
    tickInterval = setInterval(tick, prefs["timer.tick_length_s"]*1000);
  };

  sp.on("timer.tick_length_s", f);
  unload(function(){sp.removeListener("timer.tick_length_s", f)});

  f = function(pref){
    timerData.elapsedTotalTime = elapsedTotalTime();
  };

  sp.on("experiment.startTimeMs", f);
  unload(function(){sp.removeListener("experiment.startTimeMs", f)});

  debug.init();
  debug.update({silenceStatus: true});

  console.timeEnd("timer init");
}

const elapsedTotalTime = function(stage){
  let exp = require("./experiment");

  if (!stage){
    let ett = (Date.now() - startTimeMs) / (1000 * prefs["timer.tick_length_s"]);

    return ett;
  }

  let stageTimes = exp.stageTimes;

  if (!stageTimes[stage])
    return 0;

  // in the stage
  if (!stageTimes[stage].duration){
    let ett = (Date.now() - Number(stageTimes[stage].start)) / (1000 * prefs["timer.tick_length_s"]);

    return ett;
  }

  // stage has ended
  let ett = stageTimes[stage].duration;

  return ett;
}

const watchActivity = function(){

  activity = {
    minor_inactive_s: 0,
    last_minor_inactive_s: 0,
    minor_active_s: 0,
    active_s: 0,
    active: false
  };

  let activeCounter, inactiveCounter;

  activityObs = {
    observe: function(subject, topic, data){
      switch(topic){
        case "user-interaction-active":

          if (!isFocused(getMostRecentBrowserWindow()))
            break;
          
          if (inactiveCounter)
            clearInterval(inactiveCounter);
          inactiveCounter = null;
          if (activity.minor_inactive_s) activity.last_minor_inactive_s = activity.minor_inactive_s;
          activity.minor_inactive_s = 0;
          if (!activeCounter){
            activeCounter = setInterval(function(){
              activity.minor_active_s += 1;
              activity.active_s += 1;
              debug.update();

            }, 1000);
          }
          activity.active = true;

          if (activity.minor_active_s == 0){ // to call the handlers only once
            console.log("user active (minor)");
            userActiveHandlers.forEach((fn) => fn());
            require('./stats').event("activation", {}, {inactivity: activity.last_minor_inactive_s}, {inactivity: 'average'});

            if (isRecentlyActive(10, 10 * 60)){
              require('./logger').logLongInactivityBack({length: activity.last_minor_inactive_s});

            }
          }

        break;
        case "user-interaction-inactive":
          require('./stats').event("inactiveTick");
          console.log("user inactive (minor)");
          if (activeCounter)
            clearInterval(activeCounter);
          activeCounter = null;
          activity.minor_active_s = 0;
          if (!inactiveCounter){
            inactiveCounter = setInterval(function(){
              activity.minor_inactive_s += 1;

              if (activity.active)
                activity.active_s += 1;

              if (activity.minor_inactive_s > prefs["timer.inactive_threshold_s"] && activity.active){
                deactivate();
              }

              if (activity.minor_inactive_s == 10 * 60){
                require('./logger').logLongInactivity();
              }
              
              debug.update();
            }, 1000);
          }
        break;
      }
    },
    register: function(){
      observerService.addObserver(this, "user-interaction-active", false);
      observerService.addObserver(this, "user-interaction-inactive", false);
    },
    unregister: function(){
      observerService.removeObserver(this, "user-interaction-inactive");
      observerService.removeObserver(this, "user-interaction-active");
    }
  };

  unload(function(){if (activityObs) activityObs.unregister();});

  activityObs.register();
}

const tick = function(){

  let ett = elapsedTotalTime();
  timerData.elapsedTotalTime = ett;

  if (!activity.active){
    console.log("tick missed due to inactivity");
    require('./stats').event("missedTick");
    debug.update({silenceStatus: true});
    return;
  }

  require('./stats').event("tick");

  let et = timerData.elapsedTime + 1;

  timerData.elapsedTime = et;
  console.log("elapsed time: " + et + " ticks = " + et*prefs["timer.tick_length_s"]/60 + " minutes");

  tickHandlers.forEach(function(callback){
    callback(et, ett);
  });

  debug.update({silenceStatus: true});
}

const onTick = function(callback){
  tickHandlers.push(callback);
}

const onUserActive = function(fn){
  userActiveHandlers.push(fn);
}

const elapsedTime = function(stage){
  if (!stage)
    return timerData.elapsedTime;

  let exp = require('./experiment');
  let stageTimes = exp.stageTimes;
  
  if (!stageTimes[stage])
    return 0;
  else
    return stageTimes[stage].elapsedTime;
}

const silence = function(){
  let ett = elapsedTotalTime();
  timerData.silenceStart = ett;

  console.log("silence started at " + ett + " ticks");
  console.log("silence is expected to end at " + Number(ett + silence_length_tick()) + " ticks");

  silenceLeft(); //to update all variables

  debug.update({silenceStatus: true});

  let info = {startett: ett};
  require('./logger').logSilenceStart(info);
  require('./stats').event("silence");
}

const silenceElapsed = function(){
  return (isSilent()? elapsedTotalTime() - timerData.silenceStart : 0);
}

const silenceLeft = function(){

  if (timerData.silenceStart == -1)
    return 0;

  let ett = elapsedTotalTime();

  let left = silence_length_tick() - ett + timerData.silenceStart;
  
  //updating silence status
  if (left <= 0)
    endSilence();

  return left;
}

const endSilence = function(){
  let start = timerData.silenceStart;

  timerData.silenceStart = -1;
  let ett = elapsedTotalTime();

  console.log("silence ended at " + ett + " ticks");

  let info = {startett: start, endett: ett, effectiveLength: ett-start};

  require('./logger').logSilenceEnd(info);

  require('./stats').event("silenceend");

  debug.update({silenceStatus: true});

  return ett;
}

const isSilent = function(){
  return (silenceLeft() > 0);
}

const isActive = function(){
  return activity.active;
}

const deactivate = function(){
  activity.active = false;
  activity.active_s = 0;
  require('./stats').event("deactivation");
  console.log("user inactive");
}

const isRecentlyActive = function(activity_threshold_s, inactivity_threshold_s /* optional */){

  if (activity.minor_active_s > activity_threshold_s)
    return false;

  if (inactivity_threshold_s && (activity.last_minor_inactive_s < inactivity_threshold_s))
    return false;
  
  return true;
}

const isCertainlyActive = function(){
  return (activity.minor_inactive_s < 10 && isFocused(getMostRecentBrowserWindow()));
}

const randomTime = function(start, end){
  return Math.floor(Math.random()*(end-start) + start);
}

const silence_length_tick = function(){
  return sToT(timerData.silence_length_s);
}

const tToS = function(t){
  return t*prefs["timer.tick_length_s"];
}

const sToT = function(s){
  return s/prefs["timer.tick_length_s"];
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(options){

    if (!isEnabled()) return;
    
    dumpUpdateObject(activity, {list: "Activity Status"});

    if (options && options.silenceStatus){
      let silenceObj = {
        isSilent: isSilent(),
        silenceStart: timerData.silenceStart,
        silenceEnd: isSilent()? timerData.silenceStart + silence_length_tick() : 0,
        silenceElapsed: silenceElapsed(),
        silenceLeft: silenceLeft()
      }
      dumpUpdateObject(silenceObj, {list: "Silence Status"});
    }
  },

  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);

    let subArgs;
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){
      case "tick":
        tick();
        break;
      case "silence":
        silence();
        break;
      case "issilent":
        return isSilent();
        // break;
      case "endsilence":
        return "silence ended at " + endSilence() + " ticks";
        // break;
      case "iscertainlyactive":
        return isCertainlyActive();
        // break;
      case "inactive":
        deactivate();
        observerService.notifyObservers(null, "user-interaction-inactive", "");
        debug.update();
        return "user inactivity forced"
        // break;

      case "time": {
        subArgs = params.split(" ");

        let act = subArgs[0];

        if (!subArgs[0])
          return "error: invalid use of time command.";

        switch(act){
          case "set":
            if (!subArgs[1])
              return "error: invalid use of time set command.";

            switch(subArgs[1]){
              case "et":
                if (!subArgs[2])
                  return "error: invalid use of time set et command.";

                timerData.elapsedTime = Number(subArgs[2]);
                return "elapsedTime set to " + Number(subArgs[2]);
              // break;
              case "tick_length_s":
                if (!subArgs[2])
                  return "error: invalid use of time set tick_length_s command.";

                prefs["timer.tick_length_s"] = Number(subArgs[2]);
                return "new tick length in seconds: " + prefs["timer.tick_length_s"];
                // break;
              case "st-diff": {
                if (!subArgs[2])
                  return "error: invalid use of time set st command.";

                let startTimeMs = Number(require('./storage').osFileObjects['experiment.data'].startTimeMs);
                console.log(startTimeMs);

                let dateNum = startTimeMs
                              + Number(subArgs[2])*prefs["timer.tick_length_s"]*1000;

                console.log(dateNum);
                require('./storage').osFileObjects['experiment.data'].startTimeMs = String(dateNum);

                return "new start time set to: " + require('./timer').dateTimeToString(new Date(dateNum));
                // break;
              }
              
              default:
                return "error: invalid use of time set command.";
            }
        
          // break;
          
          case "get":

            if (!subArgs[1])
              return "error: invalid use of time set command.";

            switch(subArgs[1]){
              case "et":
                return elapsedTime(subArgs[2]);
                // break;
              case "ett":
                return elapsedTotalTime(subArgs[2]);
                // break;
              
              default:

            }
            break;

          default:
            return "error: invalid use of time command.";
        }

      break;
    }

      default: 
        return undefined;
    }

    return " ";
  }

}

exports.elapsedTime = elapsedTime;
exports.elapsedTotalTime = elapsedTotalTime;
exports.isActive = isActive;
exports.isRecentlyActive = isRecentlyActive;
exports.isCertainlyActive = isCertainlyActive;
exports.isSilent = isSilent;
exports.silence = silence;
exports.endSilence = endSilence;
exports.randomTime = randomTime;
exports.onTick = onTick;
exports.onUserActive = onUserActive;
exports.tToS = tToS;
exports.sToT = sToT;
exports.init = init;