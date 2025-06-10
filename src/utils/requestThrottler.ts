/**
 * Request throttling utility to prevent browser resource exhaustion
 * by limiting the number of concurrent API requests.
 */

interface QueuedRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class RequestThrottler {
  private maxConcurrent: number;
  private runningCount: number;
  private queue: QueuedRequest[];
  private static instance: RequestThrottler;

  private constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
    this.runningCount = 0;
    this.queue = [];
  }

  public static getInstance(maxConcurrent: number = 5): RequestThrottler {
    if (!RequestThrottler.instance) {
      RequestThrottler.instance = new RequestThrottler(maxConcurrent);
    }
    return RequestThrottler.instance;
  }

  /**
   * Adds a request to the queue and executes it when capacity is available
   * @param requestFn Function that returns a promise (the actual request)
   * @returns Promise that resolves with the result of the request
   */
  public async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        execute: async () => {
          try {
            const result = await requestFn();
            return result;
          } catch (error) {
            throw error;
          }
        },
        resolve,
        reject
      };

      this.queue.push(queuedRequest);
      this.processQueue();
    });
  }

  /**
   * Process the next items in the queue if capacity is available
   */
  private processQueue(): void {
    if (this.runningCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Process as many items as we can up to maxConcurrent
    while (this.runningCount < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) continue;

      this.runningCount++;

      // Execute the request
      request.execute()
        .then((result) => {
          request.resolve(result);
        })
        .catch((error) => {
          request.reject(error);
        })
        .finally(() => {
          this.runningCount--;
          this.processQueue(); // Process next item when this one completes
        });
    }
  }

  /**
   * Set the maximum number of concurrent requests
   */
  public setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
    // Process queue in case we increased capacity
    this.processQueue();
  }

  /**
   * Get the current number of requests in the queue
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get the current number of running requests
   */
  public getRunningCount(): number {
    return this.runningCount;
  }
}

/**
 * Throttled fetch function that limits concurrent requests
 * @param input Request URL or Request object
 * @param init Optional request init options
 * @returns Promise with fetch response
 */
export async function throttledFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const throttler = RequestThrottler.getInstance();
  
  return throttler.add(async () => {
    return fetch(input, init);
  });
}

export default RequestThrottler.getInstance(); 