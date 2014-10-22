// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 


"use strict";

oak.canvas.Rectangle = function () {

}.inherit(oak.canvas.Sprite, {

  _init: function (spec) {
    oak.canvas.Sprite.prototype._init.call(this, spec);
    this.width = this.height = this.radius * 2;
  },

  draw: function (ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(0,0,this.width,this.height);
  }

});

oak.canvas.Rectangle.prototype.defaults({
  color: "#FFF",
  height: 100,
  width: 100 
});

