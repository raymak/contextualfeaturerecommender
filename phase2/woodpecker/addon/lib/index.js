const self = require('./self');
const controller = require('./controller');
const logger = require('./logger');

self.init();
require("./experiment").init();
require("./timer").init();
require("./logger").init();
require("./connection").init();
require("./debug").init();


exports.main = function(options, callbacks){

  console.log("Hello World! Woodpecker is alive :)");

  if (!self.isInitialized)
    firstRun();

  logger.logLoad(options.loadReason);

  controller.init();
}

function firstRun(){
  
  logger.logFirstRun();
  self.setInitialized();
}


exports.onUnload = function(reason){
  console.log("unloading due to " + reason);
  logger.logUnload(reason);

  if (reason == "uninstall" || reason == "disable")
    logger.logDisable(reason);
}
