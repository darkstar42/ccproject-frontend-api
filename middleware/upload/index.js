'use strict';

/**
 * Dependencies
 */
var path = require('path');

var nconf = require('nconf').file({
    file: path.join(__dirname, '..', '..', 'config', 'global.json')
});

/**
 * Routes
 */
var routes = [];

/**
 * POST /upload
 * Version: 1
 */
routes.push({
    meta: {
        name: 'postUpload',
        method: 'POST',
        paths: [
            '/upload'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        console.log('XXXX: BODY', req.body);
        console.log('XXXX params', req.params);
        console.log('XXXX UPLOADED FILES', req.files);

        res.send({
            katze: 'blubb'
        });

        return next();
    }
});

/**
 * Export
 */
module.exports = routes;
