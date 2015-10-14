"use strict";

const {PersistentObject} = require("./utils");
const {prefs} = require("sdk/simple-prefs");
const {merge} = require("sdk/util/object");
const timer = require("./timer");
const {handleCmd, dumpUpdateObject, isEnabled} = require("./debug");
const logger = require("./logger");


const expDataAddress = "experiment.data";

let expData;

const experiment = {
  init: function(){
  // expData.mode = {rateLimit: true, moment: 'interruptible'};
  //rate limit {true, false}
  //moment {'interruptible', 'random', 'in-context'}
  console.log("initializing experiment");

  expData = PersistentObject("simplePref", {address: expDataAddress, updateListener: debug.update});

  debug.init();

  if (!("stageForced" in expData))
    expData.stageForced = false;

  if (!("stage" in expData))
    expData.stage = "obs1";

  timer.tickCallback(debug.update);
  timer.tickCallback(checkStage);


  },
  get info(){
    return {startTimeMs: startTimeMs(), stage: expData.stage};
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
  stages[nStage];

  expData.stage = nStage;

  logger.logExpStageAdvance({newstage: nStage});

  console.log("starting new experiment stage: " + nStage);
}

const stages = {
  obs1: function(){

  },
  intervention: function(){


  },
  obs2: function(){

  },
  end: function(){

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

        if (params == "none"){
          expData.stageForced = false;
          return "back to normal stage determination";
        }

        if (!stages[params])
          return "error: no such stage exists.";

        stages[params]();
        expData.stageForced = true;

        expData.stage = params;

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