/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const timer = require("./timer");
const {PersistentObject} = require("./utils");
const {prefs} = require("sdk/simple-prefs");
const {tToS, sToT} = require("./timer");


const momentDataAddress = "moment.data";

const momentData = PersistentObject("simplePref", {address: momentDataAddress});

const countRecent = function(momentData, win_length_tick){
  let count = 0;
  let now = Date.now();

  for (let t of momentData.timestamps)
    if (now - t < tToS(win_length_tick)*1000)
      count = count + 1;

  return count;

}

const updateFrequencies = function(name){

  console.log("updating frequencies: ", name);
  let names;

  if (name)
    names = [].push(name);
  else {
    names = Object.keys(momentData); //update all
    // console.log(names);
  }

  for (let i in names){
    name = names[i];
    let data = momentData[name];
    let dEffFrequency = 1/prefs["moment.dEffFrequency_i"];
    data.frequency = (data.count / timer.elapsedTime()) || 0;
    data.totalFrequency = (data.count / timer.elapsedTotalTime()) || 0;
    data.effFrequency = (data.effCount / timer.elapsedTime()) || 0;
    data.effTotalFrequency = (data.effCount / timer.elapsedTotalTime()) || 0;
    data.rEffCount = countRecent(data, prefs["moment.recent_window_length"]);
    data.rEffFrequency = data.rEffCount/prefs["moment.recent_window_length"];
    data.samplingProb = data.frequency < dEffFrequency ? 1 : (dEffFrequency/data.frequency) ;
    momentData[name] = data;
  }
}

exports.updateFrequencies = updateFrequencies;