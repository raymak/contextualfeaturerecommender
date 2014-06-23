

self.port.on("message", function (msg){
	document.body.innerHTML = msg;
});