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
 * A module that wraps a the image element to work with the oak canvas API.
 * @class Image 
 * @example
 * var img = new oak.canvas.Image();
 * img.once("loaded", function () {
 *   // Do something
 * });
 * img.load("test.jpg");
 */
oak.canvas.Image = function () {

  this._init = function () {
    this.img = new Image();
    this.loaded = false;
    this.nativeWidth = this.img.width;
    this.nativeHeight = this.img.height;
  };

}.inherit(oak.Evented);

oak.extend(oak.canvas.Image.prototype, {

  load: function (src) {
    if (typeof src === "undefined") {
      console.error("No source was provided for the image.");
      return;
    }

    var self = this; 
    this.img.onload = function () {
      self.img.onload = undefined;
      // Since retina image is twice the size, modify width and height vars
      self.nativeWidth = self.img.width;
      self.nativeHeight = self.img.height;
      self.width = self.img.width/oak.canvas.renderer.pixelRatio;
      self.height = self.img.height/oak.canvas.renderer.pixelRatio;
      self.loaded = true;

      self.trigger("loaded");
    };

    // Look for image with @2x in the file name, if retina
    if (oak.canvas.renderer.pixelRatio > 1) {
      src = src.replace(/(.jpg|.png|.gif)$/, function (s) {
        return "@2x" + s;
      });
    }

    this.img.src = src;
    return this;
  }

});
