/**********************
 * Module Dependencies.
 *********************/
var debug = require('debug')('glint-block');
var isBrowser = require('is-browser');
var slice = require('sliced');
var merge = require('utils-merge');
var xor = require('exclusive-or');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;


/**
 * Expose Block element.
 */
exports = module.exports = Block;
inherits(Block, EventEmitter);

/**
 * Initialize a new `Block` element.
 * @param {[type]} options [description]
 */
function Block(block) {
  if (!(this instanceof Block)) return new Block(block);
  this.buffer = [];
  this.delegate(block);
  this.init();
}


/****************
 * API Functions.
 ***************/

Block.prototype.api = Block.api = 'block';

['id', 'selector', 'el', 'place'].forEach(function(attribute) {
  Block.prototype[attribute] = function(value) {
    this.emit(attribute, value);
    if (typeof value !== 'undefined') {
      this.send(attribute, value);
      return this;
    }
    return this.send(attribute);
  };
});

// blocks must implement:
// - load, edit, save
// the other methods are optional:
// - cancel, hasChanged, isValid
['load', 'edit', 'save', 'cancel', 'hasChanged', 'isValid',].forEach(function(name) {
  Block.prototype[name] = function(arg) {
    var errorReturn = '';
    var args = slice(arguments);
    this.emit.apply(this, ['pre-' + name].concat(args));
    var result = errorReturn;
    try {
      result = this.send.apply(this, [name].concat(args));
    } catch (e) {
      console.error('block command', name, 'was not successful', e);
      result = arg || errorReturn;
    }
    this.emit.apply(this, ['post-' + name].concat(args));
    return result;
  };
});

/**
 * Forward function calls to this Implementation
 */

Block.prototype.delegate = function(block) {
  if (!block) return this.block;
  this.block = block;

  // execute buffered commands
  while (this.buffer.length > 0) {
    var cmd = this.buffer.shift();
    this.exec(cmd);
  }
  return this;
};

Block.prototype.undelegate = function(block) {
  this.block = undefined;
};

/**
 * Use the given `plugin`.
 *
 * @param {Function} plugin
 * @api private
 */
Block.prototype.use = function(plugin) {
  plugin(this);
  return this;
};

/**
 * Mixin the given `mixins` functions.
 * @param {Object} mixins e.g.
 *
 * { key : function fn () {} }
 *
 * @returns {Block}
 */
Block.prototype.mixin = function(mixins) {
  var self = this;
  Object.keys(mixins).forEach(function(key) {
    self[key] = mixins[key];
  });
  return this;
};

/****************
 * Base functions.
 ***************/
Block.prototype.init = function() {
  this.on('selector', function(selector) {
    if (isBrowser && selector) this.send('el', document.querySelector(selector));
  });
}


Block.prototype.send = function(command, rest) {
  var args = slice(arguments);
  if (!this.block) {
    // buffer
    this.buffer.push(args);
    return this;
  } else {
    // send
    return this.exec(args);
  }
};

/**
 * Don't call this method directly.
 *
 * @param args
 * @api private
 */
Block.prototype.exec = function(args) {
  var command = args.shift();
  var impl = this.block[command];
  if (typeof impl == 'function') {
    // call function
    return this.block[command].apply(this.block, args);
  } else if (args.length > 0) {
    // set attribute
    this.block[command] = args.shift();
    return this;
  } else {
    // get attribute
    return this.block[command];
  }
};


