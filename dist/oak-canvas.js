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
 * The bread and butter of the oak.canvas library. This is the engine.
 * It is responsible for running the requestAnimationFrame process, updating the tween engine, running requestAnimtionFrame
 * based timers and pausing  it all when the window loses focus. There should only be a single instance of the Renderer 
 * class in your project. There is no need to instantiate the renderer, there is a global instance that is created by oak 
 * and assigned to the oak.canvas.renderer variable. 
 * 
 * Fire up the oak sandbox and hit http://localhost:3000/canvas for a great working example
 *
 * @class Renderer 
 * @example
 * // First we'll create a stage to add to the renderer
 * var stage = new oak.canvas.Stage({
 *   id: "game-stage",
 *   opaque: true,
 *   backgroundColor: "#000",
 *   width: 1200,
 *   height: 700
 * });
 *
 * // Now add the stage to the renderer stack.
 * // This will call the stages frame function on every requestAnimationFrame call.
 * oak.canvas.renderer.addToStack(stage);
 * oak.canvas.renderer.startup();
 */
oak.canvas = oak.canvas || {};
(function () {

  var Renderer = inherit(oak.Statable, function () {
    if (!oak.support.canvas) { return; }

    this._numResizables = 0;
    this._numInStack = 0;
    this._numScenes = 0;
    this._numTimers = 0;
    this._calls = [];
    this._resizables = [];
    this._stack = [];
    this._timers = [];

    this.paused = false;
    // Defines padding to subtract from the width and height variables on resizable callbacks
    this.windowPadding = {left: 0, right: 0, top: 0, bottom: 0};

    /**
     * Difference in time between the current frame and last executed frame.
     * Used to counter fps differences using requestAnimatioFrame
     * Use to make value relative to the running frames per second which is
     * inconsistent across browsers and devices and is completely dependent on performance. 
     * @example
     * // To accurately move something 10 pixels every frame we need to multiply
     * // 10 by the renderer delta to determine how far it needs to move for that
     * // specific frame...
     * this.x += 10 * oak.canvas.renderer.delta
     * @property {number} defaults - 0
     * @memberof Renderer 
     */
    this.delta = 0;

     /**
     * Normalized device backing ratio of the device. Will be 1 or 2.
     * This is required because some devices have ratios such as 1.25 that cause issues with scaling. 
     * @property {number} defaults - 1
     * @memberof Renderer 
     */
    this.deviceBackingRatio = (oak.support.deviceBackingRatio >= 2) ? 2 : 1;
   
    /**
     * Realtime frames per second that the renderer is running at. Updated on every frame.
     * @property {number} defaults - 0
     * @memberof Renderer 
     */ 
    this.fps = 0;
    
    /**
     * Framerate for the renderer.
     * @property {number} defaults - 30
     * @memberof Renderer 
     */
    this.frameRate = 30;

    /**
     * Canvas pixel ratio. Either 1 or 2. 
     * @property {number} defaults - 1
     * @memberof Renderer 
     */
    this.pixelRatio = (oak.support.pixelRatio >= 2) ? 2 : 1;

    this._init = function() {
      this._hiddenPrefix = "hidden";
      // Listen for document hidden event
      if (this._hiddenPrefix in document) {
        document.addEventListener("visibilitychange", this._onVisibility);
      } else if ((this._hiddenPrefix = "mozHidden") in document) {
        document.addEventListener("mozvisibilitychange", this._onVisibility);
      } else if ((this._hiddenPrefix = "webkitHidden") in document) {
        document.addEventListener("webkitvisibilitychange", this._onVisibility);
      } else if ((this._hiddenPrefix = "msHidden") in document) {
        document.addEventListener("msvisibilitychange", this._onVisibility);
      // IE 9 and lower:
      } else if ("onfocusin" in document) {
        document.onfocusin = document.onfocusout = this._onVisibility;
      // All others:
      } else {
        window.onpageshow = window.onpagehide = window.onfocus = window.onblur = this._onVisibility;
      }
    };

    // TODO Test
    // TODO make this throttled using RAF
    this._onResize = function () {
      var i;
      for (i = 0; i < this._numResizables; i += 1) {
        this.getWindowBounds();
        this._resizables[i].resize.call(this._resizables[i], this.getWindowBounds());
      }
    }.bind(this);

    this.getWindowBounds = function () {
      var bounds = {
        top: this.windowPadding.top,
        left: this.windowPadding.left,
        width: window.innerWidth - (this.windowPadding.left + this.windowPadding.right), 
        height: window.innerHeight - (this.windowPadding.top + this.windowPadding.bottom) 
      };
      bounds.bottom = this.windowPadding.top + bounds.height;
      bounds.right = this.windowPadding.left + bounds.width;

      return bounds; 
    };

    // Tracks page visibility
    // I.e. when a different tab i sactive
    this._onVisibility = function (e) {
      e = e || window.event;
      // Update this._time so stage.delta doesn't turn into a giant number when the page loses focus
      this._time = new Date().getTime();
      var 
        stateMap = {
          focus: "visible",
          focusin: "visible",
          pageshow: "visible",
          blur: "hidden",
          focusout: "hidden",
          pagehide: "hidden"
        },
        state = stateMap[e.type];

      state = (typeof state !== "undefined") ? state : document[this._hiddenPrefix] ? "hidden" : "visible";
      if (state === "hidden") {
        oak.canvas.renderer.toggle(true);
      } else if (state === "visible") {
        // Give it a timeout otherwise the Date variable gets funky 
        setTimeout(function () {
          oak.canvas.renderer.toggle(false);
        }, 100);
      }
      oak.canvas.renderer.trigger("visibility", state);
    }.bind(this);

    this.addResizable = function (val) {
      this._resizables.push(val);
      this._numResizables = this._resizables.length;
      val.resize.call(val, this.getWindowBounds());
    };

    /**
     * Add and item to be called on every frame. As long as the item is an object and has a method called frame
     * it can be added to the render call stack through the addToStack function. 
     * @memberof Renderer 
     * @method addToStack 
     * @access public
     * @instance
     * @param {object} val The object with the frame method 
     */
    this.addToStack = function (val) {
      this._stack.push(val);
      this._numInStack = this._stack.length;
    };

    /**
     * Queue a function to be called on the next draw cycle
     * @memberof Renderer 
     * @method callLater 
     * @access public
     * @instance
     * @param {function} callback The function to call 
     * @param {array} array Arguments to pass into the callback 
     * @param {object} scope Options scope to apply when calling the callback function 
     */
    this.callLater = function (callback, args, scope) {
      this._calls.push({callback: callback, args: args, scope: (scope || null)});
    };

    /**
     * Cancel a timer created using the renderer timeout function 
     * @memberof Renderer 
     * @method cancelTimeout 
     * @access public
     * @instance
     * @param {object} timer The timer instance to cancel 
     */
    this.cancelTimeout = function (timer) {
      var index = this._timers.indexOf(timer);
      if (index !== -1) {
        this._timers.splice(index, 1);
        this._numTimers = this._timers.length;
        return true;
      }
      return false;
    };

    this.draw = function () {
      var 
          call, i, timer,
          now = new Date().getTime();

      this._dt = now - (this._time || now);

      // 30 fps
      this.delta = this._dt/this.frameRate;
      this._time = now;

      // FRAME RATE 
      this.fps = Math.round(1/(this._dt/1000));

      for (i = 0; i < this._calls.length; i += 1)  {
        call = this._calls[i];
        call.callback.apply(call.scope, call.args);
      }
      this._calls.length = 0;
      if (this.paused === false) {
        oak.raf(this.draw);
        //this.delta = (this.delta <= 0) ? 1 : this.delta;
        if (this.delta < 160) {
          for (i = 0; i < this._numInStack; i += 1) {
            this._stack[i].frame.call(this._stack[i]);
          }

          var timeInc = this.frameRate * this.delta;
          for (i = 0; i < this._numTimers; i += 1) {
            timer = this._timers[i];
            timer.time += timeInc;

            if (timer.time >= timer.delay) {
              this._timers.splice(i, 1);
              this._numTimers = this._timers.length;
              timer.callback.apply(timer.scope, timer.args);
              i -= 1;
            }
          }
        }
      }
    }.bind(this);

    /**
     * Measures text on a dummy canvas
     * @method measureText 
     * @memberof Renderer 
     * @access public
     * @instance
     * @param {string} text The string of text to measure 
     * @param {string} font The font to use for measuring 
     */
    this.measureText = function (text, font) {
      if (typeof font !== "undefined" && oak._dummyCtx.font !== font) {
        oak._dummyCtx.font = font; 
      }
      return oak._dummyCtx.measureText(text); 
    };

    // TODO Test 
    this.removeResizable = function (val) {
      var i = this._resizables.indexOf(val);
      if (i >= 0) {
        this._resizables.splice(i, 1);
        this._numResizables = this._resizables.length;
      }
    };

    /**
     * Remove an obejct from the render call stack.
     * @memberof Renderer 
     * @method removeFromStack 
     * @access public
     * @instance
     * @param {object} val The object in the stack 
     */
    this.removeFromStack = function (val) {
      var i = this._stack.indexOf(val);
      if (i >= 0) {
        this._stack.splice(i, 1);
        this._numInStack = this._stack.length;
      }
    };
    
    /**
     * Start the renderer. Start the requestAnimationFrame loop, adds a "loaded" class to the document body and sets the
     * renderers state to "startup". 
     * @memberof Renderer 
     * @method startup 
     * @access public
     * @instance
     */
    this.startup = function () {
      window.addEventListener("resize", this._onResize);
      // Allow to trigger resize events on renderer
      this.on("resize", this._onResize);

      var bodyStrap = oak.strap("body");
      bodyStrap
        .removeClass("preload")
        .addClass("loaded");

      oak.raf(this.draw);
      this.setState("startup");
    };
    
    /**
     * Add a timer that runs based on requestAnimationFrame. The timer will pause when the window loses focus.
     * @memberof Renderer 
     * @method timeout 
     * @access public
     * @instance
     * @param {function} callback The function to call when timer completes 
     * @param {number} delay How long to wait until the callback is called
     * @param {object} scope Optional scope for the callback 
     * @param {array} args Optional array of arguments to be passed to the callback
     * @example
     * oak.canvas.renderer.timeout(function (message) {
     *   console.log(message);
     * }, 2000, this, ["hello world"]);
     */
    this.timeout = function (callback, delay, scope, args) {
      var timer = {
        time: 0,
        delay: delay,
        callback: callback,
        scope: scope || null,
        args: oak._arrProto.slice.call(arguments, 3)
      };

      /*
       * Make sure it doesn't get looped through until the next draw cycle, otherwise we run into issues
       * with the timer firing before a full render cycle has run 
       */
      var self = this;
      this.callLater(function (timer) {
        self._timers.push(timer);
        self._numTimers = self._timers.length;
      }, [timer]);

      return timer;
    };

    /**
     * Pause and resume the renderer. 
     * @memberof Renderer 
     * @method toggle 
     * @access public
     * @instance
     * @param {boolean} pause If true, the renderer will pause, if false, it will resume 
     * @example
     * oak.canvas.renderer.pause(true); 
     */
    this.toggle = function (pause) {
      this.paused = pause;
      if (this.paused === false) {
        // Update this._time so stage.delta doesn't turn into a giant number when the page loses focus
        this._time = new Date().getTime();

        oak.raf(this.draw);
        this.trigger("rendererResumed");
      } else {
        this.trigger("rendererPaused");
      }
    };
  });

  oak.canvas.renderer = new Renderer();
}());

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

// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 


oak.canvas.Camera = function () {
}.inherit(oak.Base, {
  x: 0,
  y: 0
});

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

// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 

"use strict";

oak.canvas.TextField = function () {
}.inherit(oak.canvas.Text, {

  draw: function (ctx) {
    oak.canvas.Text.prototype.draw.call(this, ctx);
    ctx.fillText(this.label, 0, 0);
  }

});

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
 *
 */
oak.canvas.Sequence = function () {

}.inherit(oak.canvas.Sheet, {

  _init: function (spec) {
    oak.canvas.Sheet.prototype._init.call(this, spec);

    // If frames are in spec use them, otherwise create default frames
    // based on dimensions
    if (this.frames.length) {
      this.numFrames = this.frames.length;
    } else {
      this.numFrames = Math.round(this.source.height/this.height);
      var i, col = 0, numCols = Math.round(this.source.width/this.width), row = 0;
      for (i = 0; i < this.numFrames; i += 1) {
        this.frames.push({
          width: this.width,
          height: this.height,
          x: this.width * col,
          y: this.height * row,
          deltaX: 0,
          deltaY: 0
        });
        col += 1;
        if (col > numCols - 1) {
          col = 0;
          row += 1;
        }
      }
    }

    this.startFrame = oak.defined(spec.startFrame) ? spec.startFrame : 0;
    this.endFrame = oak.defined(spec.endFrame) ? spec.endFrame : this.numFrames - 1;

    this.gotoFrame(this.frameIndex);
    if (this.autoplay === true) {
      this.play(this.startFrame, this.endFrame);
    }
    return this;
  },

  gotoFrame: function (i) {
    this.frameIndex = i;
    this.frame = this.frames[i];
    this.cropX = this.frame.x * oak.canvas.renderer.pixelRatio;
    this.cropY = this.frame.y * oak.canvas.renderer.pixelRatio;
    this.cropWidth = this.frame.width * oak.canvas.renderer.pixelRatio;
    this.cropHeight = this.frame.height * oak.canvas.renderer.pixelRatio;
    this.width = this.frame.width;
    this.height = this.frame.height;
  },

  draw: function (ctx) {
    if (this.isSnake) {
    }
    if (this.playing === true) {
      this.count += 1 * oak.canvas.renderer.delta;
      if (this.count >= this.countMax) {

        // If it's at the end of the sequence 
        if (this.dir === 1 && this.frameIndex >= this.endFrame || this.dir === -1 && this.frameIndex <= this.endFrame) {
          // If playing a yoyo sequence (back and forth animation) 
          if (this.yoyo === true) {
            // Swap this.directions
            this.dir *= -1;
            this.frameIndex += this.dir;

            // Swap start and end frames
            var start = this.startFrame;
            this.startFrame = this.endFrame;
            this.endFrame = start;
          }
          
          // If looping to a specific number
          if (this.loops > 0 && this.loop < this.loops && this.dir === 1) {
            if (this.yoyo === false) {
              this.frameIndex = this.startFrame;
            }
            this.loop += 1;
          // If loop infinitely
          } else if (this.loops < 0 && this.yoyo === false) {
            this.frameIndex = this.startFrame;
          } else if (this.dir === 1) {
            this.trigger("complete");
            this.playing = false;
          }
        } else {
          this.frameIndex += this.dir;
        }
        this.count = 0;
        this.gotoFrame(this.frameIndex);
      }
    }

    oak.canvas.Sheet.prototype.draw.call(this, ctx, this.frame.deltaX || 0, this.frame.deltaY || 0); 
  },

  // isVisible
  // ---------
  // Returns if the current frame of the sequence is visible on the stage 
  // given the global x,y coordinates and the width and height of the frame 
  isVisible: function () {
    this.bounds.left = this.globalX - this.centerX + this.frame.deltaX;
    this.bounds.right = this.globalX - this.centerX + this.frame.width + this.frame.deltaX;
    this.bounds.top = this.globalY - this.centerY + this.frame.deltaY;
    this.bounds.bottom = this.globalY - this.centerY + this.frame.height + this.frame.deltaY;
    if (this.bounds.bottom < 0 || this.bounds.top  > this.stage.height || this.bounds.right < 0 || this.bounds.left > this.stage.width) { 
      return false;
    }
    return true;
  },

  // play 
  // ----
  // @params
  // loothis.stage.width, this.stage.heightps - The number of times to loop the animation. Default is -1, infinite loops.
  // fps - The number frames to play per second.
  // startFrame - The frame to start on.
  // endFrame - The frame to end on
  play: function (start, end, fps, loops) {
    if (oak.defined(fps)) {
      this.fps = fps;
    }
    if (oak.defined(loops)) {
      this.loops = loops;
    }
    this.dir = (start > end) ? -1 : 1;
    this.loop = 0;
    this.count = 0;
    this.countMax = Math.round(oak.canvas.renderer.frameRate/this.fps);
    this.startFrame = start;
    this.endFrame = end;
    this.playing = true;
    this.gotoFrame(start);
  }

});

oak.canvas.Sequence.prototype.defaults({
  autoplay: false,
  count: 0,
  dir: 1,
  fps: 15,
  frames: [],
  frameIndex: 0,
  loop: 0,
  loops: -1,
  playing: false,
  yoyo: false
});

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



// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 

"use strict";

oak.canvas.Resizable = function () {

}.inherit(oak.canvas.Sprite, {

  addedToStage: function () {
    oak.canvas.renderer.addResizable(this);
  },
  
  removed: function () {
    oak.canvas.renderer.removeResizable(this);
  },

  resize: function (bounds) {
    // Resize all the children
    var child, i;
    for (i = 0; i < this.numChildren; i += 1) {
      child = this.children[i];
      if (typeof child.resize === "function") {
        child.resize(bounds);
      }
    }
  }

});

// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 


oak.canvas.MultilineText = function () {

}.inherit(oak.canvas.Text, {
  _init: function (spec) {
    this._width = 0;
    oak.canvas.Text.prototype._init.call(this, spec);

    this._initSize = this.size;
    this._initWidth = this.width;
    this._lines = [];

    if (typeof this.lineHeight === "undefined") {
      this.lineHeight = this.size;
    }
    this._inited = true;
    this.width = spec.width;
  },
  _calcSize: function (w) {
    var widthDiff = this._initWidth - (w - this.padding);
    this.size = this._initSize - (this._initSize/this._initWidth) * widthDiff; 
    this.resetStyle();
  },
  _resize: function (width) {
    var i, match,
        re = /[^\S]([\S]*$)/,
        chars = "",
        w = 0,
        maxW = width - (this.padding.left + this.padding.right);

    this._lines = [];
    this._chars = this.label.split('');
    for (i = 0; i < this._chars.length; i += 1) {
      chars += this._chars[i];
      w = oak.canvas.renderer.measureText(chars, this.style).width;
      // Detect new line char
      if (this._chars[i].match(/\n/)) {
        this._lines.push(chars);
        chars = "";
        w = 0;
      } else if (maxW > 0 && w > maxW) {
        match = chars.match(re);

        if (match && match[1]) {
          chars = chars.replace(re, "");
          this._lines.push(chars);
          chars = match[1];
        } else {
          this._lines.push(chars);
          chars = "";
        }
        w = 0;
      } else if (i == this._chars.length - 1) {
        this._lines.push(chars);
      }
    }
    this.height = this._lines.length * this.lineHeight;
  },
  draw: function (ctx) {
    oak.canvas.Text.prototype.draw.call(this, ctx);
    var i,
        ypos = this.padding.top;
    for (i = 0; i < this._lines.length; i += 1) {
      ctx.fillText(this._lines[i], 0, ypos);
      ypos += this.lineHeight;

    }
  }
});

Object.defineProperty(oak.canvas.MultilineText.prototype, "width", {
  get: function width () {
    return this._width;
  },
  set: function width (val) {
    if (!this._inited) { return; }
    this._width = val;
    this._resize(this._width);
    //oak.canvas.renderer.callLater(this._resize.bind(this), [this._width]);
  }
});

oak.canvas.MultilineText.prototype.defaults({
  padding: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  },
  size: 12,
  lineHeight: undefined,
  label: ""
});

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

// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 


oak.canvas.FluidText = function () {

}.inherit(oak.canvas.Text, {
  _init: function (spec) {
    oak.canvas.Text.prototype._init.call(this, spec);

    this._initSize = this.size;
    this._initWidth = this.width;
  },
  _calcSize: function (w) {
    var widthDiff = this._initWidth - (w - this.padding);
    this.size = this._initSize - (this._initSize/this._initWidth) * widthDiff; 
    this.resetStyle();
  },
  resize: function (bounds) {
    if (bounds.width < this._initWidth + this.padding) {
      this._calcSize(bounds.width - this.padding);
    } else if (this.size !== this._initSize) {
      this.size = this._initSize;
      this.resetStyle();
    }
    if (this.centered === true) {
      this.centerX = this.width/2;
      //self.centerY = self.height/2;
    }
  },
  addedToStage: function () {
    oak.canvas.renderer.addResizable(this);
  },
  draw: function (ctx) {
    oak.canvas.Text.prototype.draw.call(this, ctx);
    ctx.fillText(this.label, 0, 0);
  },
  removed: function () {
    oak.canvas.renderer.removeResizable(this);
  }
});

oak.canvas.FluidText.prototype.defaults({
  centered: false,
  padding: 10,
  size: 12,
  label: ""
});

// Authors 
// ---
// Maxwell Folley  
// David Glivar  
//
// Copyright
// ---------
// 2014 W+K 


oak.canvas.FluidMultilineText = function () {

}.inherit(oak.canvas.MultilineText, {
  addedToStage: function () {
    oak.canvas.renderer.addResizable(this);
  },
  removed: function () {
    oak.canvas.renderer.removeResizable(this);
  },
  resize: function (bounds) {
    this.width = bounds.width - this.padding.left - this.padding.right;
  }
});



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
