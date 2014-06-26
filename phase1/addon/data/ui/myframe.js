
//window.parent.postMessage("ping", "*");

window.addEventListener("message", function(msg) {
  document.body.innerHTML = msg.data;
  //msg.source.postMessage("source", msg.origin)
}, false);