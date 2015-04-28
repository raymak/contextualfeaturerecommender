
"use strict";

const prefs = require("sdk/simple-prefs").prefs;
const {PersistentObject} = require("utils");

const eventDataAddress = "eventData";

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