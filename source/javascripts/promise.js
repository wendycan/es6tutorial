
function race(entries) {
  var Constructor = this;

  var promise = new Constructor(lib$es6$promise$$internal$$noop);

  if (!lib$es6$promise$utils$$isArray(entries)) {
    lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
    return promise;
  }

  var length = entries.length;

  function onFulfillment(value) {
    lib$es6$promise$$internal$$resolve(promise, value);
  }

  function onRejection(reason) {
    lib$es6$promise$$internal$$reject(promise, reason);
  }

  for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
    lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
  }

  return promise;
}
