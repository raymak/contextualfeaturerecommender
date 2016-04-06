/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {prefs} = require("sdk/simple-prefs");
const {PersistentObject} = require('./storage');

let routeData;
const routeDataAddress = "route.data";


function init(){
  return PersistentObject('osFile', {address: routeDataAddress})
  .then((obj)=> {
    routeData = obj;
    if (!("coefficient" in routeData))
      routeData.coefficient = 1;
  });
}

function Route(route){

  if (typeof route === "object")
    return route;

  // convert str to object
  let rRoute = require('./utils').extractOpts(route);

  return rRoute;
}

const equals = function(route){
  if (Object.keys(this).length !== Object.keys(route).length) 
    return false;

  for (let key in this)
    if (typeof this[key] !== "function" && this[key] !== route[key]) return false;

  return true;
}

// coefficient of 1 is more conservative than 2
const scale = function(coeff){
  for (let key in this){
    if (typeof this[key] === "function" || typeof this[key] === "boolean") continue;

    if (this[key].charAt(0) === ">")
      this[key] = ">" + String(Number(this[key].slice(1))/coeff);

    if (this[key].charAt(0) === "<")
       this[key] = "<" + String(Number(this[key].slice(1))*coeff);
  }

  return this;
};

const str = function(){
  let str = this.header;

  for (let key in this){
    if (key == "header")
      continue;
    str = str + " -" + key;
    if (typeof this[key] === "boolean") 
      continue; //only key and no value
    str = str + " " + this[key];
  }

  return str;
}

const matches = function(inRoute, looseMatch){
  looseMatch = !!looseMatch; //false by default

  // make sure routes are represented as objects
  inRoute = Route(inRoute);
  let defRoute = Route(this);

  let twoWay = false;

  // two-way match
  // TODO: think about this and make it a general pattern)
  if (~["hotkey"].indexOf(inRoute.header.split(" ")[0]))
    twoWay = true;

  if (Object.keys(defRoute).length > Object.keys(inRoute).length) 
    return false;

  let keys = Object.keys(defRoute);

  if (twoWay){
    let xKeys = Object.keys(inRoute).filter(function(elm){
      return !~["f", "if", "c"].indexOf(elm);
    });

    keys = keys.concat(xKeys);
  }

  for (let key of keys){
    if (!(key in inRoute))
      return false;

    if (twoWay && !(key in defRoute))
      return false;
    
    if (typeof defRoute[key] === "function" 
        || defRoute[key] === inRoute[key]) continue;

    if (defRoute[key].charAt(0) === ">")
      if (looseMatch || Number(defRoute[key].slice(1)) < Number(inRoute[key])) continue;

    if (defRoute[key].charAt(0) === "<")
      if (looseMatch || Number(defRoute[key].slice(1)) > Number(inRoute[key]) || looseMatch) continue;

    return false;
  }

  return true;
}

function coefficient(coeff){
  if (coeff)
    routeData.coefficient = Number(coeff)*prefs["route.default_coefficient"];

  return routeData.coefficient;
}

// exports.init = init;
exports.scale = scale;
exports.Route = Route;
exports.equals = equals;
exports.matches = matches;
exports.scale = scale;
exports.coefficient = coefficient;
exports.str = str;
exports.init = init;