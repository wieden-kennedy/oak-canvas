// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 


"use strict";

/**
 * A module that inherits Sprite and provides augmented functionality for drawing an image onto the stage.
 * It also accomadates for cropping so sprite sheets can be used.
 * @class Graphic 
 * @param {Object} spec - A hash of parameters
 * @param {oak.canvas.Image} spec.source - The image to draw onto the canvas. Required. 
 * @prop {Number} width - Read only. The width of the crop. Defaults to 0. 
 * @prop {Number} height - Read only. The height of the crop. Defaults to 0. 
 * @prop {oak.canvas.Image} source - Read only. The image to draw onto the canvas. 
 * @example
 * var foo = new oak.canvas.Graphic({
 *  source: myImg
 * });
 * myStage.addChild(foo);
 */
oak.canvas.Graphic = inherit(oak.canvas.Sprite, function () {});

oak.extend(oak.canvas.Graphic.prototype, {

  _init: function (spec) {
    if (typeof spec.source === "undefined" || typeof spec.source.img === "undefined") {
      console.log("!!! You must specify a source that is of type oak.canvas.Image !!!");
      return;
    }

    this.source = spec.source;
    spec.width = this.source.width;
    spec.height = this.source.height;

    oak.canvas.Sprite.prototype._init.call(this, spec);
  },

  // draw
  // ----
  // @params
  // ctx - canvas context to draw onto
  draw: function (ctx) {
    // Don't draw if we have nothing to draw it to
    ctx.drawImage(this.source.img, 1, 0, this.source.nativeWidth, this.source.nativeHeight, -this.centerX, -this.centerY, this.source.width, this.source.height);  
  }

});
