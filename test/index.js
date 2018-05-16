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

test('FIFOProcessQueue throws an error if provided with a non-function postProcessor argument', function (t) {
    t.throws(function () {
        FIFOProcessQueue(function () {}, 1);
    }, '[Error: postProcessor must be a function]');
    t.throws(function () {
        FIFOProcessQueue(function () {}, null)
    }, '[Error: postProcessor must be a function]');

    t.end();
});

test('FIFOProcessQueue throws an error if provided with a non-number maxConcurrency argument', function (t) {
    t.throws(function () {
        FIFOProcessQueue(function () {}, function () {}, 'a');
    }, '[Error: maxConcurrency must be a number]');
    t.throws(function () {
        FIFOProcessQueue(function () {}, function () {}, null);
    }, '[Error: maxConcurrency must be a number]');

    t.end();
});

test('FIFOProcessQueue throws an error if provided with a maxConcurrency argument < 1', function (t) {
    t.throws(function () {
        FIFOProcessQueue(function () {}, function () {}, 0.9999);
    }, '[Error: maxConcurrency must be at least 1]');

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
                t.deepEqual(processed, items, 'processed must be equal to items');
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
            t.deepEqual(processed, items, 'processed must be equal to items');
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

test('one processed at a time in processor with post processor and maxConcurrency 1', function (t) {
    var items = [1, 2, 3, 4, 5];
    var running = false;
    var processed = 0;

    var processor = function (data, callback) {
        t.equal(running, false, 'running must be false when processor starts');
        running = true;
        setTimeout(function () {
            t.equal(running, true, 'running must be true before callback() is called');
            running = false;
            callback();
        }, 100);
    };
    var postProcessor = function (data) {
        processed++;
        if (processed === items.length) {
            t.end();
        }
    };
    var queue = FIFOProcessQueue(processor, postProcessor, 1);
    queue.pushAll(items);
});

test('bulk processing without post processor', function (t) {
    var items = Array.apply(null, { length: 10000 }).map(Number.call, Number).map(function (n) {
        return {
            value: n,
            triple: n * 3,
            square: n * n,
            root: Math.sqrt(n)
        };
    });
    var processed = [];

    var processor = function (data, callback) {
        processed.push(data);
        callback();
        if (processed.length === items.length) {
            t.deepEqual(processed, items, 'processed must be equal to items');
            t.end();
        }
    };
    var queue = FIFOProcessQueue(processor);
    queue.pushAll(items);
});

test('bulk processing with post processor and unlimited concurrency', function (t) {
    var items = Array.apply(null, { length: 10000 }).map(Number.call, Number).map(function (n) {
        return {
            value: n,
            triple: n * 3,
            square: n * n,
            root: Math.sqrt(n)
        };
    });
    var processed = [];

    var processor = function (data, callback) {
        callback();
    };
    var postProcessor = function (data) {
        setTimeout(function () {
            processed.push(data);
            if (processed.length === items.length) {
                processed.sort(function (a, b) {
                    return a.value - b.value;
                });
                t.deepEqual(processed, items, 'processed must be equal to items');
                t.end();
            }
        }, Math.random() * 100 + 100);
    };
    var queue = FIFOProcessQueue(processor, postProcessor);
    queue.pushAll(items);
});

test('bulk processing with post processor and limited concurrency', function (t) {
    var items = Array.apply(null, { length: 10000 }).map(Number.call, Number).map(function (n) {
        return {
            value: n,
            triple: n * 3,
            square: n * n,
            root: Math.sqrt(n)
        };
    });
    var processed = [];

    var processor = function (data, callback) {
        callback();
    };
    var postProcessor = function (data) {
        setTimeout(function () {
            processed.push(data);
            if (processed.length === items.length) {
                processed.sort(function (a, b) {
                    return a.value - b.value;
                });
                t.deepEqual(processed, items, 'processed must be equal to items');
                t.end();
            }
        }, Math.random() * 100 + 100);
    };
    var queue = FIFOProcessQueue(processor, postProcessor, 10);
    queue.pushAll(items);
});
