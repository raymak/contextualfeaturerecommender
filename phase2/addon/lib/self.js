/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {Cu} = require("chrome");
const genPrefs = require("sdk/preferences/service");
const {prefs} = require("sdk/simple-prefs");
const system = require("sdk/system");
const {handleCmd} = require("./debug");
const {getFhrData, cleanUp, extractOpts} = require("./utils");
const {merge} = require("sdk/util/object");
Cu.import("resource://gre/modules/AddonManager.jsm");

const self = {
  init: function(){
    debug.init();
  },
  get isInitialized(){
    return !!prefs["isInitialized"];
    },
  setInitialized: function(){
    prefs["isInitialized"] = true;
  },
  get delMode(){
    return {
      rateLimit: prefs["delivery.mode.rate_limit"],
      moment: prefs["delivery.mode.moment"],
      observOnly: prefs["delivery.mode.observ_only"]
    }
  },
  // also sets user id for the first tiem
  get userId(){
    if (prefs["userId"]) 
      return prefs["userId"];
    else {
      prefs["userId"] = require("sdk/util/uuid").uuid().toString().slice(1,-1); //set for the first time
      return prefs["userId"];
    }
  },
  get isTest(){

    if (!("isTest" in prefs)){
        // throw Error("isTest state not specified properly. use --static-args to define set .isTest to either \"true\" or \"false\"");
        prefs["isTest"] = true;  //true by default
    }      
    return prefs["isTest"];
  },
  get locale(){
    return genPrefs.get("general.useragent.locale");
  },
  get updateChannel(){
    return genPrefs.get("app.update.channel");
  },
  get sysInfo(){
    return {
      system_name: system.name,
      system_version: system.version,
      os: system.platform
    };
  },
  get addonVersion(){
    return require("sdk/self").version;
  },
  getPeriodicInfo: function(f){

    //addons info
    let activeThemeId, activeThemeName;
    let addonNames = [];
    let addonIds = [];
    let addonTypes = [];
    let addonActivities = [];
    let arr = [];
    let extensionCount = 0;
    let themeCount = 0;
    let searchenginename = genPrefs.get("browser.search.defaultenginename");
    let isdntenabled = genPrefs.get("privacy.donottrackheader.enabled");
    let dntvalue = genPrefs.get("privacy.donottrackheader.value");
    let ishistoryenabled = genPrefs.get("places.history.enabled");
    let browsertabsremote = genPrefs.get("browser.tabs.remote");
    let browsertabsremoteautostart = genPrefs.get("browser.tabs.remote.autostart");

    AddonManager.getAddonsByTypes(['extension'], function(addons){
  
      extensionCount = addons.length;

      for (let i = 0; i < addons.length; i++){
        addonNames.push(addons[i].name);
        addonIds.push(addons[i].id);
        addonTypes.push(addons[i].type);
        addonActivities.push(addons[i].isActive);
      }


      AddonManager.getAddonsByTypes(['theme'], function(addons){
        
        themeCount = addons.length;

        for (let i = 0; i < addons.length; i++){
          addonNames.push(addons[i].name);
          addonIds.push(addons[i].id);
          addonTypes.push(addons[i].type);
          addonActivities.push(addons[i].isActive);
          if (addons[i].isActive) {activeThemeId = addons[i].id; activeThemeName = addons[i].name;}
        }

        //fhr
        getFhrData(function(profileAgeDays, totalActiveTicks, totalTime, isDefaultBrowser, crashCount, sessionCount){
          try {
            let result = {  
               extensioncount: extensionCount, themecount: themeCount,
               addonnames: addonNames, addonids: addonIds, addontypes: addonTypes,
               activeThemeId: activeThemeId, activeThemeName: activeThemeName,
               searchenginename: searchenginename, isdntenabled: isdntenabled, dntvalue: dntvalue, ishistoryenabled: ishistoryenabled,
               profileAgeDays: profileAgeDays, totalActiveTicks: totalActiveTicks, totalTime: totalTime,
               isDefaultBrowser: isDefaultBrowser, crashCount: crashCount, sessionCount: sessionCount,
               browsertabsremote: browsertabsremote, browsertabsremoteautostart: browsertabsremoteautostart
              };

            f(result);
          }
          catch (e){
            console.log("error logging periodic self info.");
            console.log(e.message);
          }

        });
      }); 
    
    });
  }
}

const debug = {
  init: function(){
    handleCmd(this.parseCmd);
  },
  update: function(){

  },
  parseCmd: function(cmd){
    const patt = /([^ ]*) *(.*)/; 
    let args = patt.exec(cmd);

    let subArgs;
    
    if (!args)  //does not match the basic pattern
      return false;

    let name = args[1];
    let params = args[2];

    switch(name){
      case "uninstall":
        require("sdk/addon/installer").uninstall(require("sdk/self").id);
        return "addon uninstalled";
        break;
      case "disable":
        require("sdk/addon/installer").disable(require("sdk/self").id);
        return "addon disabled"
        break
      case "cleanup":
        let opts = extractOpts(cmd);
        cleanUp(opts);
        return "cleaning up..."
        break;
      default:
        return undefined
    }

  }
};

module.exports = self;
