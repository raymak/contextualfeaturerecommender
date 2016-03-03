/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const request = require("sdk/request");
const unload = require("sdk/system/unload").when;
const {Cu, Cc, Ci} = require("chrome");
const ss = require("sdk/simple-storage");
const {pathFor} = require('sdk/system');
const file = require('sdk/io/file');
const {onTick} = require('./timer');
const {prefs} = require("sdk/simple-prefs");
const { Buffer, TextEncoder, TextDecoder } = require('sdk/io/buffer');
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/osfile.jsm");

const REMOTE_URL = "https://testpilot.mozillalabs.com/submit/" + "featurerecommender";
const TEST_URL = "http://logs-01.loggly.com/inputs/ac4fee9c-9dc4-4dc9-8a1b-4094253067bb/tag/http/";
// const TEST_URL = "http://requestb.in/uzm38guz";

const FILE_NAME = "wp-log";
const PATH_DIR = pathFor("Desk");

const observerService = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);


function init(){

  console.log("initializing sender");


  onTick(function(et, ett){
    if (Math.floor(ett) % prefs["sender.resend_period"] == 0)
      flush();
  });

  if (!ss.storage.sender){
    ss.storage.sender = {};
    ss.storage.sender.messages = [];
  }

  flush();
}

function remove(data){
  try{
    ss.storage.sender.messages.splice(
      ss.storage.sender.messages.findIndex(function(elem) elem.number === data.number),
      1);
  } catch(e){console.log(e)}
  prefs["sender.data.queue_size"] = ss.storage.sender.messages.length;
}

function queue(data){
  if (ss.storage.sender.messages.length <= prefs["sender.queue_quota"]){
    ss.storage.sender.messages.push(data); 
    console.log("http message queued");
  }
  else
    console.log("warning: http message dropped due to limited quota");

  prefs["sender.data.queue_size"] = ss.storage.sender.messages.length;
}

function flush(){
  let arr = ss.storage.sender.messages.slice();

  if (arr.length > 0)
    console.log("flushing " + arr.length + " queued messages...");

  ss.storage.sender.messages = [];

  while (arr.length  > 0){
    console.log(arr.length);
    sendToRemote(arr.shift());
  }

  prefs["sender.data.queue_size"] = ss.storage.sender.messages.length;
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
      url: TEST_URL,
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
      aFile.write(array);
      aFile.close();
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

  appendLineToFile(FILE_NAME, JSON.stringify(data));
}

function send(data){
  if (prefs["sender.send_to_remote"])
    sendToRemote(data);

  if (prefs["sender.send_to_file"])
    sendToFile(data);

}

exports.init = init;
exports.send = send;