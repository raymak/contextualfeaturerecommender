
"use strict";

const {Recommendation} = require("recommendation")
const controller = require("controller")

const start = function () {

	console.log("Hello World! I am alive :)");

	// test recommendation creation
	const gmailNotifier = Recommendation({
		id: "gmailNotifier",
		trigBehavior: "hostname visit www.google.ca 2",
		feature: "gmail notifier",
		classTags: "extension low-priority",
		delivContext: "hostname visit www.gmail.ca",
		presentationData: "log: yay! gmail-notifier;",
		respCommandMap: ""
	});

	controller.recommendations.add(gmailNotifier);

	// console.log(gmailNotifier.toString());

	controller.listener.start();

	

}

start()

