/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {prefs} = require("sdk/simple-prefs");

function Route(routeStr){
  let rRoute = require('./utils').extractOpts(routeStr);

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
    str = str + " -" + key;
    if (typeof this[key] === "boolean") continue; //only key and no value
    str = str + " " + this[key];
  }

  return str;
}

const matches = function(inRoute, looseMatch){
  looseMatch = !!looseMatch; //false by default

  let defRoute = this;

  if (Object.keys(defRoute).length > Object.keys(inRoute).length) 
    return false;

  for (let key in defRoute){
    if (!(key in inRoute))
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
    prefs["route.coefficient"] = String(coeff*Number(prefs["route.coefficient"]));

  return Number(prefs["route.coefficient"]);
}

// exports.init = init;
exports.scale = scale;
exports.Route = Route;
exports.equals = equals;
exports.matches = matches;
exports.scale = scale;
exports.coefficient = coefficient;
exports.str = str;