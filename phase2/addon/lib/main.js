
const {Recommendation} = require("recommendation")
const controller = require("controller")

const start = function () {

	console.log("Hello World! I am alive :)");

	// test recommendation creation
	const gmailNotifier = Recommendation({
		id: "gmailNotifier",
		trigBehavior: "url visit www.google.ca",
		feature: "gmail notifier",
		classTags: "extension low-priority",
		delivContext: "url visit www.gmail.com",
		presentationData: "log: yay! gmail-notifier;",
		respCommandMap: ""
	});

	controller.recommendations.add(gmailNotifier);

	// console.log(gmailNotifier.toString());

	controller.listener.init();

	

}

start()

