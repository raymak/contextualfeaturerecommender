/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const unload = require("sdk/system/unload").when;
const {setInterval} = require("sdk/timers");
const sp = require("sdk/simple-prefs");
const {pathFor} = require('sdk/system');
const prefs = sp.prefs;
const file = require('sdk/io/file');
const {Cu} = require("chrome");
Cu.import("resource://gre/modules/osfile.jsm");

const DIR_PATH = file.join(pathFor("ProfD"), require('sdk/self').addonId + "-storage");

"use strict";

//TODO: add OS.File
//TODO: add function definition capabilities using closures, to make it a real persistent object,
// and not only a JsonStore
// TODO: work on this and make it an npm package
// read sdk/simple-storage.js again for this + the way it's done in rails

exports.PersistentObject = function(type, options){

  switch(type){
    case "simplePref":
      return SimplePrefStorage(options);
      break;
    case "osFile":
      return OsFileStorage(options);
      break;
    default:
  }

};

function OsFileStorage(options){

  let encoder = new TextEncoder();  
  let decoder = new TextDecoder();

  let targetObj;

  if (!options.target)
    targetObj = {};
  else
    targetObj = options.target;


  const fileName = options.address + ".json"
  const filePath = file.join(DIR_PATH, options.address);

  function write(str){
    let array = encoder.encode(str);
    return OS.File.writeAtomic(filePath, array,
      {tmpPath: fileName + ".tmp"});                                  
  }

  function read(){
    return OS.File.read(filePath).then((arr)=>{
      return decoder.decode(arr);
    });
  }

  let cachedObj;

  return OS.File.makeDir(DIR_PATH).then(()=>{
    return OS.File.exists(filePath);
  }).then(exists =>{
    if (!exists)
      return write(JSON.stringify({}));
  }).then(()=>{
    return Object.assign(cachedObj, {data: JSON.parse(read()), synced: true});
  }).then(()=>{

    let updateFile = function(prop){
       return write(JSON.stingify(cachedObj.data)).then(()=>{
        cachedObj.synced = true;
        console.log("pref update", options.address, prop);
      }).catch(e => {throw e});
    };

    let rObj = StorageObject(updateFile, cachedObj, options);
    return rObj;
  }).catch((e)=>{throw e});
}


function SimplePrefStorage(options){
  //create if pref does not exist
  if (!prefs[options.address])
    prefs[options.address] = JSON.stringify({}); 

  // data property lets the cachedObj be easily reset
  let cachedObj = {data: JSON.parse(prefs[options.address]), synced: true};

  let updatePref = function(prop){
    console.log("pref update", options.address, prop);
    cachedObj.synced = true;
    prefs[options.address] = JSON.stringify(cachedObj.data);
  };

  let rObj = StorageObject(updatePref, cachedObj, options);

  // to handle external pref changes
  let f = function(p){
    rObj._syncCache(true);
  }
  sp.on(options.address, f);
 
  unload(function(){sp.removeListener(options.address, f)});

  return rObj;
}


function StorageObject(updateFn, cachedObj, options){
  let targetObj;
  if (!options.target)
    targetObj = {};
  else
    targetObj = options.target;

  let wrapper = {
      _copyCache: function(){
        return Object.assign({}, cachedObj.data);
      },
      _pasteCache: function(obj){
        cachedObj.data = Object.assign({}, obj);
        cachedObj.synced = false;
      },
      _openCache: function(callback){
        let obj = cachedObj.data;
        callback(obj);
        updateFn();
      },
      _syncCache: function(force){
        if (!cachedObj.synced || force)
          updateFn();
      }
    }

    let rObj = new Proxy(targetObj, {
      get: function(target, name) {

        if (name in target)
          return target[name];
        else
          if (cachedObj.data.hasOwnProperty(name)){
            return (typeof cachedObj.data[name] === "object"? Object.assign({}, cachedObj.data[name]): cachedObj.data[name]);
          }
          else {
            return wrapper[name];
          }

      },
      set: function(target, name, value) {
        if (target.hasOwnProperty(name)){
          target[name] = value;
        }
        else
        {
          cachedObj.data[name] = value;
          cachedObj.synced = false;

          if (options.updateListener)
            options.updateListener(this, name);
        }

        return true;
      },
      has: function(target, prop){
        if (!(prop in target))
          return prop in cachedObj.data;
        else
          return true;
      },
      ownKeys: function(target){
        return Object.getOwnPropertyNames(target).concat(Object.keys(cachedObj.data));
      },
      //ownKeys does not work properly without getOwnDescriptor
      //here is why: https://bugzilla.mozilla.org/show_bug.cgi?id=1110332
      getOwnPropertyDescriptor: function (target, prop){
        return Object.getOwnPropertyDescriptor(target, prop) || Object.getOwnPropertyDescriptor(cachedObj.data, prop);
      },
      deleteProperty: function(target, prop){
        if (prop in target){
          return delete target[prop];
        }
        else {
          let res = delete cachedObj.data[prop];

          cachedObj.synced = false;
          return res;
        }
      }
    });

    let interval = (options && options.update_interval) || prefs["utils.persistent_object.update_interval"];
    let syncTimer = setInterval(()=>{wrapper._syncCache()}, interval);

    unload(()=>{wrapper._syncCache();});

    return rObj;

}