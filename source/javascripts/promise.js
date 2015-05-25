var counter = 0;
var PENDING = void 0;
var FULFILLED = 1;
var REJECTED  = 2;
var queue = new Array(1000);
var TRY_CATCH_ERROR = new ErrorObject();
var GET_THEN_ERROR = new ErrorObject();
function noop() {}

function isFunction(x) {
  return typeof x === 'function';
}
function objectOrFunction(x) {
  return typeof x === 'function' || (typeof x === 'object' && x !== null);
}
var isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';
var browserWindow = (typeof window !== 'undefined') ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var scheduleFlush;

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function() {
    node.data = (iterations = ++iterations % 2);
  };
}
function flush() {
  for (var i = 0; i < len; i+=2) {
    var callback = queue[i];
    var arg = queue[i+1];

    callback(arg);

    queue[i] = undefined;
    queue[i+1] = undefined;
  }

  len = 0;
}
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertex();
} else {
  scheduleFlush = useSetTimeout();
}
function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFullfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value);
  } else {
    fulfill(promise, value);
  }
}

function getThen(promise) {
  try {
    return promise.then;
  } catch(error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function handleMaybeThenable(promise, maybeThenable) {
  if (maybeThenable.constructor === promise.constructor) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    var then = getThen(maybeThenable);

    if (then === GET_THEN_ERROR) {
      reject(promise, GET_THEN_ERROR.error);
    } else if (then === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then)) {
      handleForeignThenable(promise, maybeThenable, then);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}
function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch(e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}
function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value, error, succeeded, failed;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }

  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}
function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) { return; }

  var child, callback, detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}
len = 0;
function asp_default(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    scheduleFlush();
  }
}
function ErrorObject() {
  this.error = null;
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) { return; }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asp_default(publish, promise);
  }
}
function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}
function reject(promise, reason) {
  if (promise._state !== PENDING) { return; }
  promise._state = REJECTED;
  promise._result = reason;

  asp_default(publishRejection, promise);
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value){
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch(e) {
    reject(promise, e);
  }
}

function Promise(resolver) {
  this._id = counter++;
  this._state = undefined;
  this._result = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    if (!isFunction(resolver)) {
      needsResolver();
    }

    if (!(this instanceof Promise)) {
      needsNew();
    }

    initializePromise(this, resolver);
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

    var child = new this.constructor(noop);
    var result = parent._result;

    if (state) {
      var callback = arguments[state - 1];
      asp_default(function(){
        invokeCallback(state, child, callback, result);
      });
    } else {
      subscribe(parent, child, onFulfillment, onRejection);
    }

    return child;
  },

  'catch': function(onRejection) {
    return this.then(null, onRejection);
  }
};
function subscribe(parent, child, onFulfillment, onRejection) {
  var subscribers = parent._subscribers;
  var length = subscribers.length;

  parent._onerror = null;

  subscribers[length] = child;
  subscribers[length + FULFILLED] = onFulfillment;
  subscribers[length + REJECTED]  = onRejection;

  if (length === 0 && parent._state) {
    asp_default(publish, parent);
  }
}
Promise.all = function (entries) {
  console.log('all');
  console.log(entries);
  var promise = new Enumerator(this, entries); //to debug
  console.log('promise');
  console.log(promise);
  return promise.promise;
};
function Enumerator(Constructor, input) {
  var enumerator = this;

  enumerator._instanceConstructor = Constructor;
  enumerator.promise = new Constructor(noop);

  if (enumerator._validateInput(input)) {
    enumerator._input     = input;
    enumerator.length     = input.length;
    enumerator._remaining = input.length;

    enumerator._init();

    if (enumerator.length === 0) {
      fulfill(enumerator.promise, enumerator._result);
    } else {
      enumerator.length = enumerator.length || 0;
      enumerator._enumerate();
      if (enumerator._remaining === 0) {
        fulfill(enumerator.promise, enumerator._result);
      }
    }
  } else {
    reject(enumerator.promise, enumerator._validationError());
  }
}
Enumerator.prototype._validateInput = function(input) {
  return lib$es6$promise$utils$$isArray(input);
};

Enumerator.prototype._validationError = function() {
  return new Error('Array Methods must be provided an Array');
};

Enumerator.prototype._init = function() {
  this._result = new Array(this.length);
};

Enumerator.prototype._enumerate = function() {
  var enumerator = this;

  var length  = enumerator.length;
  var promise = enumerator.promise;
  var input   = enumerator._input;

  for (var i = 0; promise._state === PENDING && i < length; i++) {
    enumerator._eachEntry(input[i], i);
  }
};

Enumerator.prototype._eachEntry = function(entry, i) {
  var enumerator = this;
  var c = enumerator._instanceConstructor;

  if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
    if (entry.constructor === c && entry._state !== PENDING) {
      entry._onerror = null;
      enumerator._settledAt(entry._state, i, entry._result);
    } else {
      enumerator._willSettleAt(c.resolve(entry), i);
    }
  } else {
    enumerator._remaining--;
    enumerator._result[i] = entry;
  }
};

Enumerator.prototype._settledAt = function(state, i, value) {
  var enumerator = this;
  var promise = enumerator.promise;

  if (promise._state === PENDING) {
    enumerator._remaining--;

    if (state === REJECTED) {
      reject(promise, value);
    } else {
      enumerator._result[i] = value;
    }
  }

  if (enumerator._remaining === 0) {
    fulfill(promise, enumerator._result);
  }
};

Enumerator.prototype._willSettleAt = function(promise, i) {
  var enumerator = this;

  subscribe(promise, undefined, function(value) {
    enumerator._settledAt(FULFILLED, i, value);
  }, function(reason) {
    enumerator._settledAt(REJECTED, i, reason);
  });
};
