/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {merge} = require("sdk/util/object");
const {PersistentObject} = require("./utils");
const logger = require("./logger");
const timer = require("./timer");
const {prefs} = require("sdk/simple-prefs");

const featDataAddress = "feature_report.data";
const featData = PersistentObject("simplePref", {address: featDataAddress});
const dhDataAddress = "presentation.doorhanger.data";

function init(){
  console.log("initializing feature report");

  if (!featData.report)
    featData.report = {};

  //set up periodic logging
  timer.tickCallback(log);
  
}

function updateRow(id, obj){
  let report = featData.report;
  if (!report[id]){
    console.log("error: feature id does not exist in the report table.");
    return;
  }

  report[id] = merge(report[id], obj);

  featData.report = report;
}

function addRow(id, obj){
  let report = featData.report;

  if (report[id]){
    console.log("warning: feature id already exists in the report table.");
    return;
  }

  let rowTemp = {status: null, adopted: null, negfbchoice: null,
    dontlike: null, interaction: null,
    primbtn: null, secbtn: null, response: null,
    manualopen: null, presnumber: null,
    rationaleopen: null, firstclosereason: null, firstopen: null,
    featureuse: null, firstusesincepres: null, tried: null
    };

  for (let k in obj )
    if ((!k in rowTemp)){
      console.log("error: cannot add row to the feature report table.");
      return;
    }

  report[id] = merge(rowTemp, obj);
  featData.report = report;

}

function getRow(id){
  let report = featData.report;
  if (!report[id]){
    console.log("error: feature id does not exist in the report table.");
    return;
  }

  return report[id];
}

function postRecFeatureUse(id){
  let report = featData.report;
  
  if (report[id].firstusesincepres)
    return;

  let ett = timer.elapsedTotalTime();
  let dhCurrRec = PersistentObject("simplePref", {address: dhDataAddress}).currentRec;

  if (dhCurrRec.recomm.id != id)
    return;


  let startett = dhCurrRec.report.startett;

  report[id].firstusesincepres = ett - startett;
  report[id].tried = true;

  featData.report = report;
}

function log(et, ett){
  if (Math.floor(ett) % prefs["feature_report.log_period"] != 1) return;
  let info = featData.report;
  logger.logFeatReport(info);
}

exports.updateRow = updateRow;
exports.addRow = addRow;
exports.getRow = getRow;
exports.postRecFeatureUse = postRecFeatureUse;
exports.init = init;