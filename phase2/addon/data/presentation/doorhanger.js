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

  
  document.getElementById("neg-feedback").addEventListener("click", openNegFeedback);

  let rsTimeout;

  document.getElementById("rationalecontainer").addEventListener("mouseenter", function(e){
    if (document.getElementById("recommcontainer").classList.contains("invisible"))
      return;

    let rs = document.getElementById("rationalesection");
    if (rs.classList.contains('visible'))
      clearTimeout(rsTimeout);
    else
      expandRationale();
  });

  document.getElementById("feedback-form").addEventListener("change", function(e){
    submitFeedback();
  });

  document.body.addEventListener("mouseleave", function(e){
    if (document.getElementById("recommcontainer").classList.contains("invisible"))
      return;

    let rs = document.getElementById("rationalesection");
    if (rs.classList.contains('visible')){
      rsTimeout = setTimeout(collapseRationale, 500);
    }
  });

  document.getElementById("info-page").addEventListener("click", function(e){
    self.port.emit("infoPage");
    console.log(self.port);
  });


  window.addEventListener("keydown", function(e){
    if (e.key === "Escape")
      self.port.emit("hide", "escape");
  });

  self.port.emit("conntest", "load");
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

function openNegFeedback(){  
  collapseRationale();
  document.getElementById("feedbackcontainer").classList.add("visible");
  document.getElementById("recommcontainer").classList.add("invisible");
  document.getElementById("top-left-links").classList.add("visible");
  document.getElementById("interpunct").classList.add("invisible");
  document.getElementById("info-page").classList.add("invisible");
  document.getElementById("neg-feedback").classList.add("active");
  document.getElementById("button-container").classList.add("feedback");
  document.getElementById("prim-button").classList.add("invisible");
  document.getElementById("sec-button").classList.add("feedback");
  document.getElementById("sec-button").innerHTML = "Learn more about Feature Recommender";
  document.getElementById("sec-button").addEventListener("click", function(e){
    self.port.emit("infoPage");
  });
}

function expandRationale(){
  self.port.emit("conntest", "expand");
  document.getElementById("rationalesection").classList.add('visible');
  updatePanelSize();
}

function collapseRationale(){

  document.getElementById("rationalesection").addEventListener("transitionend", function hideRationale(e){
    document.getElementById("rationalesection").removeEventListener("transitionend", hideRationale);
    document.getElementById("rationalesection").classList.remove('visible');
    updatePanelSize();
  });

  document.getElementById("rationalesection").style.opacity = 0;
}

function submitFeedback(){
  setTimeout(function(){
    document.getElementById("feedbackcontainer").classList.remove("visible");
    document.getElementById("thankscontainer").classList.add("visible");
    setTimeout(function(){
      self.port.emit("hide", "feedbacksubmission", true);
    }, 3000);
  }, 500);
}