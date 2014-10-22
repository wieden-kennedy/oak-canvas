"use strict";

describe("sprite", function () {

  var sprite = new oak.canvas.Sprite(),
      child = new oak.canvas.Display();

  it("defined", function () {
    expect(oak.canvas.Stage).toBeDefined();
  });

  describe("add child functions", function () {

    beforeEach(function () {
      sprite.addChild(child);
    });
    
    afterEach(function () {
      while (sprite.numChildren) {
        sprite.removeChild(sprite.removeChild(sprite.children[0]));
      }
    });

    it("sets numchildren", function () {
      expect(sprite.numChildren).toBe(1);
    });

    it("adds child", function () {
      expect(sprite.addChild).toBeDefined();
      expect(sprite.numChildren).toBe(1);
      expect(sprite.children[0]).toBe(child);
    });

    it("adds child at", function () {
      expect(sprite.addChildAt).toBeDefined();

      var myDisplay = new oak.canvas.Display();

      sprite.addChild(new oak.canvas.Display());
      sprite.addChild(new oak.canvas.Display());
      sprite.addChildAt(myDisplay, 1);

      expect(sprite.numChildren).toBe(4);
      expect(sprite.children[1]).toBe(myDisplay);
    });

  });

  describe("removes child functions", function () {
    beforeEach(function () {
      sprite.addChild(child);
    });
    
    afterEach(function () {
      while (sprite.numChildren) {
        sprite.removeChild(sprite.removeChild(sprite.children[0]));
      }
    });

    it("removes child", function () {
      sprite.removeChild(child);

      expect(sprite.numChildren).toBe(0);
      expect(sprite.children.length).toBe(0);
    });

  });

});
