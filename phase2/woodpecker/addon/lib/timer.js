"use strict";

const {setTimeout, clearTimeout, setInterval, clearInterval} = require("sdk/timers");
const {PersistentObject, dateTimeToString} = require("./utils");
const sp = require("sdk/simple-prefs");
const prefs = sp.prefs;
const {Cu, Cc, Ci} = require("chrome");
const unload = require("sdk/system/unload").when;
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

  if (!timerData.silenceStart)
    timerData.silenceStart = -1;

  if (!timerData.events)
    timerData.events = [];

  event('startup');

  unload(function(){event('shutdown')});

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
  let exp = require("./experiment");
  exp.info.hello;
  let ett = (Date.now() - Number(exp.info.startTimeMs)) / (1000 * prefs["timer.tick_length_s"]);

  timerData.elapsedTotalTime = ett; //update the elapsed total time at the beginning
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
          // console.log("active " + elapsedTime());
          clearInterval(inactiveCounter);
          if (activity.minor_inactive_s) activity.last_minor_inactive_s = activity.minor_inactive_s;
          activity.minor_inactive_s = 0;
          if (!activeCounter){
            activeCounter = setInterval(function(){
              activity.minor_active_s += 1;
              activity.active_s += 1;
              debug.update();
            }, 1000);
          }
          if (!activity.active)
            event('active');
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
              deactivate();
              event('inactive');
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

  let et = timerData.elapsedTime + 1;

  timerData.elapsedTime = et;
  console.log("elapsed time: " + et + " ticks = " + et*prefs["timer.tick_length_s"]/60 + " minutes");

  if (timerData.silenceStart != -1 && silenceLeft() <= 0)
    endSilence();

  tickHandlers.forEach(function(callback){
    callback(et, elapsedTotalTime());
  });

  debug.update();
}

const event = function(name){
  let events = timerData.events;
  events.push([name, dateTimeToString(new Date())]);
  timerData.events = events;
}

const tickCallback = function(callback){
  tickHandlers.push(callback);
}

const elapsedTime = function(){
  return timerData.elapsedTime;
}

const silence = function(){
  let time = elapsedTotalTime();
  timerData.silenceStart = time;
  console.log("silence started at " + time + " ticks");
  console.log("silence ends at " + Number(time + silence_length_tick()) + " ticks");
}

const silenceElapsed = function(){
  return (isSilent()? elapsedTotalTime() - timerData.silenceStart : 0);
}

const silenceLeft = function(){
  let ett = elapsedTotalTime();

  if (!isSilent())
    return 0;

  return (silence_length_tick() - ett + timerData.silenceStart);
}

const endSilence = function(){
  timerData.silenceStart = -1;
  let time = elapsedTotalTime();
  console.log("silence ended at " + time + " ticks");
  return time;
}

const isSilent = function(){
  let ett = elapsedTotalTime();
  return (timerData.silenceStart != -1 && (ett - timerData.silenceStart <= silence_length_tick()));
}

const isActive = function(){
  return activity.active;
}

const deactivate = function(){
  activity.active = false;
  activity.active_s = 0;
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
  return (activity.minor_inactive_s === 0);
}

const randomTime = function(start, end){
  return Math.floor(Math.random()*(end-start) + start + 1);
}

const silence_length_tick = function(){
  return prefs["timer.silence_length_s"] / prefs["timer.tick_length_s"];
}

const tToS = function(t){
  return t*prefs["timer.tick_length_s"];
}

const sToT = function(s){
  return s/prefs
  ["timer.tick_length_s"];;
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
      case "issilent":
        return isSilent();
      break;
      case "endsilence":
        return console.log("silence ended at " + endSilence() + " ticks");
      break;
      case "inactive":
        deactivate();
        observerService.notifyObservers(null, "user-interaction-inactive", "");
        debug.update();
        return "user inactivity forced"
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
exports.endSilence = endSilence;
exports.randomTime = randomTime;
exports.tickCallback = tickCallback;
exports.tToS = tToS;
exports.sToT = sToT;
exports.init = init;