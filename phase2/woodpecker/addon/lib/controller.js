const dh = require('./presentation/doorhanger');
const {setTimeout, clearTimeout, setInterval, clearInterval} = require("sdk/timers");
const tabs = require('sdk/tabs');
const unload = require("sdk/system/unload").when;
const {Cu, Cc, Ci} = require("chrome");
const {prefs} = require("sdk/simple-prefs");
const {URL} = require("sdk/url");
const windows = require("sdk/windows").browserWindows
const timer = require("./timer");
const {PersistentObject} = require("./utils");

const momentDataAddress = "moment.data";

const momentData = PersistentObject("simplePref", {address: momentDataAddress});


const observerService = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);

let idleObserver;

function init(){
  dh.init();

  unload(unloadController);

  //initialize moments //TODO: first run
  for (let moment in listener.momentListeners){
    if (!momentData[moment]){
      momentData[moment] = {
        count: 0,
        frequency: 0,
        totalFrequency: 0,
        effCount: 0,
        effFrequency: 0,
        effTotalFrequency: 0,
        rates: []
      };
    }
  }

  listener.init();

}

const listener = {
  init: function(){
    
    // start moment listeners
    for (moment in this.momentListeners)
      this.momentListeners[moment]();
  }
}

listener.momentListeners = {
  "startup": function(){
    listener.moment("startup");
  },

  "tab-open": function(){
    tabs.on('open', function(tab){
      listener.moment("tab-open");
    });
  },

  "active-tab-hostname-progress": function(){
    tabs.on("ready", function(tab){
      if (tab.id !== tabs.activeTab.id) return;//make sure it's the active tab
        
        let hostname = URL(tab.url).hostname;

        //TOTHINK: potential namespace conflict      
        if (hostname === tab.hostname) return; //not a fresh url open

        tab.hostname = hostname;
        unload(function(){if (tab) delete tab.hostname;})

        //TODO: use pattern matching 
        // https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/util_match-pattern
        if (!hostname) return;//to handle new tabs and blank pages

        listener.moment("active-tab-hostname-progress");
    });
  },

  "window-open": function(){

    windows.on('open', function(window){
      listener.moment('window-open');
    });
  },

  "tab-open-recently-active5": function(){
    tabs.on("open", function(){
      if (timer.isRecentlyActive(5))
        listener.moment('tab-open-recently-active5');
    });
  }

}

listener.moment = function(name){

  let deliver = true;

  console.log("moment triggered -> " + name);

  let data = momentData[name];
  data.count = data.count + 1;
  data.frequency = data.count / timer.elapsedTime() || 0;
  data.totalFrequency = data.count / timer.elapsedTotalTime() || 0;


  if (timer.isSilent()){
    deliver = false;
    console.log("delivery rejected due to: silence");
  }

  if (data.effFrequency && data.effFrequency > 0.0166667){
    deliver = false;
    console.log("delivery rejected due to: effective frequency = " + data.effFrequency);
  }

  if (deliver){
    data.effCount = data.effCount + 1;
    data.effFrequency = data.effCount / timer.elapsedTime() || 0;
    data.totalFrequency = data.count / timer.elapsedTotalTime() || 0;

    dh.present(function(result){
      let data = momentData[name];

      if (result.type === "rate"){
        console.log("rate submitted for " + name + ": " + result.rate);
        data.rates.push(result.rate);
      }
      if (result.type === "timeout"){
        console.log("panel for " + name + " timed out");
        data.rates.push("timeout");
      }

      momentData[name] = data;
    });

    timer.silence();
  }

  
  momentData[name] = data;

}

function unloadController(){

}

exports.init = init;