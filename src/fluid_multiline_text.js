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


