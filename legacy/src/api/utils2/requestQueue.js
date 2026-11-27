// src/api/utils/requestQueue.js

class RequestQueue {
  constructor(maxConcurrent = 2, delayMs = 200) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.lastRequestTime = 0;
  }

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
}

export const apiQueue = new RequestQueue(2, 200);