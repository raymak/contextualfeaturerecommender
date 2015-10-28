"use strict";

const {setTimeout, clearTimeout, setInterval, clearInterval} = require("sdk/timers");
const {PersistentObject, dateTimeToString} = require("./utils");
const sp = require("sdk/simple-prefs");
const prefs = sp.prefs;
const {Cu, Cc, Ci} = require("chrome");
const unload = require("sdk/system/unload").when;
const exp = require("./experiment");
const {dumpUpdateObject, handleCmd, isEnabled} = require("./debug");

const observerService = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);

const timerDataAddress = "timer.data";
const timerData = PersistentObject("simplePref", {address: timerDataAddress});

const tickHandlers = [];

let activityObs;
let activity;
let tickInterval;

const init = function(){
  console.log("initializing timer");
  
  if (!timerData.elapsedTime)
    timerData.elapsedTime = 0;

  if (!timerData.silence)
    timerData.silenceStart = -1;

  elapsedTotalTime();

  watchActivity();

  tickInterval = setInterval(tick, prefs["timer.tick_length_s"]*1000);

  let f = function(pref){
    clearInterval(tickInterval);
    tickInterval = setInterval(tick, prefs["timer.tick_length_s"]*1000);
  };

  sp.on("timer.tick_length_s", f);
  unload(function(){sp.removeListener("timer.tick_length_s"), f});

  f = function(pref){
    timerData.elapsedTotalTime = elapsedTotalTime();
  };
  sp.on("experiment.startTimeMs", f);
  unload(function(){sp.removeListener("experiment.startTimeMs"), f});

  debug.init();
  debug.update();
}

// updates the ett preference records in addition to returning it
const elapsedTotalTime = function(){
  let ett = (Date.now() - Number(exp.info.startTimeMs)) / (1000 * prefs["timer.tick_length_s"]);
  timerData.elapsedTotalTime = ett; //update the elapsed total time at the beginning
  return ett;
}

const watchActivity = function(){

  activity = {
    minor_inactive_s: 0,
    minor_active_s: 0,
    active_s: 0,
    active: false
  };

  let activeCounter, inactiveCounter;


  activityObs = {
    observe: function(subject, topic, data){
      switch(topic){
        case "user-interaction-active":
          // console.log("active " + elapsedTime());
          clearInterval(inactiveCounter);
          activity.minor_inactive_s = 0;
          if (!activeCounter){
            activeCounter = setInterval(function(){
              activity.minor_active_s += 1;
              activity.active_s += 1;
              debug.update();
            }, 1000);
          }
          activity.active = true;
        break;
        case "user-interaction-inactive":
          console.log("user inactive (minor)");
          clearInterval(activeCounter);
          activeCounter = null;
          activity.minor_active_s = 0;
          inactiveCounter = setInterval(function(){
            activity.minor_inactive_s += 1;

            if (activity.active)
              activity.active_s += 1;

            if (activity.minor_inactive_s > prefs["timer.inactive_threshold_s"] && activity.active){
              activity.active = false;
              activity.active_s = 0;
              console.log("user inactive");
            }
            debug.update();
          }, 1000);
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

  timerData.elapsedTotalTime = elapsedTotalTime();

  if (!activity.active){
    console.log("tick missed due to inactivity");
    return;
  }

  const SILENCE_LENGTH_TICK = prefs["timer.silence_length_s"] / prefs["timer.tick_length_s"];

  let elapsedTime = timerData.elapsedTime + 1;

  timerData.elapsedTime = elapsedTime;
  console.log("elapsed time: " + elapsedTime + " ticks = " + elapsedTime*prefs["timer.tick_length_s"]/60 + " minutes");

  if (timerData.silenceStart != -1 && silenceLeft() < 0)
    endSilence();

  tickHandlers.forEach(function(callback){
    callback(elapsedTime, elapsedTotalTime());
  });

  debug.update();
}

const tickCallback = function(callback){
  tickHandlers.push(callback);
}

const elapsedTime = function(){
  return timerData.elapsedTime;
}

const silence = function(){
  let time = elapsedTime();
  timerData.silenceStart = time;
  console.log("silence started at " + time + " ticks");
  console.log("silence ends at " + Number(time + silence_length_tick()) + " ticks");
}

const silenceElapsed = function(){
  return (isSilent()? elapsedTime() - timerData.silenceStart : 0);
}

const silenceLeft = function(){
  let elapsedTime = timerData.elapsedTime;

  if (!isSilent())
    return 0;

  return (silence_length_tick() - elapsedTime + timerData.silenceStart);
}

const endSilence = function(){
  timerData.silenceStart = -1;
  let time = elapsedTime();
  console.log("silence ended at " + time + " ticks");
}

const isSilent = function(){
  let time = elapsedTime();
  return (timerData.silenceStart != -1 && (time - timerData.silenceStart <= silence_length_tick()));
}

const isActive = function(){
  return activity.active;
}

const isRecentlyActive = function(){
  return (activity.minor_active_s < prefs["timer.recently_active_threshold_s"]);
}

const isCertainlyActive = function(){
  return (activity.minor_inactive_s === 0);
}

const randomTime = function(start, end){
  return Math.floor(Math.random()*(end-start) + start + 1);
}

const silence_length_tick = function(){
  return prefs["timer.silence_length_s"] / prefs["timer.tick_length_s"];
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(){

    if (!isEnabled) return;
    
    dumpUpdateObject(activity, {list: "Activity Status"});

    let silenceObj = {
      isSilent: isSilent(),
      silenceStart: timerData.silenceStart,
      silenceEnd: isSilent()? timerData.silenceStart + silence_length_tick() : 0,
      silenceElapsed: elapsedTime() - silence,
      silenceLeft: silenceLeft(),
      silenceElapsed: silenceElapsed()
    }
    dumpUpdateObject(silenceObj, {list: "Silence Status"});
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
      case "silence":
        silence();
      break;
      case "isSilent":
        return isSilent();
      break;
      case "endSilence":
        return endSilence();
      break;
      case "time":
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
              break;
              case "tick_length_s":
                if (!subArgs[2])
                  return "error: invalid use of time set tick_length_s command.";

                prefs["timer.tick_length_s"] = Number(subArgs[2]);
                return "new tick length in seconds: " + prefs["timer.tick_length_s"];
                break;
              case "st-diff":
                if (!subArgs[2])
                  return "error: invalid use of time set st command.";

                console.log(Number(prefs["experiment.startTimeMs"]));

                let dateNum = Number(prefs["experiment.startTimeMs"]) 
                              + Number(subArgs[2])*prefs["timer.tick_length_s"]*1000;

                console.log(dateNum);
                prefs["experiment.startTimeMs"] = String(dateNum);

                return "new start time set to: " + dateTimeToString(new Date(dateNum));
                break;
              default:
                return "error: invalid use of time set command.";
            }
            break;

            default:
              return "error: invalid use of time command.";
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
exports.randomTime = randomTime;
exports.tickCallback = tickCallback;
exports.init = init;