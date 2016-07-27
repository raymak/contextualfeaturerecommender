/* 1. the modules needed to turn this into a STUDY */
const xutils = require("shield-studies-addon-utils");
const addonPrefs = require("sdk/simple-prefs").prefs;

/* 2. configuration / setup constants for the study.
 *  These are only ones needed, or supported
 */
const {quickCodes, modes} = require("./experiment-modes");

let variations = {};

Object.keys(quickCodes).forEach(function(v){
  variations[v] = function(){addonPrefs["shield.variation"] = v};
});

let variationsMod = {
  variations: variations,
  isEligible: function () {return true},
  cleanup: function () {}
};

const forSetup = {
  name: require("sdk/self").id, // unique for Telemetry
  choices: Object.keys(variationsMod.variations), // names of branches.
  duration: 30,   // in days,
  /* Get surveyUrl from Strategy + Insights */
  surveyUrl: "https://qsurvey.mozilla.com/s3/Firefox-Guide-Study-1-End-of-Study"
};

// 3. Study Object (module singleton);
var ourConfig = xutils.xsetup(forSetup); 
// branch is now chosen; change the url
let mode = modes[quickCodes[ourConfig.variation]];

ourConfig.surveyUrl = "https://qsurvey.mozilla.com/s3/Firefox-Guide-Study-1-End-of-Study?"
         + [
            "coeff=" + mode.coeff,
            "moment=" + mode.moment,
            "rate_limit=" + mode.rateLimit
            ].join("&");

let thisStudy = new xutils.Study(ourConfig, variationsMod);

// 3a (optional). Watch for changes and reporting
xutils.Reporter.on("report",(d)=>console.log("telemetry", d));
thisStudy.on("change",(newState)=>console.log("newState:", newState));


/* 4. usual bootstrap / jetpack main function */
function main (options, callback) {
  xutils.generateTelemetryIdIfNeeded().then(function () {
    xutils.handleStartup(options, thisStudy);
  })
  // addon specific load code should go here, if there is additional.
  console.debug(`special addon loading code: ${options.loadReason}`)
  console.debug(JSON.stringify(addonPrefs, null, 2))
}

function onUnload (reason) {
  console.debug(`special addon unloading code: ${reason}`)
  xutils.handleOnUnload(reason, thisStudy);

  // special unload code, specific to addon if any.
  console.debug(`special addon unloading code: ${reason}`)
  console.debug(JSON.stringify(addonPrefs, null, 2))
}


/* 5. usual bootstrap addon exports */
exports.main = main;
exports.onUnload = onUnload
