"use strict";

const {prefs} = require("sdk/simple-prefs");

function Route(routeStr){
  let rRoute = {};

  let headerInd = routeStr.indexOf(" -");
  if (headerInd < 0) headerInd = routeStr.length;
  let headerExp = routeStr.slice(0, headerInd);
  let keysExp = routeStr.slice(headerInd+1);

  rRoute.header = headerExp;

  let i = 0;
  let keysArr = keysExp.split(" ");

  if (keysExp.length > 0)
    while(i < keysArr.length){
      if (keysArr[i+1] && keysArr[i+1].charAt(0) !== "-"){
        rRoute[keysArr[i].slice(1)] = keysArr[i+1];
        i = i + 2;
      }
      else {
        rRoute[keysArr[i].slice(1)] = true;
        i = i + 1;
      }
    }

  return rRoute;
}

const equals = function(route){
  if (Object.keys(this).length !== Object.keys(route).length) 
    return false;

  for (let key in this)
    if (typeof this[key] !== "function" && this[key] !== route[key]) return false;

  return true;
}

const scale = function(coeff){
  for (let key in this){
    if (typeof this[key] === "function") continue;

    if (this[key].charAt(0) === ">")
      this[key] = ">" + String(Number(this[key].slice(1))/coeff);

    if (this[key].charAt(0) === "<")
       this[key] = ">" + String(Number(this[key].slice(1))*coeff);
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

const matches = function(route){
  if (Object.keys(this).length !== Object.keys(route).length) 
    return false;

  for (let key in this){
    if (typeof this[key] === "function" || this[key] === route[key]) continue;

    if (this[key].charAt(0) === ">")
      if (Number(this[key].slice(1)) < Number(route[key])) continue;

    if (this[key].charAt(0) === "<")
      if (Number(this[key].slice(1)) > Number(route[key])) continue;

    return false;
  }

  return true;
}

function coefficient(coeff){
  if (coeff)
    prefs["route.coefficient"] = String(coeff);

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