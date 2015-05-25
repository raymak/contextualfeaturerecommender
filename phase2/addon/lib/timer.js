"use strict";

const {setTimeout, clearTimeout, setInterval, clearInterval} = require("sdk/timers");
const {PersistentObject} = require("utils");

const timerDataAddress = "timer.data";
const timerData = PersistentObject("simplePref", {address: timerDataAddress});
const TICK_MS = 5000;
const SILENCE_LENGTH_TICK = 20;

const tickHandlers = [];

const init = function(){
  if (!timerData.elapsedTime)
    timerData.elapsedTime = 0;

  if (!timerData.silence)
    timerData.silenceStart = -1;

  setInterval(tick, TICK_MS);
}

const tick = function(){
  let elapsedTime = timerData.elapsedTime + 1;
  timerData.elapsedTime = elapsedTime;
  console.log("elapsed time: " + elapsedTime + " ticks = " + elapsedTime*TICK_MS/60000 + " minutes");

  if (timerData.silenceStart != -1 && elapsedTime - timerData.silenceStart > SILENCE_LENGTH_TICK)
    endSilence();

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
  return (timerData.silenceStart != -1 && (time - timerData.silenceStart <= SILENCE_LENGTH_TICK));
}

const randomTime = function(start, end){
  return Math.floor(Math.random()*(end-start) + start + 1);
}

exports.elapsedTime = elapsedTime;
exports.isSilent = isSilent;
exports.silence = silence;
exports.randomTime = randomTime;
exports.tickCallback = tickCallback;
exports.init = init;