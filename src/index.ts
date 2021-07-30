export type Callback = () => void;

export type Processor<E> = (data: E, callback: Callback) => void;

export type PostProcessor<E> = (data: E) => void;

export interface FIFOProcessQueue<E> {
  push(data: E): void;
  pushAll(data: E[]): void;
}

interface Item<E> {
  id: number;
  data: E;
  done: boolean;
}

function simpleFIFOProcessQueue<E>(processor: Processor<E>): FIFOProcessQueue<E> {
  const queue: E[] = [];

  function done() {
    queue.shift();
    if (queue.length > 0) {
      processor(queue[0], () => done());
    }
  }

  function push(data: E): void {
    queue.push(data);
    if (queue.length === 1) {
      processor(queue[0], () => done());
    }
  }

  function pushAll(data: E[]): void {
    data.forEach((d) => push(d));
  }

  return {
    push: push,
    pushAll: pushAll,
  };
}

// 2^53 is the largest power of 2 for which 2^x !== 2^x - 1
const maxId = Math.pow(2, 53);

function postProcessingFIFOProcessQueue<E>(processor: Processor<E>, postProcessor: PostProcessor<E>, maxConcurrency: number): FIFOProcessQueue<E> {

  let currentId = 0;
  const pending: E[] = [];
  const processing: Item<E>[] = [];

  function nextId(): number {
    currentId = (currentId + 1) % maxId;
    return currentId;
  }

  function startPending(): void {
    while (processing.length < maxConcurrency && pending.length > 0) {
      const item: Item<E> = {
        id: nextId(),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        data: pending.shift()!,
        done: false,
      };
      processing.push(item);
      processor(item.data, () => done(item.id));
    }
  }

  function done(id: number): void {
    for (let i = 0; i < processing.length; i++) {
      const item = processing[i];
      if (item.id === id && !item.done) {
        item.done = true;
        break;
      }
    }
    while (processing.length > 0 && processing[0].done) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const item = processing.shift()!;
      postProcessor(item.data);
    }
    startPending();
  }

  function push(data: E): void {
    pending.push(data);
    startPending();
  }

  function pushAll(data: E[]): void {
    data.forEach((d) => push(d));
  }

  return {
    push: push,
    pushAll: pushAll,
  };
}

export default function <E>(processor: Processor<E>): FIFOProcessQueue<E>;
export default function <E>(processor: Processor<E>, postProcessor: PostProcessor<E>): FIFOProcessQueue<E>;
export default function <E>(processor: Processor<E>, postProcessor: PostProcessor<E>, maxConcurrency: number): FIFOProcessQueue<E>;
export default function <E>(processor: Processor<E>, postProcessor?: PostProcessor<E>, maxConcurrency?: number): FIFOProcessQueue<E> {
  if (typeof processor !== "function") {
    throw new Error("processor must be a function");
  }
  if (typeof postProcessor !== "function" && typeof postProcessor !== "undefined") {
    throw new Error("postProcessor must be a function");
  }
  if (typeof maxConcurrency === "undefined") {
    maxConcurrency = Number.MAX_VALUE;
  } else if (typeof maxConcurrency !== "number") {
    throw new Error("maxConcurrency must be a number");
  } else if (maxConcurrency < 1) {
    throw new Error("maxConcurrency must be at least 1");
  }

  return postProcessor ? postProcessingFIFOProcessQueue(processor, postProcessor, maxConcurrency) : simpleFIFOProcessQueue(processor);
}
