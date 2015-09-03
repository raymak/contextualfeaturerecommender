"use strict";


const featDataAddress = "feature_report.data";
const {merge} = require("sdk/util/object");
const {PersistentObject} = require("./utils");
const timer = require("./timer");

const featData = PersistentObject("simplePref", {address: featDataAddress});
const dhDataAddress = "presentation.doorhanger.data";

function init(){
  console.log("initializing feature report");
  if (!featData.report)
    featData.report = {};

  //set up periodic logging
  
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
    featureuse: null, firstusesincepres: null
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

  featData.report = report;
}

exports.updateRow = updateRow;
exports.addRow = addRow;
exports.getRow = getRow;
exports.postRecFeatureUse = postRecFeatureUse;
exports.init = init;