"use strict";

const {setTimeout, clearTimeout, setInterval, clearInterval} = require("sdk/timers");
const {PersistentObject} = require("./utils");
const {prefs} = require("sdk/simple-prefs");

const timerDataAddress = "timer.data";
const timerData = PersistentObject("simplePref", {address: timerDataAddress});

const tickHandlers = [];

const init = function(){
  console.log("initializing timer");
  
  if (!timerData.elapsedTime)
    timerData.elapsedTime = 0;

  if (!timerData.silence)
    timerData.silenceStart = -1;

  setInterval(tick, prefs["timer.tick_length_s"]*1000);
}

const tick = function(){
  const SILENCE_LENGTH_TICK = prefs["timer.silence_length_s"] / prefs["timer.tick_length_s"];

  let elapsedTime = timerData.elapsedTime + 1;
  let silenceLeft = silence_length_tick() - elapsedTime + timerData.silenceStart;
  timerData.elapsedTime = elapsedTime;
  console.log("elapsed time: " + elapsedTime + " ticks = " + elapsedTime*prefs["timer.tick_length_s"]/60 + " minutes");

  if (timerData.silenceStart != -1 && silenceLeft < 0)
    endSilence();

  if (timerData.silenceStart == -1)
    timerData.silenceLeft = 0;
  else
    timerData.silenceLeft = silenceLeft;

  tickHandlers.forEach(function(callback){
    callback(elapsedTime);
  });
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

const randomTime = function(start, end){
  return Math.floor(Math.random()*(end-start) + start + 1);
}

const silence_length_tick = function(){
  return prefs["timer.silence_length_s"] / prefs["timer.tick_length_s"];
}

exports.elapsedTime = elapsedTime;
exports.isSilent = isSilent;
exports.silence = silence;
exports.randomTime = randomTime;
exports.tickCallback = tickCallback;
exports.init = init;