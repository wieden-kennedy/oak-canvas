// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 

"use strict";

oak.canvas.Scene = function () {

  this.addGfx = function (gfx) {
    this._gfxList.push(gfx);
    this.numGfx = this._gfxList.length;

    this.addChild(gfx);
  };

  this.addResizer = function (sizer) {
    this._resizers.push(sizer);
    this.numResizers = this._resizers.length;
    if (typeof this.stage !== "undefined") {
      sizer.call(null, oak.canvas.renderer.getWindowBounds());
    }
  };

  this.addSprite = function (sprite) {
    this._sprites.push(sprite);
    this.numSprites = this._sprites.length;

    this.addChild(sprite);
  };

  this.getGfxAt = function (i) {
    return this._gfxList[i];
  };

  this.removeGfx = function (gfx) {
    var index = this._gfxList.indexOf(gfx);
    if (index < 0) {
      return;
    }
    this._gfxList.splice(index, 1);
    this.numGfx = this._gfxList.length;
    
    this.removeChild(gfx);
  };

  this.removeResizer = function (sizer) {
    var index = this._resizers.indexOf(sizer);
    if (index < 0) {
      return;
    }
    this._resizers.splice(index, 1);
    this.numResizers = this._resizers.length;
  };

  this.removeSprite = function (sprite) {
    var index = this._sprites.indexOf(sprite);
    if (index < 0) {
      return;
    }
    sprite.keeper = undefined;
    this._sprites.splice(index, 1);
    this.numSprites = this._sprites.length;

    this.removeChild(sprite);
  };

  this.resize = function (bounds) {
    var args = arguments;
    if (this.liquid === true) {
      this.width = bounds.width;
      this.height = bounds.height;
    }

    var self = this;
    // Call children sizer callbacks
    oak.each(this._sizers, function (obj) {
      obj.sizer.call(obj.child, bounds);
    });

    oak.each(this._gfxList, function (gfx) {
      gfx.calc();
    });

    oak.each(this._resizers, function (sizer) {
      sizer.call(null, bounds);
    });

    return this;
  };

}.inherit(oak.canvas.Sprite, { 

  _init: function (spec) {
    if (!oak.defined(spec.camera)) {
      console.log("!!! Can't render a scene without a camera");
    }

    this._prevPos = {};
    this._resizers = [];
    this._sizers = {};
    this._gfxList = [];
    this._sprites = [];

    this.camera = spec.camera;
    this.numResizers = 0;
    this.numGfx = 0;
    this.numSprites = 0;

    // Stores hroizontal and vertical driection of layer, -1, 0, 1
    this.direction = {x: 0, y: 0};
    this.shift = {x: 0, y: 0};

    if (spec.width || spec.height) {
      this.liquid = false;
    }

    oak.canvas.Sprite.prototype._init.call(this, spec);
  },

  // addChild
  // --------
  // Extends sprite addChild method.
  // Offers the ability to pass a sizer callback.
  // This callback will get called whenever the self.stage is resized
  // and when the scene is first added as a child.
  // The scope of the sizer callback is the child and it gets
  // passed two params, the width and height of the self.stage.
  addChild: function (child, sizer) {
    if (oak.defined(sizer)) {
      this._sizers[child] = {child: child, sizer: sizer};
      sizer.call(child, oak.canvas.renderer.getWindowBounds());
    }

    oak.canvas.Sprite.prototype.addChild.call(this, child);
  },

  addedToStage: function () {
    oak.canvas.renderer.addResizable(this);
  },

  // Override calc function to include camera coords
  calc: function () {
    this.globalX += (this.camera.x * this.range);
    this.globalY += (this.camera.y * this.range);

    var dx = this.x - this._prevPos.x || 0, 
        dy = this.y - this._prevPos.y || 0;

    this.direction.x = (dx > 0) ? 1 : (dx < 0) ? -1 : 0;
    this.direction.y = (dy > 0) ? 1 : (dy < 0) ? -1 : 0;

    this._prevPos.x = this.x;
    this._prevPos.y = this.y;
  },

  removed: function () {
    oak.canvas.renderer.removeResizable(this);
  },

  removeChild: function (child) {
    delete this._sizers[child];
    oak.canvas.Sprite.prototype.removeChild.call(this, child);
  }

});

oak.canvas.Scene.prototype.defaults({
  range: 1,
  liquid: true
});


