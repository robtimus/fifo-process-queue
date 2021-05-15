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
  // 2^53 is the largest power of 2 for which 2^x !== 2^x - 1
  private static readonly MAX_ID = Math.pow(2, 53);

  private currentId: number;
  private pending: E[] = [];
  private processing: Item<E>[] = [];

  constructor(private processor: Processor<E>, private postProcessor: PostProcessor<E>, private maxConcurrency: number) {
    this.currentId = 0;
  }

  private nextId(): number {
    this.currentId = (this.currentId + 1) % PostProcessingFIFOProcessQueue.MAX_ID;
    return this.currentId;
  }

  private startPending(): void {
    while (this.processing.length < this.maxConcurrency && this.pending.length > 0) {
      const item: Item<E> = {
        id: this.nextId(),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        data: this.pending.shift()!,
        done: false,
      };
      this.processing.push(item);
      this.processor(item.data, () => this.done(item.id));
    }
  }

  private done(id: number): void {
    for (let i = 0; i < this.processing.length; i++) {
      const item = this.processing[i];
      if (item.id === id && !item.done) {
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

  return postProcessor ? new PostProcessingFIFOProcessQueue(processor, postProcessor, maxConcurrency) : new SimpleFIFOProcessQueue(processor);
}
