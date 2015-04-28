"use strict";


const prefs = require("sdk/simple-prefs").prefs;
const {merge} = require("sdk/util/object");


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
}


//TODO: add simpleStorage
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
    return new Proxy(targetObj, {
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
        }
    });
  }
}


exports.override  = function() merge.apply(null, arguments);

