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
