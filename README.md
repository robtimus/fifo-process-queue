# fifo-process-queue
[![npm](https://img.shields.io/npm/v/fifo-process-queue)](https://www.npmjs.com/package/fifo-process-queue)
[![Build Status](https://github.com/robtimus/fifo-process-queue/actions/workflows/build.yml/badge.svg)](https://github.com/robtimus/fifo-process-queue/actions/workflows/build.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=robtimus%3Afifo-process-queue&metric=alert_status)](https://sonarcloud.io/summary/overall?id=robtimus%3Afifo-process-queue)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=robtimus%3Afifo-process-queue&metric=coverage)](https://sonarcloud.io/summary/overall?id=robtimus%3Afifo-process-queue)
[![Known Vulnerabilities](https://snyk.io/test/github/robtimus/fifo-process-queue/badge.svg)](https://snyk.io/test/github/robtimus/fifo-process-queue)

A queue for processing data in FIFO order.

Process queues can run in one of two modes:

### FIFO processing mode

In _FIFO processing_ mode, pieces of data are processed one at a time. Only when the previous piece of data has been processed will the next piece of data be processed.

To create a queue in FIFO processing mode, provide only a _processor_ function. This function must take two arguments:
* The data to process. This is the data that was pushed onto the queue.
* A callback function. When the processing is done, this non-argument callback _must_ be called.

Example:
```js
var FIFOProcessQueue = require('fifo-process-queue');

var queue = FIFOProcessQueue(function (data, callback) {
    console.log('Processing', data);

    setTimeout(function () {
        console.log('Finished', data);
        callback();
    }, 100);
});

queue.push(1);
queue.push(2);
queue.pushAll([3, 4, 5]);
```

### FIFO post-processing mode

In _FIFO post-processing_ mode, pieces of data may be processed in parallel. However, after a piece of data has been processed, a _post-processor_ function is called for the piece of data. Invocations of this post-processor function are performed in FIFO order.

To create a queue in FIFO post-processing mode, provide not only a processor function (see above), but also a post-processor function. This function must take one argument:
* The data to process. This is the data that was pushed onto the queue.

In addition, the maximum number of concurrenty processed pieces of data can be given (at least 1). If this is omitted the queue will not impose any limits.

Example:
```js
var FIFOProcessQueue = require('fifo-process-queue');

var queue = FIFOProcessQueue(function (data, callback) {
    console.log('Processing', data);

    setTimeout(function () {
        console.log('Finished', data);
        callback();
    }, 100);
}, function (data) {
    console.log('Post-processing', data);
}, 10); // maximum 10 pieces of data processed concurrently; optional value

queue.push(1);
queue.push(2);
queue.pushAll([3, 4, 5]);
```

## Using in browsers

Besides using tools like [Browserify](http://browserify.org/), you can also simply include file `index.js` in a script tag. This will register a global function `FIFOProcessQueue` which can be used to create process queues.
