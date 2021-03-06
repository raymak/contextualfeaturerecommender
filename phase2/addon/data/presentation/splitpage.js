/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*eslint-env browser */
/*exported fetchEntries */

"use strict";

var entryList = document.getElementById("entry-list");

var fetchEntries = function () {
  self.port.emit("fetchEntries");
}

self.port.on("postEntry", function(entry, options){
  let entryDiv = document.createElement("div");
  entryDiv.className = "entry-div";
  entryDiv.textContent = entry.message; // TODO: sanitize and allow html
  entryList.insertBefore(entryDiv, entryList.firstChild);
});




