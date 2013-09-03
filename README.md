filecmp
=======

Asynchronous file and directory comparison for Node.js

API
---
```javascript
var filecmp = require('filecmp');

// File comparison
filecmp.filecmp(file1, file2, function(err, res) {
  // res.areDifferent is true if file1 and file2 are not identical.
})

// Directory comparison
filecmp.filecmp(dir1, dir2, function(err, res) {
  // res.areDifferent is true if dir1 and dir2 do not contain the same files/contents,
  // res.common: contains the list of common files between dir1 and dir2,
  // res.onlyLeft: contains the files only present in dir1,
  // res.onlyRight: contains the files only present in dir2,
  // res.different: contains the list of different files.
})
```

Installation
------------

Install it using [npm](http://github.com/isaacs/npm):

    $ npm install filecmp

Testing
-------

Also using [npm](http://github.com/isaacs/npm):

    $ npm test
