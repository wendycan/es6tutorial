function Enumerator(Constructor, input) {
  this._instanceConstructor = Constructor;
  this.promise = new Constructor(_noop);
  this._input     = input;
  this.length     = input.length;
  this._remaining = input.length;
  this._result = new Array(this.length);

  this._enumerate();
  if (this._remaining === 0) {
    _fulfill(this.promise, this._result);
  }
}

Enumerator.prototype._enumerate = function() {
  var length  = this.length;
  var promise = this.promise;
  var input   = this._input;

  for (var i = 0; promise._state === PENDING && i < length; i++) {
    this._eachEntry(input[i], i);
  }
};

Enumerator.prototype._eachEntry = function(entry, i) {
  var c = this._instanceConstructor;
  if (entry.constructor === c && entry._state !== PENDING) {
    entry._onerror = null;
    this._settledAt(entry._state, i, entry._result);
  } else {
    this._willSettleAt(c.resolve(entry), i);
  }
};

Enumerator.prototype._settledAt = function(state, i, value) {
  var promise = this.promise;

  if (promise._state === PENDING) {
    this._remaining--;

    if (state === REJECTED) {
      _reject(promise, value);
    } else {
      this._result[i] = value;
    }
  }

  if (this._remaining === 0) {
    _fulfill(promise, this._result);
  }
};

Enumerator.prototype._willSettleAt = function(promise, i) {
  var _this = this;

  _subscribe(promise, undefined, function(value) {
    _this._settledAt(FULFILLED, i, value);
  }, function(reason) {
    _this._settledAt(REJECTED, i, reason);
  });
};
