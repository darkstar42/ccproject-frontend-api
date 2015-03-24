'use strict';

/**
 * Dependencies
 */
var path = require('path');
var restify = require('restify');

var nconf = require('nconf').file({
    file: path.join(__dirname, '..', '..', 'config', 'global.json')
});

/**
 * Routes
 */
var routes = [];

/**
 * GET /notifications
 * Version: 1
 */
routes.push({
    meta: {
        name: 'getNotifications',
        method: 'GET',
        paths: [
            '/notifications'
        ],
        version: '1'
    },
    middleware: function (req, res, next) {
        var notificationService = this.services.notificationService;
        var userId = req.user.name;

        notificationService.getNotifications(userId, function (err, notifications) {
            console.dir(err);
            if (err) return next(new restify.InternalError("Could not load requested notifications"));
            if (notifications === null) return next(new restify.BadRequestError("Notifications not found"));

            res.send({
                status: 'success',
                notifications: notifications
            });

            return next();
        });
    }
});

/**
 * POST /notifications
 * Version: 1
 */
routes.push({
    meta: {
        name: 'saveNotification',
        method: 'POST',
        paths: [
            '/notifications'
        ],
        version: '1'
    },
    middleware: function (req, res, next) {
        var notificationService = this.services.notificationService;
        var notification = req.body.notification;

        if (!notification) {
            return next(new restify.BadRequestError("No notification to save"));
        }

        notificationService.saveNotification(notification, function (err) {
            if (err) return next(new restify.InternalError("Could not save the notification"));

            res.send({
                status: 'success',
                notification: notification
            });

            return next();
        });
    }
});

/**
 * Export
 */
module.exports = routes;
