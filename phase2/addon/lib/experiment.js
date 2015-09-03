"use strict";

const {PersistentObject} = require("./utils");
const {prefs} = require("sdk/simple-prefs");
const {merge} = require("sdk/util/object");

const expDataAddress = "experiment";

// const expData = PersistentObject("simplePref", {address: expDataAddress});

const experiment = {
  init: function(){
  // expData.mode = {rateLimit: true, moment: 'interruptible'};
  //rate limit {true, false}
  //moment {'interruptible', 'random', 'in-context'}
  console.log("initializing experiment");

  },
  get info(){
    return {startTimeMs: startTimeMs()};
  }
}

function assignRandomMode(weightsArr){
  return modes[require("./utils").weightedRandomInt(weightsArr)];  
}

// also sets start date when called for the first time
function startTimeMs(){
  if (prefs["experiment.startTimeMs"]) 
    return prefs["experiment.startTimeMs"];
  else {
    prefs["experiment.startTimeMs"] = Date.now().toString(); //set for the first time
    return prefs["experiment.startTimeMs"];
  }
}

function setMode(weights){
  weights = weights || system.staticArgs.delMode_weights || JSON.parse(prefs["experiment.default_delMode_weights"]);
  // let modeint = require("./utils").weightedRandomInt(weights);
  // let mode = arms.arms[armint];
  // prefs["config.armnumber"] = armint;
  // prefs["config.arm"] = JSON.stringify(arm);
  // return arm;
  }

// exports.expData = expData;
module.exports = experiment;