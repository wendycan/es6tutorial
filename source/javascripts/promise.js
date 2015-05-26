(function() {
    "use strict";
    function utils_objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function utils_isFunction(x) {
      return typeof x === 'function';
    }

    function utils_isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var utils_isArray;
    if (!Array.isArray) {
      utils_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      utils_isArray = Array.isArray;
    }

    var utils_isArray = utils_isArray;
    var asap_len = 0;
    var asap_toString = {}.toString;
    var asap_vertxNext;
    function asap_asap(callback, arg) {
      asap_queue[asap_len] = callback;
      asap_queue[asap_len + 1] = arg;
      asap_len += 2;
      console.log(asap_len);
      if (asap_len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        asap_scheduleFlush();
      }
    }

    var asap_default = asap_asap;

    var asap_browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var asap_browserGlobal = asap_browserWindow || {};
    var asap_BrowserMutationObserver = asap_browserGlobal.MutationObserver || asap_browserGlobal.WebKitMutationObserver;
    var asap_isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var asap_isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function asap_useNextTick() {
      var nextTick = process.nextTick;
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // setImmediate should be used instead instead
      var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
      if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
        nextTick = setImmediate;
      }
      return function() {
        nextTick(asap_flush);
      };
    }

    // vertx
    function asap_useVertxTimer() {
      return function() {
        asap_vertxNext(asap_flush);
      };
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

    // web worker
    function asap_useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = asap_flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function asap_useSetTimeout() {
      return function() {
        setTimeout(asap_flush, 1);
      };
    }

    var asap_queue = new Array(1000);
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

    function asap_attemptVertex() {
      try {
        var r = require;
        var vertx = r('vertx');
        asap_vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return asap_useVertxTimer();
      } catch(e) {
        return asap_useSetTimeout();
      }
    }

    var asap_scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (asap_isNode) {
      asap_scheduleFlush = asap_useNextTick();
    } else if (asap_BrowserMutationObserver) {
      asap_scheduleFlush = asap_useMutationObserver();
    } else if (asap_isWorker) {
      asap_scheduleFlush = asap_useMessageChannel();
    } else if (asap_browserWindow === undefined && typeof require === 'function') {
      asap_scheduleFlush = asap_attemptVertex();
    } else {
      asap_scheduleFlush = asap_useSetTimeout();
    }

    function internal_noop() {}

    var internal_PENDING   = void 0;
    var internal_FULFILLED = 1;
    var internal_REJECTED  = 2;

    var internal_GET_THEN_ERROR = new internal_ErrorObject();

    function internal_selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function internal_cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function internal_getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        internal_GET_THEN_ERROR.error = error;
        return internal_GET_THEN_ERROR;
      }
    }

    function internal_tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function internal_handleForeignThenable(promise, thenable, then) {
       asap_default(function(promise) {
        var sealed = false;
        var error = internal_tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            internal_resolve(promise, value);
          } else {
            internal_fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          internal_reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          internal_reject(promise, error);
        }
      }, promise);
    }

    function internal_handleOwnThenable(promise, thenable) {
      if (thenable._state === internal_FULFILLED) {
        internal_fulfill(promise, thenable._result);
      } else if (thenable._state === internal_REJECTED) {
        internal_reject(promise, thenable._result);
      } else {
        internal_subscribe(thenable, undefined, function(value) {
          internal_resolve(promise, value);
        }, function(reason) {
          internal_reject(promise, reason);
        });
      }
    }

    function internal_handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        internal_handleOwnThenable(promise, maybeThenable);
      } else {
        var then = internal_getThen(maybeThenable);

        if (then === internal_GET_THEN_ERROR) {
          internal_reject(promise, internal_GET_THEN_ERROR.error);
        } else if (then === undefined) {
          internal_fulfill(promise, maybeThenable);
        } else if (utils_isFunction(then)) {
          internal_handleForeignThenable(promise, maybeThenable, then);
        } else {
          internal_fulfill(promise, maybeThenable);
        }
      }
    }

    function internal_resolve(promise, value) {
      if (promise === value) {
        internal_reject(promise, internal_selfFullfillment());
      } else if (utils_objectOrFunction(value)) {
        internal_handleMaybeThenable(promise, value);
      } else {
        internal_fulfill(promise, value);
      }
    }

    function internal_publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      internal_publish(promise);
    }

    function internal_fulfill(promise, value) {
      if (promise._state !== internal_PENDING) { return; }

      promise._result = value;
      promise._state = internal_FULFILLED;

      if (promise._subscribers.length !== 0) {
        asap_default(internal_publish, promise);
      }
    }

    function internal_reject(promise, reason) {
      if (promise._state !== internal_PENDING) { return; }
      promise._state = internal_REJECTED;
      promise._result = reason;

      asap_default(internal_publishRejection, promise);
    }

    function internal_subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + internal_FULFILLED] = onFulfillment;
      subscribers[length + internal_REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        asap_default(internal_publish, parent);
      }
    }

    function internal_publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          internal_invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function internal_ErrorObject() {
      this.error = null;
    }

    var internal_TRY_CATCH_ERROR = new internal_ErrorObject();

    function internal_tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        internal_TRY_CATCH_ERROR.error = e;
        return internal_TRY_CATCH_ERROR;
      }
    }

    function internal_invokeCallback(settled, promise, callback, detail) {
      var hasCallback = utils_isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = internal_tryCatch(callback, detail);

        if (value === internal_TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          internal_reject(promise, internal_cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== internal_PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        internal_resolve(promise, value);
      } else if (failed) {
        internal_reject(promise, error);
      } else if (settled === internal_FULFILLED) {
        internal_fulfill(promise, value);
      } else if (settled === internal_REJECTED) {
        internal_reject(promise, value);
      }
    }

    function internal_initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          internal_resolve(promise, value);
        }, function rejectPromise(reason) {
          internal_reject(promise, reason);
        });
      } catch(e) {
        internal_reject(promise, e);
      }
    }

    function enumerator_Enumerator(Constructor, input) {
      var enumerator = this;

      enumerator._instanceConstructor = Constructor;
      enumerator.promise = new Constructor(internal_noop);
      if (enumerator._validateInput(input)) {
        enumerator._input     = input;
        enumerator.length     = input.length;
        enumerator._remaining = input.length;

        enumerator._init();

        if (enumerator.length === 0) {
          internal_fulfill(enumerator.promise, enumerator._result);
        } else {
          enumerator.length = enumerator.length || 0;
          enumerator._enumerate();
          if (enumerator._remaining === 0) {
            internal_fulfill(enumerator.promise, enumerator._result);
          }
        }
      } else {
        internal_reject(enumerator.promise, enumerator._validationError());
      }
    }

    enumerator_Enumerator.prototype._validateInput = function(input) {
      return utils_isArray(input);
    };

    enumerator_Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    enumerator_Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var enumerator_default = enumerator_Enumerator;

    enumerator_Enumerator.prototype._enumerate = function() {
      var enumerator = this;

      var length  = enumerator.length;
      var promise = enumerator.promise;
      var input   = enumerator._input;

      for (var i = 0; promise._state === internal_PENDING && i < length; i++) {
        enumerator._eachEntry(input[i], i);
      }
    };

    enumerator_Enumerator.prototype._eachEntry = function(entry, i) {
      var enumerator = this;
      var c = enumerator._instanceConstructor;

      if (utils_isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== internal_PENDING) {
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

    enumerator_Enumerator.prototype._settledAt = function(state, i, value) {
      var enumerator = this;
      var promise = enumerator.promise;

      if (promise._state === internal_PENDING) {
        enumerator._remaining--;

        if (state === internal_REJECTED) {
          internal_reject(promise, value);
        } else {
          enumerator._result[i] = value;
        }
      }

      if (enumerator._remaining === 0) {
        internal_fulfill(promise, enumerator._result);
      }
    };

    enumerator_Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      internal_subscribe(promise, undefined, function(value) {
        enumerator._settledAt(internal_FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(internal_REJECTED, i, reason);
      });
    };
    function promise_all_all(entries) {
      return new enumerator_default(this, entries).promise;
    }
    var promise_all_default = promise_all_all;
    function promise_race_race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(internal_noop);

      if (!utils_isArray(entries)) {
        internal_reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        internal_resolve(promise, value);
      }

      function onRejection(reason) {
        internal_reject(promise, reason);
      }

      for (var i = 0; promise._state === internal_PENDING && i < length; i++) {
        internal_subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var promise_race_default = promise_race_race;
    function promise_resolve_resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(internal_noop);
      internal_resolve(promise, object);
      return promise;
    }
    var promise_resolve_default = promise_resolve_resolve;
    function promise_reject_reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(internal_noop);
      internal_reject(promise, reason);
      return promise;
    }
    var promise_reject_default = promise_reject_reject;

    var promise_counter = 0;

    function promise_needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function promise_needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var promise_default = promise_Promise;

    function promise_Promise(resolver) {
      this._id = promise_counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (internal_noop !== resolver) {
        if (!utils_isFunction(resolver)) {
          promise_needsResolver();
        }

        if (!(this instanceof promise_Promise)) {
          promise_needsNew();
        }

        internal_initializePromise(this, resolver);
      }
    }

    promise_Promise.all = promise_all_default;
    promise_Promise.race = promise_race_default;
    promise_Promise.resolve = promise_resolve_default;
    promise_Promise.reject = promise_reject_default;

    promise_Promise.prototype = {
      constructor: promise_Promise,

      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === internal_FULFILLED && !onFulfillment || state === internal_REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor(internal_noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          asap_default(function(){
            internal_invokeCallback(state, child, callback, result);
          });
        } else {
          internal_subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    function polyfill_polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = promise_default;
    }
    var polyfill_default = polyfill_polyfill;

    var umd_ES6Promise = {
      'Promise': promise_default,
      'polyfill': polyfill_default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return umd_ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = umd_ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = umd_ES6Promise;
    }

    polyfill_default();
}).call(this);
