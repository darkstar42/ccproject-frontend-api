'use strict';

var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var aws = require('aws-sdk');

var NotificationService = function(app) {
    this.app = app;

    this.dynamoDB = new aws.DynamoDB();

    var params = {
        AttributeDefinitions: [
            {
                AttributeName: 'id',
                AttributeType: 'S'
            },
            {
                AttributeName: 'userId',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'id',
                KeyType: 'HASH'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'CCNotifications',
        GlobalSecondaryIndexes: [
            {
                IndexName: 'userIdIdx',
                KeySchema: [
                    {
                        AttributeName: 'userId',
                        KeyType: 'HASH'
                    }
                ],
                Projection: {
                    ProjectionType: 'ALL'
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1
                }
            }
        ]
    };

    this.dynamoDB.createTable(params, function(err, data) {
        if (err) console.dir(err, err.stack);
        else console.dir(data);
    });
};

NotificationService.prototype.getNotifications = function(userId, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var self = this;

    var params = {
        KeyConditions: {
            userId: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [
                    {
                        S: userId
                    }
                ]
            }
        },
        TableName: 'CCNotifications',
        IndexName: 'userIdIdx',
        Select: 'ALL_ATTRIBUTES'
    };

    this.dynamoDB.query(params, function(err, data) {
        if (err) return callback(err);

        var notifications = [];

        if (data.Count && data.Count > 0) {
            var items = data.Items;

            for (var i = 0; i < items.length; i++) {
                var notification = self.mapDBNotification(items[0]);

                notifications.push(notification);
            }
        }

        callback(null, notifications);
    });
};

NotificationService.prototype.saveNotification = function(notification, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var rawAttributes = notification.attributes;
    var structAttributes = {};
    Object.keys(rawAttributes).forEach(function(attributeName) {
        structAttributes[attributeName] = { S: rawAttributes[attributeName] };
    });

    var params = {
        Key: {
            id: {
                S: notification.id
            }
        },
        TableName: 'CCNotifications',
        UpdateExpression: 'set #userId = :userId, #createdDate = :createdDate, #attributes = :attributes',
        ExpressionAttributeNames: {
            '#userId': 'userId',
            '#createdDate': 'createdDate',
            '#attributes': 'attributes'
        },
        ExpressionAttributeValues: {
            ':userId': {
                'S': notification.userId
            },
            ':createdDate': {
                'S': notification.createdDate.toISOString()
            },
            ':attributes': {
                'M': structAttributes
            }
        }
    };

    this.dynamoDB.updateItem(params, function(err, data) {
        if (err) return callback(err);

        callback(null);
    });
};

NotificationService.prototype.mapDBNotification = function(dbNotification) {
    var structAttributes = dbNotification.attributes.M;
    var rawAttributes = {};
    Object.keys(structAttributes).forEach(function(attributeName) {
        rawAttributes[attributeName] = structAttributes[attributeName].S;
    });

    return {
        userId: dbNotification.userId['S'],
        createdDate: new Date(dbNotification.createdDate['S']),
        attributes: rawAttributes
    };
};

NotificationService.prototype.createNotification = function(userId) {
    var notification = {
        userId: uuid.v4(),
        createdDate: new Date(),
        attributes: {}
    };

    return notification;
};

/**
 * Export
 */
module.exports = function(app) {
    return new NotificationService(app);
};
