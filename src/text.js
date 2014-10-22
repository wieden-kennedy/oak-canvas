// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 

"use strict";

oak.canvas.Text = function () {

}.inherit(oak.canvas.Sprite, {

  _init: function (spec) {
    oak.canvas.Sprite.prototype._init.call(this, spec);
    this.resetStyle();
  },

  draw: function (ctx) {
    ctx.translate(-this.centerX, -this.centerY);
    ctx.fillStyle = this.color; 
    ctx.font = this.style; 
    ctx.textAlign = this.textAlign; 
    ctx.textBaseline = this.baseline; 
    ctx.shadowColor = this.shadowColor;
    ctx.shadowOffsetX = this.shadowOffsetX;
    ctx.shadowOffsetY = this.shadowOffsetY;
    ctx.shadowBlur = this.shadowBlur;
  },

  resetStyle: function () {
    this.style = [
      this.weight, this.size.toString().replace(/([\d\.]+)/, "$1px"), this.font
    ].join(" ");

    this.width = oak.canvas.renderer.measureText(this.label, this.style).width;
    this.height = this.size;
  }

});

oak.canvas.Text.prototype.defaults({
  baseline: "alphabetic",
  color: "#FFF",
  font: "Helvetica",
  label: "",
  shadowColor: "rgba(0,0,0,.20)",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
  size: 40,
  textAlign: "left",
  weight: 800
});
