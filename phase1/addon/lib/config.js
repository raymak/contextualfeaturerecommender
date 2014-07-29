/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
var system = require("sdk/system");
var logger = require("./logger");


//arm
// exports.ARM = info.getArm(); 

// recommendation counts
exports.CLOSE_TAB_SHORTCUT_COUNT_THRESHOLD = 6;
exports.NEW_TAB_SHORTCUT_COUNT_THRESHOLD = 6;
exports.BLUSHYPAGE_COUNT_THRESHOLD = 2;
exports.FACEBOOK_COUNT_THRESHOLD = 2;
exports.YOUTUBE_COUNT_THRESHOLD = 4;
exports.DOWNLOAD_COUNT_THRESHOLD = 4;
exports.GMAIL_COUNT_THRESHOLD = 2;
exports.REDDIT_COUNT_THRESHOLD = 2;
exports.AMAZON_COUNT_THRESHOLD = 2;
exports.NEW_BOOKMARK_COUNT_THRESHOLD = 2;
exports.BOOKMARK_SHORTCUT_COUNT_THRESHOLD = 2;
exports.BOOKMARK_MANAGER_COUNT_THRESHOLD = 2;


//notification panel
exports.HIDE_PANEL_AFTER_REACTION = true;
exports.PANEL_SIZE_UNEXPLAINED = {width: 340 + 2, height: 180 + 3};
exports.PANEL_SIZE_EXPLAINED = {width: 340 + 2, height: 210 + 3};
exports.PANEL_EXPLANATIONHEADER = "<span id='whylabel'>Because </span> ";

//arm generation
exports.DEFAULT_ARM_WEIGHTS = [1, 1, 1, 1, 1];


//strings
exports.DEFAULT_MESSAGE = "As you use Firefox we'll show you tips and tricks to get the most out of your browser and favorite websites!"
exports.DEFAULT_HEADER = "Awesomeness Ahead";
exports.DEFAULT_BUTTON_LABEL = "Show Me";
exports.DEFAULT_MESSAGE_URL = "https://support.mozilla.org/en-US/products/firefox/get-started/tips";

// standard GA payload info
exports.EXPERIMENT_NAME = "CFR";
exports.EXPERIMENT_VERSION = "0.0";

// exports.TEST_MODE = info.getTestMode(); //set by init()
// exports.USER_ID = info.getUserId();

// general types
exports.TYPE_TRIGGER = "TRIGGER";
exports.TYPE_MINOR_TRIGGER = "MINORTRIGGER";
exports.TYPE_SECONDARY_LISTENER = "SECONDARYLISTENER";
exports.TYPE_OFFERING = "OFFERING";
exports.TYPE_REACTION = "REACTION";
exports.TYPE_PANEL_SHOW = "PANELSHOW";
exports.TYPE_PANEL_HIDE = "PANELHIDE";
exports.TYPE_LOAD = "LOAD";
exports.TYPE_LAST_CALL = "LASTCALL";

// offering types
exports.TYPE_OFFERING_ADDON = "ADDON";
exports.TYPE_OFFERING_ADDON_IGNORED = "ADDON_IGNORED";
exports.TYPE_OFFERING_PINTAB = "PINTAB";
exports.TYPE_OFFERING_NEWWINDOW = "NEWWINDOW";
exports.TYPE_OFFERING_KEYBOARDSHOTCUT = "KEYBOARDSHORTCUT";

exports.TYPE_INSTALL = "INSTALL";
exports.ID_NA = "NA";

exports.GA_URL = "https://addons.allizom.org/";
exports.SEND_REQ_TO_GA = true;
