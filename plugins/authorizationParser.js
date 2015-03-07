'use strict';

/**
 * Module dependencies
 */
var crypto = require('crypto');
var path = require('path');

var _ = require('lodash');
var nconf = require('nconf').file({
    file: path.join(__dirname, '..', 'config', 'global.json')
});
var restify = require('restify');
var jwt = require('jsonwebtoken');

var secret = nconf.get('Security:AuthKey');
var credentialsRequired = false;

var options = {};


module.exports = function() {
    var parseAuthorization = function(req, res, next) {
        var token;

        if (req.method === 'OPTIONS' && req.headers.hasOwnProperty('access-control-request-headers')) {
            var hasAuthInAccessControl = !!~req.headers['access-control-request-headers']
                .split(',').map(function(header) {
                    return header.trim();
                }).indexOf('authorization');

            if (hasAuthInAccessControl) return next();
        }

        if (false) {

        } else if (req.headers && req.headers.authorization) {
            var parts = req.headers.authorization.split(' ');

            if (parts.length == 2) {
                var scheme = parts[0];
                var credentials = parts[1];

                if (/^Bearer$/i.test(scheme)) {
                    token = credentials;
                }
            } else {
                return next(new restify.errors.InvalidCredentials('Format is Authorization: Bearer [token]'));
            }
        }

        if (!token) {
            if (credentialsRequired) {
                return next(new restify.errors.InvalidCredentials('No authorization token was found'));
            } else {
                req.user = {
                    name: 'anonymous',
                    role: 'anonymous'
                };

                return next();
            }
        }

        jwt.verify(token, secret, options, function(err, decoded) {
            if (err && credentialsRequired) return next(new restify.errors.InvalidCredentials(err));

            req.user = {
                name: decoded.user,
                role: decoded.role
            };

            next();
        });
    };

    return parseAuthorization;
};
