#!/usr/bin/env node

var vows = require('vows'),
    temp = require('temp'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    filecmp = require('../lib/filecmp');

function createTempFilesFromContent(contentList, cb) {
    var fdList = [],
        pathList = [],
        nbFileCreated = 0;
    contentList.forEach(function (content) {
        var buffer = new Buffer(content);
        temp.open('filecmp', function (err, info) {
            assert.isNull(err);
            fdList.push(info.fd);
            pathList.push(info.path);
            fs.write(info.fd, buffer, 0, buffer.length, null, callback);
        });
    });
    function callback(err) {
        assert.isNull(err);
        if (++nbFileCreated === contentList.length)
            cb(fdList, pathList);
    }
}

vows.describe('filecmp').addBatch({

    'Comparing files': {

        'with same content': {
            topic: function () {
                var cb = this.callback,
                    fdList = [];
                createTempFilesFromContent(['same content', 'same content'], 
                    function (_fdList, pathList) {
                        fdList = _fdList;
                        filecmp.filecmp(pathList[0], pathList[1], cleanAndCallback);
                });
                function cleanAndCallback(err, res) {
                    fdList.forEach(function (fd) { fs.close(fd); });
                    cb(err, res);
                }
            },
            'areDifferent is equal to false': function (err, res) {
                assert.isNull(err);
                assert.strictEqual(res.areDifferent, false);
            }
        },

        'with different content': {
            topic: function () {
                var cb = this.callback,
                    fdList = [];
                createTempFilesFromContent(['same content', 'other content'], 
                    function (_fdList, pathList) {
                        fdList = _fdList;
                        filecmp.filecmp(pathList[0], pathList[1], cleanAndCallback);
                });
                function cleanAndCallback(err, res) {
                    fdList.forEach(function (fd) { fs.close(fd); });
                    cb(err, res);
                }
            },
            'areDifferent is equal to true': function (err, res) {
                assert.isNull(err);
                assert.strictEqual(res.areDifferent, true);
            }
        }

    },

    'Comparing a file': {
        
        'with a missing file': {
            topic: function () {
                var cb = this.callback,
                    fdList = [];
                createTempFilesFromContent(['content'], 
                    function (_fdList, pathList) {
                        fdList = _fdList;
                        filecmp.filecmp(pathList[0], pathList[0] + 'a', cleanAndCallback);
                });
                function cleanAndCallback(err, res) {
                    fs.close(fdList[0]);
                    cb(err, res);
                }
            },
            'returns ENOENT error': function (err, res) {
                assert.strictEqual(err.code, 'ENOENT');
            }
        },

        'with a directory': {
            topic: function () {
                var cb = this.callback;
                temp.mkdir('filecmp', function(err, dirPath) {
                    var fdList = [];
                    createTempFilesFromContent(['content'], 
                        function (_fdList, pathList) {
                            fdList = _fdList;
                            filecmp.filecmp(pathList[0], dirPath, cleanAndCallback);
                    });
                    function cleanAndCallback(err, res) {
                        fs.close(fdList[0]);
                        cb(err, res);
                    }                   
                });
            },
            'returns EISDIR error': function (err, res) {
                assert.strictEqual(err.code, 'EISDIR');
            }
        }       
    },

    'Comparing directories': {

        'with same content': {
            topic: function () {
                var cb = this.callback;
                temp.mkdir('filecmp', function(err, dirPath) {
                    fs.mkdirSync(path.join(dirPath, 'd1'));
                    fs.mkdirSync(path.join(dirPath, 'd1', 'subd'));
                    fs.writeFileSync(path.join(dirPath, 'd1', 'subd', 'f1'), 'content');
                    fs.writeFileSync(path.join(dirPath, 'd1', 'subd', 'f2'), 'content');
                    fs.mkdirSync(path.join(dirPath, 'd2'));
                    fs.mkdirSync(path.join(dirPath, 'd2', 'subd'));
                    fs.writeFileSync(path.join(dirPath, 'd2', 'subd', 'f1'), 'content');
                    fs.writeFileSync(path.join(dirPath, 'd2', 'subd', 'f2'), 'content');
                    filecmp.filecmp(path.join(dirPath, 'd1'), path.join(dirPath, 'd2'), cb);
                });
            },
            'areDifferent is equal to false': function (err, res) {
                assert.isNull(err);
                assert.strictEqual(res.areDifferent, false);
                assert.strictEqual(res.common.length, 2);
                assert.strictEqual(res.onlyLeft.length, 0);
                assert.strictEqual(res.onlyRight.length, 0);
            }
        },

        'where files have different names': {
            topic: function () {
                var cb = this.callback;
                temp.mkdir('filecmp', function(err, dirPath) {
                    fs.mkdirSync(path.join(dirPath, 'd1'));
                    fs.mkdirSync(path.join(dirPath, 'd1', 'subd'));
                    fs.writeFileSync(path.join(dirPath, 'd1', 'subd', 'f1'), 'content');
                    fs.writeFileSync(path.join(dirPath, 'd1', 'subd', 'f2'), 'content');
                    fs.mkdirSync(path.join(dirPath, 'd2'));
                    fs.mkdirSync(path.join(dirPath, 'd2', 'subd'));
                    fs.writeFileSync(path.join(dirPath, 'd2', 'subd', 'f1'), 'content');
                    fs.writeFileSync(path.join(dirPath, 'd2', 'subd', 'f22'), 'content');
                    filecmp.filecmp(path.join(dirPath, 'd1'), path.join(dirPath, 'd2'), cb);
                });
            },
            'different filenames are correctly returned': function (err, res) {
                assert.isNull(err);
                assert.strictEqual(res.areDifferent, true);
                assert.strictEqual(res.common.length, 1);
                assert.strictEqual(res.onlyLeft.length, 1);
                assert.strictEqual(res.onlyRight.length, 1);
            }
        },

        'where the content of a file is different': {
            topic: function () {
                var cb = this.callback;
                temp.mkdir('filecmp', function(err, dirPath) {
                    fs.mkdirSync(path.join(dirPath, 'd1'));
                    fs.mkdirSync(path.join(dirPath, 'd1', 'subd'));
                    fs.writeFileSync(path.join(dirPath, 'd1', 'subd', 'f1'), 'content');
                    fs.writeFileSync(path.join(dirPath, 'd1', 'subd', 'f2'), 'content2');
                    fs.mkdirSync(path.join(dirPath, 'd2'));
                    fs.mkdirSync(path.join(dirPath, 'd2', 'subd'));
                    fs.writeFileSync(path.join(dirPath, 'd2', 'subd', 'f1'), 'content');
                    fs.writeFileSync(path.join(dirPath, 'd2', 'subd', 'f2'), 'content');
                    filecmp.filecmp(path.join(dirPath, 'd1'), path.join(dirPath, 'd2'), cb);
                });
            },
            'the different file is correctly identified': function (err, res) {
                assert.isNull(err);
                assert.strictEqual(res.areDifferent, true);
                assert.strictEqual(res.common.length, 2);
                assert.strictEqual(res.onlyLeft.length, 0);
                assert.strictEqual(res.onlyRight.length, 0);
                assert.strictEqual(res.different.length, 1);
                assert.strictEqual(res.different[0], path.join('subd', 'f2'));
            }
        }

    }

}).export(module);
