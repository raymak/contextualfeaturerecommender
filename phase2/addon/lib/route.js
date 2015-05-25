"use strict";

function Route(routeStr){
  rRoute = {};

  headerInd = routeStr.indexOf("-")-1;
  headerExp = routeStr.slice(0, headerInd);
  keysExp = routeStr.slice(headerInd+1);

  rRoute.header = headerExp;

  i = 0;
  keysArr = keysExp.split(" ");

  while(i < keysArr.length){
    rRoute[keysArr[i].slice(1)] = keysArr[i+1];
    i = i + 2;
  }

  rRoute.equals = equals;

  return rRoute;
}

const equals = function(route){
  if (Object.keys(this).length !== Object.keys(route).length) 
    return false;

  for (key in this)
    if (typeof this[key] !== "function" && this[key] !== route[key]) return false;

  return true;
}