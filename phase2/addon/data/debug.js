/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*eslint-env jquery*/

"use strict";

const items = {};
const records = {};

self.port.on("init", function(){

  //registering listeners
  $("#cmdForm").submit(function(e){
    submitCmd();
    e.preventDefault();
  });

});


self.port.on("update", function(recs, options){

  let keySet;

  if (options && options.keys)
    keySet = options.keys
  else
    keySet = Object.keys(recs);

  keySet.forEach(function(key){
    if (!records[key])
        records[key] = {};

    records[key].data = recs[key].data;
    records[key].type = recs[key].type;
    records[key].list = recs[key].list;
    updateObject(key);
  });
      
});

self.port.on("refresh", function(){
  location.replace(window.location.protocol + "//" + window.location.hostname + window.location.pathname);
});

function updateObject(key){
  let item;
  if (key in items)
    item = items[key];
  else
  {
    item = document.createElement("li");
    let lst = document.getElementById(listToId(records[key].list));
    if (!lst){ //creating a new list
      lst = document.createElement("ul");
      lst.setAttribute("id", listToId(records[key].list));
      let lsts = document.getElementById("lists");
      let lstLabel = document.createElement("p");
      lstLabel.classList.add("list-label");
      lstLabel.textContent = records[key].list;
      let hr = document.createElement("hr");
      lsts.appendChild(hr);
      lsts.appendChild(lstLabel);
      lsts.appendChild(lst);
    }
    lst.appendChild(item);
    items[key] = item;
  }
  
  if (records[key].type === 'json'){ //viewing json
    let kElem = $("<span class='key'></span>").text(key);
    let vElem = $("<div class='value json' </div>");
    $(vElem).attr("id", keyToId(key));
    $(item).text(": ").prepend(kElem).append(vElem);

    $(document.getElementById(keyToId(key))).JSONView(records[key].data, { collapsed: true, nl2br: true, recursive_collapser: true });
  }
  else //anything other than json
  {
    let kElem = $("<span class='key'></span>").text(key);
    let vElem = $("<span class='value "+ mapJsType2JsonViewClass(records[key].type)  + "'></span>").text(records[key].data);
    $(item).text(": ").prepend(kElem).append(vElem);
  }

}

function keyToId(key){
  return "key-" + key.replace(/ /g, "-");
}

function listToId(list){
  return list.replace(/ /g, "-") + "-list";
}

function mapJsType2JsonViewClass(type){
  const map = {
    "boolean": "bool",
    "string": "string",
    "number": "num",
    "json": "json"
  }

  //unknown type is treated as null
  return map[type] || "null";
}

function submitCmd(){
  self.port.emit("cmd", $("#cmdText").val());
}

function cmdOut(out, cmd){
  $("#cmdOut").prepend(">> &nbsp" + "<span class='outcmd'></span>" 
                    + "<br>"  
                    + " &nbsp"+ "<span class='outout'></span>"+ "<br><br>");

  $("#cmdOut .outcmd").filter(":first").text(cmd);
  $("#cmdOut .outout").filter(":first").text(out ? out : "unrecognized");
  if (!out) $("#cmdOut .outout").filter(":first").addClass("outunrecognized");

  window.location.href = "#cmdOut";
  $("#cmdText").focus();
}

self.port.on("cmdOut", cmdOut);

