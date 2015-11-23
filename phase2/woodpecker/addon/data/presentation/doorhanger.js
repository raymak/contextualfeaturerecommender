
var colorMode;

self.port.on("init", function(options){
  colorMode = options && options.colorMode;

  switch(colorMode){

    case "gradient-linear":
      $('.tag.minimal').css('color', 'green');
      $('.tag.very').css('color', 'red');
      break;
  }
});

$(document).ready(function(){

  updatePanelSize();

  $('.ratings_circles').hover(
  // Handles the mouseover
  function() {
    var c1_r = 0, c1_g = 1, c1_b = 0;
    var c2_r = 1, c2_g = 0, c2_b = 0;

    var lvl = (Number($(this).attr("data-lvl"))-1)/4;

    var c_r =  (1-lvl)*c1_r + (lvl)*c2_r,
        c_g =  (1-lvl)*c1_g + (lvl)*c2_g,
        c_b =  (1-lvl)*c1_b + (lvl)*c2_b;

   var c = 'rgb(' + Math.floor(c_r*255) + ', ' + Math.floor(c_g*255) + ', ' + Math.floor(c_b*255) + ')';

    // self.port.emit("log", c);

    $(this).prevAll().andSelf().addClass('ratings_over');
    if (colorMode && colorMode === 'gradient-linear')
       $(this).prevAll().andSelf().css('background-color', c);

  },
  // Handles the mouseout
  function() {
      $(this).prevAll().andSelf().removeClass('ratings_over');
      if (colorMode && colorMode === 'gradient-linear')
        $(this).prevAll().andSelf().css('background-color', 'rgb(255, 255, 255)');
      // set_votes($(this).parent());
  }
  );

  $('.ratings_circles').on("click", function(){
      var c = $(this).css('background-color');

      $(this).prevAll().andSelf().addClass('ratings_vote');

      if (colorMode && colorMode === 'gradient-linear')
        $(this).prevAll().andSelf().css('background-color', c);

      var rate = Number($(this).attr('data-lvl'));
      fbSubmit(rate);
  });
});

function updatePanelSize(width, height){
  self.port.emit("resize", {height: height || $('body').height(),
    width: width || $('body').width()});
}

function fbSubmit(rate){
  self.port.emit("fbSubmit", rate);
  self.port.emit("hide", "fbSubmit", true);
}
