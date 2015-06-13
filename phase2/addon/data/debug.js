"use strict";

const data = {};
const items = {};
const types = {};

self.port.on("create", function(sp){

  document.getElementById("view-prefs-btn").addEventListener("click", function(){
    self.port.emit("view-prefs");
  });
});

self.port.on("update", function(typ, newData){
  for (let key in newData){
      data[key] = newData[key];
      types[key] = types[key] || typ[key];
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
    document.getElementById("main-list").appendChild(item);
    items[key] = item;
  }
  
  if (types[key] === 'json'){
    item.innerHTML = "<span class='prop'>"+ key + "</span>" + ": " +
       "<div id='key-" + key + "' class='value json'>" +  "</div>";

    $("#key-" + key.replace(".", "\\.")).JSONView(data[key], { collapsed: true, nl2br: true, recursive_collapser: true });
  }
  else
    item.innerHTML = "<span class='prop'>"+ key + "</span>" + ": " + 
      "<span class='value " + mapJsType2JsonViewClass(types[key]) + "'>"+ data[key] + "</span>"; 

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



