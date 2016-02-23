/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const {ToggleButton} = require("sdk/ui/button/toggle");
const {Panel} = require("../panel");
const {setTimeout, clearTimeout} = require("sdk/timers");
const {PersistentObject, wordCount, weightedRandomInt} = require("../utils");
const {extractPresentationData, extractResponseCommandMap} = require("../recommendation");
const {prefs} = require("sdk/simple-prefs");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {merge} = require("sdk/util/object");
const {dumpUpdateObject, handleCmd, isEnabled} = require("../debug");
const {logDhReport} = require("../logger");
const timer = require("../timer");
const self = require("../self");
const logger = require("../logger");
const featReport = require("../feature-report");
const unload = require("sdk/system/unload").when;

const dhDataAddress = "presentation.doorhanger.data";

let dhData; //initialized in init()

let panel;
let button;
let hideTimeout;
let wrdCnt; //for auto-adjuting fading time
let buttonState = false;
let command;
let hideWatch;
let closedwithreason;

function init(){
  console.log("initializing doorhanger");
  // panel = initPanel(button);

  dhData = PersistentObject("simplePref", {address: dhDataAddress, updateListener: debug.update});

  debug.init();
  // debug.update();
  
  let wt = new WindowTracker({
    onTrack: function(window){
      if (!isBrowser(window)) return;

      let f = function(e){
       if (e.key === "Escape")
        pHide("escape");
      };

      window.addEventListener("keydown", f);
      unload(function(){window.removeEventListener("keydown", f)});
    }
  });

  if (dhData.currentRec && dhData.currentRec.recomm){
    button = initButton(buttonClick);
    updateEntry();
  }

}

function initPanel(button){
  let nPanel =  Panel({
    autosize: true,
    autohide: false,
    focus: false,
    contentURL: data.url("./presentation/doorhanger.html"),
    contentScriptFile: data.url("./presentation/doorhanger.js"),
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
  nPanel.port.on("rationaleopen", rationaleOpen);

  return nPanel;

}

function initButton(clickHandler){
  return ToggleButton({
      id: "dh-button",
      label: "Feature Recommender",
      icon: {
          "16": "./ui/icons/lightbulb_bw.png"
      },
      onClick: buttonClick,
      onChange: buttonChange
      // onChange: buttonChange
  });
}

function negFbOrder(){
  if (dhData["neg_fb_order"])
    return dhData["neg_fb_order"];

  let order = weightedRandomInt([1, 1, 1, 1, 1, 1]);

  return order;
}


function present(aRecommendation, cmdCallback){
 
  if (dhData.count)
     dhData.count = dhData.count + 1;

  if (dhData.currentRec && dhData.currentRec.recomm){
    updateReport();
    report(); //report the last recommendation
  }

  dhData.currentRec = {recomm: aRecommendation, 
                       state:{like: false, dontlike: false, count: 0, negFbChoice: null},
                       report:{number: dhData.count || 1, startett: timer.elapsedTotalTime(), durationett: 0, primbtn: 0, secbtn: 0,
                       closebtn: 0, autohide: 0, autofade: 0, esc: 0,
                       closeother: 0, responseclose: 0, firstclosereason: "", mouseenter: false,
                       totalopen: 0, firstopen: 0, rationaleopen: 0, infopage: 0}
                      };
  command = cmdCallback;
  console.log("showing " + aRecommendation.id);

   if (!dhData.count)
    dhData.count = 1;


  let dhPresentInfo = {id: aRecommendation.id, number: dhData.count};
  logger.logDhPresent(dhPresentInfo);
  
  updateShow();  
}

function updateEntry(){

  if (!button)
    button = initButton(buttonClick);
  panel = initPanel(button);

  let entry = extractPresentationData.call(dhData.currentRec.recomm, "doorhanger");
  panel.port.emit("updateEntry", entry, dhData.currentRec.state, {negFbOrder: negFbOrder(), os: self.sysInfo.os});

  wrdCnt = wordCount(entry.message);

}

function updateShow(options, panelOptions){
  updateEntry();

  showPanel(150, panelOptions);

  let noSchedule = options && options.noschedule;

  if (!noSchedule)
    scheduleHide(prefs["presentation.doorhanger.autofade_time_ms_per_word"]*wrdCnt);

  buttonOn();
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
  merge(state, {count: state.count+1});
  dhData.currentRec = merge({}, currRec, {state: state});

  //delay to make sure the layout has been loaded
  setTimeout(function(){
    panel.show(merge({position: button}, panelOptions));
  }, delay_ms || 0);

}

function hidePanel(fadeOut){

  clearTimeout(hideTimeout);

  if (fadeOut)
    panel.fadeOut();
  else
    panel.hide();

}

function buttonChange(state){
  if (state.checked){
    if (!panel.isShowing)
     updateShow({noschedule: true}, {autohide: true, focus: true});
  }
  else
    hidePanel(true);
}

function buttonClick(state){


}

function buttonSwitch(state){
  if (state)
    buttonOn();
  else
    buttonOff();
}

function buttonOn(){
  button.icon = "./ui/icons/lightbulb_gr.png";
  if (buttonState) return;
  //when sate is changed as below, button.state does not change, it only changes by button.click()
  button.state("window", {checked: true}); 
  buttonState = true;
}

function buttonOff(){
  button.icon = "./ui/icons/lightbulb_bw.png";
  if (!buttonState) return;
  button.state("window", {checked: false});
  buttonState = false;
}

function onPanelShow(){
  hideWatch = Date.now();
}

function onPanelHide(){

  buttonOff();

  clearTimeout(hideTimeout);

  let showLength = Date.now()-hideWatch;

  let currRec = dhData.currentRec;
  let report = currRec.report;

  if (currRec.state.count == 1)
    report.firstopen = showLength;

  report.totalopen = report.totalopen + showLength;

  if (!closedwithreason)
    report.autofade = report.autofade + 1;

  dhData.currentRec = merge(currRec, {report: report});
}

function pHide(reason, fadeOut){

  let currRec = dhData.currentRec;
  let report = currRec.report;

  if (currRec.state.count == 1)
    report.firstclosereason = reason;

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

  report.mouseenter = true;

  dhData.currentRec = merge(currRec, {report: report});
}

function pMouseleave(){
  clearTimeout(hideTimeout);

  scheduleHide(prefs["presentation.doorhanger.exitfade_time_ms_per_word"]*wrdCnt);
}

function openInfoPage(){
  command("info");

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
  command(respCmdMap[element]);
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

  dhData.currentRec = merge(currRec, {state: state});
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

  let addedInfo = {durationtt: timer.elapsedTotalTime() - currRec.report.startett,
                   interaction: Boolean(state.like || state.dontlike || (state.count > 1) 
                   || state.negFbChoice || (report.primbtn > 0) || (report.secbtn > 0)
                   || (report.closebtn > 0) || (report.esc > 0) || report.mouseenter
                   || report.rationaleopen || (report.infopage > 0))
                    };
  let info = merge({}, currRec.state, currRec.report, addedInfo);

  //reporting to feature report
  let featReportRow = {negfbchoice: info.negFbChoice, dontlike: info.dontlike, presnumber: info.number,
                    interaction: info.interaction, primbtn: (info.primbtn > 0),
                    secbtn: (info.secbtn > 0), manualopen: (info.count > 1),
                    response: (info.primbtn > 0 || info.secbtn > 0), rationaleopen: (info.rationaleopen > 0),
                    firstclosereason: info.firstclosereason, firstopen: info.firstopen
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

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(){
    if (!isEnabled) return;

    let data = dhData;
    let updateObj = {count: data.count, currentRecomm: data.currentRec.recomm, state: data.currentRec.state};
    dumpUpdateObject(updateObj, {list: "Presentation: Doorhanger"});
  },
  parseCmd: function(cmd){
    return undefined;
  }
}

exports.init = init;
exports.present = present;
