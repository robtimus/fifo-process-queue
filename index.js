var FIFOProcessQueue = function (processor, postProcessor) {
    if (typeof processor !== 'function') {
        throw new Error('processor must be a function');
    }
    if (typeof postProcessor !== 'function' && typeof postProcessor !== 'undefined') {
        throw new Error('postProcessor must be a function');
    }

    var queue = [];

    var push;

    if (postProcessor) {
        function done(data) {
            for (var i = 0; i < queue.length; i++) {
                if (queue[i].data === data && queue[i].data !== 'done') {
                    queue[i].status = 'done';
                    break;
                }
            }
            while (queue.length > 0 && queue[0].status === 'done') {
                var item = queue.shift();
                postProcessor(item.data);
            }
        }

        push = function (data) {
            var item = {
                data: data,
                status: 'processing'
            };
            queue.push(item);
            processor(item.data, function () {
                done(data);
            });
        };
    } else {
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
