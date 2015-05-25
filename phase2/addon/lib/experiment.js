"use strict";

const {PersistentObject} = require("utils");
const {prefs} = require("sdk/simple-prefs");

const expDataAddress = "experiment";

// const expData = PersistentObject("simplePref", {address: expDataAddress});

const init = function(){
  // expData.mode = {rateLimit: true, moment: 'interruptible'};
  //rate limit {true, false}
  //moment {'interruptible', 'random', 'in-context'}
};

const mode = function(){
  return {
    rateLimit: prefs["exp_mode_rate"],
    moment: prefs["exp_mode_moment"]
  }
}

// exports.expData = expData;
exports.init = init;
exports.mode = mode;