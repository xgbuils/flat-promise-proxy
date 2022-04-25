const isPromise = (obj) => typeof obj.then === "function";
const isIterable = (obj) => obj && typeof obj[Symbol.iterator] === "function";

const set = () => {
  return true;
};
const bind = (target, prop) => {
  if (typeof target[prop] === "function") {
    return target[prop].bind(target);
  }
  return target[prop];
};

const promiseMethods = ["then", "catch", "finally"];

const promiseHandler = {
  get: (resolver, prop) => {
    const promise = resolver();
    if (promiseMethods.includes(prop)) {
      return functionProxy(bind(promise, prop));
    }
    const nextPromise = promise.then((target) =>
      flatPromiseProxy(bind(noPromiseProxy(target), prop))
    );
    return promiseProxy(() => nextPromise);
  },
  apply: (resolver, thisArg, args) => {
    return flatPromiseProxy(
      resolver().then((fn) => {
        return flatPromiseProxy(fn(...args));
      })
    );
  },
  set,
};

const promiseProxy = (resolver) => new Proxy(resolver, promiseHandler);

const objectHandler = {
  get: (target, prop) => {
    return flatPromiseProxy(bind(target, prop));
  },
  set,
};
const objectProxy = (value) => new Proxy(value, objectHandler);

const functionHandler = {
  apply: (target, thisArg, args) => {
    return flatPromiseProxy(target.apply(thisArg, args));
  },
  set,
};
const functionProxy = (fn) => {
  return new Proxy(fn, functionHandler);
};

const hasPromiseItem = (iterable) => {
  for (const item of iterable) {
    if (isPromise(item)) {
      return true;
    }
  }
  return false;
};

const iterableProxy = (iterable) => {
  if (hasPromiseItem(iterable)) {
    const nextPromise = Promise.all(iterable);
    return promiseProxy(() => nextPromise);
  }
  return objectProxy(iterable);
};

const noPromiseProxy = (value) => {
  if (typeof value === "function") {
    return functionProxy(value);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if (isIterable(value)) {
    return iterableProxy(value);
  }
  return objectProxy(value);
};

export const flatPromiseProxy = (value) => {
  if (typeof value === "function") {
    return functionProxy(value);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if (isIterable(value)) {
    return iterableProxy(value);
  }
  if (isPromise(value)) {
    return promiseProxy(() => value);
  }
  return objectProxy(value);
};
