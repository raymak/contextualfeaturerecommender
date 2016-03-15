/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {prefs} = require("sdk/simple-prefs");
const {eventData} = require("./event");
const {storage} = require("sdk/simple-storage");
const self = require("./self");
const exp = require("./experiment");
const AS = require("./async-storage").AsyncStorage; //TODO: use async storage as a mode of persistent object
const {dumpUpdateObject, handleCmd, isEnabled} = require("./debug");
const {elapsedTime, elapsedTotalTime, onTick} = require("./timer");
const {PersistentObject} = require("./utils");


const statsDataAddress = "stats.data";
const statsData = PersistentObject("simplePref", {address: statsDataAddress});

const config = {
  name: 'stats-db',
  version: 1
}

function init(){

  console.log("initializing stats");

  AS.open(config);

  if (!statsData.count){
    statsData.eventCount = 0;
  }

  debug.update();

}

function getRouteStats(baseRoute){
  let data = eventData[baseRoute];

  if (!data)
    console.log("warning: no event data for " + baseRoute);
  return data;
}


function event(evtId, prefix){

  if (prefix)
    evtId = [prefix, "-", evtId].join("");

  let instance = getContext();

  AS.getItem(evtId).then(function(evt){
      if (evt){
        evt.instances.push(instance);
        evt.count += 1;
        evt.freq = evt.count / (instance.et+1);
        evt.ifreq = (instance.et+1) / evt.count;
        evt.tfreq = evt.count / (instance.ett);
        evt.tifreq = instance.ett / evt.count;
      }
      else
        evt = { instances: [instance],
                count: 1,
                freq: 1/(instance.et+1),
                ifreq: instance.et+1,
                tfreq: 1/(instance.ett+1),
                tifreq: instance.ett+1 
              };
      return evt;
    }).then(function(evt){
        AS.setItem(evtId, evt);
        statsData.eventCount += 1;
        debug.update(evtId);
      }).catch((e) => {throw e});
} 

function getContext(){

  let now = new Date();

  return {
    ts: now.getTime(),
    hour: now.getHours(),
    day: now.getDay(),
    et: elapsedTime(),
    ett: elapsedTotalTime(),
    stage: exp.info.stage
  };
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(key){

    if (!isEnabled) return;

    if (!prefs["stats.send_to_debug"]) return;

    if (!key){ // update all
      AS.keys().then(function(keys){
        let updateObj = {};

        let promises = [];
        keys.forEach((key) => { promises.push(AS.getItem(key)) });

        return Promise.all(promises).then(function(vals){
          for (let i in keys){
            updateObj[keys[i]] = vals[i];
          }

          return updateObj;
        });
      }).then(function(updateObj){
          dumpUpdateObject(updateObj, {list: "Stats"});
        }).catch((e) => {throw e;});
    }
    else
    {
      AS.getItem(key).then(function(v){
        let obj = {};
        obj[key] = v;
        dumpUpdateObject(obj, {list: "Stats"});
      }).catch((e) => {throw e;});
    }

  },

  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);

    let subArgs;
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];
  }
}


exports.init = init;
exports.event = event;