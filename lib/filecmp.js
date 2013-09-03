
var async = require('async'),
    fs = require('fs'),
    path = require('path');

module.exports = filecmp
filecmp.filecmp = filecmp

var BUFSIZE = 8192;

function filecmp(filedir1, filedir2, callback) {
    if (!callback) throw new Error("No callback passed to filecmp()");

    compare(filedir1, filedir2, callback);

    function compare(filedir1, filedir2, callback) {
        var firstStat = null;
        fs.stat(filedir1, compareStats);
        fs.stat(filedir2, compareStats);
        function compareStats(err, secondStat) {
            if (err) return callback(err)
            if (firstStat === null) {
                firstStat = secondStat;
            } else {
                if (firstStat.isDirectory() && secondStat.isDirectory()) {
                    return compareDirectories(filedir1, filedir2, callback);
                } else if (firstStat.isFile() && secondStat.isFile()) {
                    if (firstStat.size !== secondStat.size)
                        return callbackDifferentFiles(callback);
                }
                compareFileContents(filedir1, filedir2, callback);
            }
        }
    }

    function compareDirectories(dir1, dir2, callback) {
        var leftRightFiles = [ [], [] ],
            res = { common: [],
                    onlyLeft: [],
                    onlyRight: [],
                    different: [],
                    areDifferent: false };

        readRercusivelyDir(dir1, leftRightFiles[0], 
            compareDirectoryFileList.bind(undefined, 0));
        readRercusivelyDir(dir2, leftRightFiles[1], 
            compareDirectoryFileList.bind(undefined, 1));

        function readRercusivelyDir(rootDir, outputFileList, callback) {
            function finalizeReadDir(nbDone, nbToDo) {
                if (nbDone === nbToDo) {
                    if (--running === 0)
                        callback();
                }
            }
            function readDir(dir) {
                fs.readdir(dir, function (err, files) {
                    var countStat = 0;
                    files.forEach(function (file) {
                        file = path.join(dir, file);
                        fs.stat(file, function (err, stat) {
                            if (stat.isDirectory()) {
                                running++;
                                process.nextTick(readDir.bind(undefined, file));
                            } else if (stat.isFile()) {
                                outputFileList.push(file.substr(rootDir.length+1));
                            }
                            finalizeReadDir(++countStat, files.length);
                        });
                    });
                    if (!files.length)
                        finalizeReadDir(0, 0);
                });
            }
            var running = 1;
            readDir(rootDir);
        }
    
        var leftRightSorted = [false, false];
        function compareDirectoryFileList(leftRightIndex) {
            async.sortBy(leftRightFiles[leftRightIndex], function (file, callback) {
                callback(null, file);
            }, function(err, sortedFiles) {
                leftRightFiles[leftRightIndex] = sortedFiles;
                leftRightSorted[leftRightIndex] = true;
                compareDirectorySortedFileList();
            });         
        }

        function compareDirectorySortedFileList() {
            if (leftRightSorted[0] && leftRightSorted[1]) {
                var i = j = 0;
                while (i < leftRightFiles[0].length ||
                       j < leftRightFiles[1].length) {
                    var leftFile = leftRightFiles[0].length > i ?
                                        leftRightFiles[0][i] : null,
                        rightFile = leftRightFiles[1].length > j ?
                                        leftRightFiles[1][j] : null;
                    if (!leftFile || leftFile > rightFile) {
                        res.onlyRight.push(rightFile)
                        j += 1;
                    } else if (!rightFile || leftFile < rightFile) {
                        res.onlyLeft.push(leftFile);
                        i += 1;
                    } else {
                        res.common.push(leftFile);
                        j += 1;
                        i += 1;
                    }
                }
                var done = 0;
                res.common.forEach(function (file) {
                    var leftFile = path.join(dir1, file),
                        rightFile = path.join(dir2, file);
                    compareFileContents(leftFile, rightFile, function(err, files) {
                        if (files && files.areDifferent) 
                            res.different.push(file);
                        finalizeCompareDirectories(err, ++done, res.common.length);
                    });
                });
                if (!res.common.length)
                    finalizeCompareDirectories(undefined, 0, 0);
            }
        }

        function finalizeCompareDirectories(err, done, toBeDone) {
            if (done === toBeDone) {
                if (res.onlyLeft.length || res.onlyRight.length || 
                    res.different.length)
                    res.areDifferent = true;
                callback(err, res);
            }
        }
    }

    function compareFileContents(file1, file2, callback) {
        var firstFD = null;
        fs.open(file1, 'r', compareFD);
        fs.open(file2, 'r', compareFD);
        function compareFD(err, secondFD) {
            if (err) return callback(err);
            if (firstFD === null) {
                firstFD = secondFD;
            } else {
                function cleanAndCallback(err, res2) {
                    fs.close(firstFD);
                    fs.close(secondFD);
                    callback(err, res2);
                }               
                compareFDContents(firstFD, secondFD, cleanAndCallback);
            }
        }   
    }

    function compareFDContents(fd1, fd2, callback) {
        var buffer1 = new Buffer(BUFSIZE),
            buffer2 = new Buffer(BUFSIZE),
            bytesRead1st = null;
        fs.read(fd1, buffer1, 0, buffer1.length, null, compareBulk);
        fs.read(fd2, buffer2, 0, buffer2.length, null, compareBulk);
        function compareBulk(err, bytesRead) {
            if (err) return callback(err);
            if (bytesRead1st === null) {
                bytesRead1st = bytesRead;
            } else if (bytesRead === 0 && bytesRead1st === 0) {
                callbackSameFiles(callback);
            } else if (bytesRead1st != bytesRead || 
                       !bufferAreEqual(buffer1, buffer2, bytesRead)) {
                callbackDifferentFiles(callback);
            } else {
                compareFDContents(fd1, fd2, callback);
            }
        }
        function bufferAreEqual(buffer1, buffer2, nbBytes) {
            for (var i = 0; i < nbBytes; i++) {
                if (buffer1[i] != buffer2[i])
                    return false;
            }
            return true;
        }
    }

    function callbackSameFiles(callback) {
        callback(null, {areDifferent: false});
    }
    function callbackDifferentFiles(callback) {
        callback(null, {areDifferent: true});
    }

}