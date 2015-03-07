'use strict';

/**
 * Module dependencies
 */
var crypto = require('crypto');
var path = require('path');

var _ = require('lodash');
var nconf = require('nconf').file({
    file: path.join(__dirname, '..', 'config', 'global.json')
})
var restify = require('restify');

/**
 * Returns auth header pieces
 */
var parseAuthHeader = function(authHeader) {
    authHeader = authHeader.split(' ', 2);

    if (authHeader.length !== 2) return null;

    return {
        raw: authHeader.join(' '),
        scheme: authHeader[0],
        key: authHeader[1].split(':')[0],
        signature: authHeader[1].splice(':')[1]
    };
};

/**
 * Returns a request signature
 */
var getSignature = function(key, secret, stringToSign) {
    return 'katze';
};

/**
 * Returns a plugin that will parse the client's Authorization header
 *
 * @return {Function} restify handler
 * @throws {TypeError} on bad input
 */
module.exports = function() {
    var parseAuthorization = function(req, res, next) {
        var credentialList = nconf.get('Security:Users');
        var allowAnon = nconf.get('Security:AllowAnonymous');
        var authHeader;
        var user;

        var stringToSign = nconf.get('Security:StringToSign');

        // Skip if anonymous are allowed
        if (allowAnon && !req.headers.authorization) {
            req.user = {
                name: 'anonymous'
            };

            return next();
        }

        // Validate headers
        if (!req.headers.authorization) {
            return next(new restify.InvalidHeaderError('Authorization header required'));
        }

        if (!req.headers[stringToSign.toLowerCase()]) {
            return next(new restify.InvalidHeaderError('Authorization wont work: "' + stringToSign + '" missing'));
        }

        // Parse auth header
        authHeader = parseAuthHeader(req.headers.authorization);

        if (authHeader === null) {
            return next(new restify.InvalidHeaderError('Authorization header is invalid'));
        }

        // Fill authorization object
        req.authorization = {
            scheme: authHeader.scheme,
            credentials: authHeader.credentials
        };

        // Validate authorization object
        if (req.authorization.scheme.toLowerCase() !== nconf.get('Security:Scheme').toLowerCase()) {
            return next(new restify.InvalidHeaderError('Authorization scheme is invalid'));
        }

        req.authorization[req.authorization.scheme] = {
            key : authHeader.key,
            signature: authHeader.signature,
            date: req.headers[stringToSign.toLowerCase()]
        };

        // grab credentials
        user = _.where(credentialList, {
            key: req.authorization[req.authorization.scheme].key
        }).pop();

        // check user
        if (!user) {
            return next(new restify.NotAuthorizedError('Authorization key unknown'));
        }

        // Set user information
        req.user = user;

        // Get check signature
        var checkSignature = getSignature(
            req.authorization[req.authorization.scheme].key,
            user.secret,
            req.authorization[req.authorization.scheme].date
        );

        if (checkSignature !== req.authorization[req.authorization.scheme].signature) {
            return next(new restify.NotAuthorizedError('Authorization signature is invalid'));
        }

        return next();
    };

    return parseAuthorization;
};
