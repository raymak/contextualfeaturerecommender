var utils = require("./utils");
var ui = require("./ui");

/** Instantly remove addon if the button is killed.
 *
 *  Notes:
 *
 *  1.  this will Trash INSTANTLY, btw.  Like as soon as you move it.
 *  2.  if you then reinstall addon, the button will be HIDDEN, b/c pref
 */
function init(){

    let allprefs = require("sdk/preferences/event-target").PrefsTarget({branchName:""});
    allprefs.on("browser.uiCustomization.state", function (pref) {
    let addonid = require('sdk/self').id;
    console.log("PREF:", allprefs.prefs[pref]);
    let data = JSON.parse(allprefs.prefs[pref]);
    let bid = "action-button--featurerecommenderinsightsmozillacom-panel-button";
    let pl = data.placements;
    let has = (arr, el) => arr.indexOf(el) >= 0;

    if (has(pl["nav-bar"],bid) ||
        has(pl["PersonalToolbar"],bid) ||
        has(pl["addon-bar"],bid) ) 
    {
        console.log("button is fine!")
        // okay!
    } else {
        // send final message?
        let reason = "button moved";
        utils.sendLastCallEvent(reason, ui.getLastRecommendationOptions().id);
        console.log("button moved, uninstalling addon");
        require("sdk/timers").setTimeout(function (){
            require("sdk/addon/installer").uninstall(addonid);
        }, 2000);
    }
    });

}

exports.init = init;