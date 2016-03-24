/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {PersistentObject} = require("./utils");
const {prefs} = require("sdk/simple-prefs");
const {merge} = require("sdk/util/object");
const timer = require("./timer");
const {setTimeout} = require("sdk/timers");
const {handleCmd, dumpUpdateObject, isEnabled} = require("./debug");

const expDataAddress = "experiment.data";

let expData;

const modes = [
  {rateLimit: 'easy', moment: 'random', coeff: 1}, //0
  {rateLimit: 'easy', moment: 'random', coeff: 2}, //1
  {rateLimit: 'easy', moment: 'in-context', coeff: 1}, //2
  {rateLimit: 'easy', moment: 'in-context', coeff: 2}, //3
  {rateLimit: 'easy', moment: 'interruptible', coeff: 1}, //4
  {rateLimit: 'easy', moment: 'interruptible', coeff: 2}, //5
  {rateLimit: 'strict', moment: 'random', coeff: 1}, //6
  {rateLimit: 'strict', moment: 'random', coeff: 2}, //7
  {rateLimit: 'strict', moment: 'in-context', coeff: 1}, //8
  {rateLimit: 'strict', moment: 'in-context', coeff: 2}, //9
  {rateLimit: 'strict', moment: 'interruptible', coeff: 1}, //10
  {rateLimit: 'strict', moment: 'interruptible', coeff: 2} //11
]

const quickCodes = {
  "er1": 0,
  "er2": 1,
  "ec1": 2,
  "ec2": 3,
  "ei1": 4,
  "ei2": 5,
  "sr1": 6,
  "sr2": 7,
  "sc1": 8,
  "sc2": 9,
  "si1": 10,
  "si2": 11
}

const experiment = {
  init: function(){

    console.log("initializing experiment");

    expData = PersistentObject("simplePref", {address: expDataAddress, updateListener: debug.update});

    if (!expData.mode)
      setMode();

    debug.init();

    if (!("stageForced" in expData))
      expData.stageForced = false;

    if (!("stageTimes" in expData))
      expData["stageTimes"] = {};

    if (!(expData.stage)){
      console.log("experiment stage set to obs1 due to no existing stage");
      expData.stage = "obs1";
    }

    timer.onTick(checkStage);
    timer.onTick(debug.update);
    timer.onTick(updateStageEt);

    debug.update();

  },
  get info(){
    const name = prefs["experiment.name"];

    let stTimeMs = startTimeMs();
    return {startTimeMs: stTimeMs,
            startLocaleTime: (new Date(Number(stTimeMs))).toLocaleString(),  
            name: name, stage: expData.stage,
            mode: expData.mode};
  },
  get stage(){
    return expData.stage;
  },
  get stageTimes(){
    return expData.stageTimes;
  },
  firstRun: function(){
    setStage("obs1");
  }
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

function updateStageEt(){
  let stageTimes = expData.stageTimes;
  stageTimes[expData.stage].elapsedTime += 1;
  expData.stageTimes = stageTimes;
}

function setStage(nStage){

  let stageTimes = expData.stageTimes;

  let stage = expData.stage;
  let duration;
  let et;

  if (stage && stageTimes[stage]){
    stageTimes[stage].end = Date.now().toString();
    duration = Number(Date.now() - Number(stageTimes[stage].start))/(1000 * prefs["timer.tick_length_s"]);
    stageTimes[stage].duration = duration;
    et = stageTimes[stage].elapsedTime;
  }

  expData.stage = nStage;

  if (!stageTimes[nStage]){
    stageTimes[nStage] = {start: Date.now().toString(), end: null, elapsedTime: 0}
  }

  expData.stageTimes = stageTimes;

  require("./logger").logExpStageAdvance({newstage: nStage, oldStage: stage, duration: duration, elapsedTime: et});

   //prepare the new stage
  stages[nStage]();

  console.log("starting new experiment stage: " + nStage);
}

function checkStage(et, ett){

  if (expData.stageForced)
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

  setStage(nStage);
}

const stages = {
  obs1: function(){
    prefs["delivery.mode.observ_only"] = true;
    let mode = expData.mode;
    // fr silence disabled and ignored in wp
    // prefs["timer.silence_length_s"] = 
    //   timer.tToS(prefs["delivery.mode.silence_length." + prefs["delivery.mode.rate_limit"]]);
    prefs["delivery.mode.moment"] = mode.moment;
    prefs["delivery.mode.rate_limit"] = mode.rateLimit;
    prefs["route.coefficient"] = String(mode.coeff);
    console.log("obs1 stage started.");
  },
  intervention: function(){
    prefs["delivery.mode.observ_only"] = false;
    console.log("intervention stage started.");

    require("./moment-report").log();

    require('./stats').log();
  },
  obs2: function(){
    prefs["delivery.mode.observ_only"] = true;

    require("./fr/feature-report").log();
    require("./moment-report").log();
    require('./stats').log();

    console.log("obs2 stage started.");
  },
  end: function(){
    prefs["delivery.mode.observ_only"] = true;

     require("./self").getPeriodicInfo(function(info){
        require("./logger").logPeriodicSelfInfo(info);

        require("./fr/feature-report").log();
        require("./moment-report").log();
        require('./stats').log();

        // flush the remaining log messages
        require('./sender').flush();
    });

    // delay to give some time for the remaining message queue to be flushed
    setTimeout(function() {require("./utils").selfDestruct("end");}, prefs["experiment.modes.end.delay"])
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

    if (!isEnabled()) return;

    let updateObj = {};
    updateObj.stage = expData.stage;
    updateObj.nextStage = ({"obs1": "intervention", "intervention": "obs2", "obs2": "end"})[updateObj.stage];
    updateObj.stageForced = expData.stageForced;
    updateObj.timeUntilNextStage = timeUntilNextStage();
    updateObj.mode = expData.mode;

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

          setStage(subArgs[1]);
          expData.stageForced = true;

          return "warning: experiment stage forced to " + subArgs[1];

          break;
      default: 
        return undefined;
    }

    return " ";
  }

}

function setMode(weights){
  weights = weights || JSON.parse(prefs["experiment.default_delMode_weights"]);
  console.log(weights);

  let modeCode = require("./utils").weightedRandomInt(JSON.parse(prefs["experiment.default_delMode_weights"]));
  
  if (prefs["experiment.override_mode"]){
    console.log("experiment mode overrided");
    modeCode = quickCodes[prefs["experiment.override_mode"]];
  }

  expData.mode = modes[modeCode];
  console.log("assigned experimental mode: ", expData.mode, " code: ", modeCode);
}

// exports.expData = expData;
module.exports = experiment;