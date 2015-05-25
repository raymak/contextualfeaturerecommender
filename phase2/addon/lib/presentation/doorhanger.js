"use strict";

const {ActionButton} = require("sdk/ui/button/action");
const {Panel} = require("../panel");
const {setTimeout, clearTimeout} = require("timers");
const {PersistentObject} = require("utils");
const {extractPresentationData} = require("recommendation");
const data = require("sdk/self").data;

const dhDataAddress = "presentation.dhData";

const dhData = PersistentObject("simplePref", {address: dhDataAddress});

const AUTO_FADE_TIME_MS = 5000;
const FADE_TIME_MS = 2000;


let panel;
let button;
let hideTimeout;

function init(){
  button = initButton(buttonClick);
  panel = initPanel(button);

  panel.port.on("buttonClicked", function(){});
  panel.port.on("hide", pHide);
  panel.port.on("mouseenter", pMouseenter);
  panel.port.on("mouseleave", pMouseleave);
  panel.port.on("resize", resize);
}

function initPanel(button){
  return Panel({
  autosize: true,
  autohide: false,
  focus: false,
  contentURL: data.url("./presentation/doorhanger.html"),
  contentScriptFile: data.url("./presentation/doorhanger.js"),
  onShow: onPanelShow,
  onHide: onPanelHide
  });
}

function initButton(clickHandler){
  return ActionButton({
      id: "dh-button",
      label: "Recommend Feature",
      icon: {
          "16": "./ui/icons/lightbulb_bw.png"
      },
      onClick: clickHandler
      // onChange: buttonChange
  });
}

function present(aRecommendation){
  dhData.currentRec = aRecommendation;
  console.log("showing " + aRecommendation.id);
  
  updateShow();  
}

function updateEntry(){
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
} 

function hide(fadeOut){
  if (fadeOut)
    panel.fadeOut();
  else
    panel.hide();
}

function buttonClick(state){
  updateShow();
}

function onPanelShow(){

}

function onPanelHide(){

}

function pHide(reason){
  console.log(reason);
  hide();
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

function resize(size){
  panel.resize(size.width+2, size.height+3);
}

exports.init = init;
exports.present = present;
