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
 * A module that wraps a canvas element to work with the oak canvas API
 * @class Stage
 * @param {Object} spec - A hash of parameters
 * @param {Number} spec.id - Read only. The x position of the crop. Defaults to 0. 
 * @param {Number} spec.backgroundColor - If opaque, the background color of the stage. Defaults to #FFF.
 * @param {Number} spec.opaque - Set to true if the canvas should not be transparent. Defaults to false.
 * @prop {String} backgroundColor - If opaque, the background color of the stage. Defaults to #FFF.
 * @prop {Boolean} opaque - Set to true if the canvas should not be transparent. Defaults to false.
 * @example
 * var stage = new oak.canvas.Stage({
 *   id: "game-stage",
 *   opaque: true,
 *   backgroundColor: "#000",
 *   width: 1200,
 *   height: 700
 * });
 * oak.canvas.renderer.addToStack(stage);
 * oak.canvas.renderer.startup();
 */
oak.canvas.Stage = inherit(oak.canvas.Display, function () {

  this._evented = [];
  this.mouse = {x: 0, y: 0};
  this._offset = {left: 0, top: 0};

  // TODO
  // Sort by priority
  // Allow for a priority parameter
  this._addEventedHandler = function (eventName, target, callback, args) {
    var observer = this._getObserver(target);
    if (typeof observer === "undefined") {
      observer = {
        target: target,
        isOver: false
      };
      this._evented.push(observer); 
    }

    observer[eventName] = {
      callback: callback,
      args: args
    };

    if (this._mouseIsOver(target) && target.visible) {
      this.strap.css("cursor", "pointer");
    }
  };

  this._addListeners = function () {
    if (oak.support.isTouch) {
      this.addObserver(this.canvas, "touchstart", this._onTouchStart);
      this.addObserver(this.canvas, "touchmove", this._onTouchMove);
      this.addObserver(this.canvas, "touchend", this._onTouchEnd);
    } else {
      this.addObserver(this.canvas, "click", this._onClick);
      this.addObserver(this.canvas, "mousedown", this._onMouseDown);
      this.addObserver(this.canvas, "mousemove", this._onMouseMove);
      this.addObserver(this.canvas, "mouseup", this._onMouseUp);
    }
  };

  this._calcMouse = function (e) {
    this.mouse.x = e.pageX - this._offset.left;
    this.mouse.y = e.pageY - this._offset.top;
  };

  this._checkCursor = function () {
    var i, observer,
        num = this._evented.length,
        cursor = this.cursor;
    for (i = 0; i < num; i += 1) {
      observer = this._evented[i];
      if (this._mouseIsOver(observer.target)) {
        cursor = observer.target.cursor || "pointer";
        if (observer.isOver === false && typeof observer.over !== "undefined") {
          observer.over.callback.apply(observer.target, observer.over.args);
        }
        if (observer.isOver === false && typeof observer.mousemove !== "undefined") {
          observer.mousemove.callback.apply(observer.target, observer.over.args);
        }
        observer.isOver = true;
      } else {
        if (observer.isOver === true && typeof observer.out !== "undefined") {
          observer.out.callback.apply(observer.target, observer.out.args);
        }
        observer.isOver = false;
      }
    }
    this.strap.css("cursor", cursor);
  };

  this._getObserver = function (target) {
    var i, num = this._evented.length;
    for (i = 0; i < num; i += 1) {
      if (this._evented[i].target === target) {
        return this._evented[i];
      }
    }
  };

  this._mouseIsOver = function (targ) {
    if (!targ.visible) { return false; }

    // In the case of a special need for a target {x,y}, use the eventedX|Y
    // properties over globalX|Y
    var x = targ.eventedX || targ.globalX,
        y = targ.eventedY || targ.globalY,
        cx = targ.eventedCenterX || targ.centerX,
        cy = targ.eventedCenterY || targ.centerY,
        w = targ.eventedWidth || targ.width,
        h = targ.eventedHeight || targ.height;

    // Check if the this.mouse is within the bounds of the object
    if (this.mouse.x >= x - cx &&
        this.mouse.x <= x - cx + w &&
        this.mouse.y >= y - cy &&
        this.mouse.y <= y - cy + h)
    {
        return true;
    }
    return false;
  };

  this._onClick = function (e) {
    this._calcMouse(e);
    this._triggerMouseEvent("click");
  };

  this._onMouseDown = function (e) {
    this._calcMouse(e);
    this._triggerMouseEvent("mousedown", e);
  };

  this._onMouseMove = function (e) {
    this._calcMouse(e);
    this._checkCursor();
  };

  this._onMouseUp = function (e) {
    this._calcMouse(e);
    this._triggerMouseEvent("mouseup");
  };

  this._onTouchEnd = function (e) {
    this._triggerMouseEvent("mouseup");
    this._triggerMouseEvent("click");
  };

  this._onTouchMove = function (e) {
    var touch = e.touches.item(0);
    this.mouse.x = touch.clientX;
    this.mouse.y = touch.clientY;
  };

  this._onTouchStart = function (e) {
    var touch = e.touches.item(0);
    this.mouse.x = touch.clientX;
    this.mouse.y = touch.clientY;
    this._triggerMouseEvent("mousedown");
    this._triggerMouseEvent("touchstart", e);
  };

  this._removeEventedHandler = function (eventName, target) {
    var observer = this._getObserver(target);
    if (typeof observer === "undefined") {
      return;
    }

    if (typeof observer[eventName] !== "undefined") {
      delete observer[eventName];
    }

    // If all events are removed, delete the observer
    if (typeof observer.click === "undefined" && typeof observer.over === "unfeined" && typeof observer.out === "undefined") {
      var index = this._evented.indexOf(observer);
      if (index >= 0) {
        this._evented.splice(index, 1);
      }
    }
  };

  this._removeListeners = function () {
    this.removeObserver(this.canvas, "touchstart", this._onTouchStart);
    this.removeObserver(this.canvas, "touchmove", this._onTouchMove);
    this.removeObserver(this.canvas, "touchend", this._onTouchEnd);
    this.removeObserver(this.canvas, "click", this._onClick);
    this.removeObserver(this.canvas, "mousedown", this._onMouseDown);
    this.removeObserver(this.canvas, "mousemove", this._onMouseMove);
    this.removeObserver(this.canvas, "mouseup", this._onMouseUp);
  };

  this._triggerMouseEvent = function (state, evt) {
    var i, observer, targ,
        num = this._evented.length;
    for (i = num - 1; i > -1; i -= 1 ) {
      observer = this._evented[i];
      targ = observer.target;
      // Check if the mouse is within the bounds of the object
      if (typeof observer[state] !== "undefined" && this._mouseIsOver(targ)) {
        var args = Array.prototype.slice.call(observer[state].args);
        if (evt) {
          args = Array.prototype.concat.call(args, [evt]);
        }
        observer[state].callback.apply(observer.target, args);
        return;
      }
    }
  };

});

oak.extend(oak.canvas.Stage.prototype, { 
  
  _init: function (spec) {
    // Call super _init method
    oak.canvas.Display.prototype._init.call(this, spec);

    this.backgroundColor = spec.backgroundColor || "#FFF";
    this.opaque = spec.opaque || false;

    // Add mouse events to children of the stage
    var i, name,
        events = ["out", "over", "click", "mousedown", "mouseup", "mousemove"],
        eventedHelper = function (name) {
          return function (target, callback) {
            this._addEventedHandler(name, target, callback, Array.prototype.slice.call(arguments, 2));
          }; 
        },
        removeEventedHelper = function (name) {
          return function (target, callback) {
            this._removeEventedHandler(name, target);
          };
        };

    for (i = 0; i < events.length; i += 1) {
      name = events[i];
      this[name] = eventedHelper(name);
      this["remove" + name.charAt(0).toUpperCase() + name.slice(1)] = removeEventedHelper(name);
    }

    // If no id provided it create one and attempt to append it to a container 
    if (typeof spec.id === "string") {
      this.canvas = document.getElementById(spec.id);
    } else if (typeof spec.el !== "undefined" && oak.isNode(spec.el)) {
      this.canvas = spec.el; 
    } else if (typeof spec.container !== "undefined" && oak.isStrap(spec.container)) {
      this.canvas = document.createElement("canvas"); 
      spec.container.append(this.canvas);
    }

    this.ctx = this.canvas.getContext("2d");
    this.strap = oak.strap(this.canvas);

    this._addListeners();
    this.pixelReady();

    oak.canvas.renderer.addResizable(this);
  },

  /**
   * Adds a Display item to the stage's display list.
   * @method addChild
   * @memberof Stage
   * @access public
   * @instance
   * @param {oak.canvas.Display} child The child to add to the stage's children stack. 
   */
  addChild: function (child) {
    child.setStage(this);
    oak.canvas.Display.prototype.addChild.call(this, child);
  },

  /**
   * Adds a Display item to the stage's display list at a specific index.
   * @method addChildAt
   * @memberof Stage
   * @access public
   * @instance
   * @param {oak.canvas.Display} child The child to add to the stage's display list.
   * @param {number} index The position in the display list to add the child at.
   */
  addChildAt: function (child, i) {
    child.setStage(this);
    oak.canvas.Display.prototype.addChildAt.call(this, child, i);
  },

  /**
   * Adds a callback that get's called when a Display item is clicked.
   * @method click 
   * @memberof Stage
   * @access public
   * @instance
   * @param {oak.canvas.Display} target The Display item to track for the click event.
   * @param {function} callback The function to call when the target is clicked.
   */
  click: function (target, callback) {
    this._addEventedHandler("click", target, callback, Array.prototype.slice.call(arguments, 2));
  },

  /**
   * Disables all mouse events on the stage.
   * @method disable 
   * @memberof Stage
   * @access public
   * @instance
   */
  disable: function () {
    this._removeListeners();
    this.strap.css("cursor", "auto");
  },

  /**
   * Enables all mouse events on the stage.
   * @method enable 
   * @memberof Stage
   * @access public
   * @instance
   */
  enable: function () {
    this._addListeners();
  },

  /**
   * Runs through the render cycle of the stage. This get's called on every frame when the stage is added to the renderer.
   * @method frame 
   * @memberof Stage
   * @access public
   * @instance
   */
  frame: function () {
    // Clear the stage
    if (this.opaque) {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Render everything onto the stage
    this.render(this.ctx);
  },

  mousedown: function (target, callback) {
    this._addEventedHandler("mousedown", target, callback, Array.prototype.slice.call(arguments, 2));
  },

  mouseup: function (target, callback) {
    this._addEventedHandler("mouseup", target, callback, Array.prototype.slice.call(arguments, 2));
  },

  /**
   * Adds a callback that get's called when the mouse moves out of a Display item.
   * @method out 
   * @memberof Stage
   * @access public
   * @instance
   * @param {oak.canvas.Display} target The Display item to track for the click event.
   * @param {function} callback The function to call when the target is clicked.
   */
  out: function (target, callback) {
    this._addEventedHandler("out", target, callback, Array.prototype.slice.call(arguments, 2));
  },

  /**
   * Adds a callback that get's called when the mouse moves over of a Display item.
   * @method over 
   * @memberof Stage
   * @access public
   * @instance
   * @param {oak.canvas.Display} target The Display item to track for the click event.
   * @param {function} callback The function to call when the target is clicked.
   */
  over: function (target, callback) {
    this._addEventedHandler("over", target, callback, Array.prototype.slice.call(arguments, 2));
  },

  /**
   * Scales the canvas for proper pixel rendering for retina and non-retina devices.
   * @method pixelReady 
   * @memberof Stage
   * @access public
   * @instance
   */
  pixelReady: function () {
    // Subtract 1 pixel from the width
    // WHY?
    // Landscape view on iPad retina takes a huge hit if not. See this link...
    // http://www.scirra.com/forum/retina-ios-performance-problem-fix-please-test_topic58742.html
    this.canvas.height = this.height * oak.canvas.renderer.deviceBackingRatio;
    if (oak.canvas.renderer.deviceBackingRatio > 1) {
      this.canvas.width = this.width * oak.canvas.renderer.deviceBackingRatio - 1;
    } else {
      this.canvas.width = this.width * oak.canvas.renderer.deviceBackingRatio;
    }
    this.canvas.style.height = this.height + "px";
    this.canvas.style.width = this.width + "px";
    
    this.ctx.scale(oak.canvas.renderer.deviceBackingRatio, oak.canvas.renderer.deviceBackingRatio);
    return this;
  },

  /**
   * Removes a Display item from the this._evented list. The item passed to this method will no longer receive mouse event callbacks.
   * @method removeEvented 
   * @memberof Stage
   * @access public
   * @instance
   * @param {oak.canvas.Display} target The Display item to remove from the evnted list.
   */
  removeEvented: function (target) {
    var self = this;
    this._evented.forEach(function (e, i) {
      if (e.target === target) {
        self._evented.splice(i, 1);
      }
    });
  },
  
  resize: function () {
    this._offset = this.strap.offset();
  },

  /**
   * Sets the index of an item in the children array.
   * @method setChildIndex 
   * @memberof Stage
   * @access public
   * @instance
   * @param {oak.canvas.Display} target The child who's index you want to set.
   * @param {number} index The index to move the target to in the children array.
   */
  setChildIndex: function (child, i) {
    var oldIndex = this.children.indexOf(child);
    if (oldIndex >= 0) {
      this.children.splice(oldIndex, 1);
      this.children.splice(i, 0, child);
      child.index = i;
      return i;
    }
    return -1;
  },

  touchstart: function (target, callback) {
    this._addEventedHandler("touchstart", target, callback, Array.prototype.slice.call(arguments, 2));
  }

});

oak.canvas.Stage.prototype.defaults({
  cursor: "default"
});
