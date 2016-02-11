const system = require("sdk/system");
const {prefs} = require("sdk/simple-prefs");


exports.main = function(options, callbacks){

  console.log("Hello World! Woodpecker is alive :)");

  const isFirstRun = !prefs["isInitialized"]

  if (options.loadReason === "install")
    installRun(isFirstRun);

  const self = require('./self');

  self.init();
  require("./experiment").init();
  require("./timer").init();
  require("./logger").init();
  require("./sender").init();
  require("./debug").init();

  if (isFirstRun)
    firstRun();

  require('./logger').logLoad(options.loadReason);

  const controller = require('./controller');
  controller.init();
}

function firstRun(){

  require('./logger').logFirstRun();
  require('./self').setInitialized();
  require('./experiment').firstRun();
}

function installRun(isFirstRun){
  let clean = false;

  //static args have precedence over default preferences
  if (system.staticArgs && system.staticArgs["clean_install"])
    clean = true;
  else
    if (system.staticArgs && system.staticArgs["clean_install"] === false)
      clean = false;
    else
      clean = prefs["clean_install"];

  if (clean)
    require('./utils').cleanUp({reset: true});


  if (clean || isFirstRun){
    try{require('./utils').overridePrefs("../prefs.json");}
    catch(e){console.log("skipped overriding preferences");}
  }
}


exports.onUnload = function(reason){
  console.log("unloading due to " + reason);
  require('./logger').logUnload(reason);

  if (reason == "uninstall" || reason == "disable")
    logger.logDisable(reason);
}
