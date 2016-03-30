/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const sp = require("sdk/simple-prefs");
const prefs = sp.prefs;
const {merge} = require("sdk/util/object");
const {URL} = require("sdk/url");
const {Cu, Cc, Ci} = require("chrome");

exports.extractOpts = function(str){
  let obj = {};

    str = str.trim();
  
  let headerInd = str.indexOf(" -");
  if (headerInd < 0) headerInd = str.length;
  let headerExp = str.slice(0, headerInd).trim();
  let keysExp = str.slice(headerInd);

  obj.header = headerExp;

  let i = 0;
  let keysArr = keysExp.split(/ +-/);
  keysArr.shift(); // removing the first "" item

  keysArr.forEach(function(key){
    let regex = /^([^ ]*) +(.*)$/.exec(key);
    
    if (!regex)
      obj[key] = true;
    else
      {
        obj[regex[1]]=regex[2];
      }
   });

  return obj;
}

exports.isPowerOf2 = function(num){
  if (!num)
    return false;

  let num2 = num/2;
  if (num==1)
    return true;
  if (num2 !== Math.floor(num2))
    return false;
  
  return exports.isPowerOf2(num2);
}

//weights have to be integers
exports.weightedRandomInt = function(weightsArr){
  let sum = weightsArr.reduce(function(pv, cv) { return pv + cv; }, 0);

  let randInt = Math.floor(Math.random() * sum);

  let index = 0;
  let cummWeight = weightsArr[0];

  for (let i = 0; i < sum; i++){
    while (i == cummWeight) {index++; cummWeight += weightsArr[index];}
    if (randInt == i) return index;
  }
};

exports.arraysEqual = function(arr1, arr2){
  if (arr1.length != arr2.length)
    return false;

  let equal = true;

  arr1.forEach(function(val, ind){
    if (val !== arr2[ind])
      equal = false;
  });

  return equal;
}

exports.wordCount = function(str){
  return str.split(" ").length;
};

exports.isHostVideo = function(host){
  let list = [
    "www.youtube.com",
    "www.netflix.com",
    "vimeo.com",
    "screen.yahoo.com",
    "www.hulu.com",
    "www.dailymotion.com",
    "www.liveleak.com",
    "www.twitch.tv",
    "vine.co"
  ];

  return (list.indexOf(host) !== -1);
}

// returns whether the active tab is one of the well known video websites
// and is playing sound
// use the attribute 'muted' to check if it is muted
exports.isVideoPlaying = function(){

  let tabs = require('sdk/tabs');
  const {viewFor} = require("sdk/view/core");  

  let hostname = URL(tabs.activeTab.url).hostname;

  if (exports.isHostVideo(hostname))
      return viewFor(tabs.activeTab).getAttribute("soundplaying") === "true";

  return false;
}

// returns whether the active tab is playing sound
// does not check if it's muted
exports.isSoundPlaying = function(){
  let tabs = require('sdk/tabs');
  const {viewFor} = require("sdk/view/core");

  return viewFor(tabs.activeTab).getAttribute("soundplaying") === "true";
}

function getFhrData(callback){

  console.log("starting to get FHR data");

  try {
    if (Cu.import("resource://gre/modules/TelemetryEnvironment.jsm"))
      getFhrDataV4(callback);
    else
      getFhrDataV2(callback);
  }
  catch(e){
    console.log("warning: could not get fhr data", e.message);
    require('./logger').logWarning({code: "no_fhr", message: "could not receive fhr info."});
    callback(0,0,0, null);
  }

}

function getFhrDataV2(callback){
  console.log("getting fhr v2");

  var fhrReporter;

  
  fhrReporter = Cc["@mozilla.org/datareporting/service;1"]
                 .getService(Ci.nsISupports)
                 .wrappedJSObject
                 .healthReporter;


  fhrReporter.onInit().then(function() {
    return fhrReporter.collectAndObtainJSONPayload(true);
  }).then(function(data) {
    parseFhrPayloadV2(data, callback);
  });
}

function getFhrDataV4(callback){
   console.log("getting fhr v4");

  Cu.import("resource://gre/modules/TelemetryStorage.jsm");

  TelemetryStorage.loadArchivedPingList().then(function(map){
    parseFhrPayloadV4(map, callback);
  }).catch(function(reason){console.log(reason.message)});
    
}
// parses the fhr 'data' object and calls the callback function when the result is ready.
// https://github.com/raymak/contextualfeaturerecommender/issues/136

function parseFhrPayloadV2(data, callback){
  // console.log(data);
  console.log("parsing FHR payload");

  var days = data.data.days;

  var nowDate = new Date();
  
  var todayDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0 ,0, 0);
  console.log("today: ", todayDate.toString());

  var aMonthAgoDate = new Date(todayDate.getTime() - 30 * 24 * 3600 * 1000);
  console.log("one mongth ago: ", aMonthAgoDate.toString());

  var totalActiveTicks = 0;

  var totalTime = 0;
  
  var profileAgeDays = Date.now()/(86400*1000) - data.data.last["org.mozilla.profile.age"].profileCreation;

  for (var key in days){
    if (days.hasOwnProperty(key)){

      var dateRegExp = new RegExp("(.*)-(.*)-(.*)");
      var allQs = dateRegExp.exec(key);
      // console.log(allQs[1], allQs[2], allQs[3]);

      let tmpDate = new Date(days[key]);
      let date = new Date(parseInt(allQs[1], 10), parseInt(allQs[2] - 1, 10), parseInt(allQs[3], 10), 0, 0, 0, 0);
      // console.log(date.toString());

      if (date >= aMonthAgoDate && date < todayDate){
        if (days[key]["org.mozilla.appSessions.previous"]){
          if (days[key]["org.mozilla.appSessions.previous"].cleanActiveTicks)
            days[key]["org.mozilla.appSessions.previous"].cleanActiveTicks.forEach(function (elm){
              totalActiveTicks += elm;
            });
          if (days[key]["org.mozilla.appSessions.previous"].cleanTotalTime)
            days[key]["org.mozilla.appSessions.previous"].cleanTotalTime.forEach(function (elm){
              totalTime += elm;
            });
        }
      }
    }

  }

  let todayKey = [todayDate.getFullYear(), "-",
                  ('0' + (todayDate.getMonth() + 1)).slice(-2), "-",
                  ('0' + todayDate.getDate()).slice(-2)].join("");

  let isDefaultBrowser = null;

  if (days[todayKey] && days[todayKey]["org.mozilla.appInfo.appinfo"])
    isDefaultBrowser = !!days[todayKey]["org.mozilla.appInfo.appinfo"].isDefaultBrowser;

  console.log("profileAgeDays", profileAgeDays, "totalActiveTicks", totalActiveTicks, "totalTime", totalTime, "isDefaultBrowser", isDefaultBrowser);

  // no crash count or session count reported for v2
       callback({
                profileAgeDays: profileAgeDays, totalActiveTicks: totalActiveTicks,
                totalTime: totalTime, isDefaultBrowser: isDefaultBrowser,
                crashCount: null, sessionCount: null
              });
    // console.log(JSON.stringify(data.data, null, 2));
    // return usage statistic
}

function parseFhrPayloadV4(map, callback){

  Cu.import("resource://gre/modules/TelemetrySession.jsm");

  let lastPayload = TelemetrySession.getPayload();

  var nowDate = new Date();

  var todayDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0 ,0, 0);
  console.log("today: ", todayDate.toString());

  var aMonthAgoDate = new Date(todayDate.getTime() - 30 * 24 * 3600 * 1000);
  console.log("one mongth ago: ", aMonthAgoDate.toString());

  
  Cu.import("resource://gre/modules/ProfileAge.jsm");
  var profileAgeDays;

  Cu.import("resource://gre/modules/TelemetryEnvironment.jsm");

  let isDefaultBrowser = TelemetryEnvironment.currentEnvironment.settings.isDefaultBrowser;

  var promises = [];

  let totalTime = 0;
  let totalActiveTicks = 0;
  let crashCount = 0;
  let sessionCount = 0;

  for (var [k, v] of map){
      console.log(k, v);

      if (v["type"] !== "main" && v["type"] !== "crash")
        continue;

      let date = new Date(v["timestampCreated"]);
      if (!(date >= aMonthAgoDate && date < todayDate))  // only consider the pings from a month ago 
        continue;

      if (v["type"] == "crash"){
        crashCount +=1;
        continue;
      }

      promises.push(TelemetryStorage.loadArchivedPing(k));
    }

    Promise.all(promises).then(function(subsessionArr){
      subsessionArr.forEach(function(subsession){
        let pd = subsession.payload;
        totalTime += pd.info.subsessionLength;
        totalActiveTicks += pd.simpleMeasurements.activeTicks;
        sessionCount += (pd.info.reason == 'shutdown')? 1: 0;
      });

      return (new ProfileAge()).getOldestProfileTimestamp();
    }).then(function(oldestTimestamp){
      profileAgeDays = (Date.now() - oldestTimestamp)/(86400*1000);
      console.log("profileAgeDays", profileAgeDays, "totalActiveTicks", totalActiveTicks, "totalTime", totalTime, "isDefaultBrowser", isDefaultBrowser);
      callback({
                profileAgeDays: profileAgeDays, totalActiveTicks: totalActiveTicks,
                totalTime: totalTime, isDefaultBrowser: isDefaultBrowser,
                crashCount: crashCount, sessionCount: sessionCount
              });
    });     
}

exports.cleanUp =  function(options){
  //note: preferences defined in package.json cannot be deleted
  if (options && options.reset){

    console.log("cleaning up the stats indexeddb database");

    const config = {
      name: 'stats-db',
      version: 1
    }
    
    const AS = require("./async-storage").AsyncStorage;
    
    AS.open(config);

    AS.clear().then(function(){
      AS.length().then((l) => {if (l == 0) console.log("indexeddb clear confirmed")});
    }).catch((e)=>{throw e});

    console.log("resetting preferences...");
    for (let pref in prefs){
      if (pref.slice(0,3) !== 'sdk'){
        console.log('resetting ' + pref + '...');
        require('sdk/preferences/service').reset(['extensions', require('sdk/self').id, pref].join('.'));
      }
    }
  }
  else
    console.log("cleaning up cancelled.");
}

exports.dateTimeToString = function(date){
  let n = date.toDateString();
  let time = date.toLocaleTimeString();

  return (n + ' ' + time);
}

exports.overridePrefs = function(fileName){
  let pj = require("sdk/self").data.load(fileName);

  try {var newPrefs = JSON.parse(pj)}
  catch(e){console.log("failed to parse " + fileName + " as json")}

  for (let p in newPrefs){
    if (p === null)
      continue;

    if (p in prefs)
      console.log("overriding " + p + ": " + prefs[p] + "-> " + newPrefs[p]);
    else
      console.log("creating " + p + ": " + newPrefs[p]);

    prefs[p] = newPrefs[p];
  }
}

exports.selfDestruct = function(reason){
  console.log("self-destructing...");
  console.log("Goodbye cruel world... I'm leaving you today...");

  if (reason === undefined)
    reason = "unknown";

  require("./logger").logSelfDestruct({reason: reason});

  if (prefs["cleanup_on_death"])
    exports.cleanUp({reset: true});

  return require("sdk/addon/installer")
    .uninstall(require("sdk/self").id);
}

const debug = {
  init: function(){
    require("./debug").handleCmd(this.parseCmd);
  },
  update: function(){

  },
  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
      let args = patt.exec(cmd);
      
      if (!args)  //does not match the basic pattern
        return false;

      let subArgs, id;

      let name = args[1];
      let params = args[2];

      switch(name){
        case "isVideoPlaying":
          return exports.isVideoPlaying();
          break;

        case "isSoundPlaying":
          return exports.isSoundPlaying();
          break;

        case "fhr":
          if (params === 'dump'){
            getFhrData(function(profileAgeDays, totalActiveTicks, totalTime, isDefaultBrowser, crashCount, sessionCount){
              console.log(profileAgeDays, totalActiveTicks, totalTime, isDefaultBrowser, crashCount, sessionCount);
            });
          }

          break;

        case "pref":
          
          subArgs = patt.exec(params);
          let pref = subArgs[1];
          let value = subArgs[2];

          if (!pref)
            return "error: incorrect use of pref command.";

          //getting
          if (!value){ 
            if (!prefs[pref])
              return pref + " does not exist.";

            return pref + ": " + prefs[pref];
          } 

          prefs[pref] = JSON.parse(value);

          //setting
          if (!prefs[pref]) 
            return pref + " created: " + value;
          else
            return pref + " updated: " + value;

          break;

        default: 
          return undefined;
      }

      return " ";
    }
};

debug.init();


exports.getFhrData = getFhrData
exports.override  = function() merge.apply(null, arguments);


