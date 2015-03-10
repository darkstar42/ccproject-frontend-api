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
 * GET /about
 * Version: 1
 */
routes.push({
    meta: {
        name: 'getAbout',
        method: 'GET',
        paths: [
            '/about'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var userService = this.services.userService;
        var userName = req.user.name;

        userService.getUserByName(userName, function(err, user) {
            if (err) return next(new restify.InternalError("Could not load requested user"));
            if (user === null) return next(new restify.BadRequestError("User not found"));

            var attributes = user.attributes;

            res.send(attributes);

            return next();
        });
    }
});

/**
 * Export
 */
module.exports = routes;
