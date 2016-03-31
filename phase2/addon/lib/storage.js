/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const unload = require("sdk/system/unload").when;
const {setInterval} = require("sdk/timers");
const sp = require("sdk/simple-prefs");
const prefs = sp.prefs;

"use strict";

//TODO: add OS.File
//TODO: add function definition capabilities using closures, to make it a real persisten object,
// and not only a JsonStore
// TODO: work on this and make it an npm package
// read sdk/simple-storage.js again for this

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

    // data property lets the cachedObj be easily reset
    let cachedObj = {data: JSON.parse(prefs[options.address]), synced: true};

    let updatePref = function(prop){
      console.log("pref update", options.address, prop);
      cachedObj.synced = true;
      prefs[options.address] = JSON.stringify(cachedObj.data);
    };

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
        console.log(obj);
        callback(obj);
        updatePref();
      },
      _syncCache: function(force){
        if (!cachedObj.synced || force)
          updatePref();
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

    // to handle external pref changes
    sp.on(options.address, function(p){
      cachedObj.data = JSON.parse(prefs[p]);
    });

    let syncTimer = setInterval(()=>{wrapper._syncCache()}, prefs["utils.persistent_object.update_interval"]);

    unload(()=>{wrapper._syncCache();});
    return rObj;
  }
};