'use strict';

/**
 * Routes
 */
var routes = [];

/**
 * GET /
 * Version: 1.0.0
 */
routes.push({
    meta: {
        name: 'getRoot',
        method: 'GET',
        paths: [
            '/'
        ],
        version: '1'
    },
    middleware: function(req, res, next) {
        var fileService = this.services.fileService;
        var userService = this.services.userService;

        userService.getUserByName('hund', function(err, user) {
            console.log('load user');
            console.dir(err);
            console.dir(user);

            res.send({
                user: user
            });

            return next();
        });

        /*
        userService.getUserByName('katze', function(err, data) {
            console.log('get user');
            console.dir(err);
            console.dir(data);

            res.send({
                foo: data
            });

            return next();
        });
        */
    }
});

/**
 * Export
 */
module.exports = routes;
