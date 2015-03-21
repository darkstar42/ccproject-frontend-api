'use strict';

var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var aws = require('aws-sdk');
var fs = require('fs');

var FileService = function(app) {
    this.app = app;

    this.dynamoDB = new aws.DynamoDB();
    this.s3 = new aws.S3({apiVersion: '2006-03-01'});

    this.setupEntriesTable();
    this.setupS3();
};

FileService.prototype.setupS3 = function() {
    var params = {
        Bucket: 'ccstore',
        ACL: 'public-read',
        CreateBucketConfiguration: {
            LocationConstraint: 'eu-west-1'
        }
    };

    this.s3.createBucket(params, function(err, data) {
        console.dir(err);
        console.dir(data);
    });
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

FileService.prototype.deleteFile = function(entryId, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var self = this;

    this.getFile(entryId, function(err, file) {
        if (err) throw new Error('Internal error while loading file');

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

        self.dynamoDB.deleteItem(params, function(err, data) {
            if (err) return callback(err);

            callback(null, file);
        });
    });
};

FileService.prototype.deleteFolder = function(entryId, callback) {
    if (typeof callback !== 'function') throw new Error('Last parameter must be a callback function');

    var self = this;

    this.getFolder(entryId, function(err, folder) {
        if (err) throw new Error('Internal error while loading folder');

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

        self.dynamoDB.deleteItem(params, function(err, data) {
            if (err) return callback(err);

            callback(null, folder);
        });
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
                'S': file.parentId
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

    if (folder.entryId === null) {
        folder.entryId = uuid.v4();
    }

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
                'S': folder.parentId
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

FileService.prototype.upload = function(folderId, file, callback) {
    var fileName = file.name;
    var fileObj = this.createFile(folderId, fileName);
        fileObj.mimeType = file.type;
        fileObj.filesize = file.size;
    var fileKey = fileObj.entryId;

    console.dir(fileObj);

    var s3 = this.s3;
    var self = this;

    var stream = fs.createReadStream(file.path);
    var params = {
        Bucket: 'ccstore', 
        Key: fileKey,
        ACL: 'public-read',
        Body: stream
    };

    s3.upload(params, function(err, data) {
        console.dir(err);
        console.dir(data);

        fileObj.downloadUrl = 'https://s3-eu-west-1.amazonaws.com/ccstore/' + fileKey;

        self.saveFile(fileObj, function(err) {
            callback(err, fileObj);
        });
    });
};

/**
 * Export
 */
module.exports = function(app) {
    return new FileService(app);
};
