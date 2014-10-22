// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 


"use strict";

oak.canvas.Circle = function () {

}.inherit(oak.canvas.Sprite, {

  _init: function (spec) {
    oak.canvas.Sprite.prototype._init.call(this, spec);
    this.width = this.height = this.radius * 2;
  },

  draw: function (ctx) {
    ctx.beginPath();
    ctx.arc(-this.centerX, -this.centerY, this.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.color;
    ctx.fill();

    if (this.strokeStyle) {
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
    }
  }

});

oak.canvas.Circle.prototype.defaults({
  color: "#FFF",
  lineWidth: 1,
  strokeStyle: null,
  radius: 100
});
