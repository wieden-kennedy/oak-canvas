"use strict";

describe("renderer", function () {

  it("defined", function () {
    expect(oak.canvas.renderer).toBeDefined();
  });

  describe("frame function", function () {

    beforeEach(function () {
    });

    afterEach(function () {
      oak.canvas.renderer.currentState = undefined;
    });

    it("startsup", function () {
      expect(oak.canvas.renderer.startup).toBeDefined();
      oak.canvas.renderer.startup();
      expect(oak.canvas.renderer.currentState).toBe("startup");
    });

    it("sets states", function () {
      var called = false;

      oak.canvas.renderer.states = {
        onStartup: function () {
          called = true;
        }
      };

      oak.canvas.renderer.startup();

      expect(oak.canvas.renderer.states.onStartup).toBeDefined();
      expect(oak.canvas.renderer.currentState).toBe("startup");

      expect(called).toBe(true);
    });

    describe("stack functions", function () {
      var Foo = function() {
        this.numCalls = 0;
        this.frame = function() {
          this.numCalls += 1;
        };
      };
      var foo = new Foo();

      it("adds to stack", function () {
        oak.canvas.renderer.addToStack(foo);
        oak.canvas.renderer.draw();

        expect(foo.numCalls).toBe(1);
      });

      it("removes from stack", function () {
        oak.canvas.renderer.removeFromStack(foo);
        oak.canvas.renderer.draw();

        expect(foo.numCalls).toBe(1);
      });
    });

  });

});
