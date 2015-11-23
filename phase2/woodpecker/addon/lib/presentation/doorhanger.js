"use strict";

const {getMostRecentBrowserWindow, isBrowser} = require("sdk/window/utils");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const {ActionButton} = require("sdk/ui/button/action");
const {Panel} = require("../panel");
const {setTimeout, clearTimeout} = require("sdk/timers");
// const {PersistentObject, wordCount, weightedRandomInt} = require("../utils");
const {prefs} = require("sdk/simple-prefs");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {merge} = require("sdk/util/object");
// const {dumpUpdateObject, handleCmd, isEnabled} = require("../debug");
// const {logDhReport} = require("../logger");
// const timer = require("../timer");
// const self = require("../self");
// const logger = require("../logger");
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
let fbCallback;

function init(){
  console.log("initializing doorhanger");
  // button = initButton(buttonClick);
  // panel = initPanel(button);

  // dhData = PersistentObject("simplePref", {address: dhDataAddress, updateListener: debug.update});
  
  // let wt = new WindowTracker({
  //   onTrack: function(window){
  //     if (!isBrowser(window)) return;

  //     let f = function(e){
  //      if (e.key === "Escape")
  //       pHide("escape");
  //     };

  //     window.addEventListener("keydown", f);
  //     unload(function(){window.removeEventListener("keydown", f)});
  //   }
  // });

}

function initPanel(button){
  let nPanel =  Panel({
    autosize: true,
    autohide: false,
    focus: false,
    contentURL: data.url("./presentation/doorhanger.html"),
    contentScriptFile: [data.url("./js/jquery-1.11.3.min.js"), data.url("./presentation/doorhanger.js")],
    onShow: onPanelShow,
    onHide: onPanelHide
  });

  nPanel.port.on("log", function(m){console.log(m)});
  nPanel.port.on("hide", pHide);
  nPanel.port.on("resize", resize);
  nPanel.port.on("infoPage", openInfoPage);
  nPanel.port.on("fbSubmit", fbSubmit);

  return nPanel;

}

function initButton(clickHandler){
  return ActionButton({
      id: "dh-button",
      label: "Woodpecker",
      icon: {
          "16": "./ui/icons/lightbulb_bw.png"
      },
      onClick: buttonClick,
      onChange: buttonChange
      // onChange: buttonChange
  });
}


function fbSubmit(rate){
  let result = {type: "rate", rate: rate};
  fbCallback(result);
}


function present(callback){ 
  // let dhPresentInfo = {id: aRecommendation.id, number: dhData.count};
  // logger.logDhPresent(dhPresentInfo);

  if (panel && panel.isShowing){
    console.log("warning: doorhanger panel already open");
    return;
  }

  fbCallback = callback;
  
  updateShow();  
}

function updateEntry(){

  panel = initPanel(button);
  panel.port.emit("init", {colorMode: prefs['presentation.doorhanger.color_mode']});
}

function updateShow(options, panelOptions){
  updateEntry();

  showPanel(150, panelOptions);

  let noSchedule = options && options.noschedule;

  if (!noSchedule)
    scheduleHide(prefs["presentation.doorhanger.autofade_time_ms"]);

  // buttonOn();
} 

function scheduleHide(time_ms){
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(function(){
    pHide("autohide", true);
    fbCallback({type: "timeout"});
  }, time_ms);
}

function showPanel(delay_ms, panelOptions){

  //delay to make sure the layout has been loaded
  setTimeout(function(){
    panel.show(merge({position: {top: 0, right: 50}}, panelOptions));
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
  // if (state.checked){
  //   if (!panel.isShowing)
  //    updateShow({noschedule: true}, {autohide: true, focus: true});
  // }
  // else
  //   hidePanel(true);
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

  // buttonOff();

  clearTimeout(hideTimeout);

  let showLength = Date.now()-hideWatch;
}

function pHide(reason, fadeOut){

  hidePanel(fadeOut);
}


function openInfoPage(){
  tabs.open(data.url("infopage.html"));


}

function resize(size){
  panel.resize(size.width+4, size.height+4);
}

function response(element, options){

}


function updateReport(){

}

function report(){
  let info = dhData.lastReport;
  if (info)
    logDhReport(info);
  else
    console.log("warning: no report to log.");
}


exports.init = init;
exports.present = present;
