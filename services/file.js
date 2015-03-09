'use strict';

var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var aws = require('aws-sdk');

var FileService = function(app) {
    this.app = app;

    this.dynamoDB = new aws.DynamoDB();

    var params = {
        AttributeDefinitions: [
            {
                AttributeName: 'fileId',
                AttributeType: 'S'
            },
            {
                AttributeName: 'parentId',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'fileId',
                KeyType: 'HASH'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'CCFiles',
        GlobalSecondaryIndexes: [
            {
                IndexName: 'parentIdx',
                KeySchema: [
                    {
                        AttributeName: 'parentId',
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

FileService.prototype.getFile = function(fileId, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var params = {
        Key: {
            fileId: {
                S: fileId
            }
        },
        TableName: 'CCFiles'
    };

    this.dynamoDB.getItem(params, function(err, data) {
        if (err) return callback(err);

        callback(null, data);
    });
};

FileService.prototype.getFilesByParent = function(parentId, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var self = this;

    var params = {
        KeyConditions: {
            parentId: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [
                    {
                        S: parentId
                    }
                ]
            }
        },
        TableName: 'CCFiles',
        IndexName: 'parentIdx',
        Select: 'ALL_ATTRIBUTES'
    };

    this.dynamoDB.query(params, function(err, data) {
        if (err) return callback(err);

        var files = [];

        if (data.Count && data.Count > 0) {
            var items = data.Items;

            files = items;
        }

        callback(null, files);
    });
};

FileService.prototype.saveFile = function(file, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var params = {
        Key: {
            fileId: {
                S: file.fileId
            }
        },
        TableName: 'CCFiles',
        UpdateExpression: 'set #title = :title, #mimeType = :mimeType, #originalFilename = :originalFilename, #filesize = :filesize, #downloadUrl = :downloadUrl, #createdDate = :createdDate, #modifiedDate = :modifiedDate',
        ExpressionAttributeNames: {
            '#parentId': 'parentId',
            '#title': 'title',
            '#mimeType': 'mimeType',
            '#originalFilename': 'originalFilename',
            '#filesize': 'filesize',
            '#downloadUrl': 'downloadUrl',
            '#createdDate': 'createdDate',
            '#modifiedDate': 'modifiedDate'
        },
        ExpressionAttributeValues: {
            ':parentId': {
                'S': file.parentId
            },
            ':title': {
                'S': file.title
            },
            ':mimeType': {
                'S': file.mimeType
            },
            ':originalFilename': {
                'S': file.originalFilename
            },
            ':filesize': {
                'N': file.filesize
            },
            ':downloadUrl': {
                'S': file.downloadUrl
            },
            ':createdDate': {
                'S': file.createdDate.toISOString()
            },
            ':modifiedDate': {
                'S': file.modifiedDate.toISOString()
            }
        }
    };

    this.dynamoDB.updateItem(params, function(err, data) {
        if (err) return callback(err);

        callback(null);
    });
};

FileService.prototype.mapDBFile = function(dbFile) {
    return {
        parentId: dbFile.parentId['S'],
        title: dbFile.title['S'],
        mimeType: dbFile.mimeType['S'],
        originalFilename: dbFile.originalFilename['S'],
        filesize: dbFile.filesize['N'],
        downloadUrl: dbFile.downloadUrl['S'],
        createdDate: new Date(dbFile.createdDate['S']),
        modifiedDate: new Date(dbFile.modifiedDate['S'])
    };
};

FileService.prototype.createFile = function(parentId, title) {
    return {
        parentId: parentId,
        title: title,
        mimeType: '',
        originalFilename: '',
        filesize: 42,
        downloadUrl: 'http://cs.umu.se',
        createdDate: new Date(),
        modifiedDate: new Date()
    };
};

/**
 * Export
 */
module.exports = function(app) {
    return new FileService(app);
};
