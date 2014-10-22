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
 * @class Sheet 
 * @param {Object} spec - A hash of parameters
 * @param {Number} spec.cropX - Read only. The x position of the crop. Defaults to 0. 
 * @param {Number} spec.cropY - Read only. The y position of the crop. Defaults to 0. 
 * @param {Number} spec.width - Read only. The width of the crop. Defaults to 0. 
 * @param {Number} spec.height - Read only. The height of the crop. Defaults to 0.. 
 * @param {oak.canvas.Image} spec.source - Read only. The image to draw onto the canvas. Required. 
 * @prop {Number} cropX - Read only. The x position of the crop. Defaults to 0. 
 * @prop {Number} cropY - Read only. The y position of the crop. Defaults to 0. 
 * @prop {Number} width - Read only. The width of the crop. Defaults to 0. 
 * @prop {Number} height - Read only. The height of the crop. Defaults to 0. 
 * @prop {oak.canvas.Image} source - Read only. The image to draw onto the canvas. 
 * @example
 * var foo = new oak.canvas.Sheet({
 *  cropX: 20,
 *  cropY: 20,
 *  width: 100,
 *  height: 100,
 *  source: myImg
 * });
 * myStage.addChild(foo);
 */
oak.canvas.Sheet = inherit(oak.canvas.Sprite, function () {});

oak.extend(oak.canvas.Sheet.prototype, {
  
  _init: function (spec) {
    oak.canvas.Sprite.prototype._init.call(this, spec);

    // Crop x and y position has to be aware if it's a retina image or not
    // Scales it based on pixel ratio for retina
    this.shift(this.cropX, this.cropY);
    this.cropWidth = this.width * oak.canvas.renderer.pixelRatio;
    this.cropHeight = this.height * oak.canvas.renderer.pixelRatio;
  },

  // draw
  // ----
  // @params
  // ctx - canvas context to draw onto
  // x - x offset only for drawing the image, allows us to shift postiiong of image without affecting x, y position of whole sprite
  // y - y offset used for drawing the image
  draw: function (ctx, x, y) {
    x = x || 0;
    y = y || 0;
    /*
     We need to crop it based on it's native dimensions, but when posiitoning on the scaled canvas
     and stretching it's width and height, we need to use the normalized values. These are the values 
     this have been adjusted for the device pixel ratio.
     sheetW and sheetH are the original width and height of the unmodified image
     width and height are the normalized valuesi, same for reting and non-retina. Based on non-retina dimensions.
     for retina and non-retina images.
     cropYsheetX and sheetY is modified in this module to adjust based on the device pixel ratio. This is because
     if the image is twice as large, it's crop x and y coordinates are doubled. 
     */
    // Don't draw if we have nothing to draw it to
    //if (this.keeper) {
    ctx.drawImage(this.source.img, this.cropX, this.cropY, this.cropWidth, this.cropHeight, -this.centerX + x, -this.centerY + y, this.width, this.height);  
    //}
  },

  // Shift the x,y position of the crop
  shift: function (cropX, cropY) {
    this.cropX = cropX * oak.canvas.renderer.pixelRatio;
    this.cropY = cropY * oak.canvas.renderer.pixelRatio;
  }
});

oak.canvas.Sheet.prototype.defaults({
  cropX: 0,
  cropY: 0,
  source: null
});
