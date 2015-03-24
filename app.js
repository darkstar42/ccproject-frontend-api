'use strict';

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}

/**
 * Module dependencies
 */
var path = require('path');
var restify = require('restify');
var bunyan = require('bunyan');
var aws = require('aws-sdk');
var nconf = require('nconf');

var conf = require('nconf')
    .file({ file: path.join(__dirname, 'config', 'global.json') })
    .file('aws', { file: path.join(__dirname, 'config', 'aws.json') });

aws.config.update({
    accessKeyId: conf.get('AWS:AccessKeyId'),
    secretAccessKey: conf.get('AWS:SecretAccessKey'),
    region: conf.get('AWS:Region')
});

/**
 * Logging
 */
var ConsoleStream = require(path.join(__dirname, 'helpers', 'consoleStream.js'));
var Logger = bunyan.createLogger({
    name: conf.get('Logging:Name'),
    serializers: {
        req: bunyan.stdSerializers.req,
        res: bunyan.stdSerializers.res
    },
    streams: [
        {
            path: path.join(__dirname, conf.get('Logging:Dir'), process.env.NODE_ENV + '-' + conf.get('Server:Name') + '.log')
        },
        {
            stream: process.stdout,
            level: 'trace'
        }
    ]
});

/**
 * Server
 */
var server = restify.createServer({
    name: conf.get('Server:Name'),
    version: conf.get('Server:DefaultVersion'),
    acceptable: conf.get('Server:Acceptable'),
    log: Logger
});

server.conf = conf;

/**
 * Server plugins
 */
var throttleOptions = {
    rate: conf.get('Server:ThrottleRate'),
    burst: conf.get('Server:ThrottleBurst'),
    ip: true,
    username: false
};

var plugins = [
    restify.acceptParser(server.acceptable),
    restify.throttle(throttleOptions),
    restify.dateParser(),
    restify.queryParser(),
    restify.fullResponse()
];

if (conf.get('Security:UseAuth')) {
    plugins.push(require(path.join(__dirname, 'plugins', 'authorizationParser'))());
}

if (conf.get('Security:UseACL')) {
    plugins.push(require(path.join(__dirname, 'plugins', 'aclPlugin'))());
}

plugins.push(restify.bodyParser());
plugins.push(restify.gzipResponse());

server.use(plugins);

/**
 * CORS
 */
var corsOptions = {
    origins: conf.get('CORS:Origins'),
    credentials: conf.get('CORS:Credentials'),
    headers: conf.get('CORS:Headers')
};

server.pre(restify.CORS(corsOptions));

if (corsOptions.headers.length) {
    server.on('MethodNotAllowed', require(path.join(__dirname, 'helpers', 'corsHelper.js'))(corsOptions));
}

/**
 * Request / Response logging
 */
server.on('after', restify.auditLogger({
    log: Logger
}));

/**
 * Middleware
 */
var registerRoute = function(route) {
    var routeMethod = route.meta.method.toLowerCase();
    var routeName = route.meta.name;
    var routeVersion = route.meta.version;

    route
        .meta
        .paths
        .forEach(function(aPath) {
            var routeMeta = {
                name: routeName,
                path: aPath,
                version: routeVersion
            };

            server[routeMethod](routeMeta, route.middleware);
        });
};

var setupMiddleware = function(middlewareName) {
    var routes = require(path.join(__dirname, 'middleware', middlewareName));

    routes.forEach(registerRoute);
};

[
    'about',
    'auth',
    'files',
    'folders',
    'jobs',
    'notifications',
    'root',
    'upload'
].forEach(setupMiddleware);

server.services = {};
server.services.fileService = require('./services/file')(server);
server.services.notificationService = require('./services/notification')(server);
server.services.userService = require('./services/user')(server);
server.services.jobService = require('./services/job')(server);

/**
 * Listen
 */
var listen = function(done) {
    server.listen(conf.get('Server:Port'), function() {
        if (done) return done();

        console.log();
        console.log('%s now listening on %s', conf.get('App:Name'), server.url);
        console.log();
    });
};

if (!module.parent) {
    listen();
}

/**
 * Export
 */
module.exports.listen = listen;
