/* This Source Code Form is subject to the terms of the Mozilla Public
# * License, v. 2.0. If a copy of the MPL was not distributed with this
# * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci } = require('chrome');

let reporter;

/* reporter object */
exports.reporter = reporter = Cc["@mozilla.org/datareporting/service;1"]
                   .getService(Ci.nsISupports)
                   .wrappedJSObject
                   .healthReporter;