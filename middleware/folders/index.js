'use strict';

/**
 * Dependencies
 */
var path = require('path');
var restify = require('restify');
var bcrypt = require('bcrypt');

var jwt = require('jsonwebtoken');
var nconf = require('nconf').file({
    file: path.join(__dirname, '..', '..', 'config', 'global.json')
});

/**
 * Routes
 */
var routes = [];

/**
 * GET /folders/:entryId
 * Version: 1
 */
routes.push({
    meta: {
        name: 'getFolder',
        method: 'GET',
        paths: [
            '/folders/:entryId'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var fileService = this.services.fileService;
        var entryId = req.params.entryId;

        fileService.getFolder(entryId, function(err, folder) {
            if (err) return next(new restify.InternalError("Could not load requested folder"));
            if (folder === null) return next(new restify.BadRequestError("Folder not found"));

            res.send(folder);

            return next();
        });
    }
});

/**
 * GET /folders/:entryId/children
 * Version: 1
 */
routes.push({
    meta: {
        name: 'getFolderChildren',
        method: 'GET',
        paths: [
            '/folders/:entryId/children'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var fileService = this.services.fileService;
        var entryId = req.params.entryId;

        fileService.getEntriesByParent(entryId, function(err, children) {
            if (err) return next(new restify.InternalError("Could not load requested folder"));

            res.send(children);

            return next();
        });
    }
});

/**
 * Export
 */
module.exports = routes;
