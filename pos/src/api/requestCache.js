/**
 * Request Deduplication Cache
 * Prevents multiple identical concurrent API requests
 */

// Map to store pending requests
const pendingRequests = new Map();

/**
 * Deduplicate concurrent requests with the same key
 * @param {string} key - Unique identifier for the request
 * @param {Function} requestFn - Async function that makes the request
 * @param {AbortSignal} [signal] - Optional abort signal; evicts cache entry on abort
 * @returns {Promise} The request result
 */
export const dedupeRequest = async (key, requestFn, signal) => {
  // Check if there's already a pending request with this key
  if (pendingRequests.has(key)) {
    console.log(`[RequestCache] Reusing pending request: ${key}`);
    return pendingRequests.get(key);
  }

  // If a signal is provided, evict the cache entry synchronously on abort
  // so that a subsequent call creates a fresh request
  if (signal) {
    const onAbort = () => {
      pendingRequests.delete(key);
      console.log(`[RequestCache] Evicted (aborted): ${key}`);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  }

  // Create the promise
  const promise = requestFn().finally(() => {
    // Clean up when done
    pendingRequests.delete(key);
    console.log(`[RequestCache] Completed and removed: ${key}`);
  });

  // Store the pending promise
  pendingRequests.set(key, promise);
  console.log(`[RequestCache] New request cached: ${key}`);

  return promise;
};

/**
 * Check if a request is already pending
 * @param {string} key - Request key
 * @returns {boolean}
 */
export const isRequestPending = (key) => {
  return pendingRequests.has(key);
};

/**
 * Get count of pending requests (for debugging)
 * @returns {number}
 */
export const getPendingRequestCount = () => {
  return pendingRequests.size;
};

/**
 * Clear all pending requests (useful for logout)
 */
export const clearPendingRequests = () => {
  pendingRequests.clear();
  console.log("[RequestCache] All pending requests cleared");
};

/**
 * Get list of pending request keys (for debugging)
 * @returns {string[]}
 */
export const getPendingRequestKeys = () => {
  return Array.from(pendingRequests.keys());
};
