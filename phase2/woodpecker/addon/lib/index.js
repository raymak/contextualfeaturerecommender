const system = require("sdk/system");
const {prefs} = require("sdk/simple-prefs");

const recommFileAddress = "mozlando-recommendations.json";

exports.main = function(options, callbacks){

  console.log("Hello World! Woodpecker is alive :)");

  const isFirstRun = !prefs["isInitialized"]
  const frLog = !!prefs["experiment.fr_usage_logging.enabled"];

  if (options.loadReason === "install")
    installRun(isFirstRun);

  const self = require('./self');

  self.init();
  require("./experiment").init();
  require("./timer").init();
  require("./logger").init();
  require("./sender").init();
  require("./debug").init();
  require("./moment-report").init();
  
  if (frLog)
    require("./fr/feature-report").init();


  if (isFirstRun)
    firstRun();

  require('./logger').logLoad(options.loadReason);

  require('./controller').init();

  if (frLog)
    require("./fr/controller").init();


}

function firstRun(){
  if (prefs["experiment.fr_usage_logging.enabled"])
    require("./fr/controller").loadRecFile(recommFileAddress);

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
