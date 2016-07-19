/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const request = require("sdk/request");
const unload = require("sdk/system/unload").when;
const {Cu, Cc, Ci} = require("chrome");
const {storage} = require("sdk/simple-storage");
const {pathFor} = require('sdk/system');
const file = require('sdk/io/file');
const {onTick} = require('./timer');
const {prefs} = require("sdk/simple-prefs");
const {TextEncoder} = require('sdk/io/buffer');
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/osfile.jsm");

const { TelemetryController } = Cu.import("resource://gre/modules/TelemetryController.jsm");

const REMOTE_URL = "http://logs-01.loggly.com/inputs/ac4fee9c-9dc4-4dc9-8a1b-4094253067bb/tag/http/";

let FILE_NAME;
const PATH_DIR = pathFor("Desk");

const observerService = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);


function init(){

  let userid;

  try {
    userid = require("./experiment").userId;
  }
  catch(e){
    userid = prefs["userId"];
  }

  FILE_NAME = "fr-" + prefs["experiment.name"] + "-log-" + userid + ".jsonl";

  console.log("initializing sender");

  onTick(function(et, ett){
    if (Math.floor(ett) % prefs["sender.resend_period"] == 0)
      flush();
  });

  if (!storage.sender){
    storage.sender = {};
    storage.sender.messages = [];
  }

  flush();
}

function remove(data){
  try{
    storage.sender.messages.splice(
      storage.sender.messages.findIndex(function(elem) elem.number === data.number),
      1);
  } catch(e){console.log(e)}
  prefs["sender.data.queue_size"] = storage.sender.messages.length;
}

function queue(data){

  if (data.headless) return; //headless messages are not resent

  if (storage.sender.messages.length <= prefs["sender.queue_quota"]){
    storage.sender.messages.push(data);
    console.log("http message queued");
  }
  else
    console.log("warning: http message dropped due to limited quota");

  prefs["sender.data.queue_size"] = storage.sender.messages.length;
}

function flush(){
  let arr = storage.sender.messages.slice();

  if (arr.length > 0)
    console.log("flushing " + arr.length + " queued messages...");

  storage.sender.messages = [];

  while (arr.length  > 0){
    console.log(arr.length);
    sendToRemote(arr.shift());
  }

  prefs["sender.data.queue_size"] = storage.sender.messages.length;
}

function generateTelemetryIdIfNeeded() {
  let id = TelemetryController.clientID;
  /* istanbul ignore next */
  if (id == undefined) {
    return CID.ClientIDImpl._doLoadClientID()
  } else {
    return Promise.resolve(id)
  }
}

function sendToTelemetry (data) {
  let telOptions = {addClientId: true, addEnvironment: true};
  generateTelemetryIdIfNeeded().then(()=>
  TelemetryController.submitExternalPing("x-contextual-feature-recommendation", data, telOptions)
  )
}

function sendToRemote(data){

  function requestCompleted(which, response) {
    console.log("REQUEST COMPLETE", which, response.status);

    if (response.status == 200)
        remove(data);
  }

  let fields = data;

  queue(data);

  let XmlReq = new request.Request({
      url: REMOTE_URL,
      headers: {},
      onComplete: requestCompleted.bind(null, fields.number),
      content: JSON.stringify(fields),
      contentType: "application/json"
  });

  XmlReq.post();
}

function sendToFile(data){

  console.log("sending to file");

  let writeToFile = function(fileName, message, options){

    let onFulFill = function(aFile){
      let encoder = new TextEncoder();  // This encoder can be reused for several writes
      let array = encoder.encode(message);
      aFile.write(array).then(function(){aFile.close();});
    }

    let b_dirPath = pathFor("ProfD"); //backup file
    let b_filePath = file.join(b_dirPath, fileName + "_backup");
    let b_filePromise = OS.File.open(b_filePath, options);
    b_filePromise.then(onFulFill)
                 .then(null, Cu.reportError);

    let dirPath = PATH_DIR;
    let filePath = file.join(dirPath, fileName);
    let filePromise = OS.File.open(filePath, options);
    filePromise.then(onFulFill)
               .then(null, Cu.reportError);
  }

  let appendToFile = function(fileName, message){
   writeToFile(fileName, message, {write: true, append: true});
  };

  let appendLineToFile = function(fileName, message){
   appendToFile(fileName, message + "\n");
  };

  if (!FILE_NAME)  // if the file name hasn't been initializeded due to error
    FILE_NAME = "fr-" + prefs["experiment.name"] + "-log-" + prefs["userId"] + ".jsonl";

  appendLineToFile(FILE_NAME, JSON.stringify(data));
}

function send(data){
  if (prefs["sender.send_to_remote"])
    sendToRemote(data);
  if (prefs["sender.send_to_file"])
    sendToFile(data);
  if (prefs["sender.sent_to_telemetry"])
    sendToTelemetry(data);

}

exports.init = init;
exports.send = send;
exports.flush = flush;
