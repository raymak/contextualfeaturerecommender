

"use strict";

const {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const {Route} = require("./route");
const {URL} = require("sdk/url");
const {getBrowserForTab, getTabForId} = require("sdk/tabs/utils");
const tabs = require("sdk/tabs");
const {Event, eventData, eventDataAddress} = require("./event");
const {Cu, Cc, Ci} = require("chrome");
const {prefs} = require("sdk/simple-prefs");
const presenter = require("./presenter");
const {PersistentRecSet} = require("./recommendation");
const timer = require("./timer");
const {delMode} = require("./self");
const system = require("sdk/system");
const windows = require("sdk/windows");
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const NEWTAB_URL = 'about:newtab';
const HOME_URL = 'about:home';
const BLANK_URL = 'about:blank';

const recSetAddress = "controller.recommData";

let recommendations = PersistentRecSet("simplePref", {address: recSetAddress});

let downloadList;

const init = function(){
  console.log("initializing controller");
  listener.start();
  deliverer.init();
}

/**
 * Listens for events exhibited by the user.
 *
 */
const listener = {
  start: function(){

    console.log("starting listener");

    let that = this;

    this.listenForAddonEvents(function(eventType, addonId){
      let addonEvent = Event("addonEvent", {
        route: ['addon', eventType, addonId].join(" ")
      });

      addonEvent.effect = function(){
        listener.dispatchRoute(this.options.route);
      };

      addonEvent.wake();
    });

    this.listenForActiveNewtab(function(){
      let newtabEvent = Event("newtabEvent", {
        route: 'newtab'
       });

      newtabEvent.effect = function(){
        listener.dispatchRoute(this.options.route);
      };

      let interruptibeMomentEvent = Event("interruptibeMomentEvent", 
      {
        route: "*"
      });

      interruptibeMomentEvent.checkPreconditions = function(){
        return delMode.moment === 'interruptible';
      }

      interruptibeMomentEvent.effect = function(){
        listener.context(this.options.route);
      }

      newtabEvent.postEvents.push(interruptibeMomentEvent);

      newtabEvent.wake();
    });

    //TODO: merge with chromeEvent
    this.listenForKeyboardEvent(function(evt){

      let hotkeyEvent = Event("hotkeyEvent", {
        event: evt
      });

      hotkeyEvent.effect = function(){
        let e = this.options.event;
        let route = ["hotkey", e.key,
                   e.metaKey ? "-meta" : "",
                   e.ctrlKey ? "-ctrl" : "",
                   e.shiftKey ? "-shift" : "",
                   e.altKey ? "-alt" : "" ].filter(function(elm){
                    return elm != "";
                   }).join(" ");

        listener.dispatchRoute(route);

        let osDarwin = system.platform === 'darwin'; //TODO

        route = ["hotkey", e.key,
                ((e.metaKey && osDarwin) || (e.ctrlKey && !osDarwin)) ? "-cmd" : "",
                e.shiftKey ? "-shift" : "",
                e.altKey ? "-alt" : ""].filter(function(elm){
                    return elm != "";
                   }).join(" ");

        //TODO: solve thE multiple correct routes problem by adding the capability of having multople
        //routes for behaviors and contexts (or adding route equivalence test)

        listener.dispatchRoute(route);

        this.options.route = route; //TOTHINK: the first route is ignored for postEvents
      }

      hotkeyEvent.checkPreconditions = function(){
        let e = this.options.event;
        return (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey);
      }

      let multipleHotkeyEvent = that.multipleRoute(hotkeyEvent);

      hotkeyEvent.postEvents.push(multipleHotkeyEvent);

      hotkeyEvent.wake();

    });

    this.listenForChromeEvents(function(evtName, evt){

      let chromeEvent = Event("chromeEvent", {
        route: ["chrome", evtName, evt.currentTarget.getAttribute("id")].join(" "),
        event: evt,
        eventName: evtName
      });

      chromeEvent.effect = function(){
        let route = this.options.route;

        listener.dispatchRoute(route);
      }

      let multipleChromeEvent = that.multipleRoute(chromeEvent);
      chromeEvent.postEvents.push(multipleChromeEvent);

      let chromeEventAnon = Event("chromeEventAnon");

      chromeEventAnon.effect = function(){
        let anonid = this.preEvent.options.event.originalTarget.getAttribute("anonid");
        let baseRoute = this.preEvent.options.route;
        this.options.route = [baseRoute, "-anonid", anonid].join(" ");

        let route = this.options.route;

        listener.dispatchRoute(route);
      }

      chromeEventAnon.checkPreconditions = function(){
        return (!!this.preEvent.options.event.originalTarget.getAttribute("anonid"));
      }

      let multipleChromeEventAnon = that.multipleRoute(chromeEventAnon);

      chromeEventAnon.postEvents.push(multipleChromeEventAnon);

      chromeEvent.postEvents.push(chromeEventAnon);

      chromeEvent.wake();

    });

    this.listenForActiveTabHostnameProgress(function(hostname){

      let hostVisit = Event("activeTabHostnameVisit", {
        hostname: hostname,
        route: ["visit", "hostname", hostname].join(" ")
      });

      hostVisit.effect = function(){
          let hostname = this.options.hostname; //TODO: remove if unnecessary
          let route = this.options.route;

          listener.dispatchRoute(route);
        };

        let multipleHostVisit = that.multipleRoute(hostVisit);

        hostVisit.postEvents.push(multipleHostVisit);
        hostVisit.wake();

    }, {fresh: true});

    this.listenForPrivateBrowsing(function(reason){
      let privateBrowse = Event("privateBrowse", {
        reason: reason,
        route: ["private browse", reason].join(" ")
      });

      privateBrowse.effect = function(){
        let route = this.options.route;
        listener.dispatchRoute(route);
      }

      let multiplePrivateBrowse = that.multipleRoute(privateBrowse);

      privateBrowse.postEvents.push(multiplePrivateBrowse);
      privateBrowse.wake();
    });

  
    this.listenForHistory(function(reason){
      let histInteraction = Event(("historyInteraction"), {
        reason: reason,
        route: "history"
      });

      histInteraction.effect = function(){
        let route = this.options.route;

        listener.dispatchRoute(route);
      };

      let multipleHistInteraction = that.multipleRoute(histInteraction);
      histInteraction.postEvents.push(multipleHistInteraction);

      //delete or clear
      //TODO: implement as separate and merge using OR operation
      
      let histDeleted = Event("historyDeleted");

      histDeleted.effect = function(){
        let reason = this.preEvent.options.reason;
        let baseRoute = this.preEvent.options.route;
        this.options.route = [baseRoute, "deleted"].join(" ");

        let route = this.options.route;

        listener.dispatchRoute(route);
      }

      histDeleted.checkPreconditions = function(){
        return (["cleared", "deletedURI", "deletedvisits"].indexOf(this.preEvent.options.reason) != -1);
      }

      histInteraction.postEvents.push(histDeleted);

      let multipleHistDeleted = that.multipleRoute(histDeleted);
      histDeleted.postEvents.push(multipleHistDeleted);

      histInteraction.wake();
    });

    this.listenForDownloads(function(reason){

      let downloadInteraction = Event("downloadInteraction", {
        reason: reason,
        route: "download"
      });

      downloadInteraction.effect = function(){
        let route = this.options.route;

        listener.dispatchRoute(route);
      };

      let multipleDownloadInteraction = that.multipleRoute(downloadInteraction);
      downloadInteraction.postEvents.push(multipleDownloadInteraction);

      //Download Added
      let downloadAdded = Event("downloadAdded");

      downloadAdded.effect = function(){
        let reason = this.preEvent.options.reason;
        let baseRoute = this.preEvent.options.route;
        this.options.route = [baseRoute, reason].join(" ");

        let route = this.options.route;

        listener.dispatchRoute(route);
      };

      downloadAdded.checkPreconditions = function(){
        return this.preEvent.options.reason === "added";
      };

      let multipleDownloadAdded = that.multipleRoute(downloadAdded);
      downloadAdded.postEvents.push(multipleDownloadAdded);

     
      //Download Changed
      let downloadChanged = Event("downloadChanged");

      downloadChanged.effect = function(){
        let reason = this.preEvent.options.reason;
        let baseRoute = this.preEvent.options.route;
        this.options.route = [baseRoute, reason].join(" ");

        let route = this.options.route;

        listener.dispatchRoute(route);
      };

      downloadChanged.checkPreconditions = function(){
        return this.preEvent.options.reason === "changed";
      };

      let multipleDownloadChanged = that.multipleRoute(downloadChanged);
      downloadChanged.postEvents.push(multipleDownloadChanged);

      //Download Removed
      let downloadRemoved = Event("downloadRemoved");

      downloadRemoved.effect = function(){
        let reason = this.preEvent.options.reason;
        let baseRoute = this.preEvent.options.route;
        this.options.route = [baseRoute, reason].join(" ");

        let route = this.options.route;

        listener.dispatchRoute(route);
      };

      downloadRemoved.checkPreconditions = function(){
        return this.preEvent.options.reason === "removed";
      };

      let multipleDownloadRemoved = that.multipleRoute(downloadRemoved);
      downloadRemoved.postEvents.push(multipleDownloadRemoved);


      downloadInteraction.postEvents.push(downloadAdded, downloadChanged, downloadRemoved);
      downloadInteraction.wake();

    });
  },
  behavior: undefined, //defined below
  context: undefined, //defined below
  listenForActiveTabHostnameProgress: undefined, //defined below
  listenForDownloads: undefined, //defined blow
  multipleRoute: undefined //defined below
};


const deliverer = {
  init: function(){
    timer.tickCallback(this.checkSchedule);
  },
  deliver: function (/* recommendations */) {

    let recomms = Array.prototype.slice.call(arguments);

    if (recomms.length === 0)
      return;

    if (recomms.length > 1)
      console.log("warning: attempted to deliver multple recommendations at the same time.");

    //finding the recommendation with the highest priority

    let minPriority = recomms[0];
    let minRec = recomms[0];

    recomms.forEach(function(aRecommendation){
      if (aRecommendation.priority < minPriority){
        minPriority = aRecommendation.priority;
        minRec = aRecommendation;
      }
    });

    let aRecommendation = minRec;

    if (delMode.rateLimit){
      if (timer.isSilent()){
        console.log("delivery rejected due to silence: id -> " + aRecommendation.id);

        if (delMode.moment === "random"){
          console.log("rescheduling delivery time: id -> " + aRecommendation.id);
          this.rescheduleDelivery(aRecommendation);
          recommendations.update(aRecommendation);
        }
        return;
      }
    }

    console.log("delivering " + aRecommendation.id);
    presenter.present(aRecommendation, listener.command.bind(listener));

    aRecommendation.status = "delivered";
    recommendations.update(aRecommendation);

    timer.silence();

  },
  checkSchedule: function(time){
    let recomms = recommendations.getByRouteIndex('delivContext', '*', 'outstanding');

    if (recomms.length === 0)
      return;
    
    deliverer.deliver.apply(deliverer, recomms.filter(function(aRecommendation){ 
      return aRecommendation.deliveryTime && (aRecommendation.deliveryTime <= time);
    }));
  },
  scheduleDelivery: function(aRecommendation){
    let time = timer.elapsedTime();
    let deliveryTime = timer.randomTime(time, time + prefs["random_interval_length_tick"]);
    aRecommendation.deliveryTime = deliveryTime;

    console.log("recommendation delivery scheduled: id -> " + aRecommendation.id + ", time -> " + deliveryTime + " ticks");
  },
  rescheduleDelivery: function(aRecommendation){
    this.scheduleDelivery(aRecommendation);
    
    console.log("recommendation delivery rescheduled: id -> " + aRecommendation.id + ", time -> " + aRecommendation.deliveryTime + " ticks");
  }
};


listener.behavior = function(route){
  console.log("behavior -> route: " + route);

  //TODO: use pattern matching 
  // https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/util_match-pattern
  
  let recomms = recommendations.getByRouteIndex('trigBehavior', route, 'active');
  if (recomms.length === 0)
    return;

  let random = (delMode.moment === "random");

  recomms.forEach(function(aRecommendation){
    aRecommendation.status = 'outstanding';

    if (random){
      deliverer.scheduleDelivery(aRecommendation);
    }

    recommendations.update(aRecommendation);
  });

};

listener.context = function(route){

  if ((delMode.moment === 'interruptible' && route != '*') || delMode.moment === 'random')
    return;

  console.log("context -> route: " + route);
 
  let recomms = recommendations.getByRouteIndex('delivContext', route, 'outstanding');
  //TODO: use pattern matching 
  // https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/util_match-pattern
  if (recomms.length === 0)
    return;

  //deliver recommendation
  deliverer.deliver.apply(deliverer, recomms);
};

listener.featureUse = function(route){
  console.log("featureUse -> route: " + route);

  let recomms = recommendations.getByRouteIndex('featUseBehavior', route);

  if (recomms.length === 0)
    return;

  recomms.forEach(function(aRecommendation){
    if (aRecommendation.status === 'active' || aRecommendation.status === 'outstanding'){
      aRecommendation.status = 'inactive';
      recommendations.update(aRecommendation);
    }
  });
}

listener.command = function(cmd){
  let cmdRoute = Route(cmd);

  switch(cmdRoute.header){
    case "open url":
      if (cmdRoute.l) 
        tabs.open(cmdRoute.l);
      else
        console.log("no url provided for command: " + cmd);
      break;
    default:
      console.log("command not recognized: " + cmd);
  }

}

listener.dispatchRoute = function(route, options){
  if (!options){
    this.behavior(route);
    this.context(route);
    this.featureUse(route);
  }
  else {
    if (options.behavior)
      this.behavior(route);

    if (options.context)
      this.context(route);

    if (optiona.featureUse)
      this.featureUse(route);
  }
}

listener.listenForAddonEvents = function(callback){
  let addonListener = {
    onInstallEnded: function(install, addon){
      callback('install', addon.id);
      callback('has', addon.id);
    }
  }

  AddonManager.addInstallListener(addonListener);

  AddonManager.getAllAddons(function(addons){
    addons.forEach(function(addon){
      callback('has', addon.id);
    });
  });
}

listener.listenForActiveNewtab = function(callback){
  tabs.on('open', function(tab){
    if ([NEWTAB_URL, HOME_URL].indexOf(tab.url) != -1) callback();
  });
}

listener.listenForActiveTabHostnameProgress = function(callback, options){

  tabs.on("ready", function(tab){
      if (tab.id !== tabs.activeTab.id) return;//make sure it's the active tab
        
        let hostname = URL(tab.url).hostname;

        //TOTHINK: potential namespace conflict      
        if (options.fresh && hostname === tab.hostname) return; //not a fresh url open

        tab.hostname = hostname;

        //TODO: use pattern matching 
        // https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/util_match-pattern
        if (!hostname) return;//to handle new tabs and blank pages


        console.log("active tab progressed to: " + hostname);

        callback(hostname);

  });
};

listener.listenForDownloads = function(callback, options){
  let view = {
    onDownloadAdded: function(download) { 
      console.log("Download added");
      callback('added');
    },
    onDownloadChanged: function(download) {
      console.log("Download changed");
      callback('changed');
    },
    onDownloadRemoved: function(download) {
     console.log("Download removed");
     callback('removed');
    } 
  };

  Task.spawn(function() {
    try {
      downloadList = yield Downloads.getList(Downloads.ALL);
      yield downloadList.addView(view);
    } catch (ex) {
      console.error(ex);
    }
  });
};

listener.listenForChromeEvents = function(callback, options){

  let routesToListenFor = {};

  function evalRoute(route){
      let routeTokens = route.split(" ");
      if (routeTokens[0] === "chrome"){
        let eventName = routeTokens[1];
        let id = routeTokens[2];

        routesToListenFor[[eventName, id].join(" ")] = {
          eventName: eventName,
          id: id
        };
      }
    };

  recommendations.forEach(function(aRecommendation){    
    evalRoute(aRecommendation.trigBehavior);
    evalRoute(aRecommendation.delivContext);
    evalRoute(aRecommendation.featUseBehavior);
  });

  let windowTracker = new WindowTracker({
    onTrack: function(window){
      if (!isBrowser(window)) return;

      for (let routeId in routesToListenFor){
        let route =routesToListenFor[routeId];
        let elem = window.document.getElementById(route.id);
        
        elem.addEventListener(route.eventName, function(evt){
          console.log(elem);
          callback(route.eventName, evt);
        });
      } 
    }
  });

};

//listen for when specific hotkeys are pressed
listener.listenForKeyboardEvent = function(callback, options){
  
  //TODO: merge hotkeys with other chrome events
  let keyTracker = new WindowTracker({
    onTrack: function (window){
      if (!isBrowser(window)) return;   

      window.addEventListener((options && options.eventName) || "keydown", callback );
    }
  });
}


listener.listenForHistory = function(callback){

  //Create history observer
  let historyObserver = {
  onBeginUpdateBatch: function() {},
  onEndUpdateBatch: function() {
  },
  onVisit: function(aURI, aVisitID, aTime, aSessionID, aReferringID, aTransitionType) {},
  onTitleChanged: function(aURI, aPageTitle) {},
  onBeforeDeleteURI: function(aURI) {},
  onDeleteURI: function(aURI) {
    callback('deletedURI');

  },
  onClearHistory: function() {
    callback('cleared');
  },
  onPageChanged: function(aURI, aWhat, aValue) {},
  onDeleteVisits: function() {
    callback("deletedvisits");
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsINavHistoryObserver])
  };

  var hs = Cc["@mozilla.org/browser/nav-history-service;1"].
         getService(Ci.nsINavHistoryService);

  hs.addObserver(historyObserver, false);

}

listener.listenForPrivateBrowsing = function(callback){
  console.log("mo");
  windows.browserWindows.on('open', function(window){
    if (require("sdk/private-browsing").isPrivate(window)){
      callback('open');
      
    }
  });
}

listener.multipleRoute = function(baseEvent, options){

    if (!options)
      options = {};

    let eventName = options.name || ["multiple", baseEvent.name.slice(0,1).toUpperCase(), baseEvent.name.slice(1)].join("");
    let rEvent = Event(eventName, options.options);
    let that = this;
    
    rEvent.effect = function(){
      let baseRoute = options.baseRoute || baseEvent.options.route;

      let data = eventData[baseRoute];
      
      if (data){
        data.count = (data.count + 1) || 1;
        data.freq = data.count / (timer.elapsedTime() + 1);
        data.ifreq = 1/data.freq;
      }
      else {
        data = {count: 1, freq: 1 / (timer.elapsedTime() + 1), ifreq: timer.elapsedTime()};
      }

      eventData[baseRoute] = data;

      this.options.route = [baseRoute, "-c", String(data.count)].join(" ");
      let route = this.options.route;

      listener.dispatchRoute(route);

      this.options.route = [baseRoute, "-f", String(data.freq)].join(" ");
      route = this.options.route;

      listener.dispatchRoute(route);

      this.options.route = [baseRoute, "-if", String(data.ifreq)].join(" ");
      route = this.options.route;

      listener.dispatchRoute(route);
      

      if (options.addedEffect)
        options.addedEffect();
    };

    return rEvent;
  };


function onUnload(reason){
  if (downloadList) downloadList.removeView();

  hs.removeObserver(historyObserver);
}

exports.init = init;
exports.recommendations = recommendations;
exports.onUnload = onUnload;