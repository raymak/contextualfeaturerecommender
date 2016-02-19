/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {notify} = require("sdk/notifications");
const {extractPresentationData} = require("../recommendation");

function getData(aRecommendation){
	return merge({}, aRecommendation.presentationData.all, aRecommendation.presentationData.desktopnotification);
}

function present(aRecommendation){
	let data = extractPresentationData.call(aRecommendation, "desktopnotification");
	// notify({
	// 	title: data.title || "",
	// 	text: data.message,
	// 	data: "",
	// 	onClick: function(data) {}
	// });
}


exports.present = present;