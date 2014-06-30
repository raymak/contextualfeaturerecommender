

self.port.on("updateinnerhtml", function (msg){
	document.body.innerHTML = msg;
	//refering the hyperlinks back to the extension
		tags = document.getElementsByTagName("a");
		for each (var tag in tags) tag.onclick = onlinkclick;
});

function onlinkclick(){
	self.port.emit("openlinkinnewtab", this.href);
}