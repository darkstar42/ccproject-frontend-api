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
 * POST /folders
 * Version: 1
 */
routes.push({
    meta: {
        name: 'saveFolder',
        method: 'POST',
        paths: [
            '/folders'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var fileService = this.services.fileService;
        var folder = req.body.folder;

        if (!folder) {
            return next(new restify.BadRequestError("No folder to save"));
        }

        folder.createdDate = new Date(folder.createdDate);
        folder.modifiedDate = new Date(folder.modifiedDate);

        fileService.saveFolder(folder, function(err) {
            if (err) return next(new restify.InternalError("Could not save the folder"));

            res.send({
                status: 'success',
                folder: folder
            });

            return next();
        });
    }
});

/**
 * DELETE /folders/:entryId
 * Version: 1
 */
routes.push({
    meta: {
        name: 'deleteFolder',
        method: 'DEL',
        paths: [
            '/folders/:entryId'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var fileService = this.services.fileService;
        var entryId = req.params.entryId;

        fileService.deleteFolder(entryId, function(err, folder) {
            if (err) return next(new restify.InternalError("Could not delete the folder"));

            res.send({
                status: 'success',
                kind: 'folder',
                folder: folder
            });

            return next();
        });
    }
});

/**
 * Export
 */
module.exports = routes;
