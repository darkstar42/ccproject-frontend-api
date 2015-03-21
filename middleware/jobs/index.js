'use strict';

/**
 * Dependencies
 */
var path = require('path');
var restify = require('restify');

var nconf = require('nconf').file({
    file: path.join(__dirname, '..', '..', 'config', 'global.json')
});

/**
 * Routes
 */
var routes = [];

/**
 * POST /jobs
 * Version: 1
 */
routes.push({
    meta: {
        name: 'saveJob',
        method: 'POST',
        paths: [
            '/jobs'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var jobService = this.services.jobService;
        var job = req.body.job;

        if (!job) {
            return next(new restify.BadRequestError("No job to save"));
        }

        jobService.enqueueJob(job, function(err) {
            if (err) return next(new restify.InternalError("Could not enqueue the folder"));

            res.send({
                status: 'success'
            });

            return next();
        });
    }
});

/**
 * Export
 */
module.exports = routes;
