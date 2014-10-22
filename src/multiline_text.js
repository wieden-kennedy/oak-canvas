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
