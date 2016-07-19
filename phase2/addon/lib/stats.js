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
const AS = require("./async-storage-wrapper").open('stats');
const {dumpUpdateObject, handleCmd, isEnabled, removeList} = require("./debug");
const {elapsedTime, elapsedTotalTime, onTick} = require("./timer");
const {PersistentObject} = require("./storage");
const {merge} = require("sdk/util/object");
const {defer, resolve} = require("sdk/core/promise");

const REPORT_TYPES = ["looseBehavior", "looseFeatureUse", "behavior", "delivery", "extra", "behavior"];

const statsDataAddress = "stats.data";
let statsData;

let medPromise = resolve();

let eventCount;

function init(){

  console.log("initializing stats");
  
  return PersistentObject("osFile", {address: statsDataAddress})
  .then((obj)=> {
    statsData = obj;
  }).then(_init);
}
function _init(){

  if (!("eventCount" in statsData)){
    statsData.eventCount = 0;
  }

  eventCount = statsData.eventCount;

  handleCmd(debug.parseCmd);

  require('./timer').onTick(periodicLog);
  require('./timer').onTick(checkForMemoryLoss);

  checkForMemoryLoss();

  debug.update();
}



function checkForMemoryLoss(){
  AS.getItem("tick").then(function(evt){

    if (!evt){
      console.log("memory loss checker: no previous active tick record found.");
      return;
    }

    let et = evt.lastInstance.et;
    console.log("last et:", et);

    if (elapsedTime() < et){
      require('./logger').logWarning({type: "memory-loss", length: et - elapsedTime()});
      console.log("warning: memory loss detected.");
    }
    else
    {
      console.log("memory loss checker: no memory loss detected.")
    }
  });
}

function getRouteStats(baseRoute){
  let data = eventData[baseRoute];

  if (!data)
    console.log("warning: no event data for " + baseRoute);
  return data;
}


function event(evtId, options, addData, aggregates){

  let type = options && options.type;
  let collectInstance = options && options.collectInstance;
  aggregates = aggregates || {};
  addData = addData || {};

  let evtKey;

  if (type)
    evtKey = ["[", type, "] ", evtId].join("");
  else
    evtKey = evtId;

  let instance = merge({},getContext(), addData);

  const updateEvt = function(ev, typ, id, inst, aggr){
    if (!ev){
      ev = {};
      ev.instances = [];
      ev.aggregates = {};
      ev.count = 0;
      ev.type = typ;
      ev.id = id;
    }

    if (collectInstance) ev.instances.push(inst);
    ev.lastInstance = inst;
    ev.count = ev.count + 1;
    ev.freq = ev.count / (inst.et+1);
    ev.ifreq = (inst.et+1) / ev.count;
    ev.tfreq = ev.count / (inst.ett);
    ev.tifreq = inst.ett / ev.count;

    if (!ev[inst.stage])
      ev[inst.stage] = {count: 0}

    ev[inst.stage].count = ev[inst.stage].count + 1;
    // ev[inst.stage].freq = ev[inst.stage].count / (inst.et+1);
    // ev[inst.stage].ifreq = (inst.et+1) / ev[inst.stage].count;
    // ev[inst.stage].tfreq = ev[inst.stage].count / (inst.ett);
    // ev[inst.stage].tifreq = inst.ett / ev[inst.stage].count;


    // calculating the aggregate values
    for (let k in aggr){

      if (!(k in inst)){
        console.log("warning: aggregate data not provided");
        continue;
      }

      if (!(k in ev.aggregates)){
        ev.aggregates[k] = {
          type: aggr[k],
          count: 0,
          value: 0
        }
      }

      switch(aggr[k]){
        case 'average':
          ev.aggregates[k].value = ev.aggregates[k].value*ev.aggregates[k].count + inst[k];
          ev.aggregates[k].count += 1;
          ev.aggregates[k].value /= ev.aggregates[k].count;
          break;
        default:

      }

    }

    return ev;
  };

  medPromise = medPromise.then(()=> AS.getItem(evtKey).then(function(evt){
      return updateEvt(evt, type, evtId, instance, aggregates);
    })).then(function(evt){
        eventCount += 1;
        if (eventCount % 20 == 0)
          statsData.eventCount = eventCount;
        return AS.setItem(evtKey, evt).then(()=> debug.update(evtKey));
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
    stage: exp.stage
  };
}

function periodicLog(et, ett){
  if (et % 240 !== 150)
    return;

  log();
}

function getEvents(){
  return AS.keys().then(function(ks){

    let promises = [];
    ks.forEach((k) => { promises.push(AS.getItem(k))});

    return Promise.all(promises).then(function(vs){

      return {keys: ks, vals: vs};
    });
  });
}

function log(){

  // log general stats
  
  let info = {};
  getEvents().then(function(items){

    for (let i in items.keys){
      let evt = items.vals[i];
      let key = items.keys[i];

      if (evt.type && !~REPORT_TYPES.indexOf(evt.type)) continue;

      info[key] = evt;
    }
  }).then(function(){require('./logger').logStatsReport(info);})
    .catch((e) => {throw e});
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(key){

    if (!isEnabled()) return;

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

  remove: function(){
    removeList("Stats");
  },

  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);

    let subArgs;
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){
      case "stats":
        switch(params){

          case "on":
            prefs["stats.send_to_debug"] = true;
            debug.update();
            return "stats on";
            break;

          case "off":
            prefs["stats.send_to_debug"] = false;
            debug.remove();
            return "stats off"
            break;

          case "log":
            log();
            break;

          default:
            return "warning: incorrect use of the stats command.";

        }

        break;

      default:
        return undefined;
    }

    return " ";
  }
}


exports.init = init;
exports.event = event;
exports.log = log;