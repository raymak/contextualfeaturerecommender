"use strict";

const {merge} = require("sdk/util/object");
const {PersistentObject} = require("utils");
const {Route, equals, matches} = require("route");

const Recommendation = function(data) {
  let nRecommendation = {
    id: data.id,
    trigBehavior: data.trigBehavior || "null",
    trigBehaviorRoute: Route(data.trigBehavior),
    featUseBehavior: data.featUseBehavior || "null",
    featUseBehaviorRoute: Route(data.featUseBehavior),
    delivContext: data.delivContext || "null",
    delivContextRoute: Route(data.delivContext),
    feature: data.feature,
    classTags: data.classTags,
    presentationData: data.presentationData,
    respCommandMap: data.respCommandMap,
    status: data.status || "active",
    priority: data.priority || 1,
    deliveryTime:undefined
  }

  return nRecommendation;
}

const recSet = {
  routeIndexTables: ["trigBehavior", "delivContext", "featUseBehavior"],
  add: function(/* recommendations */){
    let that = this;
    Array.prototype.slice.call(arguments).forEach(function(aRecommendation){

      if (that[aRecommendation.id]){
        console.log("error: unable to add recommendation. A recommendation with the same ID exists: id -> " + aRecommendation.id);
        return;
      }
      
      that[aRecommendation.id] = aRecommendation;

      that.routeIndexTables.forEach(function(indexTable){
        let currIndexTable = that[indexTable];

        if (currIndexTable[aRecommendation[indexTable + "Route"].header])
          currIndexTable[aRecommendation[indexTable + "Route"].header].push(aRecommendation.id);
        else
         currIndexTable[aRecommendation[indexTable + "Route"].header] = [aRecommendation.id];

        that[indexTable] = currIndexTable;
      });

      console.log("recommendation added: id -> " + aRecommendation.id);
    });
  },
  remove: function(/* recommendations */){
    let that = this;
    Array.prototype.slice.call(arguments).forEach(function(aRecommendation){
      if (!that[aRecommendation.id]) return;
      delete that[aRecommendation.id];

      that.routeIndexTables.forEach(function(indexTable){
        let currIndexTable = that[indexTable];
        currIndexTable[aRecommendation[indexTable + "Route"].header] = currIndexTable[aRecommendation[indexTable + "Route"].header]
          .filter(function(id){return id!==aRecommendation.id});

        that[indexTable] = currIndexTable;
      });

      console.log("recommendation removed: " + "id -> " + aRecommendation.id);
    });
  },
  update: function(/* recommendations */){
    let that = this;
    Array.prototype.slice.call(arguments).forEach(function(aRecommendation){
      if (!that[aRecommendation.id]){
        console.log("error: unable to update recommendation. No recommendation with this ID exists: id -> " + aRecommendation.id);
        return;
      }

      that.remove(aRecommendation);
      that.add(aRecommendation);

      console.log("recommendation updated: id -> " + aRecommendation.id + ", status -> " + aRecommendation.status);
    });
  },
  getByRouteIndex: function(indexTable, route, status){
    let that = this;
    console.log(route);

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
      console.log(this[indexTable][route.header]);
      let recomms = this[indexTable][route.header].map(function(id){
        return that[id];
      }).filter(function(aRecommendation){
        return matches.call(aRecommendation[indexTable + "Route"], route);
      });

      if (status)
        recomms = recomms.filter(function(aRecommendation){return aRecommendation.status === status});

      return recomms;
    }
    else
      return [];
  },
  forEach: function(callback) {
  let that = this;
  Object.keys(this).forEach(function(key){
    return typeof that[key] === "function" ||  ["routeIndexTables", "delivContext", "trigBehavior", "featUseBehavior"].indexOf(key) != -1 || callback(that[key]);
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

  return nObj;
}
const extractPresentationData = function(channel){
  return merge({}, this.presentationData["all"] || {}, this.presentationData[channel] || {});
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