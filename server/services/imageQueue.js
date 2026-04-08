/**
 * imageQueue.js — T4
 * Server-side semaphore for Imagen 4 rate limiting.
 * Max 3 concurrent image generation calls.
 * Exponential backoff on 429 / quota errors.
 */

const MAX_CONCURRENT = 3;
const MAX_RETRIES = 3;

let _running = 0;
const _queue = [];

function flush() {
  while (_running < MAX_CONCURRENT && _queue.length > 0) {
    const job = _queue.shift();
    _running++;
    execute(job)
      .catch(() => {})
      .finally(() => {
        _running--;
        flush();
      });
  }
}

async function execute({ fn, resolve, reject, retries }) {
  try {
    const result = await fn();
    resolve(result);
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    const isRateLimit =
      err?.status === 429 ||
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('quota') ||
      msg.includes('resource exhausted');

    if (isRateLimit && retries < MAX_RETRIES) {
      // Exponential backoff: 1.5s, 3s, 6s + jitter
      const delay = Math.pow(2, retries) * 1500 + Math.random() * 500;
      console.log(`[imageQueue] Rate limited — retrying in ${Math.round(delay)}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, delay));
      // Re-enqueue at front (priority)
      _queue.unshift({ fn, resolve, reject, retries: retries + 1 });
    } else {
      reject(err);
    }
  }
}

/**
 * Enqueue an image generation function.
 * Returns a Promise that resolves when the function completes.
 * @param {Function} fn - async function that performs image generation and returns the result
 */
export function enqueueImageJob(fn) {
  return new Promise((resolve, reject) => {
    _queue.push({ fn, resolve, reject, retries: 0 });
    flush();
  });
}

/** Current queue depth (for monitoring) */
export function queueDepth() {
  return _queue.length;
}

/** Currently running count (for monitoring) */
export function runningCount() {
  return _running;
}
