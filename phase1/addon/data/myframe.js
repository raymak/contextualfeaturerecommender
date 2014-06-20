window.addEventListener("message", function(msg) {
  document.body.innerHTML = msg.data;
}, false);