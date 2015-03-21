'use strict';

/**
 * Dependencies
 */
var path = require('path');
var restify = require('restify');

/**
 * Routes
 */
var routes = [];

/**
 * GET /files/:entryId
 * Version: 1
 */
routes.push({
    meta: {
        name: 'getFile',
        method: 'GET',
        paths: [
            '/files/:entryId'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var fileService = this.services.fileService;
        var entryId = req.params.entryId;

        fileService.getFile(entryId, function(err, file) {
            if (err) return next(new restify.InternalError("Could not load requested file"));
            if (file === null) return next(new restify.BadRequestError("File not found"));

            res.send(file);

            return next();
        });
    }
});

/**
 * POST /files
 * Version: 1
 */
routes.push({
    meta: {
        name: 'saveFile',
        method: 'POST',
        paths: [
            '/files'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var fileService = this.services.fileService;
        var file = req.body.file;

        if (!file) {
            return next(new restify.BadRequestError("No file to save"));
        }

        file.createdDate = new Date(file.createdDate);
        file.modifiedDate = new Date(file.modifiedDate);

        fileService.saveFile(file, function(err) {
            if (err) return next(new restify.InternalError("Could not save the file"));

            res.send({
                status: 'success',
                file: file
            });

            return next();
        });
    }
});

/**
 * DELETE /files/:entryId
 * Version: 1
 */
routes.push({
    meta: {
        name: 'deleteFile',
        method: 'DEL',
        paths: [
            '/files/:entryId'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var fileService = this.services.fileService;
        var entryId = req.params.entryId;

        fileService.deleteFile(entryId, function(err, file) {
            if (err) return next(new restify.InternalError("Could not delete the file"));

            res.send({
                status: 'success',
                kind: 'file',
                file: file
            });

            return next();
        });
    }
});

/**
 * Export
 */
module.exports = routes;
