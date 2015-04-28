"use strict";

const {notify} = require("sdk/notifications");
const {extractPresentationData} = require("recommendation");

function getData(aRecommendation){
	return merge({}, aRecommendation.presentationData.all, aRecommendation.presentationData.desktopnotification);
}

function present(aRecommendation){
	let data = extractPresentationData.call(aRecommendation, "desktopnotification");
	notify({
		title: data.title || "",
		text: data.message,
		data: "",
		onClick: function(data) {}
	});
}


exports.present = present;