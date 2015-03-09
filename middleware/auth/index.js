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
        var userService = this.services.userService;

        var username = req.body.username;
        var password = req.body.password;
        var secret = nconf.get('Security:AuthKey');

        if (typeof username === 'undefined' || typeof password === 'undefined') {
            return next(new restify.MissingParameterError("Parameters username or password missing"));
        }

        userService.getUserByName(username, function(err, user) {
            if (err) return next(new restify.InternalError("Could not load requested user"));
            if (user === null) return next(new restify.BadRequestError("User not found"));

            var salt = user.passwordSalt;
            var hash = bcrypt.hashSync(password, salt);

            if (hash !== user.passwordHash) {
                return next(new restify.InvalidCredentialsError("Invalid credentials"));
            }

            var payload = {
                user: user.name,
                role: user.role
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
        });
    }
});

/**
 * POST /auth/register
 * Version: 1
 */
routes.push({
    meta: {
        name: 'postRegister',
        method: 'POST',
        paths: [
            '/auth/register'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var userService = this.services.userService;

        var username = req.body.username;
        var password = req.body.password;

        if (typeof username === 'undefined' || typeof password === 'undefined') {
            return next(new restify.MissingParameterError("Parameters username or password missing"));
        }

        var registerUser = function(callback) {
            var user = userService.createUser(username, password, 'user');

            userService.saveUser(user, function(err) {
                if (err) return callback(err);

                callback(null, user);
            });
        };

        userService.getUserByName(username, function(err, existingUser) {
            if (err) return next(new restify.InternalError("Could not check existing user"));

            if (existingUser === null) {
                registerUser(function(err, user) {
                    if (err) {
                        console.dir(err);
                        return next(new restify.InternalError("Could not register new user"));
                    }

                    res.send({
                        user: {
                            userId: user.userId,
                            name: user.name,
                            role: user.role
                        }
                    });
                    return next();
                });
            } else {
                return next(new restify.BadRequestError("A user with the given name already exists"));
            }
        });
    }
});

/**
 * Export
 */
module.exports = routes;
