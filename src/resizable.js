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
