// ─────────────────────────────────────────────────────────────
// DEBOUNCE UTILITY
// File: src/utils/debounce.js
//
// What this file teaches:
//   • Closures — `timer` is captured in the returned function's scope
//   • Higher-order functions — takes a function, returns a new function
//   • setTimeout / clearTimeout — browser timer APIs
//   • Practical performance pattern — reduces expensive work
//
// What is debouncing?
//   When the user types fast in a search box, we DON'T want to
//   fire an API call on every single keystroke. That would be
//   hundreds of requests. Instead, we WAIT until the user
//   STOPS typing for a set number of milliseconds, THEN fire.
//
// Example: user types "india" quickly
//   Without debounce: fires on "i", "in", "ind", "indi", "india" — 5 calls
//   With debounce (400ms): fires ONCE, only after the user stops
//
// How it works:
//   Every time the returned function is called, it:
//   1. Cancels any previously scheduled call (clearTimeout)
//   2. Schedules a new call to happen after `delay` ms
//   So the actual function only runs when the calls stop coming in.
// ─────────────────────────────────────────────────────────────

/**
 * Creates a debounced version of `fn` that delays execution by `delay` ms.
 *
 * @param {Function} fn    - The function to debounce (e.g. an API call or filter).
 * @param {number}   delay - Milliseconds of silence to wait before calling `fn`.
 * @returns {Function}     - The debounced wrapper function. Call it like the original.
 *
 * Closure concept: `timer` lives in this function's scope and is shared
 * across all calls to the returned wrapper — so each new call can cancel
 * the timer set by the previous call.
 */
export function debounce(fn, delay) {
  // `timer` holds the ID of the scheduled setTimeout so we can cancel it.
  // It persists between calls thanks to the closure over this function scope.
  let timer;

  // Return a new function that wraps the original.
  // The `...args` spread collects all arguments so we can forward them.
  return function (...args) {
    // Cancel the previously scheduled call (if any).
    // If the user is still typing, this prevents the last keystroke from firing.
    clearTimeout(timer);

    // Schedule a fresh call after `delay` ms of silence.
    // If the wrapped function is called again before delay expires,
    // the clearTimeout above will cancel this one too.
    timer = setTimeout(() => {
      // fn.apply(this, args) calls the original function with:
      //   - `this` preserved (so the function works correctly inside classes/objects)
      //   - the same arguments the wrapper received
      fn.apply(this, args);
    }, delay);
  };
}
