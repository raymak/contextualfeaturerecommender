
"use strict";

var entryList = document.getElementById("entry-list");

function fetchEntries(){
  self.port.emit("fetchEntries");
}

self.port.on("postEntry", function(entry, options){
  let entryDiv = document.createElement("div");
  entryDiv.className = "entry-div";
  entryDiv.innerHTML = entry.message;
  entryList.insertBefore(entryDiv, entryList.firstChild);
});




