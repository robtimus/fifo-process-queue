/* eslint-disable no-undef */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('fifo-process-queue', [], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FIFOProcessQueue = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  function simpleFIFOProcessQueue(processor) {
    var queue = [];

    function done() {
      queue.shift();
      if (queue.length > 0) {
        processor(queue[0], done);
      }
    }

    function push(data) {
      queue.push(data);
      if (queue.length === 1) {
        processor(queue[0], done);
      }
    }

    function pushAll(data) {
      data.forEach(push);
    }

    return {
      push: push,
      pushAll: pushAll
    }
  }

  // 2^53 is the largest power of 2 for which 2^x !== 2^x - 1
  var maxId = Math.pow(2, 53);

  function postProcessingFIFOProcessQueue(processor, postProcessor, maxConcurrency) {
    var currentId = 0;
    var pending = [];
    var processing = [];

    function nextId() {
      currentId = (currentId + 1) % maxId;
      return currentId;
    }

    function startPending() {
      while (processing.length < maxConcurrency && pending.length > 0) {
        var item = {
          id: nextId(),
          data: pending.shift(),
          done: false
        };
        processing.push(item);
        processor(item.data, function () { done(item.id)});
      }
    }

    function done(id) {
      var item;
      for (var i = 0; i < processing.length; i++) {
        item = processing[i];
        if (item.id === id && !item.done) {
          item.done = true;
        }
      }
      while (processing.length > 0 && processing[0].done) {
        item = processing.shift();
        postProcessor(item.data);
      }
      startPending();
    }

    function push(data) {
      pending.push(data);
      startPending();
    }

    function pushAll(data) {
      data.forEach(push);
    }

    return {
      push: push,
      pushAll: pushAll
    }
  }

  return function(processor, postProcessor, maxConcurrency) {
    if (typeof processor !== 'function') {
      throw new Error('processor must be a function');
    }
    if (typeof postProcessor !== 'function' && typeof postProcessor !== 'undefined') {
      throw new Error('postProcessor must be a function');
    }
    if (typeof maxConcurrency === 'undefined') {
      maxConcurrency = Number.MAX_VALUE;
    } else if (typeof maxConcurrency !== 'number') {
      throw new Error('maxConcurrency must be a number');
    } else if (maxConcurrency < 1) {
      throw new Error('maxConcurrency must be at least 1');
    }

    return postProcessor ? postProcessingFIFOProcessQueue(processor, postProcessor, maxConcurrency) : simpleFIFOProcessQueue(processor);
  }
}));
