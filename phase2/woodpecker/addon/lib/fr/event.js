/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {prefs} = require("sdk/simple-prefs");
const {PersistentObject} = require("./../storage");

const eventDataAddress = "event.data";

//TOTHINK: could potentially have multiple effect handlers (like in DOM), but is it necessary/good idea?
//TOTHINK: to use the event API from the SDK to emit and listen

const Event = function(name, options) {
  return {
    name: name,
    options: options || {},
    preEvent: null,
    checkPreconditions: function(){return true;}, //preconditions are met by default
    wake: function(preEvent){
    	this.preEvent = preEvent || this.preEvent;

    	if (this.checkPreconditions()){    		
    		this.trigger();
    	}

    },
    trigger: function(){
    	console.log(this + " triggered");
    	this.effect(); 
    	this.wakePostEvents();
    },
    effect: function(){}, //no effect by default
    wakePostEvents: function(){
    	let that = this;
    	this.postEvents.forEach(function(aEvent){aEvent.wake(that);});
    },
    postEvents: [],
    toString: function() {
      return "event -> " + "name: " + this.name;
    }
  };
};

//TOTHINK: replace with a database?
const eventData = PersistentObject("simplePref", {address: eventDataAddress});





exports.Event = Event;
exports.eventData = eventData;
exports.eventDataAddress = eventDataAddress;