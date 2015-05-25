"use strict";

const {elapsedTime} = require("timer");
const {merge} = require("sdk/util/object");
const override  = function() merge.apply(null, arguments);

function log(type, attrs){

  let OUT = {ts: Date.now(),
    et: elapsedTime(),
    experiment_version: 1,
    addon_version: 1,
    test_mode:  true,
    userid:   1

  }

  OUT = override(OUT, {type: type, attrs: attrs});

  console.log(OUT);

}


function logRecommUpdate(oldStatus, newStatus){
  // log("RECOMM_STATUS_UPDATE", {oldStatus: oldStatus, newStatus: newStatus});
}


exports.logRecommUpdate = logRecommUpdate;

