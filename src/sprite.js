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

 * A  module that inherits Display and provides augmented visibility functionality.
 * A sprite will use it's displacement and dimensions to determine if it should render or not. If it is 
 * not in view it skips the render cycle providing some potential performance enhancements.
 * @class Sprite 
 * @prop {Object} bounds - Read only. The boundaries used to determine if the sprite is in view or not. 
 * @example
 * var mySprite = new oak.canvas.Sprit({
 *  width: 100,
 *  height: 100
 * });
 * myStage.addChild(mySprite);
 */
oak.canvas.Sprite = inherit(oak.canvas.Display, function () {});

oak.extend(oak.canvas.Sprite.prototype, {

  _init: function (spec) {
    oak.canvas.Display.prototype._init.call(this, spec);

    this.bounds = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    };
  },

  /**
   * Alternative for defining boundaries of a sprite if they should be different than it's displacement and dimensions. 
   * The boundaries that determine if the sprite is inView or not. 
   * @method defineBounds 
   * @memberof Sprite 
   * @instance
   * @access public
   */
  defineBounds: function (bounds) {
    this._localBounds = bounds;
  },

  /**
   * Determines if the sprite is in view given its stage's dimensions. 
   * @method isVisible 
   * @memberof Sprite 
   * @access public
   * @instance
   * @returns {Boolean} Indicates if the sprite is in view or not
   */
  isVisible: function () {
    // alwaysVisible is a way to skip the offscreen detection on Sprites
    if (this.alwaysVisible === true) { return true; }

    if (typeof this._localBounds !== "undefined") {
      var boundsX = this.globalX - this.centerX,
          boundsY = this.globalY - this.centerY; 

      this.bounds.left = boundsX + this._localBounds.left;
      this.bounds.top = boundsY + this._localBounds.top;
      this.bounds.right = boundsX + this._localBounds.right;
      this.bounds.bottom = boundsY + this._localBounds.bottom;
    // If not rotated, use normal width and height
    } else if (this.rotation === 0) {
      this.bounds.left = this.globalX - this.centerX;
      this.bounds.top = this.globalY - this.centerY;
      this.bounds.right = this.bounds.left + this.width;
      this.bounds.bottom = this.bounds.top + this.height;
    // Else we need to calulated the rotated bounding box 
    } else {
      var 
          x = this.globalX - this.centerX,
          y = this.globalY - this.centerY,
          x2 = x + this.width,
          y2 = y + this.height,
          cX = this.globalX,
          cY = this.globalY,
          rot = this.rotation;

      var tlX, trX, brX, blX,
          tlY, trY, brY, blY,
          cos = Math.cos(rot),
          sin = Math.sin(rot);

      // Rotate the 4 corners of the bounding rect 
      tlX = cX + (x - cX) * cos + (y - cY) * sin;
      trX = cX + (x2 - cX) * cos + (y - cY) * sin;
      brX = cX + (x2 - cX) * cos + (y2 - cY) * sin;
      blX = cX + (x - cX) * cos + (y2 - cY) * sin;

      tlY = cY + (x - cX) * sin + (y - cY) * cos;
      trY = cY + (x2 - cX) * sin + (y - cY) * cos;
      brY = cY + (x2 - cX) * sin + (y2 - cY) * cos;
      blY = cY + (x - cX) * sin + (y2 - cY) * cos;

      // The bounding right is defined by the top-left most coords abd bottom-right most coords
      this.bounds = {
        left: Math.min(tlX, trX, brX, blX),
        right: Math.max(tlX, trX, brX, blX),
        top: Math.min(tlY, trY, brY, blY),
        bottom: Math.max(tlY, trY, brY, blY)
      };

    }

    if (this.bounds.bottom < 0 || this.bounds.top  > this.stage.height || this.bounds.right < 0 || this.bounds.left > this.stage.width) { 
      return false;
    }

    return true;
  },

  /**
   * Steps through the sprites render cycle. Typically called on requestAnimationFrame by the renderer
   * but can be called externally as needed. 
   * @method render 
   * @memberof Sprite 
   * @access public
   * @instance
   * @returns {Boolean} Indicates if the sprite was rendereed or not 
   */
  render: function (ctx) {
    this._calc();
    this.calc();

    if (this.visible === false || this.isVisible() === false) {
      return false;
    }

    this._save(ctx);
    this._draw(ctx);
    this._restore(ctx);

    // Render the children
    var child, i;
    for (i = 0; i < this.numChildren; i += 1) {
      child = this.children[i];
      child.render(ctx);
    }

    return true;
  }

});

oak.canvas.Sprite.prototype.defaults({
  alwaysVisible: false
});
