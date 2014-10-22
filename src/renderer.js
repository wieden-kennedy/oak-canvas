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
          oak.tweener.update();

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

        oak.tweener.resume();
        oak.raf(this.draw);
        this.trigger("rendererResumed");
      } else {
        oak.tweener.pause();
        this.trigger("rendererPaused");
      }
    };
  });

  oak.canvas.renderer = new Renderer();
}());
