"use strict";


const prefs = require("sdk/simple-prefs").prefs;
const sp = require("sdk/simple-prefs");
const {merge} = require("sdk/util/object");
const {URL} = require("sdk/url");
// const {handleCmd} = require("./debug");

/**
 * Applies partial arguments to a function
 *
 * @param fn {function} The original function to call
 * @param [arguments] {arguments} The partial arguments to be sent to fn
 *
 * @returns {function} The function that accepts partial arguments to be sent to fn
 */
exports.partial = function(fn /*, arguments */) {
  
  let args = Array.prototype.slice.call(arguments, 1);

  return function(){
    return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
  };
};


//TODO: add simpleStorage
////TODO: add function definition capabilities using closures
exports.PersistentObject = function(type, options){
  if (type === "simplePref"){
    //create if pref does not exist
    if (!prefs[options.address])
      prefs[options.address] = JSON.stringify({}); 

    let targetObj;

    if (!options.target)
      targetObj = {};
    else
      targetObj = options.target;

    //TOTHINK: some way to cache data to improve performance
    let rObj = new Proxy(targetObj, {
        get: function(target, name) {
          if (!target[name])
            return JSON.parse(prefs[options.address])[name];
          else
            return target[name];
        },
        set: function(target, name, value) {
          if (!Object.hasOwnProperty(target, name)){
            let dataObj = JSON.parse(prefs[options.address]);
            dataObj[name] = value;
            prefs[options.address] = JSON.stringify(dataObj);
          }
          else
            target[name] = value;

          return true;
        },
        ownKeys: function(target){
          return Object.getOwnPropertyNames(target).concat(Object.keys(JSON.parse(prefs[options.address])));
        },
        //ownKeys does not work properly without getOwnDescriptor
        //here is why: https://bugzilla.mozilla.org/show_bug.cgi?id=1110332
        getOwnPropertyDescriptor: function (target, prop){
          return Object.getOwnPropertyDescriptor(target, prop) || Object.getOwnPropertyDescriptor(JSON.parse(prefs[options.address]), prop);
        },
        deleteProperty: function(target, prop){
          if (prop in target){
            return delete target[prop];
          }
          else {
            let dataObj = JSON.parse(prefs[options.address]);
            let res = delete dataObj[prop];
            prefs[options.address] = JSON.stringify(dataObj);
            return res;
          }

          if (options.updateListener)
            options.updateListener(this);
        }
    });

    if (options.updateListener)
      sp.on(options.address, function(pref){
        options.updateListener(rObj);
    });
    return rObj;
  }
};

exports.isPowerOf2 = function(num){
  if (!num)
    return false;
  let num2 = num/2;
  if (num==1)
    return true;
  if (num2 !== Math.floor(num2))
    return false;
  
  return exports.isPowerOf2(num2);
}

exports.weightedRandomInt = function(weightsArr){
  let sum = weightsArr.reduce(function(pv, cv) { return pv + cv; }, 0);

  let randInt = Math.floor(Math.random() * sum);

  let index = 0;
  let cummWeight = weightsArr[0];

  for (let i = 0; i < sum; i++){
    while (i == cummWeight) {index++; cummWeight += weightsArr[index];}
    if (randInt == i) return index;
  }
};

//http://stackoverflow.com/a/20392392/4015333
exports.tryParseJSON  = function(jsonString){
  try {
      var o = JSON.parse(jsonString);

      // Handle non-exception-throwing cases:
      // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
      // but... JSON.parse(null) returns 'null', and typeof null === "object", 
      // so we must check for that, too.
      if (o && typeof o === "object" && o !== null) {
          return o;
      }
  }
  catch (e) { }

  return false;
};

exports.wordCount = function(str){
  return str.split(" ").length;
};

exports.isHostVideo = function(host){
  let list = [
    "www.youtube.com",
    "www.netflix.com",
    "vimeo.com",
    "screen.yahoo.com",
    "www.hulu.com",
    "www.dailymotion.com",
    "www.liveleak.com",
    "www.twitch.tv",
    "vine.co"
  ];

  return (list.indexOf(host) !== -1);
}

exports.isVidTabOpen = function(){
  let tabs = require('sdk/tabs');
  
  for (let tab of tabs){
    let hostname = URL(tab.url).hostname;
    if (exports.isHostVideo(hostname))
      return true;
  }

  return false;
}

exports.handleCmd = function(h){
  h(debug.parseCmd);
};

exports.dateTimeToString = function(date){
  let n = date.toDateString();
  let time = date.toLocaleTimeString();

  return (n + ' ' + time);
}

const debug = {
  init: function(){

  },
  update: function(){

  },
  parseCmd: function(cmd){
  const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){
      case "isVidTabOpen":
        return exports.isVidTabOpen();
        break;

      default: 
        return undefined;
    }

    return " ";
  }
};



exports.override  = function() merge.apply(null, arguments);


