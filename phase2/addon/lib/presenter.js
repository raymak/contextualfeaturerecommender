"use strict";

const splitpage = require("./presentation/splitpage");
const desktopnotification = require("./presentation/desktopnotification");
const doorhanger = require("./presentation/doorhanger");
const prefs = require("sdk/simple-prefs").prefs;
const {extractPresentationData} = require("./recommendation");

const that = this;

const present = function(aRecommendation, cmdCallback){
  let data = aRecommendation.presentationData;
  let channel;
  for (channel in data){
      if (that[channel])
        that[channel].present(aRecommendation, cmdCallback);
      else
        if (channel != '*')
          console.log("warning: no presenter module named '" + channel + "' was found.");
  }
}


const log = {present: function(aRecommendation){
  let data = extractPresentationData.call(aRecommendation, "log");
  console.log("presenting recommendation: " + data.message);
  }
};


exports.present = present;