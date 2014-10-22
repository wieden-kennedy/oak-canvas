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
