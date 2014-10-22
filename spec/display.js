"use strict";

describe("display", function () {

  it("defined", function () {
    expect(oak.canvas.Display).toBeDefined();
  });

  describe("add child methods", function () {
    var myChild = new oak.canvas.Display(); 
    it("adds child", function () {
      var myParent = new oak.canvas.Display();
      myParent.addChild(myChild);
      expect(myParent.children[0]).toBe(myChild);
    });

    it("adds child at", function () {
      var myParent = new oak.canvas.Display();
      myParent.addChild(new oak.canvas.Display());

      myParent.addChildAt(myChild, 0);
      expect(myParent.children[0]).toBe(myChild);
    });
  });

  describe("removal methods", function () {

    var myChild, myParent;
    beforeEach(function () {
      myChild = new oak.canvas.Display(); 
      myParent = new oak.canvas.Display();
    });

    it("removes child", function () {
      myParent.addChild(myChild);
      myParent.removeChild(myChild);
      expect(myParent.numChildren).toBe(0);
    });

    it("removed gets called", function () {
      var called = false;
      myChild.removed = function () {
        called = true;
      };

      myParent.addChild(myChild);
      myParent.removeChild(myChild);

      expect(called).toBe(true);
    });
  });

});
