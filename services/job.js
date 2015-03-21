'use strict';

var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var aws = require('aws-sdk');

var JobService = function(app) {
    this.app = app;

    this.sqs = new aws.SQS();
};

JobService.prototype.enqueueJob = function(job, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var messageBody = {
        type: 'job',
        image: job.image,
        cmd: job.cmd,
        src: job.src,
        dst: job.dst
    };

    var params = {
        MessageBody: JSON.stringify(messageBody),
        QueueUrl: this.app.conf.get('AWS:SQS:QueueUrl')
    };

    this.sqs.sendMessage(params, function(err, data) {
        if (err) {
            console.dir(err);
            return callback(err);
        }

        callback(null, data);
    });
};

/**
 * Export
 */
module.exports = function(app) {
    return new JobService(app);
};
