// ─────────────────────────────────────────────────────────────
// DEBOUNCE UTILITY
// ─────────────────────────────────────────────────────────────
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

export function debounce(fn, delay) {
  // `timer` holds the ID of the scheduled setTimeout so we can cancel it
  let timer;

  // Return a new function that wraps the original
  return function (...args) {
    // Cancel the previously scheduled call (if any)
    clearTimeout(timer);

    // Schedule a fresh call after `delay` ms of silence
    timer = setTimeout(() => {
      fn.apply(this, args); // call original function with original arguments
    }, delay);
  };
}
