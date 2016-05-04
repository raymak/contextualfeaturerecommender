/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {setTimeout, clearTimeout, setInterval, clearInterval} = require("sdk/timers");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const tabs = require('sdk/tabs');
const {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
const unload = require("sdk/system/unload").when;
const {Cu, Cc, Ci} = require("chrome");
const {prefs} = require("sdk/simple-prefs");
const {URL} = require("sdk/url");
const windows = require("sdk/windows").browserWindows
const timer = require("./timer");
const {handleCmd} = require("./debug");
const {osFileObjects, PersistentObject} = require("./storage");
const {countRecent, updateFrequencies} = require("./moment");
const events = require("sdk/system/events");
const {merge} = require("sdk/util/object");
const logger = require('./logger');
const statsEvent = require('./stats').event;
const dh = require('./presentation/doorhanger');
const {isPrivate} = require("sdk/private-browsing");

const momentDataAddress = "moment.data";
const deliveryDataAddress = "delivery.data";

let momentData;
let deliveryData;

const observerService = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);

let idleObserver;

function init(){

  console.log("initializing woodpecker controller");

  return PersistentObject("osFile", {address: momentDataAddress})
  .then((obj)=> {
    momentData = obj;
  })
  .then(()=> PersistentObject("osFile", {address: deliveryDataAddress}))
  .then((obj)=> {
    deliveryData = obj;
  })
  .then(_init);
}

function _init(){

  osFileObjects["timer.data"].silence_length_s = prefs["timer.silence_length_s"];

  handleCmd(debug.parseCmd);

  listener.init();
}

const listener = {
  init: function(){

    for (let moment in listener.momentListeners){
      if (!momentData[moment]){
        momentData[moment] = {
          count: 0,
          frequency: 0,
          totalFrequency: 0,
          effCount: 0,
          effFrequency: 0,
          effTotalFrequency: 0,
          rEffCount: 0,
          rEffFrequency: 0,
          rates: [],
          lengths: [],
          timestamps: []
        };
      }
    }
    
    // start moment listeners
    for (let moment in this.momentListeners)
      this.momentListeners[moment]();

    timer.onTick(function(et){updateFrequencies()});

    updateFrequencies();
  }
}

//new tab does not capture opening a new tab by double clicking the area on the right of the tabs
//or opening a link in new tab

listener.momentListeners = {
  "*": function(){

  },

  "startup": function(){
    if (require("sdk/self").loadReason == "startup")
      listener.moment("startup"); 
  },

  "tab-new": function(){
    listener.addEventListener("#cmd_newNavigatorTab", "command", function(e){
        console.log("tab-new");
        listener.moment("tab-new", {reject: true});
      });
  },

  "active-tab-hostname-progress": function(){
    tabs.on("ready", function(tab){
      if (tab.id !== tabs.activeTab.id) return;//make sure it's the active tab
        
        let hostname = URL(tab.url).hostname;

        //TODO: use pattern matching 
        // https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/util_match-pattern
        if (!hostname || hostname === "about:newtab" || hostname === "about:blank") return;//to handle new tabs and blank pages

        //TOTHINK: potential namespace conflict      
        if (hostname === tab.hostname) return; //not a fresh url open

        if (!tab.hostname){
          tab.hostname = hostname;
          unload(function(){if (tab) delete tab.hostname;})
        }
        else
        {
          tab.hostname = hostname;
          listener.moment("active-tab-hostname-progress");   
        }

    });
  },

  "window-open": function(){

    listener.addEventListener("#cmd_newNavigator", "command", function(e){
      listener.moment('window-open');
    });

  },

  "tab-new-recently-active10s": function(){
     listener.addEventListener("#cmd_newNavigatorTab", "command", function(e){

        if (!timer.isRecentlyActive(10, 10))
         return;

         listener.moment('tab-new-recently-active10s');
      });
  },

  "tab-new-recently-active10s-no-tab": function(){
    listener.listenForUserActivity(function(e){
      
      if (!timer.isRecentlyActive(10, 10)) 
       return;

      listener.moment('tab-new-recently-active10s-no-tab', {reject: true});
    });
  },

  "tab-new-recently-active10m": function(){
    listener.addEventListener("#cmd_newNavigatorTab", "command", function(e){
      if (!timer.isRecentlyActive(10, 10*60)) 
       return;

       listener.moment('tab-new-recently-active10m', {reject: true});
    });
  },

  "tab-new-recently-active10m-no-tab": function(){
    
   listener.listenForUserActivity(function(e){
      
      if (!timer.isRecentlyActive(10, 10*60)) 
       return;

      listener.moment('tab-new-recently-active10m-no-tab', {reject: true});
    });
  },

  "tab-new-recently-active20m": function(){
    listener.addEventListener("#cmd_newNavigatorTab", "command", function(e){
      if (!timer.isRecentlyActive(10, 20*60)) 
       return;

       listener.moment('tab-new-recently-active20m', {reject: true});
    });
  },

  "tab-new-recently-active20m-no-tab": function(){
    
    listener.listenForUserActivity(function(e){
      
      if (!timer.isRecentlyActive(10, 20*60)) 
       return;

      listener.moment('tab-new-recently-active20m-no-tab');
    });
  },

  "tab-new-recently-active5m-no-tab": function(){
    
    listener.listenForUserActivity(function(e){
      
      if (!timer.isRecentlyActive(10, 5*60)) 
       return;

      listener.moment('tab-new-recently-active5m-no-tab', {reject: true});
    });
  }
};

listener.addEventListener = function(querySelector, eventName, handler){
  let windowTracker = new WindowTracker({
      onTrack: function(window){
        if (!isBrowser(window)) return;

        let elem = window.document.querySelector(querySelector);
        elem.addEventListener(eventName, handler);
        unload(function(){elem.removeEventListener(eventName, handler)});
      }
    });
};

listener.moment = function(name, options){

  if (!timer.isCertainlyActive()){
    console.log("delivery rejected due to: uncertain activity");
    statsEvent("inactive-reject", {type: "delivery-wp"});
    return;
  }

  statsEvent(name, {type: "moment"});

  let dEffFrequency = 1/prefs["moment.dEffFrequency_i"];

  let canDeliver = true;
  let data = momentData[name];
  let allData = momentData["*"];

  console.log("moment triggered -> " + name);

  data.count = data.count + 1;
  allData.count = allData.count + 1;
  momentData[name] = data;
  momentData["*"] = allData;

  updateFrequencies(name);

  if (isPrivate(getMostRecentBrowserWindow())){
    console.log("delivery rejected due to private browsing");
    require('./stats').event("private-reject", {type: "delivery-wp"});
    canDeliver = false;
  }

  if (options && options.reject){
    canDeliver = false;
    console.log("delivery rejection forced");
    statsEvent("forced-reject", {type: "delivery-wp"})
  }

  if (deliveryData.mode.observ_only){
    canDeliver = false;
    console.log("delivery rejected due to: observation-only period");
    statsEvent("observe-only-reject", {type: "delivery-wp"})

  }

  if (timer.isSilent()){
    canDeliver = false;
    console.log("delivery rejected due to: silence");
    statsEvent("silence-reject", {type: "delivery-wp"});
  }


  if (data.effFrequency && 1/data.effFrequency < prefs["moment.min_effFrequency_i"]){
    canDeliver = false;
    console.log("delivery rejected due to: effective frequency = " + data.effFrequency);
    statsEvent("effective-frequency-reject", {type: "delivery-wp"})
  }

  if (data.rEffCount && data.rEffCount > prefs["moment.max_rEffCount"]){
    canDeliver = false;
    console.log("delivery rejected due to: recent effective count = " + data.effCount);
    statsEvent("recent-effective-count-reject", {type: "delivery-wp"})
  }

  let prob = 1; 
  if (data.frequency < dEffFrequency)
    prob = 1;
  else
    prob = dEffFrequency/data.frequency;

  if (Math.random() > prob){
    canDeliver = false; 
    console.log("delivery rejected due to: sampling, prob = " + prob);
    statsEvent("sampling-prob-reject", {type: "delivery-wp"})
  }

  if (options && options.force){
    console.log("moment notification delivery forced");
    canDeliver = true;
  }

  if (canDeliver){

    console.log("moment notification delivered -> " + name);

    data = momentData[name];
    allData = momentData["*"];
    data.effCount = data.effCount + 1;
    allData.effCount = allData.effCount + 1;
    let ts = data.timestamps;
    let allTs = allData.timestamps;
    ts.push(Date.now());
    allTs.push(Date.now());
    data.timestamps = ts;
    allData.timestamps = allTs;

    momentData[name] = data;
    momentData["*"] = allData; 


    dh.present(function(result){
      let data = momentData[name];
      let allData = momentData["*"];

      if (result.type === "rate"){
        console.log("rate submitted for " + name + ": " + result.rate);
        data.rates.push(result.rate);
        data.lengths.push(result.length);
        allData.rates.push(result.rate);

        statsEvent(name , {collectInstance: true, type: "result"},
         {moment: name, type: result.type, length: result.length, rate: result.rate, mouseenter: result.mouseenter, certainlyactive: result.certainlyactive});
      }
      if (result.type === "timeout"){
        console.log("panel for " + name + " timed out");
        data.rates.push("timeout");
        data.lengths.push("timeout");
        allData.rates.push("timeout");

         statsEvent(name , {collectInstance: true, type: "result"},
         {moment: name, type: "timeout", length: "timeout", rate: "timeout", mouseenter: result.mouseenter, certainlyactive: result.certainlyactive});
      }

      momentData[name] = data;
      momentData["*"] = allData;

      logger.logMomentDelivery(merge({name: name}, result));

      if (prefs["delivery.mode.no_silence"])
        timer.endSilence();

    }, name);

    statsEvent("moment delivered", {moment: name});

    timer.silence();
  }
  // momentData[name] = data;
};

listener.listenForUserActivity = function(callback){
  timer.onUserActive(callback);
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);

    let name = args[1];
    let params = args[2];
    let subArgs;

    switch (name){

      case "moments":
        return Object.keys(listener.momentListeners);
        break;

      case "moment":

        subArgs = params.split(" ");

        let mName = subArgs[0];
        let mode = subArgs[1];

        let short = {
          "s": "startup",
          "athp": "active-tab-hostname-progress",
          "tnra10s": "tab-new-recently-active10s",  
          "tnra10m": "tab-new-recently-active10m",
          "wo": "window-open"
        }

        if (!listener.momentListeners[mName] && !short[mName])
          return "moment '" + mName + "'' does not exist.";

        let m;

        if (listener.momentListeners[mName])
          m = mName;
        else
          m = short[mName];

        listener.moment(m, {force: (mode === "-force")});

        return mName + " triggered.";
        break;


      case "delmode":
        subArgs = patt.exec(params);

        if (!subArgs[0])
          return "error: incorrect use of delmode command.";

        let subMode = subArgs[1];

        switch (subMode){
          case "observ_only":
            if (subArgs[2] != "true" && subArgs[2] != "false") 
              return "error: incorrect use of delmode observ_only command.";

            osFileObjects["delivery.data"].mode = 
              merge(osFileObjects["delivery.data"].mode, {observ_only: modeJSON.parse(subArgs[2])});

            return "observ_only mode is now " + (JSON.parse(subArgs[2]) ? "on": "off");

            break;
          default:
            return "error: incorrect use of delmode command.";
        }
        break;

      default:
        return undefined;
    }

     return " ";
  }

}


exports.init = init;