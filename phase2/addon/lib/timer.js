"use strict";

const {setTimeout, clearTimeout, setInterval, clearInterval} = require("sdk/timers");
const {PersistentObject} = require("./utils");
const sp = require("sdk/simple-prefs");
const prefs = sp.prefs;
const {Cu, Cc, Ci} = require("chrome");
const {dumpUpdateObject, handleCmd} = require("./debug");

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

  watchActivity();

  tickInterval = setInterval(tick, prefs["timer.tick_length_s"]*1000);

  sp.on("timer.tick_length_s", function(pref){
    clearInterval(tickInterval);
    tickInterval = setInterval(tick, prefs["timer.tick_length_s"]*1000);
  });

  debug.init();

  debug.update();
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

  activityObs.register();
}

const tick = function(){

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
    callback(elapsedTime);
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
    dumpUpdateObject(activity, {list: "Activity Status"});

    let silenceObj = {
      isSilent: isSilent(),
      silenceStart: timerData.silenceStart,
      silenceEnd: isSilent()? timerData.silenceStart + silence_length_tick() : "",
      silenceElapsed: elapsedTime() - silence,
      silenceLeft: silenceLeft(),
      silenceElapsed: silenceElapsed()
    }
    dumpUpdateObject(silenceObj, {list: "Silence Status"});
  },

  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){
      case "silence":
        silence();
      break;
      case "isSilent":
        return String(isSilent());
      break;
      case "endSilence":
        return endSilence();
      break;
      default: 
        return false;
    }

    return " ";
  }

}

function onUnload(reason){
  if (activityObs) activityObs.unregister();
}

exports.elapsedTime = elapsedTime;
exports.isActive = isActive;
exports.isRecentlyActive = isRecentlyActive;
exports.isCertainlyActive = isCertainlyActive;
exports.isSilent = isSilent;
exports.silence = silence;
exports.randomTime = randomTime;
exports.tickCallback = tickCallback;
exports.init = init;