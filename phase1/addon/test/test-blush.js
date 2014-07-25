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

let {blushiness} = require("blush");

exports["test blushiness of urls"] = function (assert) { //sync, no done
  let urls = [
    "http://youporn.com/some/query", // adult
    "https://youporn.com/some/query", // adult
    "freelotto.com", // gambling
    "erowid.org",  // drugs
    "gawker.com",  // celebs
    "hazelden.org",  // health
    "facebook.com",  // social
    "mozilla.com" // nothing!
  ];

  let got = urls.map((url) => blushiness(url));
  let expected = [
    { // [object Object]
        hash: "ba3599f39957f1a964d65b05a918c3b0c9bd64e9bdfcb1f3",
        category: "adult"
    },
    { // [object Object]
        hash: "ba3599f39957f1a964d65b05a918c3b0c9bd64e9bdfcb1f3",
        category: "adult"
    },
    { // [object Object]
        hash: "845d12d980b727f02797bb89a87bd0aeef46c8b71e378ddf",
        category: "gambling"
    },
    { // [object Object]
        hash: "f7589ec8b3eb3c6bc43d8aa93939f45d3f5fde1207a51d60",
        category: "drugs"
    },
    { // [object Object]
        hash: "4043d20f0cf3221387bc9f072d67e45334ed9e7b822cc8f3",
        category: "gossip"
    },
    { // [object Object]
        hash: "0f41ace82e4d212ea4f454197a3566db7bab6b11b7e39587",
        category: "medical"
    },
    { // [object Object]
        hash: "31193328f8e21dfb6c99f322d22d7b0b508778e64ffbba86",
        category: "social"
    },
    { // [object Object]
        hash: "bcc1bf92c55c47ae4d4eb27684d44467538298d7e3f252b3",
        category: undefined
    }
  ];
  assert.deepEqual(got,expected,"blushiness correct");

}
require("sdk/test").run(exports);
