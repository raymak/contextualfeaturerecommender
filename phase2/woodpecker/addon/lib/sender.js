"use strict";

const request = require("sdk/request");
const unload = require("sdk/system/unload").when;
const {Cu, Cc, Ci} = require("chrome");
const ss = require("sdk/simple-storage");
const {pathFor} = require('sdk/system');
const path = require('sdk/fs/path');
const file = require('sdk/io/file');
const {prefs} = require("sdk/simple-prefs");
const { Buffer, TextEncoder, TextDecoder } = require('sdk/io/buffer');
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/osfile.jsm");

const QUOTA = 50;

const TP_URL = "https://testpilot.mozillalabs.com/submit/" + "featurerecommender";
const TEST_URL = "http://requestb.in/zobohnzo";

const FILE_NAME = "wp-log";
const FILE_PATH = "Desk";

const observerService = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);


let offlineObs;

function init(){

    let topic = "network:offline-status-changed";
    offlineObs = {
    observe: function(aEngine, aTopic, aData){
      if (aTopic == topic){
        if (aData == "online"){
            console.log("flushing the http message queue");
            flush();
          }
        else
            console.log("offline");
      }
    },
    register: function(){
      Services.obs.addObserver(offlineObs, topic, false);
    },
    unregister: function(){
      Services.obs.removeObserver(offlineObs, topic, false);
    }
  }

  offlineObs.register();
  unload(offlineObs.unregister);

  if (!ss.storage.sender){
    ss.storage.sender = {};
    ss.storage.sender.messages = [];
  }

  flush();
}

function queue(data){
  if (ss.storage.sender.messages.length <= QUOTA){
    ss.storage.sender.messages.push(data); 
    console.log("http message queued");
  }
  else
    console.log("warning: http message lost due to limited quota");
}

function flush(){
  let arr = ss.storage.sender.messages.slice();

  ss.storage.sender.messages = [];

  while (arr.length  > 0)
    sendToTp(arr.shift());
}

function sendToTp(data){

  function requestCompleted(which, response) {
    console.log("REQUEST COMPLETE", which, response.status);

    if (response.status != 200)
        queue(data);
  }

  let fields = {
      "userid": data.userid, // for easy sorting at TP
      "v": 1, //static
      "tid": "UA-35433268-28", //id of ga account for mozillalabs
      "cid": "be74c5a0-143a-11e4-8c21-0800200c9a66", //randomly generated uuid
      "t": "pageview", //type of hit. keep static
      "dh": "caravela.mozillalabs.com", //subpage of mozillalabs account to get data
      "dp": JSON.stringify(data), //subpage to register pageview. required for view
  }

  /** TP packet
        * - special url
        * - POST instead of getElementsByTagName('')
        * - explicit about content type.
        * - will autogen a record at /bagheera end
        */
  
  let XmlReqTp = new request.Request({
      url: TEST_URL,
      headers: {},
      onComplete: requestCompleted.bind(null, "TP"),
      content: JSON.stringify(fields),
      contentType: "application/json"
  });

  XmlReqTp.post();
}

function sendToFile(data){

  console.log("sending to file");

  let writeToFile = function(fileName, message, options){
    let dirPath = pathFor("Desk");
    let filePath = file.join(dirPath, fileName);
    let filePromise = OS.File.open(filePath, options);
    filePromise.then(function onFullFill(aFile){
      let encoder = new TextEncoder();  // This encoder can be reused for several writes
      let array = encoder.encode(message); 
      aFile.write(array);
    }).then(null, Cu.reportError);
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
  if (prefs["sender.send_to_tp"])
    sendToTp(data);

  if (prefs["sender.send_to_file"])
    sendToFile(data);

}

exports.init = init;
exports.send = send;