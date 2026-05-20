// ─────────────────────────────────────────────────────────────
// THROTTLE UTILITY
// File: src/utils/throttle.js
//
// What this file teaches:
//   • Closures — `lastRun` is captured in the returned function's scope
//   • Higher-order functions — takes a function, returns a new function
//   • Date.now() — current Unix timestamp in milliseconds
//   • Performance optimization for high-frequency DOM events
//
// What is throttling?
//   Some events fire VERY frequently — scroll, resize, mouse move.
//   A scroll event can fire 60+ times per second! If we do
//   expensive work on every single event, the page will lag.
//
//   Throttling says: "run this function AT MOST once every X ms."
//   Even if 100 events happen in 1 second, if X=200ms, we only
//   run the function 5 times.
//
// Difference from debounce:
//   Debounce = wait for silence, then run ONCE at the end
//   Throttle  = run at a steady maximum rate, no matter how many calls come in
//
// We use throttle for scroll handlers where we want regular updates
// (e.g. infinite scroll) without firing on every single pixel scrolled.
// ─────────────────────────────────────────────────────────────

/**
 * Creates a throttled version of `fn` that executes at most once per `limit` ms.
 *
 * @param {Function} fn    - The function to throttle (e.g. a scroll handler).
 * @param {number}   limit - Minimum milliseconds between consecutive executions.
 * @returns {Function}     - The throttled wrapper. Call it like the original.
 *
 * Closure concept: `lastRun` is shared across all calls via the enclosing scope,
 * letting each call check when the function last actually ran.
 */
export function throttle(fn, limit) {
  // Track when we last actually ran the function.
  // Starts at 0 so the very first call always goes through immediately.
  let lastRun = 0;

  // Return the throttled wrapper function.
  return function (...args) {
    const now = Date.now(); // current time in milliseconds since epoch

    // Only run if enough time has passed since the last successful run.
    // `now - lastRun` is the elapsed time in ms since the function last executed.
    if (now - lastRun >= limit) {
      lastRun = now;         // record this execution time for future comparisons
      fn.apply(this, args);  // call the original function with preserved context and args
    }
    // Otherwise: silently drop this call — throttle in action.
    // The next call that arrives after `limit` ms will go through.
  };
}
