var FIFOProcessQueue = require('../index');
var test = require('tape-catch');
var tapSpec = require('tap-spec');

test.createStream()
    .pipe(tapSpec())
    .pipe(process.stdout);

test('FIFOProcessQueue is a function', function (t) {
    t.equal(typeof FIFOProcessQueue, 'function', 'FIFOProcessQueue is a function');
    t.end();
});

test('FIFOProcessQueue returns an object with function push and pushAll', function (t) {
    var queue = FIFOProcessQueue(function () {});

    t.equal(typeof queue, 'object', 'FIFOProcessQueue returns an object');
    t.equal(typeof queue.push, 'function', 'FIFOProcessQueue.push is a function');
    t.equal(typeof queue.pushAll, 'function', 'FIFOProcessQueue.pushAll is a function');
    t.end();
});

test('FIFOProcessQueue throws an error if not provided with a processor function', function (t) {
    t.throws(FIFOProcessQueue, '[Error: processor must be a function]');
    t.end();
});

test('FIFOProcessQueue throws an error if provided with a non-function processor argument', function (t) {
    t.throws(function () {
        FIFOProcessQueue(1);
    }, '[Error: processor must be a function]');
    t.throws(function () {
        FIFOProcessQueue(null);
    }, '[Error: processor must be a function]');

    t.end();
});

test('FIFOProcessQueue throws an error if with a non-function postProcessor argument', function (t) {
    t.throws(function () {
        FIFOProcessQueue(function () {}, 1);
    }, '[Error: postProcessor must be a function]');
    t.throws(function () {
        FIFOProcessQueue(function () {}, null)
    }, '[Error: postProcessor must be a function]');

    t.end();
});

test('processed in FIFO order without post processor', function (t) {
    var times = [1500, 1000, 500];
    var items = times.map(function (x) {
        return { time: x };
    });
    var processed = [];
    var start = Date.now();
    var processor = function (data, callback) {
        setTimeout(function () {
            callback();
            processed.push(data);
            if (items.length === processed.length) {
                var end = Date.now();
                var timeTaken = end - start;
                var totalTime = times.reduce(function (sum, value) {
                    return sum + value;
                }, 0);
                t.deepEqual(items, processed, 'processed must be equal to items');
                t.ok(timeTaken >= totalTime, 'time taken should be at least the sum of times');
                t.end();
            }
        }, data.time);
    };
    var queue = FIFOProcessQueue(processor);
    queue.pushAll(items);
});

test('processed in FIFO order with post processor', function (t) {
    var times = [1500, 1000, 500];
    var items = times.map(function (x) {
        return { time: x };
    });
    var processed = [];
    var start = Date.now();
    var processor = function (data, callback) {
        setTimeout(function () {
            callback();
        }, data.time);
    };
    var postProcessor = function (data) {
        processed.push(data);
        if (items.length === processed.length) {
            var end = Date.now();
            var timeTaken = end - start;
            var totalTime = times.reduce(function (sum, value) {
                return sum + value;
            }, 0);
            var maxTime = times.reduce(function (max, value) {
                return max >= value ? max : value;
            }, 0);
            t.deepEqual(items, processed, 'processed must be equal to items');
            t.ok(timeTaken < totalTime, 'time taken should be smaller than the sum of times');
            t.ok(maxTime <= timeTaken && timeTaken < maxTime + 50, 'time taken should be approximately the max of times');
            t.end();
        }
    };
    var queue = FIFOProcessQueue(processor, postProcessor);
    queue.pushAll(items);
});

test('one processed at a time in processor without post processor', function (t) {
    var items = [1, 2, 3, 4, 5];
    var running = false;
    var processed = 0;

    var processor = function (data, callback) {
        t.equal(running, false, 'running must be false when processor starts');
        running = true;
        setTimeout(function () {
            t.equal(running, true, 'running must be true before callback() is called');
            running = false;
            processed++;
            if (processed === items.length) {
                t.end();
            }
            callback();
        }, 100);
    };
    var queue = FIFOProcessQueue(processor);
    queue.pushAll(items);
});
