/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


self.port.on("options", function (options){
	document.getElementById("textbox").innerHTML = options.message;
	document.getElementById("header").innerHTML = options.header;
	document.getElementById("button").innerHTML = options.buttonLabel;
	
	if (!options.explanationMessage) options.explanationMessage = "";
	document.getElementById("explanationsection").innerHTML = options.explanationHeader + " " + options.explanationMessage;

	//setting the callback
	document.getElementById("button").addEventListener("click", buttonClick);

	if (options.icon) {
		document.getElementById("icon").src = options.icon;
	}
	changeBodySize(options.panelSize);

	try {
		if (options.arm.explanation == "unexplained" || options.explanationHide){
			document.getElementById("explanationsection").style.visibility = "hidden";
		}
		else{
			document.getElementById("explanationsection").style.visibility = "visible";
		}

	} catch (e) {console.log(e.message);}

	

	
});

function capitalize(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function buttonClick(){
	self.port.emit("buttonClicked");
}

function changeBodySize(panelSize){
	document.body.style.width = (panelSize.width - 2).toString() + "px";
	document.body.style.height = (panelSize.height - 3).toString() + "px";

}