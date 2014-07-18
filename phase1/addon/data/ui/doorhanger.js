/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


self.port.on("options", function (options){
	document.getElementById("textbox").innerHTML = options.message;
	document.getElementById("header").innerHTML = options.header;
	document.getElementById("button").innerHTML = options.buttonLabel;

	//setting the callback
	document.getElementById("button").addEventListener("click", buttonClick);
});

function buttonClick(){
	self.port.emit("buttonClicked");
}