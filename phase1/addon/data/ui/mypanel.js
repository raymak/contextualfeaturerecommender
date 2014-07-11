

self.port.on("updateinnerhtml", function (msg){
	document.body.innerHTML = msg;
	//refering the hyperlinks back to the extension
		elements = document.getElementsByTagName("a");
		for each (var element in elements) {
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