export as namespace FIFOProcessQueue;

declare function FIFOProcessQueue<E>(processor: FIFOProcessQueue.Processor<E>): FIFOProcessQueue.Queue<E>;
declare function FIFOProcessQueue<E>(
  processor: FIFOProcessQueue.Processor<E>,
  postProcessor: FIFOProcessQueue.PostProcessor<E>,
): FIFOProcessQueue.Queue<E>;
declare function FIFOProcessQueue<E>(
  processor: FIFOProcessQueue.Processor<E>,
  postProcessor: FIFOProcessQueue.PostProcessor<E>,
  maxConcurrency: number,
): FIFOProcessQueue.Queue<E>;

declare namespace FIFOProcessQueue {
  export type Callback = () => void;
  export type Processor<E> = (data: E, callback: Callback) => void;
  export type PostProcessor<E> = (data: E) => void;

  export interface Queue<E> {
    push(data: E): void;
    pushAll(data: E[]): void;
  }
}

export = FIFOProcessQueue;
