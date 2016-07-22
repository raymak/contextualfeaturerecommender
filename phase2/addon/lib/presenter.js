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

const present = function(aRecommendation){
  let data = aRecommendation.presentationData;
  for (let channel in data){
      if (channels[channel])
        channels[channel].present(aRecommendation);
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

exports.present = present;
exports.stop = stop;