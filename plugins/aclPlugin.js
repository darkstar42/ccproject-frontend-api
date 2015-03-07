'use strict';

/**
 * Module dependencies
 */
var path = require('path');
var util = require('util');

var nconf = require('nconf').file({
    file: path.join(__dirname, '..', 'config', 'global.json')
});
var restify = require('restify');
var ACL = require('acl');

/**
 * ACL
 */
var acl;
var getACLInstance;

getACLInstance = function(aclBackend) {
    if (acl) return acl;

    aclBackend = aclBackend || { type: 'memory' };
    aclBackend = aclBackend.type === 'memory' ? new ACL.memoryBackend()
        : new ACL.memoryBackend();

    acl = new ACL(aclBackend);

    var rules = nconf.get('Security:ACL:Rules');
    var users = nconf.get('Security:Users');

    acl.allow(rules);

    users.forEach(function(user) {
        acl.addUserRoles(user.name, user.role);
    });

    return acl;
};

/**
 * Export
 */
module.exports = function(aclBackend) {
    var aclMiddleware = function(req, res, next) {
        req.acl = getACLInstance(aclBackend);

        var resource = util.format('%s#%s', req.route.path, req.route.version);
        var permission = req.method.toLowerCase();

        console.dir("KATZE");
        console.dir(resource);
        console.dir(permission);
        console.dir(req.user);

        req.acl.isAllowed(req.user.name, resource, permission, function(err, isAllowed) {
            if (!!err) {
                console.log(err);
                return next(new restify.errors.Internal());
            }

            if (!isAllowed) {
                return next(new restify.ForbiddenError());
            }

            return next();
        });
    };

    return aclMiddleware;
};

