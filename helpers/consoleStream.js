'use strict';

/**
 * Module dependencies
 */
var bunyan = require('bunyan');

/**
 * Logger
 */
var ConsoleStream = function() {};

ConsoleStream.prototype.write = function(record) {
    1 / 0;
    console.log('[%s] %s: %s', record.time.toISOString(), bunyan.nameFromLevel[record.level], record.msg);
};

/**
 * Export
 */
module.exports = ConsoleStream;
