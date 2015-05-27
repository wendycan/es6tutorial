var PENDING   = void 0;
var FULFILLED = 1;
var REJECTED  = 2;

var asap_len = 0;
var asap_vertxNext;
var asap_queue = new Array(1000);
var asap_toString = {}.toString;
var promise_counter = 0;

var asap_BrowserMutationObserver = window.MutationObserver || window.WebKitMutationObserver;
var GET_THEN_ERROR = new _ErrorObject();
var _TRY_CATCH_ERROR = new _ErrorObject();
var asap_scheduleFlush = asap_useMutationObserver();

function _noop() {}
function objectOrFunction(x) {
  return typeof x === 'function' || (typeof x === 'object' && x !== null);
}

function isFunction(x) {
  return typeof x === 'function';
}

function isMaybeThenable(x) {
  return typeof x === 'object' && x !== null;
}

function asap_default(callback, arg) {
  asap_queue[asap_len] = callback;
  asap_queue[asap_len + 1] = arg;
  asap_len += 2;
  if (asap_len === 2) {
    asap_scheduleFlush();
  }
}

function asap_useMutationObserver() {
  var iterations = 0;
  var observer = new asap_BrowserMutationObserver(asap_flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function() {
    node.data = (iterations = ++iterations % 2);
  };
}

function asap_flush() {
  for (var i = 0; i < asap_len; i+=2) {
    var callback = asap_queue[i];
    var arg = asap_queue[i+1];

    callback(arg);

    asap_queue[i] = undefined;
    asap_queue[i+1] = undefined;
  }

  asap_len = 0;
}

function _cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function _getThen(promise) {
  try {
    return promise.then;
  } catch(error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function _tryThen(then, value, fulfillmentHandler, rejectionHandler) {
  try {
    then.call(value, fulfillmentHandler, rejectionHandler);
  } catch(e) {
    return e;
  }
}

function _handleForeignThenable(promise, thenable, then) {
  asap_default(function(promise) {
    var sealed = false;
    var error = _tryThen(then, thenable, function(value) {
      if (sealed) { return; }
      sealed = true;
      if (thenable !== value) {
        _resolve(promise, value);
      } else {
        _fulfill(promise, value);
      }
    }, function(reason) {
      if (sealed) { return; }
      sealed = true;

      _reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      _reject(promise, error);
    }
  }, promise);
}

function _handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    _fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    _reject(promise, thenable._result);
  } else {
    _subscribe(thenable, undefined, function(value) {
      _resolve(promise, value);
    }, function(reason) {
      _reject(promise, reason);
    });
  }
}

function _handleMaybeThenable(promise, maybeThenable) {
  if (maybeThenable.constructor === promise.constructor) {
    _handleOwnThenable(promise, maybeThenable);
  } else {
    var then = _getThen(maybeThenable);

    if (then === GET_THEN_ERROR) {
      _reject(promise, GET_THEN_ERROR.error);
    } else if (then === undefined) {
      _fulfill(promise, maybeThenable);
    } else if (isFunction(then)) {
      _handleForeignThenable(promise, maybeThenable, then);
    } else {
      _fulfill(promise, maybeThenable);
    }
  }
}

function _resolve(promise, value) {
  _fulfill(promise, value);
}

function _fulfill(promise, value) {
  if (promise._state !== PENDING) { return; }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap_default(_publish, promise);
  }
}

function _reject(promise, reason) {
  if (promise._state !== PENDING) { return; }
  promise._state = REJECTED;
  promise._result = reason;

  asap_default(function(promise) {
    if (promise._onerror) {
      promise._onerror(promise._result);
    }

    _publish(promise);
  }, promise);
}

function _subscribe(parent, child, onFulfillment, onRejection) {
  var subscribers = parent._subscribers;
  var length = subscribers.length;
  parent._onerror = null;
  subscribers[length] = child;
  subscribers[length + FULFILLED] = onFulfillment; //success callback
  subscribers[length + REJECTED]  = onRejection; //error callback
  if (length === 0 && parent._state) { //when finished
    asap_default(_publish, parent);
  }
}

function _publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) { return; }

  var child, callback, detail = promise._result;
  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];
    if (child) {
      _invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function _ErrorObject() {
  this.error = null;
}

function _invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value, error, succeeded, failed;
  if (hasCallback) {
    value = callback(detail); //then(f1)  f1 的返回值
    succeeded = true;

    if (promise === value) {
      _reject(promise, _cannotReturnOwn());
      return;
    }

  } else {
    value = detail;
    succeeded = true;
  }
  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    _resolve(promise, value);
  } else if (failed) {
    _reject(promise, error);
  } else if (settled === FULFILLED) {
    _fulfill(promise, value);
  } else if (settled === REJECTED) {
    _reject(promise, value);
  }
}

function promise_all(entries) {
  return new Enumerator(this, entries).promise;
}

function promise_race(entries) {
  var Constructor = this;

  var promise = new Constructor(_noop);

  if (!Array.isArray(entries)) {
    _reject(promise, new TypeError('You must pass an array to race.'));
    return promise;
  }

  var length = entries.length;

  function onFulfillment(value) {
    _resolve(promise, value);
  }

  function onRejection(reason) {
    _reject(promise, reason);
  }

  for (var i = 0; promise._state === PENDING && i < length; i++) {
    _subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
  }

  return promise;
}

function promise_resolve(object) {
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(_noop);
  _resolve(promise, object);
  return promise;
}

function promise_reject(reason) {
  var Constructor = this;
  var promise = new Constructor(_noop);
  _reject(promise, reason);
  return promise;
}

function Promise(resolver) {
  this._id = promise_counter++;
  this._state = undefined;
  this._result = undefined;
  this._subscribers = [];
  if (_noop !== resolver) {
    var _this = this;
    resolver(function resolvePromise(value){ //to call resolver function
      _resolve(_this, value);
    }, function rejectPromise(reason) {
      _reject(_this, reason);
    });
  }
}

Promise.prototype = {
  constructor: Promise,

  then: function(onFulfillment, onRejection) {
    var parent = this;
    var state = parent._state;

    if (state === FULFILLED && !onFulfillment || state === REJECTED && !onRejection) {
      return this;
    }

    var child = new this.constructor(_noop);
    var result = parent._result;

    if (state) {
      var callback = arguments[state - 1];
      asap_default(function(){
        _invokeCallback(state, child, callback, result);
      });
    } else {
      _subscribe(parent, child, onFulfillment, onRejection);
    }

    return child;
  },

  'catch': function(onRejection) {
    return this.then(null, onRejection);
  }
};

Promise.all = promise_all;
Promise.race = promise_race;
Promise.resolve = promise_resolve;
Promise.reject = promise_reject;

window.Promise = Promise;
