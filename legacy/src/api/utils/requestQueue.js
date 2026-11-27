// src/api/utils/requestQueue.js

class RequestQueue {
  constructor(maxConcurrent = 3, delayMs = 100) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.lastRequestTime = 0;
  }

  /**
   * Add request to queue
   * @param {Function} requestFn - Function that returns a promise
   * @param {number} priority - Higher = runs first (default: 0)
   */
  add(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject, priority });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { requestFn, resolve, reject } = this.queue.shift();

    try {
      // Rate limiting
      const elapsed = Date.now() - this.lastRequestTime;
      if (elapsed < this.delayMs) {
        await new Promise((r) => setTimeout(r, this.delayMs - elapsed));
      }

      this.lastRequestTime = Date.now();
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }

  /**
   * Clear pending queue
   */
  clear() {
    this.queue.forEach(({ reject }) => {
      reject(new Error("Queue cleared"));
    });
    this.queue = [];
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      pending: this.queue.length,
      running: this.running,
    };
  }
}

// Increased concurrent requests and reduced delay for better UX
export const apiQueue = new RequestQueue(3, 100);