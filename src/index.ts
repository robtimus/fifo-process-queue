export type Callback = () => void;
export type Processor<E> = (data: E, callback: Callback) => void;
export type PostProcessor<E> = (data: E) => void;

export interface Queue<E> {
  push(data: E): void;
  pushAll(data: E[]): void;
}

class SimpleQueue<E> implements Queue<E> {
  readonly #processor: Processor<E>;
  readonly #queue: E[];

  constructor(processor: Processor<E>) {
    this.#processor = processor;
    this.#queue = [];
  }

  #done(): void {
    this.#queue.shift();
    if (this.#queue.length > 0) {
      this.#processor(this.#queue[0], () => this.#done());
    }
  }

  public push(data: E): void {
    this.#queue.push(data);
    if (this.#queue.length === 1) {
      this.#processor(this.#queue[0], () => this.#done());
    }
  }

  public pushAll(data: E[]): void {
    data.forEach((d) => this.push(d));
  }
}

// 2^53 is the largest power of 2 for which 2^x !== 2^x - 1
const maxId = Math.pow(2, 53);

class PostProcessingQueue<E> implements Queue<E> {
  readonly #processor: Processor<E>;
  readonly #postProcessor: PostProcessor<E>;
  readonly #maxConcurrency: number;
  readonly #pending: E[];
  readonly #processing: { id: number; data: E; done: boolean }[];
  #currentId: number;

  constructor(processor: Processor<E>, postProcessor: PostProcessor<E>, maxConcurrency: number) {
    this.#processor = processor;
    this.#postProcessor = postProcessor;
    this.#maxConcurrency = maxConcurrency;

    this.#currentId = 0;
    this.#pending = [];
    this.#processing = [];
  }

  #nextId(): number {
    this.#currentId = (this.#currentId + 1) % maxId;
    return this.#currentId;
  }

  #startPending(): void {
    while (this.#processing.length < this.#maxConcurrency && this.#pending.length > 0) {
      const item = {
        id: this.#nextId(),
        data: this.#pending.shift()!,
        done: false,
      };
      const callback = () => this.#done(item.id);
      this.#processing.push(item);
      this.#processor(item.data, callback);
    }
  }

  #done(id: number): void {
    let item: { id: number; data: E; done: boolean };
    for (const item of this.#processing) {
      if (item.id === id && !item.done) {
        item.done = true;
      }
    }
    while (this.#processing.length > 0 && this.#processing[0].done) {
      item = this.#processing.shift()!;
      this.#postProcessor(item.data);
    }
    this.#startPending();
  }

  public push(data: E): void {
    this.#pending.push(data);
    this.#startPending();
  }

  public pushAll(data: E[]): void {
    data.forEach((d) => this.push(d));
  }
}

export function FIFOProcessQueue<E>(processor: Processor<E>): Queue<E>;
export function FIFOProcessQueue<E>(processor: Processor<E>, postProcessor: PostProcessor<E>): Queue<E>;
export function FIFOProcessQueue<E>(processor: Processor<E>, postProcessor: PostProcessor<E>, maxConcurrency: number): Queue<E>;
export function FIFOProcessQueue<E>(processor: Processor<E>, postProcessor?: PostProcessor<E>, maxConcurrency?: number): Queue<E> {
  if (maxConcurrency === undefined) {
    maxConcurrency = Number.MAX_VALUE;
  } else if (maxConcurrency < 1) {
    throw new Error("maxConcurrency must be at least 1");
  }

  return postProcessor ? new PostProcessingQueue(processor, postProcessor, maxConcurrency) : new SimpleQueue(processor);
}
