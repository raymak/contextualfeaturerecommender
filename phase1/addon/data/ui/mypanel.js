/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";


self.port.on("updateinnerhtml", function (msg){
	document.body.innerHTML = msg;
	//refering the hyperlinks back to the extension
		var elements = document.getElementsByTagName("a");
		var element;
		for (var i = 0; i < elements.length; i++) {
			element = elements[i];

			if (element.className != 'dummy')
				element.onclick = onlinkclick;
			if (element.className == 'privatewindow')
				element.onclick = movelinktoprivatewindow;
			if (element.className == 'pintab')
				element.onclick = pintab;
		}
});

function onlinkclick(){
	self.port.emit("openlinkinnewtab", this.href);
}

function movelinktoprivatewindow(){
	self.port.emit("movelinktoprivatewindow");
}

function pintab(){
	self.port.emit("pintab");
}