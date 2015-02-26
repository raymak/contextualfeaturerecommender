

"use strict";

const {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const {URL} = require("sdk/url");
const {getBrowserForTab, getTabForId} = require("sdk/tabs/utils");
const tabs = require("sdk/tabs");
const prefs = require("sdk/simple-prefs").prefs;
const Event = require("event").Event;

const eventCountsAddress = "eventData.counts";


let idBasedHash = {
  add: function(aRecommendation){
    if (!this.aRecommendation){
      this[aRecommendation.id] = aRecommendation;
      console.log("recommendation added");
    }
  },
  remove: function(aRecommendation){
    if (this.aRecommendation) {
      delete this[aRecommendation.id];
    }
  },
  forEach: function(callback) {
    let that = this;
    Object.keys(this).forEach(function(key){
      typeof that[key] === "function" || callback(that[key]);
    });
  }
}

let outstandingRecommendations = Object.create(idBasedHash);
let recommendations = Object.create(idBasedHash);

/**
 * Listens for events exhibited by the user or the system.
 *
 */
const listener = {
  start: function(){
    //   function listenForURIChanges(){
    // logger.log("listening forURI Change");
    // // tabs.on("ready", actionTriggerMap.onURIChange);

    // init persistent event data
    prefs[eventCountsAddress] = JSON.stringify({});


    console.log("starting listener");

    this.listenForActiveTabHostnameProgress({fresh: true});
    
    
  }
}


const triggerEvent = function(){
  //TODO: delivering should be delegated to deliverer
  //TODO: adding recommendations should be delegated to inference engine
  //TODO: in general this function has to be broken down into multiple procedures
  console.log(this + " triggered");


  //delivering recommendations
  let hostname = this.options.hostname;

  outstandingRecommendations.forEach(function(aRecommendation) {
    if ("hostname visit " + hostname === aRecommendation.delivContext) {

      //deliver recommendation
      outstandingRecommendations.remove(aRecommendation);
      deliverer.deliver(aRecommendation);
    }

  });
  
  //adding recommendations

  //count the event
  let eventId = "hostname visit " + hostname;

  let counts = JSON.parse(prefs[eventCountsAddress]); //TODO: check performance
  counts[eventId] =  (counts[eventId] + 1) || 1;
  prefs[eventCountsAddress] = JSON.stringify(counts);

  recommendations.forEach(function(aRecommendation){

    let params = aRecommendation.trigBehavior.match(eventId + " (\\d+)")
    
    if (params) {
      if (counts[eventId] == Number(params[1]))
        outstandingRecommendations.add(aRecommendation);

    }

    });

}

const deliverer = {
  
  deliver: function (aRecommendation) {

    console.log("delivering " + aRecommendation);
    console.log(aRecommendation.presentationData);

  }  

}

listener.listenForActiveTabHostnameProgress = function(options){

  tabs.on("ready", function(tab){
      if (tab.id == tabs.activeTab.id) { //make sure it's the active tab
        
        let hostname = URL(tab.url).hostname;

        if (options.fresh && hostname === tab.hostname) return; //not a fresh url open

        tab.hostname = hostname;

        if (!hostname) return;//to handle new tabs and blank pages

        console.log("active tab progressed to: " + hostname);

        let eventName = "activeTabHostnameProgress";


        let uriChangeEvent = Event(eventName, {
          hostname: hostname
        });

        uriChangeEvent.effect = triggerEvent;
        uriChangeEvent.wake();
      }

  });

}


exports.listener = listener;
exports.recommendations = recommendations;
