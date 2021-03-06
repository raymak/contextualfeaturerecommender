/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {PersistentObject} = require("./storage");
const {prefs} = require("sdk/simple-prefs");
const {merge} = require("sdk/util/object");
const timer = require("./timer");
const {setTimeout} = require("sdk/timers");
const {handleCmd, dumpUpdateObject, isEnabled} = require("./debug");
const {modes, quickCodes} = require('./experiment-modes');

const expDataAddress = "experiment.data";

let expData;

const experiment = {
  init: function(){

    console.log("initializing experiment");

    return PersistentObject("osFile", {address: expDataAddress})
    .then((obj)=> {
      expData = obj;
      expData.on('update', debug.update);
    }).then(this._init);
  },
  _init: function(){

    console.time("experiment init");

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

    console.timeEnd("experiment init");

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
  get currStageTimes(){
    let currStage = expData.stage;
    return {et: expData.stageTimes[expData.stage].elapsedTime, ett: timer.elapsedTotalTime(currStage)};
  },
  firstRun: function(){
    return setStage("obs1");
  },
  // also sets user id for the first time
  get userId(){
    if (!expData.userId){
      expData.userId = require("sdk/util/uuid").uuid().toString().slice(1,-1); //set for the first time
      prefs["userId"] = expData.userId; // for easier reading of userId
    }
    
    return expData.userId
  },
  checkStage: checkStage
}

// also sets start date when called for the first time
function startTimeMs(){  
  if (!("startTimeMs" in expData)){
    expData.startTimeMs = Date.now().toString(); // set for the first time 
    prefs["startTimeMs"] = expData.startTimeMs; // for easier reading og start time
  }

  return expData.startTimeMs;
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

  console.log("starting new experiment stage: " + nStage);

   //prepare the new stage
  return stages[nStage]();
}

function checkStage(et, ett){

  if (expData.stage === "end")
    end();  // in case the end stage has not been properly executed (e.g. due to crash)

  if (expData.stageForced)
    return ;
  
  // when called from index.js
  if (ett === undefined)
    ett = timer.elapsedTotalTime();

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

  return setStage(nStage);
}

const stages = {
  obs1: function(){

    return PersistentObject("osFile", {address: "delivery.data"})
    .then((deliveryData)=> {

      let mode = expData.mode;

      deliveryData.mode = {observ_only: true, rate_limit: mode.rateLimit, moment: mode.moment};
    })
    .then(()=> PersistentObject("osFile", {address: "timer.data"}))
    .then((timerData)=> {
      timerData.silence_length_s = 
          timer.tToS(prefs["delivery.mode.silence_length." + expData.mode.rate_limit]);

      require('./route').coefficient(String(expData.mode.coeff));

      console.log("obs1 stage started.");
    });

  },
  intervention: function(){

    return PersistentObject("osFile", {address: "delivery.data"})
    .then((deliveryData)=> {

      deliveryData.mode = merge(deliveryData.mode, {observ_only: false});

      console.log("intervention stage started.");

      require("./feature-report").log();
      require('./stats').log();
    });
  },
  obs2: function(){
    return PersistentObject("osFile", {address: "delivery.data"})
    .then((deliveryData)=> {

      deliveryData.mode = merge(deliveryData.mode, {observ_only: true});

      require('./presenter').stop();

      require("./feature-report").log();
      require('./stats').log();

      console.log("obs2 stage started.");

    });
  },
  end: end
};

function end(){

  if (!prefs["survey_handled_by_xutils"]  && prefs["experiment.enable_post_study_survey"]){
    require("sdk/tabs").open("https://qsurvey.mozilla.com/s3/cfr-end-of-study?"
     + ["userid=" + experiment.userId,
        "coeff=" + expData.mode.coeff,
        "moment=" + expData.mode.moment,
        "rate_limit=" + expData.mode.rateLimit].join("&")
      );
  }

    // to make sure no notifications are delivered during the delay
  return PersistentObject("osFile", {address: "delivery.data"})
  .then((deliveryData)=> {

    deliveryData.mode = merge(deliveryData.mode, {observ_only: true});
    require('./presenter').stop();

    require("./feature-report").log();
    require('./stats').log();

    require('./logger').logEnd();

    require("./self").getPeriodicInfo(function(info){
      require("./logger").logPeriodicSelfInfo(info);

      // flush the remaining log messages
      require('./sender').flush();
    });

    // delay to give some time for the remaining message queue to be flushed
    if (!prefs["death_handled_by_xutils"] && !prefs["experiment.live_forever"])
      setTimeout(function() {require("./utils").selfDestruct("end");}, prefs["experiment.modes.end.delay"]);
  });
}

function timeUntilNextStage(){
  let obs1_l = prefs["experiment.obs1_length_tick"];
  let obs2_l = prefs["experiment.obs2_length_tick"];
  let intervention_l = prefs["experiment.intervention_length_tick"];

  let stage = expData.stage;

  let ett = timer.elapsedTotalTime();

  switch(stage){
    case "obs1":
      return obs1_l - ett;
      // break;
    case "intervention":
      return obs1_l + intervention_l - ett;
      // break;
    case "obs2":
      return obs1_l + intervention_l + obs2_l - ett;
      // break;
    case "end":
      return 0;
      // break;
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
      case "stage": {//forces the stage

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

        // break;
      }

      default: 
        return undefined;
    }
  }

}

function setMode(weights){
  weights = weights || JSON.parse(prefs["experiment.default_delMode_weights"]);
  console.log(weights);

  let modeCode = require("./utils").weightedRandomInt(JSON.parse(prefs["experiment.default_delMode_weights"]));
  
  if (prefs["shield.variation"]){
    console.log("experiment mode set by shield varations");
    modeCode = quickCodes[prefs["shield.variation"]];
  }

  // currently shield variation and override_mode are not compatible
  // because survey url is generated by shield variation
  if (!prefs["shield.variation"] && prefs["experiment.override_mode"]){
    console.log("experiment mode overrided");
    modeCode = quickCodes[prefs["experiment.override_mode"]];
  }

  expData.mode = modes[modeCode];
  console.log("assigned experimental mode: ", expData.mode, " code: ", modeCode);
}

// exports.expData = expData;
module.exports = experiment;