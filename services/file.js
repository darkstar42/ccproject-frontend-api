'use strict';

var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var aws = require('aws-sdk');

var FileService = function(app) {
    this.app = app;

    this.dynamoDB = new aws.DynamoDB();

    this.setupEntriesTable();
};

FileService.prototype.setupEntriesTable = function() {
    var params = {
        AttributeDefinitions: [
            {
                AttributeName: 'entryId',
                AttributeType: 'S'
            },
            {
                AttributeName: 'kind',
                AttributeType: 'S'
            },
            {
                AttributeName: 'parentId',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'entryId',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'kind',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'CCEntries',
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

FileService.prototype.getFile = function(entryId, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var params = {
        Key: {
            entryId: {
                S: entryId
            },
            kind: {
                S: 'file'
            }
        },
        TableName: 'CCEntries'
    };

    var self = this;

    this.dynamoDB.getItem(params, function(err, data) {
        if (err) return callback(err);
        if (typeof data.Item === 'undefined') return callback(null, null);

        var file = self.mapDBFile(data.Item);

        callback(null, file);
    });
};

FileService.prototype.getFolder = function(entryId, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var params = {
        Key: {
            entryId: {
                S: entryId
            },
            kind: {
                S: 'folder'
            }
        },
        TableName: 'CCEntries'
    };

    var self = this;

    this.dynamoDB.getItem(params, function(err, data) {
        if (err) return callback(err);
        if (typeof data.Item === 'undefined') return callback(null, null);

        var folder = self.mapDBFolder(data.Item);

        callback(null, folder);
    });
};

FileService.prototype.getEntriesByParent = function(parentId, callback) {
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
        TableName: 'CCEntries',
        IndexName: 'parentIdx',
        Select: 'ALL_ATTRIBUTES'
    };

    this.dynamoDB.query(params, function(err, data) {
        if (err) return callback(err);

        var entries = [];

        if (data.Count && data.Count > 0) {
            var items = data.Items;

            items.forEach(function(entry) {
                var kind = entry.kind['S'];

                switch (kind) {
                    case 'file':
                        var file = self.mapDBFile(entry);
                        entries.push(file);
                        break;
                    case 'folder':
                        var folder = self.mapDBFolder(entry);
                        entries.push(folder);
                        break;
                }
            });
        }

        callback(null, entries);
    });
};

FileService.prototype.saveFile = function(file, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var params = {
        Key: {
            entryId: {
                S: file.entryId
            },
            kind: {
                S: 'file'
            }
        },
        TableName: 'CCEntries',
        UpdateExpression: 'set #parentId = :parentId, #title = :title, #mimeType = :mimeType, #originalFilename = :originalFilename, #filesize = :filesize, #downloadUrl = :downloadUrl, #createdDate = :createdDate, #modifiedDate = :modifiedDate',
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
                'S': 'null'
            },
            ':title': {
                'S': file.title
            },
            ':mimeType': {
                'S': file.mimeType || 'application/octet-stream'
            },
            ':originalFilename': {
                'S': file.originalFilename
            },
            ':filesize': {
                'N': file.filesize + ''
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

FileService.prototype.saveFolder = function(folder, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var params = {
        Key: {
            entryId: {
                S: folder.entryId
            },
            kind: {
                S: 'folder'
            }
        },
        TableName: 'CCEntries',
        UpdateExpression: 'set #parentId = :parentId, #title = :title, #createdDate = :createdDate, #modifiedDate = :modifiedDate',
        ExpressionAttributeNames: {
            '#parentId': 'parentId',
            '#title': 'title',
            '#createdDate': 'createdDate',
            '#modifiedDate': 'modifiedDate'
        },
        ExpressionAttributeValues: {
            ':parentId': {
                'S': 'null'
            },
            ':title': {
                'S': folder.title
            },
            ':createdDate': {
                'S': folder.createdDate.toISOString()
            },
            ':modifiedDate': {
                'S': folder.modifiedDate.toISOString()
            }
        }
    };

    this.dynamoDB.updateItem(params, function(err, data) {
        if (err) return callback(err);

        callback(null);
    });
};

FileService.prototype.mapDBFile = function(dbFile) {
    var parentId = (dbFile.parentId['S'] === 'null') ? null : dbFile.parentId['S'];

    return {
        kind: 'file',
        entryId: dbFile.entryId['S'],
        parentId: parentId,
        title: dbFile.title['S'],
        mimeType: dbFile.mimeType['S'],
        originalFilename: dbFile.originalFilename['S'],
        filesize: dbFile.filesize['N'],
        downloadUrl: dbFile.downloadUrl['S'],
        createdDate: new Date(dbFile.createdDate['S']),
        modifiedDate: new Date(dbFile.modifiedDate['S'])
    };
};

FileService.prototype.mapDBFolder = function(dbFolder) {
    var parentId = (dbFolder.parentId['S'] === 'null') ? null : dbFolder.parentId['S'];

    return {
        kind: 'folder',
        entryId: dbFolder.entryId['S'],
        parentId: parentId,
        title: dbFolder.title['S'],
        createdDate: new Date(dbFolder.createdDate['S']),
        modifiedDate: new Date(dbFolder.modifiedDate['S'])
    };
};

FileService.prototype.createFile = function(parentId, title) {
    return {
        kind: 'file',
        entryId: uuid.v4(),
        parentId: parentId,
        title: title,
        mimeType: 'application/octet-stream',
        originalFilename: title,
        filesize: 42,
        downloadUrl: 'http://cs.umu.se',
        createdDate: new Date(),
        modifiedDate: new Date()
    };
};

FileService.prototype.createFolder = function(parentId, title) {
    return {
        kind: 'folder',
        entryId: uuid.v4(),
        parentId: parentId,
        title: title,
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
