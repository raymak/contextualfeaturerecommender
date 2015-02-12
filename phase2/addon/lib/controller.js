

"use strict";

const {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const {URL} = require("sdk/url");
const {getBrowserForTab, getTabForId} = require("sdk/tabs/utils");
const tabs = require("sdk/tabs");


//TODO: common data structure for outstandingRecommendations and recommendations
let outstandingRecommendations = {
  add: function(aRecommendation){
    if (!this.aRecommendation){
      this[aRecommendation.id] = aRecommendation;
      console.log("recommendation added");
    }
  },
  remove: function(aRecommendation) {
    if (this.aRecommendation) {
      delete this[aRecommendation.id];
    }
  },
  forEach: function(callback) {
    let that = this;
    Object.keys(this).forEach(function(key){
      typeof key === "function" || callback(that[key]);
    });
  }
}

let recommendations = {
   add: function(aRecommendation){
    if (!this.aRecommendation){
      this[aRecommendation.id] = aRecommendation;
      console.log("recommendation added");
    }
  },
  remove: function(aRecommendation) {
    if (this.aRecommendation) {
      delete this[aRecommendation.id];
    }
  },
  forEach: function(fn) {
    let that = this;
    Object.keys(this).forEach(function(key){
      typeof key === "function" || fn(that[key]);
    });
  }
}

/**
 * Listens for events exhibited by the user or the system.
 *
 */
const listener = {
  init: function() {
    //   function listenForURIChanges(){
    // logger.log("listening forURI Change");
    // // tabs.on("ready", actionTriggerMap.onURIChange);
    console.log("initializing listener");
    listenForURIChanges(function(aBrowser, aWebProgress, aRequest, aLocation) {
      let eventType = "URIchange";
      GEvent(eventType, {
        browser: aBrowser,
        webProgress: aWebProgress,
        request: aRequest,
        location: aLocation
      }).trigger();
    });
    
  }

}

const GEvent = function(aType, options) {
  return {
    type: aType,
    options: options,
    //TODO: trigger must be taken out, check DC patters
    trigger: function() {
      console.log(this + " triggered");

      switch(this.type){
        case "URIchange":

          let tab = tabs.activeTab;

          // if (tab.id == activeTab.id)
          if (getBrowserForTab(getTabForId(tab.id)) === this.options.browser) {
              
            let hostname = URL(tab.url).hostname;
            console.log("active tab progressed to: " + hostname);

            if (!hostname) return;  //to handle new tabs and blank pages

            recommendations.forEach(function(aRecommendation){
              if ("url visit " + hostname === aRecommendation.trigBehavior) {
                outstandingRecommendations.add(aRecommendation);
              }

            });
          }

          break;
          default:
            console.log("undefined event type");

      }
    },
    toString: function() {
      return "event -> " + "type: " + this.type;
    }
  }
}

/**
 * Listens for URI changes to trigger appropriate recommendations
 * 
 * @param callback {function} The function to call when URI changes
 */
function listenForURIChanges(aCallback) {

  console.log("listening for URI changes");
  const windowTracker = new WindowTracker({
    onTrack: function (window){

      if (!isBrowser(window)) return;

      let tabBrowser = window.gBrowser;
      tabBrowser.addTabsProgressListener({onLocationChange: aCallback});
    }
  });
}


exports.listener = listener;
exports.recommendations = recommendations;
