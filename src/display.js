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
 * A  module that inherits Statable. Display is the base for all objects that can be placed on the
 * display list. All children are instances of Display.
 * Infact, a stage is an augmented Display instance. Displays provide properties for
 * visibly manipulating items on a canvas and define it's render cycle. All instances of
 * the Display type can have children, which are of the Display type. 
 * not in view it skips the render cycle providing some potential performance enhancements.
 * @class Sprite 
 * @prop {Object} bounds - Read only. The boundaries used to determine if the sprite is in view or not. 
 * @example
 * var mySprite = new oak.canvas.Sprite({
 *  width: 100,
 *  height: 100
 * });
 * myStage.addChild(mySprite);
 */
oak.canvas.Display = inherit(oak.Statable, function () {

  this._calc = function () {
    var p = this.keeper;
    this.globalX = this.x + this.deltaX;
    this.globalY = this.y + this.deltaY;
    this.globalX = p ? p.globalX + this.globalX : this.globalX;
    this.globalY = p ? p.globalY + this.globalY : this.globalY;
    this.globalRotation = p ? p.globalRotation + this.rotation : this.rotation;
    this.globalAlpha = p ? p.globalAlpha * this.alpha : this.alpha;
    //this.globalScale = p ? p.globalScale * this.scale : this.scale;
    this.globalScaleX  = p ? p.globalScaleX * this.scaleX : this.scaleX;
    this.globalScaleY  = p ? p.globalScaleY * this.scaleY : this.scaleY;
  };

  this._draw = function (ctx) {
    // Translate to perform transformations
    ctx.translate(this.globalX, this.globalY);
    ctx.rotate(this.globalRotation);

    // Prevent 0 scale bug in firefox
    var
      scaleX = (this.globalScaleX === 0) ? 0.01 : this.globalScaleX,
      scaleY = (this.globalScaleY === 0) ? 0.01 : this.globalScaleY;

    ctx.scale(scaleX, scaleY);

    ctx.globalAlpha = this.globalAlpha;
    this.draw(ctx);
  };

  this._restore = function (ctx) {
    ctx.restore();
  };

  this._save = function (ctx) {
    ctx.save();
  };

});

oak.extend(oak.canvas.Display.prototype, {

  _init: function (spec) {
    oak.Statable.prototype._init.call(this, spec);
    
    // Global calculated values
    this.globalAlpha = 0;
    this.globalRotation = 0;
    this.globalX = 0;
    this.globalY = 0;
    this.globalScale = 1;
    this.globalScaleX = 1;
    this.globalScaleY = 1;

    this.index = -1;

    // Allows us to add sprites to other sprites
    this.keeper = undefined;

    // Reference to that stage this gets added to
    this.stage = undefined;

    this.children = [];
    this.numChildren = 0;

    this._calc();
  },

  // Sets the stage property on a child of this display object
  assignStage: function (child) {
    if (typeof this.stage !== "undefined") {
      child.setStage(this.stage);
    }
  },

  addChild: function (child) {
    child.keeper = this;
    this.children.push(child);
    child.index = this.numChildren;
    this.numChildren = this.children.length;
    child.added();
    this.assignStage(child);
  },

  addChildAt: function (child, i) {
    if (oak.isNumber(i)) {
      child.keeper = this;
      this.children.splice(i, 0, child);
      child.index = i;
      this.numChildren = this.children.length;
      child.added();
      this.assignStage(child);
    }
  },

  added: function () {},

  addedToStage: function () {},

  // Abstract method, override
  calc: function () {},

  // Abstract method, override
  draw: function () {},

  // Gets called when ultimately added to a stage
  // Recursively gets called for all its children
  setStage: function (stage) {
    this.stage = stage;
    this.addedToStage();

    var i;
    for (i = 0; i < this.numChildren; i += 1) {
      this.children[i].setStage(stage);
    }
  },

  removeChild: function (child) {
    var index = this.children.indexOf(child);
    if (index < 0) {
      return;
    }

    // keeper is my way of saying parent
    // Keeping track of sprites parent's allow us to properly
    // position them based on the layers position
    this.children.splice(index, 1);
    this.numChildren = this.children.length;

    child.removed();
    child.keeper = undefined;
    child.stage = undefined;
  },

  removeChildren: function () {
    var i = 0;
    for (i; i < this.numChildren; i += 1) {
      var child = this.children[i];
      child.removed();
      child.keeper = undefined;
      child.stage = undefined;
    }
    this.children = [];
    this.numChildren = 0;
  },

  // Callback for when a sprite is removed 
  removed: function () {},

  // Render phases
  // -----------
  // On requestAnimationFrame the stage will draw out sprites.
  // The sprite goes through 3 phase during this process.
  // save - setup any drawing functionalty, saves the stage canvase's sate and do any necessary calculations
  // draw - modify the stage canvas
  // restore - finish it up and restore the canvas
  // @return - Boolean - whether or not to draw the object and it's children  onto the canvas
  render: function (ctx) {
    this._calc();
    this.calc();

    if (this.visible === false) { return false; }

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
  },

  setIndex: function (i) {
    if (this.stage) {
      return this.stage.setChildIndex(this, i);
    }
    return -1;
  }

});

oak.canvas.Display.prototype.defaults({
  deltaX: 0,
  deltaY: 0,
  alpha: 1,
  centerX: 0,
  centerY: 0,
  rotation: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  scaleX: 1,
  scaleY: 1,
  visible: true
});
