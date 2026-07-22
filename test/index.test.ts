import { describe, test, expect } from "vitest";
import { Callback, PostProcessor, Processor, FIFOProcessQueue } from "../src";

describe("FIFOProcessQueue", () => {
  test("is a function", () => {
    expect(typeof FIFOProcessQueue).toBe("function");
  });

  test("returns an object with function push and pushAll", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const processor: Processor<string> = () => {};
    const queue = FIFOProcessQueue(processor);

    expect(typeof queue).toBe("object");
    expect(typeof queue.push).toBe("function");
    expect(typeof queue.pushAll).toBe("function");
  });

  describe("throws an error", () => {
    describe("if maxConcurrency", () => {
      test("is < 1", () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const processor: Processor<string> = () => {};
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const postProcessor: PostProcessor<string> = () => {};

        expect(() => FIFOProcessQueue(processor, postProcessor, 0.9999)).toThrow("maxConcurrency must be at least 1");
      });
    });
  });
});

describe("Data is processed in FIFO order", () => {
  interface Item {
    time: number;
  }
  function toItem(n: number): Item {
    return { time: n };
  }

  test("without post processor", () =>
    new Promise<void>((done) => {
      const times = [1500, 1000, 500];
      const items: Item[] = times.map(toItem);
      const processed: Item[] = [];
      const start = Date.now();
      const processor = (item: Item, callback: Callback) => {
        setTimeout(() => {
          callback();
          processed.push(item);
          if (items.length === processed.length) {
            const end = Date.now();
            const timeTaken = end - start;
            const totalTime = times.reduce((sum, value) => sum + value, 0);

            expect(processed).toEqual(items);
            expect(timeTaken).toBeGreaterThanOrEqual(totalTime);

            done();
          }
        }, item.time);
      };
      const queue = FIFOProcessQueue(processor);
      queue.pushAll(items);
    }));

  test("with post processor", () =>
    new Promise<void>((done) => {
      const times = [1500, 1000, 500];
      const items: Item[] = times.map(toItem);
      const processed: Item[] = [];
      const start = Date.now();
      const processor = (item: Item, callback: Callback) => {
        setTimeout(function () {
          callback();
        }, item.time);
      };
      const postProcessor = (item: Item) => {
        processed.push(item);
        if (items.length === processed.length) {
          const end = Date.now();
          const timeTaken = end - start;
          const totalTime = times.reduce((sum, value) => sum + value, 0);
          const maxTime = times.reduce((max, value) => (max >= value ? max : value), 0);

          expect(processed).toEqual(items);
          expect(timeTaken).toBeLessThan(totalTime);
          expect(timeTaken).toBeGreaterThanOrEqual(maxTime);
          expect(timeTaken).toBeLessThan(maxTime + 50);

          done();
        }
      };
      const queue = FIFOProcessQueue(processor, postProcessor);
      queue.pushAll(items);
    }));
});

describe("One item is processed at a time in processor", () => {
  test("without post processor", () =>
    new Promise<void>((done) => {
      const items = [1, 2, 3, 4, 5];
      let running = false;
      let processed = 0;

      const processor = (item: number, callback: Callback) => {
        expect(running).toBe(false);
        running = true;

        setTimeout(() => {
          expect(running).toBe(true);
          running = false;

          processed++;
          if (processed === items.length) {
            done();
          }
          callback();
        }, 100);
      };
      const queue = FIFOProcessQueue(processor);
      queue.pushAll(items);
    }));

  test("with post processor and maxConcurrency 1", () =>
    new Promise<void>((done) => {
      const items = [1, 2, 3, 4, 5];
      let running = false;
      let processed = 0;

      const processor = (data: number, callback: Callback) => {
        expect(running).toBe(false);
        running = true;

        setTimeout(() => {
          expect(running).toBe(true);
          running = false;

          callback();
        }, 100);
      };
      const postProcessor = () => {
        processed++;
        if (processed === items.length) {
          done();
        }
      };
      const queue = FIFOProcessQueue(processor, postProcessor, 1);
      queue.pushAll(items);
    }));
});

describe("Bulk processing", () => {
  interface Item {
    value: number;
    triple: number;
    square: number;
    root: number;
  }
  function toItem(n: number): Item {
    return {
      value: n,
      triple: n * 3,
      square: n * n,
      root: Math.sqrt(n),
    };
  }

  test("without post processor", () =>
    new Promise<void>((done) => {
      const items: Item[] = new Array(10000)
        .fill(0)
        .map((value, index) => index)
        .map(toItem);
      const processed: Item[] = [];

      const processor = (item: Item, callback: Callback) => {
        processed.push(item);
        callback();

        if (processed.length === items.length) {
          expect(processed).toEqual(items);
          done();
        }
      };
      const queue = FIFOProcessQueue(processor);
      queue.pushAll(items);
    }));

  describe("with post processor", () => {
    test("and unlimited concurrency", () =>
      new Promise<void>((done) => {
        const items: Item[] = new Array(10000)
          .fill(0)
          .map((value, index) => index)
          .map(toItem);
        const processed: Item[] = [];

        const processor = (item: Item, callback: Callback) => {
          callback();
        };
        const postProcessor = (item: Item) => {
          setTimeout(
            () => {
              processed.push(item);

              if (processed.length === items.length) {
                processed.sort((a, b) => a.value - b.value);

                expect(processed).toEqual(items);
                done();
              }
            },
            Math.random() * 100 + 100,
          );
        };
        const queue = FIFOProcessQueue(processor, postProcessor);
        queue.pushAll(items);
      }));

    test("and limited concurrency", () =>
      new Promise<void>((done) => {
        const items: Item[] = new Array(10000)
          .fill(0)
          .map((value, index) => index)
          .map(toItem);
        const processed: Item[] = [];

        const processor = (item: Item, callback: Callback) => {
          callback();
        };
        const postProcessor = (item: Item) => {
          setTimeout(
            () => {
              processed.push(item);

              if (processed.length === items.length) {
                processed.sort((a, b) => a.value - b.value);

                expect(processed).toEqual(items);
                done();
              }
            },
            Math.random() * 100 + 100,
          );
        };
        const queue = FIFOProcessQueue(processor, postProcessor, 10);
        queue.pushAll(items);
      }));
  });
});

describe("Processing advances if data is modified", () => {
  interface Item {
    value: number;
    time: number;
  }
  function toItem(n: number): Item {
    return {
      value: n,
      time: n,
    };
  }

  test("without post processor", () =>
    new Promise<void>((done) => {
      const times = [1500, 1000, 500];
      const items: Item[] = times.map(toItem);
      const processed: Item[] = [];
      const start = Date.now();
      const processor = (item: Item, callback: Callback) => {
        setTimeout(() => {
          item.value *= 2;
          callback();
          processed.push(item);
          if (items.length === processed.length) {
            const end = Date.now();
            const timeTaken = end - start;
            const totalTime = times.reduce((sum, value) => sum + value, 0);

            expect(processed).toEqual(items);
            expect(timeTaken).toBeGreaterThanOrEqual(totalTime);

            done();
          }
        }, item.time);
      };
      const queue = FIFOProcessQueue(processor);
      queue.pushAll(items);
    }));

  test("with post processor", () =>
    new Promise<void>((done) => {
      const times = [1500, 1000, 500];
      const items: Item[] = times.map(toItem);
      const processed: Item[] = [];
      const start = Date.now();
      const processor = (item: Item, callback: Callback) => {
        setTimeout(function () {
          item.value *= 2;
          callback();
        }, item.time);
      };
      const postProcessor = (item: Item) => {
        item.value *= 2;
        processed.push(item);
        if (items.length === processed.length) {
          const end = Date.now();
          const timeTaken = end - start;
          const totalTime = times.reduce((sum, value) => sum + value, 0);
          const maxTime = times.reduce((max, value) => (max >= value ? max : value), 0);

          expect(processed).toEqual(items);
          expect(timeTaken).toBeLessThan(totalTime);
          expect(timeTaken).toBeGreaterThanOrEqual(maxTime);
          expect(timeTaken).toBeLessThan(maxTime + 50);

          done();
        }
      };
      const queue = FIFOProcessQueue(processor, postProcessor);
      queue.pushAll(items);
    }));
});
