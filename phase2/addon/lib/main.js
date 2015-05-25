
"use strict";

const {Recommendation} = require("recommendation");
const controller = require("controller");
const {data} = require("sdk/self");
const {WindowTracker} = require("sdk/deprecated/window-utils");

require("presentation/splitpage").init();  //TODO: move somewhere more meaningful
require("presentation/doorhanger").init();
require("experiment").init();
require("timer").init();
// require("debug").init();


const start = function(){

  console.log("Hello World! I am alive :)");

  let recommendations = JSON.parse(data.load("recommendations.json")).map(function(recData){
    return Recommendation(recData);
  });

  controller.recommendations.add.apply(controller.recommendations, recommendations);

  // console.log(gmailNotifier.toString());
  
  controller.init();
}


start();

