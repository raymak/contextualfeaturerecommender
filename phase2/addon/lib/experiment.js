/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {PersistentObject} = require("./utils");
const {prefs} = require("sdk/simple-prefs");
const {merge} = require("sdk/util/object");
const timer = require("./timer");
const {handleCmd, dumpUpdateObject, isEnabled} = require("./debug");


const expDataAddress = "experiment.data";

let expData;

const modes = [
  {rateLimit: false, moment: 'random', coeff: 1}, //0
  {rateLimit: false, moment: 'interruptible', coeff: 2}, //1
  {rateLimit: false, moment: 'in-context', coeff: 1}, //2
  {rateLimit: true, moment: 'random', coeff: 2}, //3
  {rateLimit: true, moment: 'interruptible', coeff: 1}, //4
  {rateLimit: true, moment: 'in-context', coeff: 2}, //5
  {rateLimit: false, moment: 'random', coeff: 1}, //6
  {rateLimit: false, moment: 'interruptible', coeff: 2}, //7
  {rateLimit: false, moment: 'in-context', coeff: 1}, //8
  {rateLimit: true, moment: 'random', coeff: 2}, //9
  {rateLimit: true, moment: 'interruptible', coeff: 1}, //10
  {rateLimit: true, moment: 'in-context', coeff: 2} //11
]

const experiment = {
  init: function(){

    console.log("initializing experiment");

    expData = PersistentObject("simplePref", {address: expDataAddress, updateListener: debug.update});

    if (!expData.mode)
      expData.mode = assignRandomMode(JSON.parse(prefs["experiment.default_delMode_weights"]));
  
    console.log("assigned experimental mode: ", expData.mode);

    debug.init();

    if (!("stageForced" in expData))
      expData.stageForced = false;

    if (!("stage" in expData))
      expData.stage = "obs1";

    timer.tickCallback(debug.update);
    timer.tickCallback(checkStage);
  },
  get info(){
    const name = prefs["experiment.name"];
    return {startTimeMs: startTimeMs(), name: name, stage: expData.stage, mode: expData.mode};
  },
  firstRun: function(){
    stages["obs1"]();
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

function checkStage(et, ett){

  if (expData.forcedStage)
    return ;

  let stage = expData.stage;

  let nStage;

  let obs1_l = prefs["experiment.obs1_length_tick"];
  let obs2_l = prefs["experiment.obs2_length_tick"];
  let intervention_l = prefs["experiment.intervention_length_tick"];

  if (ett < obs1_l)
    nStage = "obs1";
  else
    if (ett < obs1_l + intervention_l)
      nStage = "intervention";
    else
      if (ett < obs1_l+ intervention_l + obs2_l)
        nStage = "obs2";
      else
        nStage = "end";

  if (nStage === stage)
    return;

  //prepare the new stage
  stages[nStage]();

  expData.stage = nStage;

  require("./logger").logExpStageAdvance({newstage: nStage});

  console.log("starting new experiment stage: " + nStage);
}

const stages = {
  obs1: function(){

    prefs["delivery.mode.observ_only"] = true;
    let mode = expData.mode;
    prefs["delivery.mode.rate"] = mode.rateLimit;
    prefs["delivery.mode.moment"] = mode.moment;
    prefs["route.coefficient"] = String(mode.coeff);

  },
  intervention: function(){
    prefs["delivery.mode.observ_only"] = false;
    console.log("intervention stage started.");
  },
  obs2: function(){
    prefs["delivery.mode.observ_only"] = true;
  },
  end: function(){
    require("./utils").selfDestruct("end");
  }
};

function timeUntilNextStage(){
  let obs1_l = prefs["experiment.obs1_length_tick"];
  let obs2_l = prefs["experiment.obs2_length_tick"];
  let intervention_l = prefs["experiment.intervention_length_tick"];

  let stage = expData.stage;

  let ett = timer.elapsedTotalTime();

  switch(stage){
    case "obs1":
      return obs1_l - ett;
      break;
    case "intervention":
      return obs1_l + intervention_l - ett;
      break;
    case "obs2":
      return obs1_l + intervention_l + obs2_l - ett;
      break;
    case "end":
      return 0;
      break;
  }
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(){

    if (!isEnabled) return;

    let updateObj = {};
    updateObj.stage = expData.stage;
    updateObj.nextStage = ({"obs1": "intervention", "intervention": "obs2", "obs2": "end"})[updateObj.stage];
    updateObj.stageForced = expData.stageForced;
    updateObj.timeUntilNextStage = timeUntilNextStage();

   
    dumpUpdateObject(updateObj, {list: "Experiment"});
  },

  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){
      case "stage": //forces the stage

      let subArgs = params.split(" ");

      if (subArgs[0] !== "force") return;

        if (subArgs[1] == "none"){
          expData.stageForced = false;
          return "back to normal stage determination";
        }

        if (!stages[subArgs[1]])
          return "error: no such stage exists.";

        stages[subArgs[1]]();
        expData.stageForced = true;

        expData.stage = subArgs[1];

        return "warning: experiment stage forced to " + params;

        break;
      default: 
        return undefined;
    }

    return " ";
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