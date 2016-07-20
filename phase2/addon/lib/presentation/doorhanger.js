/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


const {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const {setTimeout, clearTimeout} = require("sdk/timers");
const {wordCount, weightedRandomInt} = require("../utils");
const {PersistentObject} = require("../storage");
const {extractPresentationData, extractResponseCommandMap} = require("../recommendation");
const {prefs} = require("sdk/simple-prefs");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {merge} = require("sdk/util/object");
const {dumpUpdateObject, handleCmd, isEnabled} = require("../debug");
const {logDhReport, logDhPresent} = require("../logger");
const timer = require("../timer");
const self = require("../self");
const featReport = require("../feature-report");
const unload = require("sdk/system/unload").when;
const {Cu} = require("chrome");

const dhDataAddress = "presentation.doorhanger.data";

let dhData; //initialized in init()

let panel;
let button;
let hideTimeout;
let letReopen = true;
let wrdCnt; //for auto-adjuting fading time
let buttonChecked = false;
let hideWatch;
let closedwithreason;

function init(){

  console.log("initializing doorhanger");

  return PersistentObject("osFile", {address: dhDataAddress})
  .then((obj)=> {
    dhData = obj;
    obj.on('update', debug.update);
  }).then(_init);
}
function _init(){
  // panel = initPanel(button);
  
  console.time("doorhanger init");

  debug.init();
  // debug.update();
  
  let wt = new WindowTracker({
    onTrack: function(window){
      if (!isBrowser(window)) return;

      let wd = Cu.getWeakReference(window);

      let f = function(e){
       if (e.key === "Escape")
        pHide("escape");
      };

      wd.get().addEventListener("keydown", f);
      unload(function(){
        if (wd.get())
          wd.get().removeEventListener("keydown", f)
      });
    }
  });

  if (dhData.currentRec && dhData.currentRec.recomm && !dhData.stopped){
    button = initButton(buttonClick);
    updateEntry();
  }

  unload(()=>{
    clearTimeout(hideTimeout);
  });

  console.timeEnd("doorhanger init");
}

function initPanel(button){
  let nPanel =  require("../panel").Panel({
    autosize: true,
    autohide: false,
    focus: false,
    contentURL: data.url("./presentation/doorhanger.html"),
    contentScriptFile: [data.url("./presentation/doorhanger.js"), data.url("./js/sanitize-html.min.js")],
    onShow: onPanelShow,
    onHide: onPanelHide
  });

  nPanel.port.on("log", function(m){console.log(m)});
  nPanel.port.on("hide", pHide);
  nPanel.port.on("mouseenter", pMouseenter);
  nPanel.port.on("mouseleave", pMouseleave);
  nPanel.port.on("resize", resize);
  nPanel.port.on("infoPage", openInfoPage);
  nPanel.port.on("response", response)
  nPanel.port.on("liketoggle", likeToggle);
  nPanel.port.on("dontliketoggle", dontLikeToggle);
  nPanel.port.on("negfb", negFbSubmit);
  nPanel.port.on("negfbopen", negFbOpen);
  nPanel.port.on("rationaleopen", rationaleOpen);

  return nPanel;

}

function initButton(clickHandler){
  return require("sdk/ui/button/toggle").ToggleButton({
      id: "dh-button",
      label: "Open to see your last recommendation",
      icon: {
          "16": "./ui/icons/lightbulb_bw.png"
      },
      onClick: buttonClick,
      onChange: buttonChange
  });
}

function negFbOrder(){
  if (dhData["neg_fb_order"])
    return dhData["neg_fb_order"];

  let n = 4;

  let baseArr =  Array(n).fill().map((x,i)=>i+1);
  let perms = Array(n);

  console.log("constructor", perms.constructor);

  for (let i=0; i < n; i++){
    let c = Math.floor(Math.random()*baseArr.length);
    perms[i] = baseArr[c];
    baseArr.splice(c, 1);
  }
      
  dhData["neg_fb_order"] = perms;

  return perms;
}


function present(aRecommendation, cmdCallback){
 
  if (dhData.count)
     dhData.count = dhData.count + 1;

  if (dhData.currentRec && dhData.currentRec.recomm){
    updateReport();
    report(); //report the last recommendation
  }

  dhData.currentRec = {
                        recomm: aRecommendation, 
                        state:{like: false, dontlike: false, count: 0, negFbChoice: null, negFbOpened: false},
                        report:{number: dhData.count || 1, startett: timer.elapsedTotalTime(), durationtt: 0, primbtn: 0, secbtn: 0,
                        closebtn: 0, autohide: 0, autofade: 0, esc: 0,
                        closeother: 0, responseclose: 0, bulbbutton: 0, firstclosereason: "", mouseenter: false,
                        totalopen: 0, firstopen: 0, rationaleopen: 0, infopage: 0, negfbopen: false,
                        certainlyactive: false}
                      };
  console.log("showing " + aRecommendation.id);

   if (!dhData.count)
    dhData.count = 1;


  let dhPresentInfo = {id: aRecommendation.id, number: dhData.count};
  logDhPresent(dhPresentInfo);
  
  let noschedule = (aRecommendation.id == 'welcome'); // no auto fade for the welcome message

  updateShow({noschedule: noschedule});  
}

function updateEntry(options){  

  let currentRec = dhData.currentRec;

  let noInit = options && options.noinit;

  if (!button)
    button = initButton(buttonClick);

  if (!noInit || !panel || currentRec.state.negFbOpened)
    panel = initPanel(button);

  let entry = extractPresentationData.call(currentRec.recomm, "doorhanger");

  panel.port.emit("updateEntry", entry, currentRec.state, {negFbOrder: negFbOrder(), os: self.sysInfo.os});

  wrdCnt = wordCount(entry.message);

  return new Promise(function(resolve, reject){
    panel.port.on("loaded", function(){resolve()});
  });

}

function updateShow(options, panelOptions){

  let delay = (options && options.nodelay)? 0: prefs["presentation.doorhanger.panel_show_delay_ms"];
  let noInit = options && options.noinit;
  let noSchedule = options && options.noschedule;

  updateEntry({noinit: noInit})
    .then(function() showPanel(delay, panelOptions))
    .then(function(){
    if (!noSchedule)
      scheduleHide(prefs["presentation.doorhanger.autofade_time_ms_flat"]
                  +prefs["presentation.doorhanger.autofade_time_ms_per_word"]*wrdCnt);

    buttonOn();
    });
} 

function scheduleHide(time_ms){
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(function(){
    pHide("autohide", true);
  }, time_ms);
}

function showPanel(delay_ms, panelOptions){

  closedwithreason = false;
  //increment count
  let currRec = dhData.currentRec;
  let state = currRec.state;
  merge(state, {count: state.count+1, negFbOpened: false});
  dhData.currentRec = merge({}, currRec, {state: state});

  return new Promise(function(resolve, reject){
  //delay to make sure the layout has been loaded
  setTimeout(function(){
    panel.show(merge({position: button}, panelOptions));
    resolve();
  }, delay_ms || 0);
  });

}

function hidePanel(fadeOut){

  clearTimeout(hideTimeout);

  if (fadeOut)
    panel.fadeOut();
  else
    panel.hide();

}

function buttonClick(state){

 if (!buttonChecked){
    if (!panel.isShowing)
      if (letReopen)
       updateShow({noschedule: true, nodelay:true, noinit: true}, {autohide: true, focus: true});
     else
      button.state("window", {checked: false}); 
  }
  else
    pHide("bulbbutton", true);
}

function buttonSwitch(state){
  if (state)
    buttonOn();
  else
    buttonOff();
}

function buttonChange(state){
 
}

function buttonOn(){
  button.icon = "./ui/icons/lightbulb_gr.png";
  if (buttonChecked) return;
  //when sate is changed as below, button.state does not change, it only changes by button.click()
  button.state("window", {checked: true}); 
  buttonChecked = true;
}

function buttonOff(){
  button.icon = "./ui/icons/lightbulb_bw.png";
  if (!buttonChecked) return;
  button.state("window", {checked: false});
  buttonChecked = false;
}

function onPanelShow(){
  hideWatch = Date.now();
}

function onPanelHide(){

  letReopen = false;

  setTimeout(function(){
    letReopen = true;
  }, 150);

  buttonOff();

  clearTimeout(hideTimeout);

  let showLength = Date.now()-hideWatch;

  let currRec = dhData.currentRec;
  let report = currRec.report;

  if (currRec.state.count == 1)
    report.firstopen = showLength;

  require("./../stats").event("dhHide", {collectInstance: true}, 
    { id: currRec.recomm.id,
      showlength: showLength,
      opencount: currRec.state.count,
      closedwithreason: closedwithreason
    });

  report.totalopen = report.totalopen + showLength;

  if (!closedwithreason)
    report.autofade = report.autofade + 1;

  dhData.currentRec = merge(currRec, {report: report});
}

function pHide(reason, fadeOut){

  if (!panel || !panel.isShowing){
    console.log("warning: no panel to hide");
    // require('./../logger').logWarning({type: "panel-hide"});
    return;
  }

  let currRec = dhData.currentRec;
  let report = currRec.report;

  if (currRec.state.count == 1){
    report.firstclosereason = reason;
    report.certainlyactive = timer.isCertainlyActive();
  }

  switch(reason){
    case "escape":
      report.esc = report.esc + 1;
      break;

    case "closebutton":
      report.closebtn = report.closebtn + 1;
      break;

    case "autohide":
      report.autohide = report.autohide + 1;
      break;

    case "response":
      report.responseclose = report.responseclose + 1;
      break;

    case "bulbbutton":
      report.bulbbutton = report.bulbbutton + 1;

    default:
      report.closeother = report.closeother + 1;   
  }

  dhData.currentRec = merge(currRec, {report: report});

  console.log(reason);

  closedwithreason = true;

  hidePanel(fadeOut);
}

function pMouseenter(){
  clearTimeout(hideTimeout);

  let currRec = dhData.currentRec;
  let report = currRec.report;

  if (!report.mouseenter){
    report.mouseenter = true;

  dhData.currentRec = merge(currRec, {report: report});
  }
}

function pMouseleave(){
  scheduleHide(prefs["presentation.doorhanger.exitfade_time_ms_per_word"]*wrdCnt);
}

function openInfoPage(){
  require('./../controller').command("info");

  let currRec = dhData.currentRec;
  let report = currRec.report;

  report.infopage = report.infopage + 1;

  dhData.currentRec = merge(currRec, {report: report});


}

function resize(size){
  panel.resize(size.width+3, size.height+3);
}

function response(element, options){

  let currRec = dhData.currentRec;
  let report = currRec.report;

  if (element === "primaryButton")
    report.primbtn = report.primbtn + 1;

  if (element === "secondaryButton")
    report.secbtn = report.secbtn + 1;

  dhData.currentRec = merge(currRec, {report: report});

  let respCmdMap = extractResponseCommandMap.call(dhData.currentRec.recomm, "doorhanger");
  require('./../controller').command(respCmdMap[element]);
}

function likeToggle(){
  console.log("liketoggle");
  let currRec = dhData.currentRec;
  let state = currRec.state;
  merge(state, {like: !state.like});
  dhData.currentRec = merge(currRec, {state: state});
}

function dontLikeToggle(){
  console.log("dontliketoggle");
  let currRec = dhData.currentRec;
  let state = currRec.state;
  state.dontlike = !state.dontlike;

  if (!state.dontlike)
    state.negFbChoice = null;

  dhData.currentRec = merge(currRec, {state: state});
}

function negFbSubmit(val){
  console.log("negative feedback submitted: " + val);
  let currRec = dhData.currentRec;
  let state = currRec.state;
  
  state.negFbChoice =  val;
}

function negFbOpen(){
  let currRec = dhData.currentRec;
  let state = currRec.state;

  state.negFbOpened = true;

  let report = currRec.report;
  report.negfbopen = true;

  dhData.currentRec = merge(currRec, {state: state}, {report: report});
}

function rationaleOpen(){
  let currRec = dhData.currentRec;
  let report = currRec.report;

  report.rationaleopen = report.rationaleopen + 1;

  dhData.currentRec = merge(currRec, {report: report});
}

function updateReport(){
  let currRec = dhData.currentRec;
  let state = currRec.state;
  let report = currRec.report;

  let addedInfo = {
                    durationtt: timer.elapsedTotalTime() - currRec.report.startett,
                    interaction: Boolean(state.like || state.dontlike || (state.count > 1) 
                   || state.negFbChoice || (report.primbtn > 0) || (report.secbtn > 0)
                   || (report.closebtn > 0) || (report.esc > 0) || report.mouseenter
                   || report.rationaleopen || (report.infopage > 0)),
                   id: currRec.recomm.id
                    };
  let info = merge({}, currRec.state, report, addedInfo);

  //reporting to feature report
  let featReportRow = {
                        negfbchoice: info.negFbChoice, dontlike: info.dontlike, presnumber: info.number,
                        interaction: info.interaction, primbtn: (info.primbtn > 0),
                        secbtn: (info.secbtn > 0), manualopen: (info.count > 1),
                        response: (info.primbtn > 0 || info.secbtn > 0), rationaleopen: (info.rationaleopen > 0),
                        firstclosereason: info.firstclosereason, firstopen: info.firstopen, interaction: info.interaction,
                        certainlyactive: report.certainlyactive
                     }
  featReport.updateRow(currRec.recomm.id, featReportRow);

  dhData.lastReport = info;
}

function report(){
  let info = dhData.lastReport;
  if (info)
    logDhReport(info);
  else
    console.log("warning: no report to log.");
}

function stop(){
  console.log("stopping doorhanger");

  if (dhData.stopped)
    return;

  if (button)
    button.destroy();

  dhData.stopped = true;

  if (dhData.currentRec && dhData.currentRec.recomm){
    updateReport();
    report(); //report the last recommendation
  }
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(){
    if (!isEnabled()) return;

    let data = dhData;

    let updateObj;

    if (!data.currentRec)
      updateObj = {};
    else
      updateObj = {count: data.count, currentRecomm: data.currentRec.recomm, state: data.currentRec.state, report: data.currentRec.report};
    
    dumpUpdateObject(updateObj, {list: "Presentation: Doorhanger"});
  },
  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);

    let subArgs;
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    if (name != "dh")
      return undefined;

    subArgs = patt.exec(params);

    switch(subArgs[1]){
      case "report":

        switch(subArgs[2]){
          case "update":
            updateReport();
            report(); //report the last recommendation
          break;

          default:
            return "warning: incorrect use of the dh report command.";
        }

        break;
      default:
        return undefined;
    }

    return " ";
  }
}

exports.init = init;
exports.stop = stop;
exports.present = present;
