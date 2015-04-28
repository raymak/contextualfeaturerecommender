"use strict";

const {PersistentObject} = require("utils");

const expDataAddress = "experiment";

const expData = PersistentObject("simplePref", {address: expDataAddress});

const init = function(){
  expData.mode = {rateLimit: true, moment: 'interruptible'};
};

exports.expData = expData;
exports.init = init;