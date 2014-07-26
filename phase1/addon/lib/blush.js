/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*jshint forin:true, noarg:false, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:false, browser:true,
  unused:true,
  indent:2, maxerr:50, devel:true, node:true, boss:true, white:true,
  globalstrict:true, nomen:false, newcap:true, moz: true */

/*global */

"use strict";

let { URL } = require("sdk/url");

//let bpUtil = require("thirdparty/blushproof/bpUtil");
//let blushlist = require("thirdparty/blushproof/blushlist").map;

/**
  * return {hash: <key>, category: <if any>}
  *
  */
let blushiness = exports.blushiness = function(url, aBlushlist) {
  let host = url;
  try {
    host = URL(url).host;
  } catch (e) {
    //
  }
  if (aBlushlist === undefined) aBlushlist = blushlist;
  let host = url;
  try {
    host = URL(url).host;
  } catch (e) {
    //
  }
  let hash = bpUtil.getKeyForHost(host);
  let category = aBlushlist[hash];
  return ({hash: hash, category: category});
};
