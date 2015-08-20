"use strict";

const {ToggleButton} = require("sdk/ui/button/toggle");
const {Panel} = require("../panel");
const {setTimeout, clearTimeout} = require("sdk/timers");
const {PersistentObject, wordCount} = require("../utils");
const {extractPresentationData, extractResponseCommandMap} = require("../recommendation");
const {prefs} = require("sdk/simple-prefs");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {merge} = require("sdk/util/object");
const {dumpUpdateObject, handleCmd} = require("../debug");

const dhDataAddress = "presentation.doorhanger.data";

let dhData; //initialized in init()

let panel;
let button;
let hideTimeout;
let wrdCnt; //for auto-adjuting fading time
let buttonState = false;
let command;

function init(){
  console.log("initializing doorhanger");
  button = initButton(buttonClick);
  // panel = initPanel(button);

  dhData = PersistentObject("simplePref", {address: dhDataAddress, updateListener: debug.update});

  debug.init();
  debug.update();

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


function present(aRecommendation, cmdCallback){
  dhData.currentRec = {recomm: aRecommendation, state:{like: false, dontlike: false, count: 0}};
  command = cmdCallback;
  console.log("showing " + aRecommendation.id);
  
  updateShow();  
}

function updateEntry(){
  panel = initPanel(button);

  let entry = extractPresentationData.call(dhData.currentRec.recomm, "doorhanger");
  panel.port.emit("updateEntry", entry, dhData.currentRec.state);

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
    hidePanel(true);
  }, time_ms);
}

function showPanel(delay_ms, panelOptions){

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

}

function onPanelHide(){
  buttonOff();

  clearTimeout(hideTimeout);
}

function pHide(reason, fadeOut){
  console.log(reason);
  hidePanel(fadeOut);
}

function pMouseenter(){
  clearTimeout(hideTimeout);
}

function pMouseleave(){
  clearTimeout(hideTimeout);

  scheduleHide(prefs["presentation.doorhanger.exitfade_time_ms_per_word"]*wrdCnt);
}

function openInfoPage(){
  tabs.open(data.url("infopage.html"));
}

function resize(size){
  panel.resize(size.width+2, size.height+3);
}

function response(element, options){
  let respCmdMap = extractResponseCommandMap.call(dhData.currentRec.recomm, "doorhanger");
  command(respCmdMap[element]);
}

function likeToggle(){
  console.log("liketoggle");
  let currRec = dhData.currentRec;
  let state = currRec.state;
  merge(state, {like: !state.like});
  dhData.currentRec = merge({}, currRec, {state: state});
}

function dontLikeToggle(){
  console.log("dontliketoggle");
  let currRec = dhData.currentRec;
  let state = currRec.state;
  merge(state, {dontlike: !state.dontlike});
  dhData.currentRec = merge({}, currRec, {state: state});
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(){
    dumpUpdateObject(dhData, {label: "Presentation: Doorhanger"});
  },
  parseCmd: function(cmd){
    return false;
  }
}

exports.init = init;
exports.present = present;
