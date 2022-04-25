import assert from "assert";
import { flatPromiseProxy } from "./index.mjs";

describe("flatPromiseProxy", () => {
  describe("object", () => {
    it("target is an object", () => {
      const proxy = flatPromiseProxy({ foo: "bar" });
      assert.deepEqual(proxy, { foo: "bar" });
      assert.deepEqual(proxy.foo, "bar");
    });

    it("target is a function that returns an object", () => {
      const proxy = flatPromiseProxy(() => ({ foo: "bar" }));
      assert.deepEqual(proxy(), { foo: "bar" });
      assert.deepEqual(proxy().foo, "bar");
    });

    it("target is a promise that resolves to an object", async () => {
      const proxy = flatPromiseProxy(Promise.resolve({ foo: "bar" }));
      assert.deepEqual(await proxy, { foo: "bar" });
      assert.deepEqual(await proxy.foo, "bar");
    });
  });

  describe("function", () => {
    it("target is a function", () => {
      const proxy = flatPromiseProxy(() => "value");
      assert.deepEqual(proxy(), "value");
    });

    it("target is a promise that resolves to a function", async () => {
      const proxy = flatPromiseProxy(Promise.resolve(() => "value"));
      assert.deepEqual(await proxy(), "value");
    });

    it("target is a promise that resolves to an object that resolves to a function", async () => {
      const proxy = flatPromiseProxy(
        Promise.resolve({ foo: () => Promise.resolve("bar") })
      );
      assert.deepEqual(await proxy.foo(), "bar");
    });
  });

  describe("promise", () => {
    it("target is a promise that resolves to a primitive", async () => {
      const proxy = flatPromiseProxy(Promise.resolve(3));
      assert.deepEqual(await proxy, 3);
    });

    it("target is an object with a prop that resolves to a promise that resolves to an object", async () => {
      const proxy = flatPromiseProxy({
        foo: Promise.resolve({
          fizz: "buzz",
        }),
      });
      assert.deepEqual(await proxy.foo.fizz, "buzz");
    });

    it("target is an object with a method that resolves to a promise that resolves to an object", async () => {
      const proxy = flatPromiseProxy({
        foo: () =>
          Promise.resolve({
            fizz: "buzz",
          }),
      });
      assert.deepEqual(await proxy.foo().fizz, "buzz");
    });

    it("target is promise that resolves to an object with a method that resolves to a promise that resolves to an object", async () => {
      const proxy = flatPromiseProxy(
        Promise.resolve({
          foo: () =>
            Promise.resolve({
              fizz: "buzz",
            }),
        })
      );
      assert.deepEqual(await proxy.foo(), {
        fizz: "buzz",
      });
      assert.deepEqual(await proxy.foo().fizz, "buzz");
    });
  });

  describe("arrays", () => {
    it("target is an array without promise items", () => {
      const proxy = flatPromiseProxy([1, 2, 3]);
      const transformedProxy = proxy.map((x) => 2 * x);
      assert.deepEqual(transformedProxy, [2, 4, 6]);
    });

    it("mapping an array with promise items", async () => {
      const proxy = flatPromiseProxy([1, Promise.resolve(2), 3]);
      const transformedProxy = await proxy.map((x) => 2 * x);
      assert.deepEqual(transformedProxy, [2, 4, 6]);
    });

    it("filtering an array with promise items", async () => {
      const proxy = flatPromiseProxy([
        1,
        Promise.resolve(2),
        Promise.resolve(3),
      ]);
      const transformedProxy = await proxy.filter((x) => x % 2 !== 0);
      assert.deepEqual(transformedProxy, [1, 3]);
    });

    it("target is a promise that resolves to an array", async () => {
      const proxy = flatPromiseProxy(
        Promise.resolve([1, Promise.resolve(2), Promise.resolve(3)])
      );
      const transformedProxy = await proxy.filter((x) => x % 2 !== 0);
      assert.deepEqual(transformedProxy, [1, 3]);
    });
  });

  describe("rejections", () => {
    it("target is a promise that rejects", async () => {
      const proxy = flatPromiseProxy(Promise.reject("error"));
      assert.deepEqual(await proxy.foo.catch((error) => error), "error");
    });

    it("accessing to a not existent prop", async () => {
      const proxy = flatPromiseProxy(Promise.resolve({}));
      const error = await proxy.foo.bar.catch((e) => e);
      return assert.equal(
        error.message,
        "Cannot read properties of undefined (reading 'bar')"
      );
    });

    it("calling not callable method", async () => {
      const proxy = flatPromiseProxy(Promise.resolve({ foo: "bar" }));
      const error = await proxy.foo().catch((e) => e);
      return assert.equal(error.message.includes("is not a function"), true);
    });
  });
});
