"use strict";

const {ActionButton} = require("sdk/ui/button/action");
const {ToggleButton} = require("sdk/ui/button/toggle");
const {Panel} = require("../panel");
const {setTimeout, clearTimeout} = require("timers");
const {PersistentObject} = require("utils");
const {extractPresentationData} = require("recommendation");
const tabs = require("sdk/tabs");
const data = require("sdk/self").data;

const dhDataAddress = "presentation.dhData";

const dhData = PersistentObject("simplePref", {address: dhDataAddress});

const AUTO_FADE_TIME_MS = 5000;
const FADE_TIME_MS = 2000;


let panel;
let button;
let hideTimeout;
let buttonState = false;

function init(){
  button = initButton(buttonClick);
  panel = initPanel(button);

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

  nPanel.port.on("buttonClicked", function(){});
  nPanel.port.on("hide", pHide);
  nPanel.port.on("mouseenter", pMouseenter);
  nPanel.port.on("mouseleave", pMouseleave);
  nPanel.port.on("resize", resize);
  nPanel.port.on("infoPage", openInfoPage);

  return nPanel;

}

function initButton(clickHandler){
  return ToggleButton({
      id: "dh-button",
      label: "Feature Recommender",
      icon: {
          "16": "./ui/icons/lightbulb_bw.png"
      },
      onClick: clickHandler,
      onChange: buttonChange
      // onChange: buttonChange
  });
}


function present(aRecommendation){
  dhData.currentRec = aRecommendation;
  console.log("showing " + aRecommendation.id);
  
  updateShow();  
}

function updateEntry(){
  panel = initPanel(button);
  panel.port.emit("updateEntry", extractPresentationData.call(dhData.currentRec, "doorhanger"));
}

function updateShow(){
  updateEntry();

  setTimeout(function(){
    panel.show({
    position: button
    });
  }, 150);


  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(function(){
    hide(true);
  }, AUTO_FADE_TIME_MS);

  buttonOn();
} 

function hide(fadeOut){

  clearTimeout(hideTimeout);

  if (fadeOut)
    panel.fadeOut();
  else
    panel.hide();

  buttonOff();
}

function buttonChange(state){
  if (state.checked){
    if (!panel.isShowing)
    updateShow();
  }
  else
    hide(true);

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

}

function pHide(reason, fadeOut){
  console.log(reason);
  hide(fadeOut);
}

function pMouseenter(){
  clearTimeout(hideTimeout);
}

function pMouseleave(){
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(function(){
    hide(true);
  }, FADE_TIME_MS);
}

function openInfoPage(){
  tabs.open(data.url("infopage.html"));
}

function resize(size){
  panel.resize(size.width+2, size.height+3);
}

exports.init = init;
exports.present = present;
