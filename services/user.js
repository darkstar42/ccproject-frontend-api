'use strict';

var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var aws = require('aws-sdk');

var UserService = function(app) {
    this.app = app;

    this.dynamoDB = new aws.DynamoDB();

    var params = {
        AttributeDefinitions: [
            {
                AttributeName: 'userId',
                AttributeType: 'S'
            },
            {
                AttributeName: 'name',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'userId',
                KeyType: 'HASH'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'CCUsers',
        GlobalSecondaryIndexes: [
            {
                IndexName: 'nameIdx',
                KeySchema: [
                    {
                        AttributeName: 'name',
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

UserService.prototype.getUser = function(userId, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var params = {
        Key: {
            userId: {
                S: userId
            }
        },
        TableName: 'CCUsers'
    };

    this.dynamoDB.getItem(params, function(err, data) {
        if (err) return callback(err);

        callback(null, data);
    });
};

UserService.prototype.getUserByName = function(username, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var self = this;

    var params = {
        KeyConditions: {
            name: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [
                    {
                        S: username
                    }
                ]
            }
        },
        TableName: 'CCUsers',
        IndexName: 'nameIdx',
        Select: 'ALL_ATTRIBUTES'
    };

    this.dynamoDB.query(params, function(err, data) {
        if (err) return callback(err);

        var user = null;

        if (data.Count && data.Count > 0) {
            var items = data.Items;
            user = self.mapDBFile(items[0]);
        }

        callback(null, user);
    });
};

UserService.prototype.saveUser = function(user, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var params = {
        Key: {
            userId: {
                S: user.userId
            }
        },
        TableName: 'CCUsers',
        UpdateExpression: 'set #name = :name, #role = :role, #passwordSalt = :passwordSalt, #passwordHash = :passwordHash, #createdDate = :createdDate, #modifiedDate = :modifiedDate',
        ExpressionAttributeNames: {
            '#name': 'name',
            '#role': 'role',
            '#passwordSalt': 'passwordSalt',
            '#passwordHash': 'passwordHash',
            '#createdDate': 'createdDate',
            '#modifiedDate': 'modifiedDate'
        },
        ExpressionAttributeValues: {
            ':name': {
                'S': user.name
            },
            ':role': {
                'S': user.role
            },
            ':passwordSalt': {
                'S': user.passwordSalt
            },
            ':passwordHash': {
                'S': user.passwordHash
            },
            ':createdDate': {
                'S': user.createdDate.toISOString()
            },
            ':modifiedDate': {
                'S': user.modifiedDate.toISOString()
            }
        }
    };

    this.dynamoDB.updateItem(params, function(err, data) {
        if (err) return callback(err);

        callback(null);
    });
};

UserService.prototype.mapDBFile = function(dbUser) {
    return {
        userId: dbUser.userId['S'],
        name: dbUser.name['S'],
        role: dbUser.role['S'],
        passwordHash: dbUser.passwordHash['S'],
        passwordSalt: dbUser.passwordSalt['S'],
        createdDate: new Date(dbUser.createdDate['S']),
        modifiedDate: new Date(dbUser.modifiedDate['S'])
    };
};

UserService.prototype.createUser = function(username, password, role) {
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(password, salt);

    role = role || 'user';

    var user = {
        userId: uuid.v4(),
        name: username,
        role: role,
        passwordHash: hash,
        passwordSalt: salt,
        createdDate: new Date(),
        modifiedDate: new Date()
    };

    return user;
};

/**
 * Export
 */
module.exports = function(app) {
    return new UserService(app);
};
