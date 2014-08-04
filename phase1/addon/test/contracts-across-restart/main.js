/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

/*jshint forin:false, noarg:false, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:false, browser:true,
  unused:true,
  indent:2, maxerr:50, devel:true, node:true, boss:true, white:true,
  globalstrict:true, nomen:false, newcap:true, moz: true, esnext:true */

/*global */

const promises = require("sdk/core/promise");
const { defer, resolve } = require("sdk/core/promise");
const installer = require("sdk/addon/installer")
const preferencesservice = require("sdk/preferences/service");
const self = require("sdk/self");
const { staticArgs } = require("sdk/system");
const timers = require("sdk/timers");
const tmp = require("sdk/test/tmp-file");

let {Cu} = require("chrome");

let { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm");

let prefstub = "extensions.featurerecommender@insights.mozilla.com.";
let ADDONPATH = staticArgs.addon;
let addonsprefs = preferencesservice.Branch(prefstub);

/**
  */
let wait = function (ms) {
  let { promise, resolve } = defer();
  timers.setTimeout(resolve, ms);
  return promise;
};

let waitasec = function(){
  let { resolve } = defer();
  return wait(1000).then(resolve);
};

let getAllAddons = function(){
  let { promise, resolve } = defer();

  let addons = {};
  AddonManager.getAllAddons(function (addonList) {
    Array.forEach(addonList, function (a) {
      let o = {};
      ['id', 'name', 'appDisabled', 'isActive', 'type', 'userDisabled'].forEach(function (k) {
        o[k] = a[k];
      });
      addons[o.id] = o;
    });
    resolve(addons);
  });
  return promise;
};

let isInstalled = function (addonid) {
  let { promise, resolve } = defer();
  getAllAddons().then(function(addons){
    resolve(addons[addonid] !== undefined);
  });
  return promise;
};

let enable_or_disable_addon = function (addonId, status) {
  let { promise, resolve } = defer();

  AddonManager.getAddonByID(addonId, function (addon) {
    addon.userDisabled = status || true;
    resolve();
  });
  return promise;
};

let setPrefs = function (prefobj) {
  for (let x in prefobj) {
    console.log("setting:", x, prefobj[x]);
    preferencesservice.set(x,prefobj[x]);
  }
};

// came from a real run
let presetPrefs = {
  "extensions.featurerecommender@insights.mozilla.com.config.arm": "{\"basis\":\"contextual\",\"explanation\":\"explained\",\"ui\":\"doorhanger-active\"}",
  "extensions.featurerecommender@insights.mozilla.com.config.test_mode": true,
  "extensions.featurerecommender@insights.mozilla.com.featureData.dataObject": "{\"closetabshortcut\":{\"count\":0,\"triggered\":false},\"newbookmark\":{\"count\":0,\"triggered\":false},\"newtabshortcut\":{\"count\":6,\"triggered\":true},\"newbookmarkshortcut\":{\"count\":0,\"triggered\":false},\"blushypage\":{\"count\":0,\"triggered\":false},\"facebook\":{\"count\":0,\"triggered\":false},\"amazon\":{\"count\":0,\"triggered\":false},\"translator\":{\"count\":0,\"triggered\":false},\"youtube\":{\"count\":0,\"triggered\":false},\"download\":{\"count\":0,\"triggered\":false},\"gmail\":{\"count\":0,\"triggered\":false},\"reddit\":{\"count\":0,\"triggered\":false}}",
  "extensions.featurerecommender@insights.mozilla.com.general.expStartTimeMs": "" + Date.now(),
  "extensions.featurerecommender@insights.mozilla.com.general.isFirstTime": false,
  "extensions.featurerecommender@insights.mozilla.com.general.userId": "8e89073a-d725-d242-980b-69b4591a11ca",
  "extensions.featurerecommender@insights.mozilla.com.lastRecommendation": "{\"showCount\":1,\"reactionCount\":0,\"panelSize\":{\"width\":402,\"height\":213},\"arm\":{\"basis\":\"contextual\",\"explanation\":\"explained\",\"ui\":\"doorhanger-active\"},\"explanationHeader\":\"<span id='whylabel'>because:</span> \",\"message\":\"You can also use <strong>Command+T</strong> to open a new tab. It's faster!\",\"header\":\"New Tab\",\"reactionType\":\"openlinkinnewtab\",\"reactionOptions\":{\"url\":\"https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly#w_windows-tabs\"},\"buttonLabel\":\"Show More\",\"id\":\"newtabshortcut\",\"explanationMessage\":\"you open tabs a lot\"}",
  "extensions.featurerecommender@insights.mozilla.com.ui.isButtonOn": false,
};

exports["test contract upon fake restart"] = function (assert, done) {
  let firstRunTime = Number(presetPrefs[prefstub+"general.expStartTimeMs"]);

  let check_first_install_reasonable = function () {
    let now = Date.now();
    let claimed = Number(addonsprefs["general.expStartTimeMs"]);
    console.log("prefs:", Object.keys(addonsprefs));
    console.log("times:", firstRunTime, now, claimed);
    assert.ok(firstRunTime === claimed, "first study time didnt change");
    assert.ok((now - firstRunTime) < 10000, "first study date is reasonable");
    assert.ok(now > firstRunTime, "first study date is in past, good.");
    return promises.resolve(true);
  };

  let check_prefs_consistent = function () {
    let names = ["general.userId", "featureData.dataObject",
      "lastRecommendation", "config.arm"];
    for (let pref in names) {
      let expected = presetPrefs[prefstub+pref];
      let claimed = addonsprefs[pref];
      assert.ok(expected === claimed, pref + " persisted");
    }
    return promises.resolve(true);
  };

  let fire_triggers = function () {
    let tabs = require("sdk/tabs");
    let seen = 0;
    let { promise, resolve } = defer();
    let openP = function (url) {
      let { promise, resolve } = defer();
      tabs.open({
        url: url,
        onReady: function (tab) {
          seen++;
          console.log("tabready:", seen, tab.url);
          wait(100).then(resolve); // for openP
        }
      });
      return promise; // for openP
    };

    promises.resolve(true).then(
    () => openP("reddit.com")).then(
    () => openP("youtube.com")).then(
    () => openP("youtube.com")).then(
    waitasec).then(
    resolve);

    return promise;

    /*
    let { promise, resolve } = defer();
    let n = 0;
    let until = 3; 
    let tabs = require("sdk/tabs");
    tabs.on('open', function(tab){
      tab.on('ready', function(tab){
        console.log("tab",tab.url);
        n++;
        if (n == until) {
          wait(1000).then(resolve);
        }
      });
    });
    // do them.
    tabs.open("reddit.com"); // should increment the gmail one.
    tabs.open("youtube.com"); // inc youtube
    tabs.open("youtube.com"); // inc youtube
    return promise;
    */

  };

  let check_triggers_good = function () {
    let pref = "featureData.dataObject";
    let newdata = JSON.parse(addonsprefs[pref]);
    console.log("==newdata==");
    console.log(JSON.stringify(newdata,null,2));
    assert.ok(newdata["reddit"]["count"] === 1, "reddit incremented");
    assert.ok(newdata["youtube"]["count"] === 2, "youtube incremented");
    return promises.resolve(true);
  };

  /** main body of test **/

  // start the chain!
  promises.resolve(true).then(
  // simulate previous install
  () => setPrefs(presetPrefs)).then(
  // install
  () => installer.install(ADDONPATH)).then(
  waitasec).then(

  // first run time should persist
  check_first_install_reasonable).then(

  // various things not overwritten
  check_prefs_consistent).then(

  // trigger still works.
  waitasec).then(
  fire_triggers).then(
  check_triggers_good).then(
  // finish
  done);
};

require("sdk/test/runner").runTestsFromModule(module);
