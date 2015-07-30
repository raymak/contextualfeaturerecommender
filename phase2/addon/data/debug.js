"use strict";



const items = {};
const records = {};

self.port.on("create", function(sp){
  document.getElementById("view-prefs-btn").addEventListener("click", function(){
    self.port.emit("view-prefs");
  });

});

self.port.on("update", function(recs){
  for (let key in recs){
      if (!records[key])
        records[key] = {};
      records[key].data = recs[key].data;
      records[key].type = records[key].type || recs[key].type || 'string';
      records[key].list = records[key].list || recs[key].list || 'default'; //cannot modify the section of an existing item
      updateObject(key);
    }
});

self.port.on("prefs", function(prefs){
  // print prefs output
  $("#prefs-jsonview").JSONView(prefs, { collapsed: true, nl2br: true, recursive_collapser: true });
});

function updateObject(key){
  let item;
  if (key in items)
    item = items[key];
  else
  {
    item = document.createElement("li");
    let lst = document.getElementById(records[key].list + "-list");
    if (!lst){ //creating a new list
      lst = document.createElement("ul");
      lst.setAttribute("id", records[key].list + "-list");
      let lsts = document.getElementById("lists");
      let lstLabel = document.createElement("p");
      lstLabel.classList.add("list-label");
      lstLabel.innerHTML = records[key].list;
      let hr = document.createElement("hr");
      lsts.appendChild(hr);
      lsts.appendChild(lstLabel);
      lsts.appendChild(lst);
    }
    lst.appendChild(item);
    items[key] = item;
  }
  
  if (records[key].type === 'json'){ //viewing json
    item.innerHTML = "<span class='key'>"+ key + "</span>" + ": " +
       "<div id='key-" + key + "' class='value json'>" +  "</div>";

    $("#key-" + key.replace(/\./g, "\\.")).JSONView(records[key].data, { collapsed: true, nl2br: true, recursive_collapser: true });
  }
  else //anything other than json
    item.innerHTML = "<span class='key'>"+ key + "</span>" + ": " + 
      "<span class='value " + mapJsType2JsonViewClass(records[key].type) + "'>"+ records[key].data + "</span>"; 

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


