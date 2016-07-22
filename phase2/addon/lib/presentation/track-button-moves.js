"use strict";

const { EventTarget } = require("sdk/event/target");
let { emit } = require('sdk/event/core');

let buttonTracker = EventTarget();

// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/CustomizableUI.jsm
const {Cu} = require("chrome");
const { CustomizableUI } = Cu.import("resource:///modules/CustomizableUI.jsm");


/*
console.debug: buttonmove: You clicked 'my button' {"disabled":false,"checked":true,"label":"my button","icon":"resource:///chrome/browser/skin/classic/browser/Geolocation-64@2x.png","id":"my-button"}
console.debug: buttonmove: a widget removed from an area, arguments: {"0":"toggle-button--buttonmove-my-button","1":"nav-bar"}
*/


function toMessage (action, aWidgetId, aArea, aPosition) {
  return {
    action: action,
    buttonId: aWidgetId,
    area: aArea,
    postion: aPosition
  }

}
var trackListener = {
  onWidgetAdded: function(aWidgetId, aArea, aPosition) {
    emit(buttonTracker, 'msg', toMessage("added", aWidgetId, aArea, aPosition));
    console.debug('a widget moved to an area, arguments:', arguments);

  },
  onWidgetMoved: function(aWidgetId, aArea, aPosition) {
    emit(buttonTracker, 'msg', toMessage("moved", aWidgetId, aArea, aPosition));
    console.debug('a widget moved within an area, arguments:', arguments);
  },
  onWidgetRemoved: function(aWidgetId, aArea, aPosition) {
    emit(buttonTracker, 'msg', toMessage("removed", aWidgetId, aArea, aPosition));
    console.debug('a widget removed from an area, arguments:', arguments);
  },
  onWidgetDestroyed: function(aWidgetId) {
    emit(buttonTracker, 'msg', toMessage("destroyed", aWidgetId, null, null));
    console.debug('a widget destroyed so removing listener, arguments:', arguments);
  }
}
CustomizableUI.addListener(trackListener);


exports.buttonTracker = buttonTracker;
/*
  let { buttonTracker } = { require("./track-button-moves");
  buttonTracker.on("msg", caseBlock);
*/



