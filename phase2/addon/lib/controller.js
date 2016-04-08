/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
const {isPrivate} = require("sdk/private-browsing");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const {Route, coefficient} = require("./route");
const {Recommendation} = require("./recommendation");
const {URL} = require("sdk/url");
const tabs = require("sdk/tabs");
const {Event, getEventData, eventDataAddress} = require("./event");
const {Cu, Cc, Ci} = require("chrome");
const sp = require("sdk/simple-prefs");
const prefs = sp.prefs;
const presenter = require("./presenter");
const { MatchPattern } = require("sdk/util/match-pattern");
const {PersistentRecSet} = require("./recommendation");
const timer = require("./timer");
const utils = require("./utils");
const self = require("./self");
const system = require("sdk/system");
const windows = require("sdk/windows");
const {viewFor} = require("sdk/view/core");
const {handleCmd} = require("./debug");
const {data}= require("sdk/self");
const unload = require("sdk/system/unload").when;
const logger = require("./logger");
const featReport = require("./feature-report");
const events = require("sdk/system/events");
const {pathFor} = require('sdk/system');  
const file = require('sdk/io/file');
const statsEvent = require("./stats").event;
const functional = require("sdk/lang/functional");
const {defer, all} = require("sdk/core/promise")
const {PersistentObject, osFileObjects} = require("./storage");
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
const devtools = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;

const observerService = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);

const NEWTAB_URL = 'about:newtab';
const HOME_URL = 'about:home';
const BLANK_URL = 'about:blank';

const recSetAddress = "controller.recommData";
const deliveryDataAddress = "delivery.data";

let recommendations; //inited in init()
let deliveryData; //inited in init()

let hs;
let sessObserver;
let contentTypeObserver;
let searchEngineObserver;
let addonListener;
let historyObserver;
let dlView;

const init = function(){
  console.log("initializing controller");

  return all(
    [ 
      initRecs(),
      PersistentObject("simplePref", {address: deliveryDataAddress})
    ])
    .then((result)=> {
      deliveryData = result[1];
    }).then(_init);
}

const _init = function(){
  console.time("controller init");

  unload(unloadController);

  listener.start();
  deliverer.init();
  debug.init();

  welcome();

  console.timeEnd("controller init");
}

function initRecs(){

  let {promise, resolve} = defer();

  if (!recommendations){
    PersistentRecSet("simplePref", {address: recSetAddress}).then((recSet)=> {
      recommendations = recSet;
    }).then(resolve);
  }
  else
    resolve();

  return promise;
}

/**
 * Listens for events exhibited by the user.
 *
 */
const listener = {
  start: function(){

    console.log("starting listener");

    let that = this;

    this.listenForTabs(function(reason, params){
      let tabsEvent = Event("tabsEvent", {
        route: ["tabs", reason].join(" "),
        reason: reason,
        params: params
      });

      tabsEvent.effect = function(){
        let route = this.options.route;

        //pin is not about tabs being pinned
        //it is about reporting the number of pinned tabs
        //so should not be dispatched as tabs even
        if (this.options.reason == "pin" || this.options.reason == "open") return;
        
        // listener.dispatchRoute(route);
      };

      let multipleTabsEvent = that.multipleRoute(tabsEvent);

      //see above
      multipleTabsEvent.checkPreconditions = function(){
        return (this.preEvent.options.reason != "pin" && this.preEvent.options.reason != "open");
      };

      tabsEvent.postEvents.push(multipleTabsEvent);

      let tabsOpen = Event("tabsOpen");

      tabsOpen.effect = function(){
        let baseRoute = this.preEvent.options.route;

        let route = [baseRoute, "-n", this.preEvent.options.params.number].join(" ");

        listener.dispatchRoute(route);
      };

      tabsOpen.checkPreconditions = function(){
        return (this.preEvent.options.reason == "open");
      };

      tabsEvent.postEvents.push(tabsOpen);

      let tabsPin= Event("tabsPin");

      tabsPin.effect = function(){
        let baseRoute = this.preEvent.options.route;

        let route = [baseRoute, "-n", this.preEvent.options.params.number].join(" ");

        listener.dispatchRoute(route);
      };

      tabsPin.checkPreconditions = function(){
        return (this.preEvent.options.reason == "pin");
      };

      tabsEvent.postEvents.push(tabsPin)

      let tabsSwitchedPosition = Event("tabsSwitchedPosition");

      tabsSwitchedPosition.effect = function(){
        let baseRoute = this.preEvent.options.route;

        let route = [baseRoute, "position", this.preEvent.options.params.position].join(" ");

        this.options.route = route;

        // listener.dispatchRoute(route);
      };

      tabsEvent.postEvents.push(tabsSwitchedPosition);

      tabsSwitchedPosition.checkPreconditions = function(){
        return (this.preEvent.options.reason == "switched"
             && this.preEvent.options.params.position);
      };

      let multipleTabsSwitchedPosition = that.multipleRoute(tabsSwitchedPosition);

      tabsSwitchedPosition.postEvents.push(multipleTabsSwitchedPosition);

      tabsEvent.wake();

    });

    this.listenForAddonEvents(function(eventType, params){
      let addonEvent = Event("addonEvent", {
        eventType: eventType,
        params: params
      });

      addonEvent.effect = function(){
        let route;
        switch(this.options.eventType){
          case "count":
            route = ["addon", this.options.eventType, this.options.params.type, "-n", this.options.params.number].join(" ");
            break;
          case "pageshow":
            route = ["addon", this.options.eventType].join(" ");
            break;
          default:
            route = ["addon", this.options.eventType, params.addonId].join(" ");
        }
        this.options.route = route;
        listener.dispatchRoute(route);
      };

      addonEvent.wake();
    });

    this.listenForUserActivity(function(){

      let interruptibleMomentEvent = Event("interruptibleMomentEvent",
      {
        route: "moment interruptible"
      });

      interruptibleMomentEvent.checkPreconditions = function(){
        return timer.isRecentlyActive(10, 2*60);
      };

      let multipleInterruptibleMomentEvent = that.multipleRoute(interruptibleMomentEvent, {
        dispatch: {context: true}
      });

      interruptibleMomentEvent.postEvents.push(multipleInterruptibleMomentEvent);

      interruptibleMomentEvent.wake();
    });

    this.listenForNewtab(function(){
      let newtabEvent = Event("newtabEvent", {
        route: 'newtab'
       });

      newtabEvent.effect = function(){
        listener.dispatchRoute(this.options.route);
      };

      newtabEvent.wake();
    });

    this.listenForFirefoxEvents(function(reason, params){

      let firefoxEvent = Event("firefoxEvent", {
        route: ['firefox', reason].join(" "),
        reason: reason,
        params: params
      });

      let updateChannelEvent = Event("updateChannel");

      updateChannelEvent.effect = function(){
        let baseRoute = this.preEvent.options.route;

        let route = [baseRoute, params.channel].join(" ");

        listener.dispatchRoute(route);
      }

      updateChannelEvent.checkPreconditions = function() this.preEvent.options.reason == "channel";

      firefoxEvent.postEvents.push(updateChannelEvent);

      let profilesEvent = Event("profilesEvent");

      profilesEvent.effect = function(){
        let baseRoute = this.preEvent.options.route;

        let route = [baseRoute,
                     "-n",
                     this.preEvent.options.params.number]
                     .join(" ");

        listener.dispatchRoute(route);
      }
      
      profilesEvent.checkPreconditions = function() this.preEvent.options.reason == "profiles";

      firefoxEvent.postEvents.push(profilesEvent);

      let startupEvent = Event("startupEvent");

      startupEvent.effect = function(){

        let baseRoute = this.preEvent.options.route;

        let route = baseRoute;

        this.options.route = route;
      }

      startupEvent.checkPreconditions = function() this.preEvent.options.reason == "startup";
      firefoxEvent.postEvents.push(startupEvent);

      let multipleStartupEvent = that.multipleRoute(startupEvent);

      startupEvent.postEvents.push(multipleStartupEvent);

      firefoxEvent.wake();

    });

    //TODO: merge with chromeEvent
    this.listenForKeyboardEvent(function(evt){

      let hotkeyEvent = Event("hotkeyEvent", {
        event: evt
      });

      hotkeyEvent.effect = function(){
        let e = this.options.event;

        // os-dependent representation, not dispatched currently
        let route = ["hotkey", e.key,
                   e.metaKey ? "-meta" : "",
                   e.ctrlKey ? "-ctrl" : "",
                   e.shiftKey ? "-shift" : "",
                   e.altKey ? "-alt" : "" ].filter(function(elm){
                    return elm != "";
                   }).join(" ");

        let osDarwin = system.platform === 'darwin'; //TODO

        // os-independent representation
        route = ["hotkey", e.key,
                ((e.metaKey && osDarwin) || (e.ctrlKey && !osDarwin)) ? "-cmd" : "",
                e.shiftKey ? "-shift" : "",
                e.altKey ? "-alt" : ""].filter(function(elm){
                    return elm != "";
                   }).join(" ");

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

    this.listenForChromeEvents(function(route, evt){

      let evtName = route.eventName;
      let id = route.id;

      let chromeEvent = Event("chromeEvent", {
        route: ["chrome", evtName, id].join(" "),
        event: evt,
        eventName: evtName,
        id: route.id
      });

      chromeEvent.effect = function(){
        let route = this.options.route;

        // listener.dispatchRoute(route);
      }

      let multipleChromeEvent = that.multipleRoute(chromeEvent);
      chromeEvent.postEvents.push(multipleChromeEvent);

      let chromeEventAnon = Event("chromeEventAnon");

      chromeEventAnon.effect = function(){
        let anonid = this.preEvent.options.event.originalTarget.getAttribute("anonid");
        let baseRoute = this.preEvent.options.route;
        this.options.route = [baseRoute, "anonid", anonid].join(" ");

        let route = this.options.route;

        // listener.dispatchRoute(route);
      }

      chromeEventAnon.checkPreconditions = function(){
        if (~["document", "window"].indexOf(this.preEvent.options.id))
          return false;

        return (!!this.preEvent.options.event.originalTarget.getAttribute("anonid"));
      }

      let multipleChromeEventAnon = that.multipleRoute(chromeEventAnon);

      chromeEventAnon.postEvents.push(multipleChromeEventAnon);

      chromeEvent.postEvents.push(chromeEventAnon);

      chromeEvent.wake();

    });

    this.listenForInternalEvents(function(reason, params){

      let frEvent = Event("frEvent", {
        route: "fr",
        reason: reason,
        params: params
      });
      
      let tickEvent = Event("tick");

      tickEvent.checkPreconditions = function(){
        return this.preEvent.options.reason === "tick";
      }

      tickEvent.effect = function(){
        let baseRoute = this.preEvent.options.route;
        let params = this.preEvent.options.params;
        let route = [baseRoute, "tick", "-et", params.et, "-ett", params.ett].join(" ");
        this.options.route = route;

        listener.dispatchRoute(route);
      }

      frEvent.postEvents.push(tickEvent);

      frEvent.wake(); 
    });

    this.listenForPageVisit(function(type, param){

      let pageVisit = Event("pageVisit", {
        route: ["visit", type, param].join(" "),
        type: type,
        param: param
      });

      let multiplePageVisit = that.multipleRoute(pageVisit);

      pageVisit.postEvents.push(multiplePageVisit);

      pageVisit.wake();

    }, {halfFresh: true});

    this.listenForSearchEngine(function(reason, params){

      let searchEngModify = Event("searchEngModify",
      {
        route: ["search-engine", reason].join(" "),
        reason: reason,
        params: params
      });

      searchEngModify.effect = function(){
        let route = this.options.route;
        let reason = this.options.reason;

        // if (reason != "alias")
        //   listener.dispatchRoute(route);
      };


      let multipleSearchEngModify = that.multipleRoute(searchEngModify);

      multipleSearchEngModify.checkPreconditions = function(){
        return (this.preEvent.options.reason != "alias");
      }

      searchEngModify.postEvents.push(multipleSearchEngModify);

      let searchEngAliasEvent = Event("searchEngModifyAliasEvent");

      searchEngAliasEvent.effect = function(){
        let baseRoute = this.preEvent.options.route;
        let params = this.preEvent.options.params;

        let route = [baseRoute, "-n", params.number].join(" ");

        listener.dispatchRoute(route);
      };

      searchEngAliasEvent.checkPreconditions = function(){
        return (this.preEvent.options.reason == "alias");
      }

      searchEngModify.postEvents.push(searchEngAliasEvent);

      searchEngModify.wake();

    });

    this.listenForDevTools(function(reason, params){
      let devToolsEvent = Event("devToolsEvent", {
        route: ["dev", reason].join(" "),
        reason: reason,
        params: params
      });

      devToolsEvent.effect = function(){
        let route = this.options.route;

        // listener.dispatchRoute(route);
      };

      let multipleDevToolsEvent = that.multipleRoute(devToolsEvent);

      devToolsEvent.postEvents.push(multipleDevToolsEvent);

      let devToolsSelect = Event("devToolsSelect");

      devToolsSelect.effect = function(){
        let baseRoute = this.preEvent.options.route;
        let toolId = this.preEvent.options.params.toolId;

        let route = [baseRoute, "tool", toolId].join(" ");

        this.options.route = route;
        this.options.toolId = toolId;

        // listener.dispatchRoute(route);
      }

      devToolsSelect.checkPreconditions = function(){
        return (this.preEvent.options.reason == "select");
      };

      devToolsEvent.postEvents.push(devToolsSelect);

      let multipleDevToolsSelect = that.multipleRoute(devToolsSelect);
      devToolsSelect.postEvents.push(multipleDevToolsSelect);

      devToolsEvent.wake();

    });

    this.listenForSessionStore(function(reason){
      let sessRestored = Event("sessionRestored", {
        reason: reason,
        route: ["session", reason].join(" ")
      });

      sessRestored.effect = function(){
        let route = this.options.route;
        // listener.dispatchRoute(route);
      }

      sessRestored.checkPreconditions = function(){
        return (this.options.reason == "restored");
      };

      let multipleSessRestored = that.multipleRoute(sessRestored);
      sessRestored.postEvents.push(multipleSessRestored);

      sessRestored.wake();
    });

    this.listenForPrivateBrowsing(function(reason){
      let privateBrowse = Event("privateBrowse", {
        reason: reason,
        route: ["private browse", reason].join(" ")
      });

      privateBrowse.effect = function(){
        let route = this.options.route;
        // listener.dispatchRoute(route);
      }

      let multiplePrivateBrowse = that.multipleRoute(privateBrowse);

      privateBrowse.postEvents.push(multiplePrivateBrowse);
      privateBrowse.wake();
    });

  
    this.listenForTools(function(tool, reason){

      let toolEvent = Event("toolEvent", {
        tool: tool,
        reason: reason,
        route: [tool, reason].join(" ")
      });

      let multipleToolEvent = that.multipleRoute(toolEvent);

      toolEvent.postEvents.push(multipleToolEvent);

      toolEvent.wake();

    });

    this.listenForHistory(function(reason){
      let histInteraction = Event(("historyInteraction"), {
        reason: reason,
        route: ["history", reason].join(" ")
      });

      histInteraction.effect = function(){
        let route = this.options.route;

        // listener.dispatchRoute(route);
      };

      let multipleHistInteraction = that.multipleRoute(histInteraction);
      histInteraction.postEvents.push(multipleHistInteraction);

      //delete or clear
      //TODO: implement as separate and merge using OR operation
      
      let histDelete = Event("historyDelete");

      histDelete.effect = function(){

        this.options.route = ['history', "delete"].join(" ");

        let route = this.options.route;

        // listener.dispatchRoute(route);
      }

      histDelete.checkPreconditions = function(){
        return (["cleared", "deletedURI", "deletedvisits"].indexOf(this.preEvent.options.reason) != -1);
      }

      histInteraction.postEvents.push(histDelete);

      let multipleHistDelete = that.multipleRoute(histDelete);
      histDelete.postEvents.push(multipleHistDelete);

      histInteraction.wake();
    });

    this.listenForDownloads(function(reason){

      let downloadInteraction = Event("downloadInteraction", {
        reason: reason,
        route: ["download", reason].join(" ")
      });

      downloadInteraction.effect = function(){
        let route = this.options.route;

        // listener.dispatchRoute(route);
      };

      let multipleDownloadInteraction = that.multipleRoute(downloadInteraction);
      downloadInteraction.postEvents.push(multipleDownloadInteraction);

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

    osFileObjects["timer.data"].silence_length_s = 
      timer.tToS(prefs["delivery.mode.silence_length." + osFileObjects["delivery.data"].mode.rate_limit]);

    timer.onTick(this.checkSchedule);

  },
  deliver: function (/* recommendations */) {

    require("./experiment").checkStage();

    let recomms = Array.prototype.slice.call(arguments);

    if (recomms.length === 0)
      return;

    if (recomms.length > 1){
      console.log("warning: attempted to deliver multiple recommendations at the same time: " + recomms.length);
      require('./stats').event("multiple-delivery", {type: "delivery"});
    }

    //finding the recommendation with the highest priority

    let minPriority = recomms[0].priority;
    let minRec = recomms[0];

    recomms.forEach(function(aRecommendation){
      if (aRecommendation.priority < minPriority){
        minPriority = aRecommendation.priority;
        minRec = aRecommendation;
      }
    });

    let aRecommendation = minRec;

    let rejectDelivery = false;

    if (prefs["passive_mode"]){
      console.log("delivery rejected due to passive mode");
      require('./stats').event("passive-mode-reject", {type: "delivery"});
      rejectDelivery = true;
    }

    if (isPrivate(getMostRecentBrowserWindow())){
      console.log("delivery rejected due to private browsing");
      require('./stats').event("private-reject", {type: "delivery"});
      rejectDelivery = true;
    }

    if (!timer.isCertainlyActive()){
      console.log("delivery rejected due to uncertain user activity status");
      require('./stats').event("inactive-reject", {type: "delivery"});
      rejectDelivery = true;
    }

    if (self.delMode.observ_only || (timer.isSilent())){
      if (self.delMode.observ_only){
        console.log("delivery rejected due to observe only period: id -> " + aRecommendation.id);
        require('./stats').event("observe-only-reject", {type: "delivery"});
      }
      else{
        console.log("delivery rejected due to silence: id -> " + aRecommendation.id);
        require('./stats').event("silence-reject", {type: "delivery"});
      }

      rejectDelivery = true;
    }

    if (rejectDelivery)
      return;

    console.log("delivering " + aRecommendation.id);

    if (aRecommendation.status == "delivered"){
      console.log("warning: delivering a recommendation that has already been delivered");
      logger.logWarning({code: "delivery", message: "delivering a recommendation that has already been delivered: " + aRecommendation.id});
    }

    aRecommendation.status = "delivered";

    recommendations.update(aRecommendation);

    statsEvent("delivery");

    presenter.present(aRecommendation, listener.command.bind(listener));

    timer.silence();

  },
  checkSchedule: function(et, ett){

    let deliveryTime = deliveryData.randomDeliveryTime;

    if (!deliveryTime){
      deliverer.scheduleRandomDelivery();
      deliveryTime = deliveryData.randomDeliveryTime
    }

    if (deliveryTime < et){
      console.log("rescheduling random delivery");
      deliverer.scheduleRandomDelivery();
      deliveryTime = deliveryData.randomDeliveryTime
    }

    if (deliveryTime == et){
      let randomMomentEvent = new Event("randomMoment", {
        route: "moment random"
      });

      let multipleRandomMomentEvent = listener.multipleRoute(randomMomentEvent, {
        dispatch: {context: true}
      });

      randomMomentEvent.postEvents.push(multipleRandomMomentEvent);
      randomMomentEvent.wake();
    }

  },
  scheduleRandomDelivery: function(){
    let et = timer.elapsedTime();
  
    let deliveryTime = timer.randomTime(et, et + prefs["timer.random_interval_length_tick"]);

    deliveryData.randomDeliveryTime = deliveryTime;

    console.log("random delivery scheduled: " +  deliveryTime + " ticks");  }
};


listener.behavior = function(route){
  console.log("behavior -> route: ", route);

  route = Route(route); // converting to route object

  let behaviorInfo =  function(aRecommendation){ 
    return {id: aRecommendation.id, count: Number(route.c), num: Number(route.n), "if": Number(route.if)};
  }

  //logging loose matches
  let recomms = recommendations.getByRouteIndex('trigBehavior', route, {looseMatch: true});
  if (recomms.length === 0)
    return;

  recomms.forEach(function(aRecommendation){
    let addedInfo = {};
    let aggregates = {};
    let bi = behaviorInfo(aRecommendation);

    if (bi.num || bi.num == 0) {
      addedInfo.num = bi.num;
      aggregates.num = 'average';
    }

    statsEvent(aRecommendation.id, {type: "looseBehavior"}, addedInfo, aggregates);

    if (utils.isPowerOf2(bi.count) || (utils.isPowerOf2(bi.num) && bi.num > 10)){
      logger.logLooseBehavior(bi);
    }
  });


  recomms = recommendations.getByRouteIndex('trigBehavior', route, {status: 'active'});
  if (recomms.length === 0)
    return;

  recomms.forEach(function(aRecommendation){
    aRecommendation.status = 'outstanding';
    recommendations.update(aRecommendation);

    let addedInfo = {};
    let bi = behaviorInfo(aRecommendation);
    if (bi.num) {
      addedInfo.num = bi.num;
    }

    statsEvent(aRecommendation.id, {type: "behavior"}, addedInfo);
    logger.logBehavior(bi);
  });
};

listener.context = function(route){

  console.log("context -> route: ", route);

  route = Route(route); // convert to object
  let header = route.header;

  let mt = self.delMode.moment;

  // handle random moments
  if (mt === 'random'){
    if (header != 'moment random')
      return;
    else {
      route = '*';
      statsEvent(header);
    }
  }

  // handle interruptible moments
  if (mt === 'interruptible'){
    if (header != 'moment interruptible')
      return;
    else {
      route = '*';
      statsEvent(header);
    }
  }
 
  let recomms = recommendations.getByRouteIndex('delivContext', route, {status: 'outstanding'});

  if (recomms.length === 0)
    return;

  //deliver recommendations
  deliverer.deliver.apply(deliverer, recomms);
};

listener.featureUse = function(route){

  console.log("featureUse -> route: ", route);

  route = Route(route);

  let featureUseInfo =  function(aRecommendation){ 
    return {id: aRecommendation.id, count: Number(route.c), num: Number(route.n), "if": Number(route.if)};
  }

  //logging loose matches
  let recomms = recommendations.getByRouteIndex('featUseBehavior', route, {looseMatch: true});
  if (recomms.length === 0)
    return;

  recomms.forEach(function(aRecommendation){
    let addedInfo = {};
    let aggregates = {};

    let fui = featureUseInfo(aRecommendation);

    if (aRecommendation.id == "pinTab")
      console.log("NUM", fui.num);

    if (fui.num || fui.num == 0) {
      addedInfo.num = fui.num;
      aggregates.num = 'average';
    }

    statsEvent(aRecommendation.id, {type: "looseFeatureUse"}, addedInfo, aggregates);

    if (utils.isPowerOf2(fui.count) || (utils.isPowerOf2(fui.num) && fui.num > 10)){
      logger.logLooseFeatureUse(featureUseInfo(aRecommendation));
    }

    if (aRecommendation.status === 'delivered'){
      featReport.postRecFeatureUse(aRecommendation.id);
    } 

  });

  let shouldReport;

  recomms = recommendations.getByRouteIndex('featUseBehavior', route);

  if (recomms.length === 0)
    return;

  recomms.forEach(function(aRecommendation){
   
    shouldReport = false;
    let featReportInfo = {};


    let oldStatus = aRecommendation.status;
    if (aRecommendation.status === 'active' ||
        aRecommendation.status === 'outstanding'){

      aRecommendation.status = 'inactive';
      recommendations.update(aRecommendation);

      shouldReport = true;
    }

    if (oldStatus == 'delivered')
      shouldReport = true;  //might cause sending of too much redundant feature use log


    if (shouldReport){
      logger.logFeatureUse(featureUseInfo(aRecommendation));

      
      if (oldStatus == 'delivered')
        featReportInfo.adopted = true;
      else
        featReportInfo.featureuse = true;

      featReport.updateRow(aRecommendation.id, featReportInfo);
      
    }
  });
}

listener.command = function(cmd){
  let cmdObj = utils.extractOpts(cmd);

  let name = cmdObj.header;

  switch(name){
    case "open url":
      if (!cmdObj.l) {
        console.log("no url provided for command: " + cmd);
        return;
      }

      if (cmdObj.window)
        windows.browserWindows.open(
          {
            url: cmdObj.l,
            isPrivate: cmdObj.private
          });
      else{
        tabs.open(cmdObj.l);
      }

      break;

    case "amo install":
      if (!cmdObj.l) {
        console.log("no url provided for command: " + cmd);
        return;
      }

      utils.installAddonFromAmo(cmdObj.l);
      break;
    case "info":
      tabs.open(data.url("infopage.html"))

      break;

    case "pin tab":
      tabs.activeTab.pin();

      break;

    case "pass":
      break;

    default:
      console.log("command not recognized: " + cmd);

      return undefined;
  }

  return "";

}

listener.dispatchRoute = function(route, options){
  route = Route(route);

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

    if (options.featureUse)
      this.featureUse(route);
  }

}

listener.listenForAddonEvents = function(callback){

  tabs.on('ready', function(tab){
    if (isPrivate(tab))
      return;

    if (tab.url == "about:addons")
      callback('pageshow');
  });

  function _reportCount(){
    AddonManager.getAllAddons(function(addons){
        callback('count', {number: addons.length, type: 'all'});
      });
    AddonManager.getAddonsByTypes(['extension'], function(addons){
        callback('count', {number: addons.length, type: 'extension'});
    });
    AddonManager.getAddonsByTypes(['theme'], function(addons){
        callback('count', {number: addons.length, type: 'theme'});
    });
  }

  let reportCount = functional.defer(_reportCount);

  addonListener = {
    onInstallEnded: function(install, addon){
      callback('install', {addonId: addon.id});
      callback('has', {addonId: addon.id});
      reportCount();
    }
  }

  AddonManager.addInstallListener(addonListener);

  AddonManager.getAllAddons(function(addons){
    reportCount();
    addons.forEach(function(addon){
      if (addon.type !== "plugin")
        callback('has', {addonId: addon.id});
    });
  });
}

listener.listenForNewtab = function(callback){
  tabs.on('open', function(tab){
    if (isPrivate(tab))
      return;

    if ([NEWTAB_URL, HOME_URL].indexOf(tab.url) != -1) callback();
  });
}

listener.listenForTools = function(callback){
  //Findbar
  
  let findopened = function(e){
    callback("finder", "opened");
  }

  let windowTracker = new WindowTracker({
    onTrack: function (window){

      if (!isBrowser(window) || isPrivate(window)) return;

      let doc = Cu.getWeakReference(window.document);

      let buttonListener = function(){
        doc.get().getElementById("find-button").addEventListener("click", findopened);
        unload(function(){
          if (doc.get() && doc.get().getElementById("find-button"))
            doc.get().getElementById("find-button").removeEventListener("click", findopened);
        });
        console.log("button listener");
      }

      if (doc.get().getElementById("find-button"))
        buttonListener()
      else { 
        doc.get().getElementById("PanelUI-menu-button").addEventListener("command", functional.once(buttonListener));
        unload(function(){
          if (doc.get() && doc.get().getElementById("PanelUI-menu-button"))
            doc.get().getElementById("PanelUI-menu-button").removeEventListener("command", buttonListener)
        });
      }

      doc.get().getElementById("cmd_find").addEventListener("command", findopened);
      unload(function(){
        if (doc.get() && doc.get().getElementById("cmd_find"))
          doc.get().getElementById("cmd_find").removeEventListener("command", findopened);
      });

    }
  });

}



listener.listenForPageVisit = function(callback, options){
  
  const tabData = new WeakMap();  

  // extracting hostnames to listen for
  const hostNameList = {};

  function evalRoute(route){
    let res = route.match(/^visit hostname ([^ ]*)/);
    if (res){
      if (!hostNameList[res[1]]){
        hostNameList[res[1]] = true;
        console.log("hostname listener: ", res[1]);
      } 
    }
  }

  // initialize the host name list
  recommendations.forEach(function(aRecommendation){
    evalRoute(aRecommendation.trigBehavior);
    evalRoute(aRecommendation.delivContext);
    evalRoute(aRecommendation.featUseBehavior);
  });

  // web apps to listen for

  const apps = {
    googleCal: new MatchPattern(/^(http|https):\/\/calendar\.google\.com\/.*/),
    gmail: new MatchPattern(/^(http|https):\/\/mail\.google\.com\/.*/),
    gdrive: new MatchPattern(/^(http|https):\/\/drive\.google\.com\/.*/),
    gdocs: new MatchPattern(/^(http|https):\/\/docs\.google\.com\/.*/),
    twitter: new MatchPattern(/^(http|https):\/\/twitter\.com.*/),
    slack: new MatchPattern(/^(http|https):\/\/.*\.slack\.com\/.*/)
  }

  // categories to listen for
  const catIndx = {
    academic:           [ new MatchPattern(/^(http|https):\/\/ieeexplore\.ieee\.org\/.*/),
                          new MatchPattern(/^(http|https):\/\/scholar\.google\..*/),
                          new MatchPattern(/^(http|https):\/\/www\.sciencedirect\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/dl\.acm\.org\/.*/)
                        ],
    search:             [ new MatchPattern(/^(http|https):\/\/www\.google\.com\/\?.*/),
                          new MatchPattern(/^(http|https):\/\/www\.bing\.com\/search\?.*/),
                          new MatchPattern(/^(http|https):\/\/.*\.search\.yahoo\.com\/.*/)
                        ],
    specializedSearch:  [ new MatchPattern(/^(http|https):\/\/www\.google\.com\/maps\/search\/.*/),
                          new MatchPattern(/^(http|https):\/\/www\.imdb\.com\/find\?.*/),
                          new MatchPattern(/^(http|https):\/\/en\.wikipedia\.org\/wiki\/.*/)
                        ],
    weather:            [ new MatchPattern(/^(http|https):\/\/weather\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/www\.accuweather\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/www\.wunderground\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/www\.weather\.gov\/.*/),
                          new MatchPattern(/^(http|https):\/\/weather\.yahoo\.com\/.*/)
                        ],
    translation:        [ new MatchPattern(/^(http|https):\/\/translate\.google\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/www\.translate\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/www\.freetranslation\.com\/.*/)
                        ],
    webApp:             [ new MatchPattern(/^(http|https):\/\/calendar\.google\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/mail\.google\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/drive\.google\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/docs\.google\.com\/.*/),
                          new MatchPattern(/^(http|https):\/\/twitter\.com.*/),
                          new MatchPattern(/^(http|https):\/\/.*\.slack\.com\/.*/)  
                        ]
  };

  tabs.on("pageshow", function(tab){

      if (isPrivate(tab))
        return;

      let isActiveTab = (tab === tabs.activeTab);

      let data = tabData.get(tab);
      
      let hostname = URL(tab.url).hostname;

      if (!hostname){
        tabData.delete(tab);
        return; //to handle new tabs and blank pages
      } 


      // process hostname
      
      (()=>{

        if (!isActiveTab)
          return;

        if (!hostNameList[hostname]){
          if (data && data.hostname){
            delete data.hostname;
            delete data.hostnameCount;
          }

          return;
        }

        if (!data){
          tabData.set(tab, {});
          data = tabData.get(tab);
        }

        if (!data.hostname){
          data.hostname = hostname;
          data.hostnameCount = 0;
        }

        if (hostname != data.hostname){
          data.hostname = hostname;
          data.hostnameCount = 1;
        } else {
          data.hostnameCount += 1;
          if (data.hostnameCount == 5)
            data.hostnameCount = 1;
        }

        console.log(data.hostname + " : " + data.hostnameCount);

        if (options && options.halfFresh && data.hostnameCount == 1) {
          callback("hostname", hostname);
          console.log("hostname visit:", data.hostname);
        }

      })();

      // process web apps
    
      (()=>{
      
        let appId = null;

        for (let id in apps){
          if (apps[id].test(tab.url))
            appId = id;
        }

        if (!appId){
          if (data && data.appId){
            delete data.appId;
            delete data.appIdCount;
          }

          return;
        }

        if (!data){
          tabData.set(tab, {});
          data = tabData.get(tab);
        }

        if (!data.appId){
          data.appId = appId;
          data.appIdCount = 0;
        }

        if (appId != data.appId){
          data.appId = appId;
          data.appIdCount = 1;
        } else {
          data.appIdCount += 1;
          if (data.appId == 5)
            data.appIdCount = 1;
        }

        console.log(data.appId + " : " + data.appIdCount);

        if (options && options.halfFresh && data.appIdCount == 1) {
          callback("webapp", appId);
          console.log("webapp visit:", data.appId);
        }

      })();

      // process website categories
      
      (()=>{

        let cats = [];

        for (let c in catIndx){
          let arr = catIndx[c];

          for (let i in arr){
            let pattern = arr[i];
            if (pattern.test(tab.url)){
              cats.push(c);
              break;
            }
          }
        }

        if (cats.length == 0){
          if (data && data.cats){
            delete data.cats;
            delete data.catsCount;
          }

          return;
        }

        if (!data){
          tabData.set(tab, {});
          data = tabData.get(tab);
        }        

        if (!data.cats){
          data.cats = cats;
          data.catsCount = 0;
        }

        if (!utils.arraysEqual(cats, data.cats)){
          data.cats = cats;
          data.catsCount = 1;
        } else {
          data.catsCount += 1;
          if (data.catsCount == 5)
            data.catsCount = 1;
        }

        console.log(data.cats + " : " + data.catsCount);

        if (options && options.halfFresh && data.catsCount == 1){
          data.cats.forEach(function(cat){
            callback("category", cat);
            console.log("category visit:", cat);

          });
        } 

      })();

    });
  }

listener.listenForTabs = function(callback, options){

  const tabData = new WeakMap();

  let reason;

  let countPinnedTabs = function(){
    let c = 0;

    for (let i in tabs)
      if (tabs[i].isPinned)
        c++;

    return c;
  }

  let windowTracker = new WindowTracker({
    onTrack: function (window){

      if (!isBrowser(window) || isPrivate(window)) return;

      let tb = Cu.getWeakReference(window.gBrowser);
      let f = function(e){
        reason = "pinned";
        callback(reason);
        callback("pin", {number: countPinnedTabs()}); 
      };
      tb.get().tabContainer.addEventListener("TabPinned", f);
      unload(function(){
        if (tb.get() && tb.get().tabContainer)
            tb.get().tabContainer.removeEventListener("TabPinned", f)
      });

      f = function(e){
        reason = "unpinned";
        callback(reason);
        callback("pin", {number: countPinnedTabs()}); 
      };
      tb.get().tabContainer.addEventListener("TabUnpinned", f);
      unload(function(){
        if (tb.get() && tb.get().tabContainer)
          tb.get().tabContainer.removeEventListener("TabUnpinned", f)
      });

      // new-tab-button
      // this would ideally be a union of 2 chrome events 
      // (since a new element is created when tabs overflow),
      // but you currently
      // cannot take the union of two routes in 1 route
      
      f = function(e){
        reason = "newtab-button";
        callback(reason);
      }

      let button =  Cu.getWeakReference(window.document
      .getAnonymousElementByAttribute(
        window.document.getElementById("tabbrowser-tabs")
        , "anonid", "tabs-newtab-button"));

      button.get().addEventListener("click", f);
      unload(function() {
        if (button.get())
          button.get().removeEventListener("click", f);
      });

      button = Cu.getWeakReference(window.document.getElementById("new-tab-button"));
      button.get().addEventListener("click", f);
      unload(function() {
        if (button.get())
          button.get().removeEventListener("click", f);
      });

    }
  });


  let tabSwitch = function(t){

    reason = "switched";

    let ts = t.window.tabs;

    let params = {};

    if (t === ts[ts.length-1])
      params.position = "last";
    else if (t === ts[0])
        params.position = "first";

    // callback(reason, {position: "1-8"});

    callback(reason, params);
  };

  tabs.on('activate', function(tab){

    if (isPrivate(tab))
      return;

    reason = "activated";
    callback(reason);

    let data = tabData.get(tab);

    if (!data || !data.initialized){
      tabData.set(tab, {initialized: true});
      return;
    }
   
    tabSwitch(tab);

  });

  tabs.on('open', function(tab){

    if (isPrivate(tab))
      return;

    reason = "opened";
    callback(reason);

    reason = "open";
    callback(reason,  {number: tabs.length});
  });

  //initial tabs that are not handled by tab.on(open)
  if (!options || !options.excludeInitialTabs){

    reason = "open";
    callback(reason, {number: tabs.length});

    callback("pin", {number: countPinnedTabs()}); 
  }
}

listener.listenForDownloads = function(callback, options){
  dlView = {
    onDownloadAdded: function(download) { 
      console.log("Download added");
      // the condition tries work around the problem that Firefox emits the downloadAdded event
      // even after the download has been done
      if (download.startTime.getTime() > Date.now() - 10000) 
        callback('added');
    },
    onDownloadChanged: function(download) {
      // console.log("Download changed");
      // callback('changed');
    },
    onDownloadRemoved: function(download) {
      console.log("Download removed");  
      if (download.startTime.getTime() > Date.now() - 10000)
        callback('removed');
    } 
  };

  Task.spawn(function() {
    try {
      let downloadList = yield Downloads.getList(Downloads.PUBLIC);
      yield downloadList.addView(dlView);
    } catch (ex) {
      console.error(ex);
    }
  });

  unload(function(){
    Task.spawn(function(){
      let list = yield Downloads.getList(Downloads.PUBLIC);
      list.removeView(dlView);
    }).then(null, Cu.reportError);
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
      if (!isBrowser(window) || isPrivate(window)) return;

      for (let routeId in routesToListenFor){
        let route =routesToListenFor[routeId];
        // console.log(route.id);
        let elem;
        console.log(route.id);
        switch(route.id){
          case "window":
            elem = Cu.getWeakReference(window);
            break
          case "document":
            elem = Cu.getWeakReference(window.document);
            break;
          default:
            elem = Cu.getWeakReference(window.document.getElementById(route.id));
        }
        
        let f = function(evt){
          // console.log(elem);
          callback(route, evt);
        }

        elem.get().addEventListener(route.eventName, f);
        unload(function(){
          if (elem.get())
            elem.get().removeEventListener(route.eventName, f)
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
      if (!isBrowser(window) || isPrivate(window)) return;

      let wd = Cu.getWeakReference(window);

      wd.get().addEventListener((options && options.eventName) || "keydown", callback );
      unload(function(){
        if (wd.get())
          wd.get().removeEventListener((options && options.eventName) || "keydown", callback)
      });
    }
  });
}

listener.listenForSearchEngine = function(callback){

  let searchService = Cc["@mozilla.org/browser/search-service;1"]
                           .getService(Ci.nsIBrowserSearchService);

  function countNondefaultAlias(engines){
    let c  = 0;
    engines.forEach(function(eng){
      if (eng.alias)
        c = c + 1;
    });

    return c;
  }

  function reportAliasCount(){
    let engines = searchService.getEngines();

    let c = countNondefaultAlias(engines);

    if (c > 0)
      callback("alias", {number: c});
  }

  searchService.init(function(){
    // console.log(engines);
    //TOTHINK: could potentially be done only the first run and make multiple modify events meaningful

    reportAliasCount();
  });

  let modifyTopic = "browser-search-engine-modified";
  searchEngineObserver = {
    observe: function(aEngine, aTopic, aData){
      if (aTopic == modifyTopic){
        callback(aData);
        
        reportAliasCount();
      }
    },
    register: function(){
      Services.obs.addObserver(searchEngineObserver, modifyTopic, false);
    },
    unregister: function(){
      Services.obs.removeObserver(searchEngineObserver, modifyTopic, false);
    }
  }

  searchEngineObserver.register();

};


listener.listenForHistory = function(callback){

  //Create history observer
  historyObserver = {
    onBeginUpdateBatch: function() {},
    onEndUpdateBatch: function() {
    },
    onVisit: function(aURI, aVisitID, aTime, aSessionID, aReferringID, aTransitionType) {},
    onTitleChanged: function(aURI, aPageTitle) {},
    onBeforeDeleteURI: function(aURI) {},
    onDeleteURI: function(aURI) {
      callback('deletedURI');
      console.log("deleted", aURI);

    },
    onClearHistory: function() {
      callback('cleared');
    },
    onPageChanged: function(aURI, aWhat, aValue) {},
    onDeleteVisits: function(aURI, aVisitTime, aGUID) {
      
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsINavHistoryObserver])
  };

  hs = Cc["@mozilla.org/browser/nav-history-service;1"].
         getService(Ci.nsINavHistoryService);

  hs.addObserver(historyObserver, false);

}

listener.listenForPrivateBrowsing = function(callback){
  windows.browserWindows.on('open', function(window){
    if (require("sdk/private-browsing").isPrivate(window)){
      callback('open');
      
    }
  });
}

listener.listenForSessionStore = function(callback){

  sessObserver = {
    observe: function(subject, topic, data) {
      if (topic == "sessionstore-browser-state-restored"){ //sessionstore... not in Observer Notifications list
        callback("restored");
      }
    },
    register: function() {
      observerService.addObserver(this, "sessionstore-browser-state-restored", false);
    },
    unregister: function() {
      observerService.removeObserver(this, "sessionstore-browser-state-restored");
    }
  };

  sessObserver.register();
}

listener.listenForContentType = function(callback, contentTypes){

  //TODO: rewrite using the contentType in tabs sdk
  //https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/tabs#contentType

  contentTypeObserver = {
    observe: function(subject,topic,data){
      let httpChannel = 
          subject.QueryInterface(Ci.nsIHttpChannel);
      
      let contentType, contentTypeExp;

      try{
        contentTypeExp = httpChannel.getResponseHeader("Content-Type").match(/.*[;\Z]/);
      }
      catch(e){}

      if (contentTypeExp)
        contentType = contentTypeExp[0].slice(0,-1);
      else
        return;
      console.log(contentType);

      let channel = subject.QueryInterface(Ci.nsIChannel);
      let url = channel.URI.spec;
      url = url.toString();

      if (contentTypes.indexOf(contentType) != -1)
        callback(contentType);
      },
    register: function() {
      observerService.addObserver(this, "http-on-examine-response", false);
    },
    unregister: function() {
        observerService.removeObserver(this, "http-on-examine-response");
    }
  };
  contentTypeObserver.register();
}

listener.listenForUserActivity = function(callback){
  timer.onUserActive(callback);
}


listener.listenForFirefoxEvents = function(callback){

  // listen for update channel
  let channel = self.updateChannel;

  let reason = 'channel';

  callback(reason, {channel: channel});
  
  // listen for profile number
  
  let toolkitProfileService = Cc["@mozilla.org/toolkit/profile-service;1"]
                            .createInstance(Ci.nsIToolkitProfileService);

  let enumerator = toolkitProfileService.profiles;

  let prof;
  let num = 0;
  while (enumerator.hasMoreElements()){
    prof = enumerator.getNext().QueryInterface(Ci.nsIToolkitProfile)
    num++;
  };

  callback('profiles', {number: num});

  if (require('sdk/self').loadReason == "startup")
    callback('startup'); 
}

// listening for command invocations is not useful because the menu items directly call gDevTools functions
listener.listenForDevTools = function(callback){

  let windowTracker = new WindowTracker({
    onTrack: function (window){

      if (!isBrowser(window) || isPrivate(window)) return;

      let gDevTools = Cu.getWeakReference(window.gDevTools);
      let gBrowser = Cu.getWeakReference(window.gBrowser);
      
      let f = function(e, toolbox){
        let reason = "toolbox-ready";

        let target = devtools.TargetFactory.forTab(gBrowser.get().selectedTab);
        toolbox = Cu.getWeakReference(gDevTools.get().getToolbox(target));

        let h = function(e, toolId){
          let reason = "select";
          callback(reason, {toolId: toolId});
        };

        toolbox.get().on("select", h);

        unload(function(){
          if (toolbox.get()){
            toolbox.get().off("select", h);
          }
        });

        callback(reason);
      };

      gDevTools.get().on("toolbox-ready", f);

      unload(function(){
        if (gDevTools.get())
          gDevTools.get().off("toolbox-ready", f);
      })

      f = function(e, toolId){
        let reason = "select";
        callback(reason, {toolId: toolId});
      };

      gDevTools.get().on("select-tool-command", f);

      unload(function(){
        if (gDevTools.get())
          gDevTools.get().off("select-tool-command", f);
      })

    }
  });
};

listener.multipleRoute = function(baseEvent, options){

    let eventData = getEventData();

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
        data = {count: 1, freq: 1 / (timer.elapsedTime() + 1), ifreq: timer.elapsedTime() + 1};
      }

      eventData[baseRoute] = data;

      this.options.route = [baseRoute,
                            "-c", String(data.count),
                            "-if", String(data.ifreq),
                            "-f", String(data.freq)].join(" ");

      let route = this.options.route;

      listener.dispatchRoute(route, options.dispatch);

      if (options.addedEffect)
        options.addedEffect();
    };

    return rEvent;
  };

listener.listenForInternalEvents= function(callback){
  // tick
  timer.onTick(function(et, ett){
    let reason = "tick";
    let params = {et: et, ett: ett};
    callback("tick", params);
  });
};

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);

    let subArgs, id;
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){

      //listener
      case "dispatch":
        listener.dispatchRoute(params);
        break;
      case "behavior":
        listener.behavior(params);
        break;
      case "context":
        listener.context(params);
        break;
      case "featureUse":
        listener.featureUse(params);
        break;
      case "command":
        listener.command(params)
        break;

      //deliverer
      case "deliver":

        if (!recommendations[params] && params != "next")
          return ("error: recommendation with id " + params + " does not exist.")

        if (params != "next")
          deliverer.deliver(recommendations[params]);
        else {
          let delivered = false;
          recommendations.forEach(function(aRecommendation){
            if (delivered) return;
            if (aRecommendation.status != "delivered"){
              timer.endSilence();
              deliverer.deliver(aRecommendation);
              delivered = true;
            }
          });
          if (!delivered)
            return "end of delivery list";
        }
        break;
      case "schedule":
        if (!recommendations[params])
          return ("error: recommendation with id " + params + "does not exist.")

        deliverer.scheduleRandomDelivery(recommendations[params]);
        break;

      case "route":
        subArgs = patt.exec(params);

        if (!subArgs[0])
          return "error: incorrent use of route command.";

        switch(subArgs[1]){
          case "coeff":
            if (subArgs[2]){
              let newCoeff = coefficient(Number(subArgs[2]));
              scaleRoutes(Number(subArgs[2]), "trigBehavior");
              return "route coefficient set to " + newCoeff;
            }
            else
              return getCoefficient();
          break;
          default:
          return "error: incorrect use of route command.";
        }
        break;
        
      case "status":
        subArgs = patt.exec(params);

        if (!subArgs[0])
          return "error: incorrect use of status command.";

        id = subArgs[1];
        let status = subArgs[2];

        if (!recommendations[id])
          return ("error: recommendation with id " + id + " does not exist.")

        if (!status)
          return recommendations[id].status;

        if (['active', 'outstanding', 'inactive'].indexOf(status) == -1)
          return "error: invalid status";

        let recomm = recommendations[id];
        let oldStat = recomm.status;
        recomm.status = status;
        recommendations.update(recomm);

        return "recommendation " + id + " updated: " + "old status -> " + oldStat + ", new status-> " + status;
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

      case "load":
        subArgs = patt.exec(params);

        if (!subArgs[0])
          return "error: incorrect use of load command.";

        let file = subArgs[1];
        id = subArgs[2];

        if (file == "*")
          file = "recommendations.json"; //default recommendations file

        if (id == "*"){
          loadRecFile(file);
          return file + " loaded";
        }

        let res = loadRec(file, id);

        if (!res)
          return "recommendation with id " + id + " does not exist in file."

        return "recommendation with id " + id + " loaded successfully."
        break;

      case "recs":

        let stat = '*';
        subArgs = patt.exec(params);

        if (subArgs[1])
          stat = subArgs[1];

        let recomIds = recommendations.getByStatus(stat).map(function(aRecommendation){
          return aRecommendation.id;
        });

        return recomIds.join(', ');

        break;

      case "suicide":

        if (params === "framed"){
          utils.selfDestruct("debug command");
          return "Let the world end...";
        }
        else
          return "One does not simply kill itself. Enter 'suicide framed' if you really want it dead.";

        break;
      default:
        return undefined;
    }

    return " ";
  }
};

function welcome(){
  let rec = recommendations["welcome"];

  if (rec.status != "active")
    return;

  rec.status = "outstanding";

  recommendations.update(rec);
}

function loadRecFile(file){
  let {resolve, promise} = defer();

  initRecs().then(()=>{
    let recomms = JSON.parse(data.load(file)).map(function(recData){
      if ("auto-load" in recData && !recData["auto-load"])
        return null;
      
      return Recommendation(recData);
    });

    recommendations.add.apply(recommendations, recomms);

    resolve();
  })

  return promise;
}

function loadRec(file, recId){

  let isFound = false;

  let recomms = JSON.parse(data.load(file)).forEach(function(recData){
    if (recData.id === recId){
      recommendations.add(Recommendation(recData));
      isFound = true;
    }
  });

return isFound;
}

function scaleRoutes(coeff, indexTable){
  if (coeff === 1)
    return;

  recommendations.forEach(function(aRecommendation){
    recommendations.scaleRoute(aRecommendation, coeff, indexTable);
  });

}

function unloadController(reason){

  console.log("unloading controller...");

  if (hs && historyObserver) hs.removeObserver(historyObserver);

  if (sessObserver) sessObserver.unregister();

  if (contentTypeObserver) contentTypeObserver.unregister();

  if (searchEngineObserver) searchEngineObserver.unregister();

  if (addonListener)
    AddonManager.removeInstallListener(addonListener);
}

exports.init = init;
exports.recommendations = recommendations;
exports.loadRecFile = loadRecFile;
exports.scaleRoutes = scaleRoutes;
exports.welcome = welcome;