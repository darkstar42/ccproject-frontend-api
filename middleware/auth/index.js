'use strict';

/**
 * Dependencies
 */
var path = require('path');

var jwt = require('jsonwebtoken');
var nconf = require('nconf').file({
    file: path.join(__dirname, '..', '..', 'config', 'global.json')
});

/**
 * Routes
 */
var routes = [];

/**
 * POST /auth
 * Version: 1
 */
routes.push({
    meta: {
        name: 'postAuth',
        method: 'POST',
        paths: [
            '/auth'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var secret = nconf.get('Security:AuthKey');
        var payload = {
            user: req.body.username,
            role: 'user'
        };
        var options = {
            expiresInMinutes: 60,
            issuer: nconf.get("Server:Name"),
            subject: payload.user + '.' + payload.role
        };
        var token = jwt.sign(payload, secret, options);

        res.send({
            auth: token,
            data: payload
        });

        return next();
    }
});

/**
 * Export
 */
module.exports = routes;
