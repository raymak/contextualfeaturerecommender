/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


self.port.on("updateEntry", function(entry, options){


  let message = entry.message;
  let title = entry.title;
  let primButtonLabel = entry.primaryButtonLabel;
  let secButtonLabel = entry.secondaryButtonLabel;
  let rationale = entry.rationale || "";

  document.getElementById("textbox").innerHTML = message;
  document.getElementById("header").innerHTML = title;
  document.getElementById("prim-button").innerHTML = primButtonLabel;
  document.getElementById("sec-button").innerHTML = secButtonLabel;
  document.querySelector("#rationalesection p").innerHTML = rationale;
  
  updatePanelSize();

  //setting the callback
  document.getElementById("sec-button").addEventListener("click", buttonClick);
  document.getElementById("close-button").addEventListener("click", closeButtonClick);

  document.body.addEventListener("mouseenter", function(e){
    self.port.emit("mouseenter");
  });
  document.body.addEventListener("mouseleave", function(e){
    self.port.emit("mouseleave");
  });

  document.getElementById("rationaleopener").addEventListener("click", function(e){
    let rs = document.getElementById("rationalesection");
    rs.classList.add('visible');
    
    updatePanelSize();
  });

  window.addEventListener("keydown", function(e){
    if (e.key === "Escape")
      self.port.emit("hide", "escape");
  });
  /*if (options.icon) {   // #134 decided against this.
    document.getElementById("icon").src = options.icon;
  }*/
  if (options && options.panelSize)
   changeBodySize(options.panelSize);
});


function capitalize(string){
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function buttonClick(){
  self.port.emit("buttonClicked");
}

function closeButtonClick(){
  self.port.emit("hide", "closeButtonClicked");
}

function changeBodySize(panelSize){
  document.body.style.width = (panelSize.width - 2).toString() + "px";
  document.body.style.height = (panelSize.height - 3).toString() + "px";
}

function updatePanelSize(width, height){
    self.port.emit("resize", {height: height || Number(getComputedStyle(document.body).height.slice(0,-2)),
     width: width || Number(getComputedStyle(document.body).width.slice(0,-2))});

}
