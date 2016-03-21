/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const channels = {
                  splitpage: require("./presentation/splitpage"),
                  desktopnotification: require("./presentation/desktopnotification"),
                  doorhanger: require("./presentation/doorhanger")
                };

const prefs = require("sdk/simple-prefs").prefs;
const {extractPresentationData} = require("./recommendation");

const present = function(aRecommendation, cmdCallback){
  return ;
  let data = aRecommendation.presentationData;
  for (let channel in data){
      if (channels[channel])
        channels[channel].present(aRecommendation, cmdCallback);
      else
        if (channel != '*')
          console.log("warning: no presenter module named '" + channel + "' was found.");
  }
}

function stop(){
  console.log("stopping presentation channels");

  for (let ch in channels)
    if (channels[ch].stop) channels[ch].stop();
}

const log = {present: function(aRecommendation){
  let data = extractPresentationData.call(aRecommendation, "log");
  console.log("presenting recommendation: " + data.message);
  }
};


exports.present = present;
exports.stop = stop;