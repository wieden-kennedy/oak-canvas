"use strict";

describe("image", function () {

  it ("is defined", function () {
    expect(oak.canvas.Image).toBeDefined();
  });

  describe ("image loading", function () {
    var triggered = false,
        image = new oak.canvas.Image();

    image.load("src/canvas/spec/img/350x150.gif");

    image.once("loaded", function () {
      triggered = true;
    });

    waitsFor(function () {
      return image.loaded;
    }, "Image never loaded", 100);

    it("loads", function () {
      expect(image.loaded).toBe(true);
    });

    it("sets dimensions", function () {
      expect(image.nativeWidth).toBe(350);
      expect(image.nativeHeight).toBe(150);
      expect(image.width).toBe(350);
      expect(image.height).toBe(150);
    });

    it("triggers loaded", function () {
      expect(triggered).toBe(true);
    });

  });

});
