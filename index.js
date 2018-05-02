var FIFOProcessQueue = function (processor, postProcessor, maxConcurrency) {
    if (typeof processor !== 'function') {
        throw new Error('processor must be a function');
    }
    if (typeof postProcessor !== 'function' && typeof postProcessor !== 'undefined') {
        throw new Error('postProcessor must be a function');
    }
    if (typeof maxConcurrency === 'undefined') {
        maxConcurrency = Number.MAX_VALUE;
    }
    if (typeof maxConcurrency !== 'number') {
        throw new Error('maxConcurrency must be a number');
    }
    if (maxConcurrency < 1) {
        throw new Error('maxConcurrency must be at least 1');
    }

    var push;

    if (postProcessor) {
        var pending = [];
        var processing = [];

        function startPending() {
            while (processing.length < maxConcurrency && pending.length > 0) {
                var item = {
                    data: pending.shift(),
                    done: false
                };
                processing.push(item);
                processor(item.data, function() {
                    done(item.data);
                });
            }
        }

        function done(data) {
            for (var i = 0; i < processing.length; i++) {
                if (processing[i].data === data && !processing[i].done) {
                    processing[i].done = true;
                    break;
                }
            }
            while (processing.length > 0 && processing[0].done) {
                var item = processing.shift();
                postProcessor(item.data);
            }
            startPending();
        }

        push = function (data) {
            pending.push(data);
            startPending();
        };
    } else {
        var queue = [];

        function done() {
            queue.shift();
            if (queue.length > 0) {
                processor(queue[0], done);
            }
        }

        push = function (data) {
            queue.push(data);
            if (queue.length === 1) {
                processor(data, done);
            }
        };
    }

    return {
        push: push,
        pushAll: function (data) {
            data.forEach(push);
        }
    };
};

if (typeof module !== 'undefined') {
    module.exports = FIFOProcessQueue;
}
