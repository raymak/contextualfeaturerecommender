/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

/*global sanitizeHtml */
/*exported capitalize, changeBodySize */

let rsTimeout;


self.port.on("updateEntry", function(entry, state, options){
  console.log(entry.message);

  // https://www.npmjs.com/package/sanitize-html
  let message = sanitizeHtml(entry.message, {
    allowedTags: ['h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
  'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'span'],
    allowedAttributes: {
      'span': ['class']
    }
  });
  console.log(message);
  let title = entry.title;
  let primButtonLabel = entry.primaryButtonLabel;
  let secButtonLabel = entry.secondaryButtonLabel;
  let rationale = entry.rationale || "";
  let iconSrc = entry.icon;
  self.port.emit("log", iconSrc);

  clearTimeout(rsTimeout);

  document.getElementById("icon").src = iconSrc;
  document.getElementById("icon").onerror = function(){
    this.src = "images/firefox-highres.png";
  };

  if (state.like)
    document.getElementById("likesection").classList.add("checked");

  if (state.dontlike){
    document.getElementById("neg-feedback").classList.add("checked");
  }

  document.getElementById("textbox").innerHTML = message; // sanitized
  if (options && options.os && options.os === "darwin")
    replaceCtrlCommand();
  document.getElementById("header").textContent = title;
  document.getElementById("prim-button").textContent = primButtonLabel;
  document.getElementById("sec-button").textContent = secButtonLabel;
  if (!primButtonLabel)
    document.getElementById("prim-button").classList.add('disabled');
  if (!secButtonLabel)
    document.getElementById("sec-button").classList.add('disabled');
  document.querySelector("#rationalesection p").textContent = rationale;

  if (options && options.negFbOrder){ //ordering negative feedback radio buttons
    orderNegFb(options.negFbOrder);
  }


  //setting the callback
  document.getElementById("sec-button").addEventListener("click", secButtonClick);
  document.getElementById("prim-button").addEventListener("click", primButtonClick);
  document.getElementById("close-button").addEventListener("click", closeButtonClick);
  document.getElementById("like").addEventListener("click", likeClick);

  document.body.addEventListener("mouseenter", mouseEnter);
  document.body.addEventListener("mouseleave", mouseLeave);

  document.getElementById("neg-feedback").addEventListener("click", negFbClick);

  document.getElementById("clickarea").addEventListener("mouseenter", caMouseEnter);

  document.getElementById("clickarea").addEventListener("click", caClick);

  document.getElementById("feedback-form").addEventListener("change", submitFeedback);

  document.getElementById("info-page").addEventListener("click", infoClick);

  self.port.emit("loaded");

  updatePanelSize();

});

function infoClick(e){
  self.port.emit("infoPage");
}

function caClick(e){
  if (document.getElementById("recommcontainer").classList.contains("invisible"))
    return;

  let rs = document.getElementById("rationalesection");
  if (rs.classList.contains('visible'))
    collapseRationale();
  else
    expandRationale();
}

function caMouseEnter(e){
  if (document.getElementById("recommcontainer").classList.contains("invisible"))
    return;

  let rs = document.getElementById("rationalesection");
  if (rs.classList.contains('visible'))
    clearTimeout(rsTimeout);
  else
    expandRationale();
}

function negFbClick(e){
  let nf = document.getElementById("neg-feedback");
  if (nf.classList.contains("active")) return;

  if (nf.classList.contains("checked"))
    nf.classList.toggle("checked");
  else
    openNegFeedback();

  self.port.emit("dontliketoggle");
}

function mouseEnter(e){
  self.port.emit("mouseenter");
}

function mouseLeave(e){
  self.port.emit("mouseleave");

  if (document.getElementById("recommcontainer").classList.contains("invisible"))
    return;

  let rs = document.getElementById("rationalesection");
  if (rs.classList.contains('visible')){
    rsTimeout = setTimeout(collapseRationale, 500);
  }
}

function capitalize(string){
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function secButtonClick(){
  self.port.emit("response", "secondaryButton");
  self.port.emit("hide", "response", true);
}

function primButtonClick(){
  self.port.emit("response", "primaryButton")
  self.port.emit("hide", "response", true);
}

function closeButtonClick(){
  self.port.emit("hide", "closebutton");
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
  // document.getElementById("button-container").classList.add("feedback");
  document.getElementById("prim-button").classList.add("invisible");
  document.getElementById("sec-button").classList.add("feedback");
  document.getElementById("sec-button").textContent= "Learn more about Firefox Guide";
  document.getElementById("sec-button").classList.remove("disabled");
  document.getElementById("sec-button").removeEventListener("click", secButtonClick);
  document.getElementById("sec-button").addEventListener("click", function(e){
    self.port.emit("infoPage");
  });
  document.getElementById("neg-feedback").textContent = "I don't like this (" + document.getElementById("header").textContent + ")";
  self.port.emit("negfbopen");

  document.getElementById("topsection").style.height = '140px'; // temporary, TODO: needs a more scalable solution

  updatePanelSize();
}

function expandRationale(){
  document.getElementById("rationalesection").classList.add('visible');
  document.getElementById("rationalecontainer").classList.add('open');
  document.getElementById("rationalesection").style.opacity = 1;
  updatePanelSize();
  self.port.emit("rationaleopen");
}

function collapseRationale(){

  document.getElementById("rationalecontainer").classList.remove('open');
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
    let val = document.querySelector('input[name="negfb"]:checked').value;
    self.port.emit("negfb", val);
    setTimeout(function(){
      self.port.emit("hide", "feedbacksubmission", true);
    }, 1000);
  }, 500);
}

function orderNegFb(order){

  let permIds = order.map(function(p){return "r" + p;});
  permIds.reverse(); //because of using insert before the first child

  let form = document.getElementById("feedback-form");

  permIds.forEach(function(id){
    form.insertBefore(document.getElementById(id), form.childNodes[0]);
  });
}

function likeClick(){
  let likesection = document.getElementById("likesection");
  //let like = document.getElementById("like");

  likesection.classList.toggle("checked");

  self.port.emit("liketoggle");

}

//TOTHINK: this is just a workaround
// should find a neat way to do this
function replaceCtrlCommand(options){
    let keys = document.querySelectorAll("span.key");
    if (keys)
      Array.prototype.slice.call(keys).forEach(function(elem){
        elem.textContent = elem.textContent.replace(/ctrl/i, "command");
      });
}
