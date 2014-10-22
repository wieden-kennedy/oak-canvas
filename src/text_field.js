// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 

"use strict";

oak.canvas.TextField = function () {
}.inherit(oak.canvas.Text, {

  draw: function (ctx) {
    oak.canvas.Text.prototype.draw.call(this, ctx);
    ctx.fillText(this.label, 0, 0);
  }

});
