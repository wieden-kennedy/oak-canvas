"use strict";

describe("stage", function () {

  var el = document.createElement("canvas"),
      child = new oak.canvas.Display(),
      stage = new oak.canvas.Stage({el: el});

  it("defined", function () {
    expect(oak.canvas.Stage).toBeDefined();
  });

  describe("add child functions", function () {

    beforeEach(function () {
      stage.addChild(child);
    });
    
    afterEach(function () {
      while (stage.numChildren) {
        stage.removeChild(stage.removeChild(stage.children[0]));
      }
    });

    it("sets numchildren", function () {
      expect(stage.numChildren).toBe(1);
    });

    it("adds child", function () {
      expect(stage.addChild).toBeDefined();
      expect(stage.numChildren).toBe(1);
      expect(stage.children[0]).toBe(child);
    });

    it("adds child at", function () {
      expect(stage.addChildAt).toBeDefined();

      var myDisplay = new oak.canvas.Display();

      stage.addChild(new oak.canvas.Display());
      stage.addChild(new oak.canvas.Display());
      stage.addChildAt(myDisplay, 1);

      expect(stage.numChildren).toBe(4);
      expect(stage.children[1]).toBe(myDisplay);
    });

  });

  describe("removes child functions", function () {
    beforeEach(function () {
      stage.addChild(child);
    });
    
    afterEach(function () {
      while (stage.numChildren) {
        stage.removeChild(stage.removeChild(stage.children[0]));
      }
    });

    it("removes child", function () {
      stage.removeChild(child);

      expect(stage.numChildren).toBe(0);
      expect(stage.children.length).toBe(0);
    });

  });

  describe("set index functions", function () {
    beforeEach(function () {
      stage.addChild(child);
    });

    it("sets child index", function () {
      expect(stage.setChildIndex).toBeDefined();
      
      var foo = new oak.canvas.Display();
      stage.addChild(foo);

      stage.setChildIndex(foo, 0);
      expect(stage.children[0]).toBe(foo);
    });

  });

});
