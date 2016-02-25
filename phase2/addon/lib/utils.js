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

const fhrReporter = Cc["@mozilla.org/datareporting/service;1"]
                   .getService(Ci.nsISupports)
                   .wrappedJSObject
                   .healthReporter;

/**
 * Applies partial arguments to a function
 *
 * @param fn {function} The original function to call
 * @param [arguments] {arguments} The partial arguments to be sent to fn
 *
 * @returns {function} The function that accepts partial arguments to be sent to fn
 */
exports.partial = function(fn /*, arguments */) {
  
  let args = Array.prototype.slice.call(arguments, 1);

  return function(){
    return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
  };
};

exports.extractOpts = function(str){
   let obj = {};

  let headerInd = str.indexOf(" -");
  if (headerInd < 0) headerInd = str.length;
  let headerExp = str.slice(0, headerInd);
  let keysExp = str.slice(headerInd+1);

  obj.header = headerExp;

  let i = 0;
  let keysArr = keysExp.split(" ");

  if (keysExp.length > 0)
    while(i < keysArr.length){
      if (keysArr[i+1] && keysArr[i+1].charAt(0) !== "-"){
        obj[keysArr[i].slice(1)] = keysArr[i+1];
        i = i + 2;
      }
      else {
        obj[keysArr[i].slice(1)] = true;
        i = i + 1;
      }
    }

    return obj;
}


//TODO: add simpleStorage
////TODO: add function definition capabilities using closures
exports.PersistentObject = function(type, options){
  if (type === "simplePref"){
    //create if pref does not exist
    if (!prefs[options.address])
      prefs[options.address] = JSON.stringify({}); 

    let targetObj;

    if (!options.target)
      targetObj = {};
    else
      targetObj = options.target;

    //TOTHINK: some way to cache data to improve performance
    let rObj = new Proxy(targetObj, {
        get: function(target, name) {
          if (!target[name])
            return JSON.parse(prefs[options.address])[name];
          else
            return target[name];
        },
        set: function(target, name, value) {
          if (!Object.hasOwnProperty(target, name)){
            let dataObj = JSON.parse(prefs[options.address]);
            dataObj[name] = value;
            prefs[options.address] = JSON.stringify(dataObj);
          }
          else
            target[name] = value;

          return true;
        },
        ownKeys: function(target){
          return Object.getOwnPropertyNames(target).concat(Object.keys(JSON.parse(prefs[options.address])));
        },
        //ownKeys does not work properly without getOwnDescriptor
        //here is why: https://bugzilla.mozilla.org/show_bug.cgi?id=1110332
        getOwnPropertyDescriptor: function (target, prop){
          return Object.getOwnPropertyDescriptor(target, prop) || Object.getOwnPropertyDescriptor(JSON.parse(prefs[options.address]), prop);
        },
        deleteProperty: function(target, prop){
          if (prop in target){
            return delete target[prop];
          }
          else {
            let dataObj = JSON.parse(prefs[options.address]);
            let res = delete dataObj[prop];
            prefs[options.address] = JSON.stringify(dataObj);
            return res;
          }

          if (options.updateListener)
            options.updateListener(this);
        }
    });

    if (options.updateListener)
      sp.on(options.address, function(pref){
        options.updateListener(rObj);
    });
    return rObj;
  }
};

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

  if (!fhrReporter) 
    {
      console.log("warning: could not get fhr data");
      return;
    }


  console.log("getting FHR data");

    fhrReporter.onInit().then(function() {
      return fhrReporter.collectAndObtainJSONPayload(true)
    }).then(function(data) {
      parseFhrPayload(data, callback);
    });
}

// parses the fhr 'data' object and calls the callback function when the result is ready.
// callback(profileAgeDays, sumMs)
// https://github.com/raymak/contextualfeaturerecommender/issues/136

function parseFhrPayload(data, callback){
  console.log("parsing FHR payload");

  var days = data.data.days;

  var nowDate = new Date();
  
  var todayDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0 ,0, 0);
  console.log(todayDate.toString());

  var aMonthAgoDate = new Date(todayDate.getTime() - 30 * 24 * 3600 * 1000);
  console.log(aMonthAgoDate.toString());

  var sumMs = 0;
  
  var profileAgeDays = Date.now()/(86400*1000) - data.data.last["org.mozilla.profile.age"].profileCreation;

  for (var key in days){
    if (days.hasOwnProperty(key)){

      var dateRegExp = new RegExp("(.*)-(.*)-(.*)");
      var allQs = dateRegExp.exec(key);
      // console.log(allQs[1], allQs[2], allQs[3]);

      let tmpDate = new Date(days[key]);
      let date = new Date(parseInt(allQs[1], 10), parseInt(allQs[2] - 1, 10), parseInt(allQs[3], 10), 0, 0, 0, 0);
      // console.log(date.toString());

      if (date >= aMonthAgoDate && date < todayDate)
        if (days[key]["org.mozilla.appSessions.previous"])
          if (days[key]["org.mozilla.appSessions.previous"].cleanActiveTicks)
            days[key]["org.mozilla.appSessions.previous"].cleanActiveTicks.forEach(function (elm){
                  sumMs = sumMs + elm * 5 * 1000;
            });


    }
  }
  console.log("sumMs", sumMs);

  callback(profileAgeDays, sumMs);

    // console.log(JSON.stringify(data.data, null, 2));
    // return usage statistic
}

exports.cleanUp =  function(options){
  //note: preferences defined in package.json cannot be deleted
  if (options && options.reset){
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

  try{var newPrefs = JSON.parse(pj)}
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


