"use strict";

const {Cu} = require("chrome");
const genPrefs = require("sdk/preferences/service");
const {prefs} = require("sdk/simple-prefs");
const system = require("sdk/system");
const logger = require("./logger");
const exp = require("./experiment");
const tabs = require("sdk/tabs");
const override  = function() merge.apply(null, arguments);
Cu.import("resource://gre/modules/AddonManager.jsm");

const self = {
  get isInitialized(){
    return !!prefs["self.isInitialized"];
    },
  setInitialized: function(){
    prefs["self.isInitialized"] = true;
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
    if ("isTest" in system.staticArgs)
      prefs["isTest"] =  system.staticArgs.isTest;
    else
      if (!( "isTest" in prefs)){
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
  get periodicInfo(){
    let result = {};

    //addons info
    //var addonNames = [];
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
        getFHRdata(function(profileAgeDays, totalActiveMs){
          
        try {
          
          result = override(OUTval, 
            {extensioncount: extensionCount, themecount: themeCount,
             addonnames: addonNames, addonids: addonIds, addontypes: addonTypes,
             activeThemeId: activeThemeId, activeThemeName: activeThemeName,
             searchenginename: searchenginename, isdntenabled: isdntenabled, dntvalue: dntvalue, ishistoryenabled: ishistoryenabled,
             profileAgeDays: profileAgeDays, totalActiveMs: totalActiveMs,
             browsertabsremote: browsertabsremote, browsertabsremoteautostart: browsertabsremoteautostart
            }); 
        }
        catch (e){
          console.log(e.message);
        }

        return result;
        });
      }); 
    });
    
  }
}

module.exports = self;
