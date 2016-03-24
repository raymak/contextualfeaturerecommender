/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


const {merge} = require("sdk/util/object");
const {PersistentObject} = require("./utils");
const {Route, equals, matches, scale, str} = require("./route");
const featReport = require("./feature-report");

const Recommendation = function(data) {

  data.presentationData['*'] = merge({}, {icon: ["images/icons/", data.id, ".png"].join("")}, data.presentationData['*']);

  let nRecommendation = {
    id: data.id,
    trigBehavior: data.trigBehavior || "null",
    trigBehaviorRoute: Route(data.trigBehavior),
    featUseBehavior: data.featUseBehavior || "null",
    featUseBehaviorRoute: Route(data.featUseBehavior),
    delivContext: data.delivContext || "null",
    delivContextRoute: Route(data.delivContext),
    feature: data.feature,
    tags: data.tags,
    presentationData: data.presentationData,
    respCommandMap: data.respCommandMap,
    status: data.status || "active",
    priority: data.priority || 1
  }

  return nRecommendation;
}

const recSet = {
  routeIndexTables: ["trigBehavior", "delivContext", "featUseBehavior"],
  add: function(/* recommendations */){
    let routeIndexTables = this.routeIndexTables;

    let that = this._copyCache(); // to reduce the number of prefs hits

    let frIds = [];
    let frObjs = [];

    Array.prototype.slice.call(arguments).forEach(function(aRecommendation){
      if (!aRecommendation)
        return;

      if (that[aRecommendation.id]){
        console.log("error: unable to add recommendation. A recommendation with the same ID exists: id -> " + aRecommendation.id);
        return;
      }
      
      that[aRecommendation.id] = aRecommendation;

      routeIndexTables.forEach(function(indexTable){
        let currIndexTable = that[indexTable];

        if (currIndexTable[aRecommendation[indexTable + "Route"].header])
          currIndexTable[aRecommendation[indexTable + "Route"].header].push(aRecommendation.id);
        else
         currIndexTable[aRecommendation[indexTable + "Route"].header] = [aRecommendation.id];

        that[indexTable] = currIndexTable;
      });

      frIds.push(aRecommendation.id);
      frObjs.push({status: aRecommendation.status, adopted: false});

      that.length += 1;

      console.log("recommendation added: id -> " + aRecommendation.id);
    });

    featReport.addRows(frIds, frObjs);

    this._pasteCache(that);

  },
  remove: function(/* recommendations */){

    let routeIndexTables = this.routeIndexTables;

    let that = this._copyCache();

    Array.prototype.slice.call(arguments).forEach(function(aRecommendation){
      if (!that[aRecommendation.id]) return;
      delete that[aRecommendation.id];

      routeIndexTables.forEach(function(indexTable){
        let currIndexTable = that[indexTable];
        currIndexTable[aRecommendation[indexTable + "Route"].header] = currIndexTable[aRecommendation[indexTable + "Route"].header]
          .filter(function(id){return id!==aRecommendation.id});

        that[indexTable] = currIndexTable;
      });

      that.length -=1;

      console.log("recommendation removed: " + "id -> " + aRecommendation.id);
    });

    this._pasteCache(that);
  },
  update: function(/* recommendations */){
    let that = this;

    Array.prototype.slice.call(arguments).forEach(function(aRecommendation){
      if (!that[aRecommendation.id]){
        console.log("error: unable to update recommendation. No recommendation with this ID exists: id -> " + aRecommendation.id);
        return;
      }

      let oldStatus = that[aRecommendation.id].status;

      that.remove(aRecommendation);
      that.add(aRecommendation);

      let newStatus = that[aRecommendation.id].status;

      console.log("recommendation updated: id -> " + aRecommendation.id + ", status -> " + aRecommendation.status);

      if (oldStatus != newStatus){
        require("./logger").logRecommUpdate(aRecommendation.id, oldStatus, newStatus);
        featReport.updateRow(aRecommendation.id, {status: newStatus});
      }

    });
  },
  getByRouteIndex: function(indexTable, route, options){
    let that = this;

    let status = options && options.status;
    let looseMatch = options && options.looseMatch;

    if (route === "*"){
      let recomms = [];
      that.forEach(function(aRecommendation){
        recomms.push(aRecommendation);
      });
      if (status)
        recomms = recomms.filter(function(aRecommendation){return aRecommendation.status === status});

      return recomms;
    }

    if (typeof route === "string")
      route = Route(route);

    if (this[indexTable][route.header]){
      // console.log(this[indexTable][route.header]);
      let recomms = this[indexTable][route.header].map(function(id){
        return that[id];
      }).filter(function(aRecommendation){
        return matches.call(aRecommendation[indexTable + "Route"], route, looseMatch);
      });

      if (status)
        recomms = recomms.filter(function(aRecommendation){return aRecommendation.status === status});

      return recomms;
    }
    else
      return [];
  },
  getByStatus: function(status){

    let recomms = [];
    this.forEach(function(aRecommendation){
      recomms.push(aRecommendation);
    });

    if (status == '*')
      return recomms;
    
    recomms = recomms.filter(function(aRecommendation){
      return aRecommendation.status === status;
    });

    return recomms;

  },
  scaleRoute: function(aRecommendation, coeff, indexTable){
    scale.call(aRecommendation[indexTable + "Route"], coeff);
    aRecommendation[indexTable] = str.call(aRecommendation[indexTable + "Route"]);

    this.update(aRecommendation);
  },
  forEach: function(callback) {
  let that = this;
  Object.keys(this).forEach(function(key){
      return typeof that[key] === "function" ||  ["routeIndexTables", "delivContext", "trigBehavior", "featUseBehavior", "length"].indexOf(key) != -1 || callback(that[key]);
    });
  }
};


const RecSet = function(options){
  let nObj =  Object.create(recSet);
  nObj.routeIndexTables.forEach(function(indexTable){
    nObj[indexTable] = {};
  });
  
  return nObj;
}

const PersistentRecSet = function(type, options){
  let nObj = PersistentObject(type, merge({}, options, {target: Object.create(recSet)}));
  nObj.routeIndexTables.forEach(function(indexTable){
    if (!nObj[indexTable])
      nObj[indexTable] = {};
  });

  if (!nObj.length)
      nObj.length = 0;

  return nObj;
}
const extractPresentationData = function(channel){
  return merge({}, this.presentationData["*"] || {}, this.presentationData[channel] || {});
}

const extractResponseCommandMap = function(channel){
  return merge({}, this.respCommandMap["*"] || {}, this.respCommandMap[channel] || {});
}

const recommendationToString = function(){
    let that = this;
    return Object.keys(this).reduce(function(previousValue, currentValue, index, array) {
      
      if (typeof that[currentValue] === "function")
        return previousValue;
      
      return previousValue + "\n" + currentValue + "-> " + that[currentValue];
    }, "");
  }




exports.extractPresentationData = extractPresentationData;
exports.RecSet = RecSet;
exports.PersistentRecSet = PersistentRecSet;
exports.Recommendation = Recommendation;
exports.extractResponseCommandMap = extractResponseCommandMap;