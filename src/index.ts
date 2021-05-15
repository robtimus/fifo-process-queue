export type Callback = () => void;

export type Processor<E> = (data: E, callback: Callback) => void;

export type PostProcessor<E> = (data: E) => void;

export interface FIFOProcessQueue<E> {
  push(data: E): void;
  pushAll(data: E[]): void;
}

interface Item<E> {
  data: E;
  done: boolean;
}

class SimpleFIFOProcessQueue<E> implements FIFOProcessQueue<E> {
  private queue: E[] = [];

  constructor(private processor: Processor<E>) {}

  private done() {
    this.queue.shift();
    if (this.queue.length > 0) {
      this.processor(this.queue[0], () => this.done());
    }
  }

  push(data: E): void {
    this.queue.push(data);
    if (this.queue.length === 1) {
      this.processor(this.queue[0], () => this.done());
    }
  }

  pushAll(data: E[]): void {
    data.forEach((d) => this.push(d));
  }
}

class PostProcessingFIFOProcessQueue<E> implements FIFOProcessQueue<E> {
  private pending: E[] = [];
  private processing: Item<E>[] = [];

  constructor(private processor: Processor<E>, private postProcessor: PostProcessor<E>, private maxConcurrency: number) {}

  private startPending(): void {
    while (this.processing.length < this.maxConcurrency && this.pending.length > 0) {
      const item: Item<E> = {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        data: this.pending.shift()!,
        done: false,
      };
      this.processing.push(item);
      this.processor(item.data, () => this.done(item.data));
    }
  }

  private done(data: E): void {
    for (let i = 0; i < this.processing.length; i++) {
      const item = this.processing[i];
      if (item.data === data && !item.done) {
        item.done = true;
        break;
      }
    }
    while (this.processing.length > 0 && this.processing[0].done) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const item = this.processing.shift()!;
      this.postProcessor(item.data);
    }
    this.startPending();
  }

  push(data: E): void {
    this.pending.push(data);
    this.startPending();
  }

  pushAll(data: E[]): void {
    data.forEach((d) => this.push(d));
  }
}

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

  return postProcessor ? new PostProcessingFIFOProcessQueue(processor, postProcessor, maxConcurrency) : new SimpleFIFOProcessQueue(processor);
}
