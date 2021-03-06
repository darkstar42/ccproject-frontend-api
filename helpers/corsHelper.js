'use strict';

/**
 * Module dependencies
 */
var restify = require('restify');

/**
 * CORS helper
 */
var CORSHelper = function(options) {
    var allowedOrigins = options.origins || [];
    var allowedHeaders = restify.CORS.ALLOW_HEADERS.concat(options.headers || []);

    var unknownMethodHandler = function(req, res) {
        var origin = req.headers.origin;
        var originAllowed = false;

        console.dir(req.method);

        if (req.method.toLowerCase() !== 'options') {
            return res.send(new restify.MethodNotAllowedError());
        }

        allowedOrigins.forEach(function(anOrigin) {
            if (anOrigin === '*' || origin.toLowerCase() === anOrigin.toLowerCase()) {
                originAllowed = true;
            }
        });

        if (!originAllowed) {
            res.header('Access-Control-Allow-Origin', '');
            return res.send(new restify.MethodNotAllowedError());
        }

        res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');

        return res.send(200);
    };

    return unknownMethodHandler;
};

/**
 * Export
 */
module.exports = CORSHelper;
