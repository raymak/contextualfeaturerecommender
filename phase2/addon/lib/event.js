


//TOTHINK: could potentially have multiple effect handlers (like in DOM), but is it necessary/good idea?

const Event = function(eventName, options) {
  return {
    name: aName,
    options: options,
    preEvent: null,
    checkPreconditions: function(){return true}, //preconditions are met by default
    wake: function(preEvent){
    	this.preEvent = preEvent;

    	if (this.checkPreconditions()){    		
    		this.trigger();
    	}

    },
    trigger: function(){
    	this.effect();
    	this.wakePostEvents();
    },
    effect: function(){}, //no effect by default
    wakePostEvents: function(){
    	this.postEvents.forEach(function(aEvent){aEvent.wake(this)})
    },
    postEvents: [],
    toString: function() {
      return "event -> " + "type: " + this.type;
    }
  }
}


exports.Event = Event;