// ─────────────────────────────────────────────────────────────
// THROTTLE UTILITY
// ─────────────────────────────────────────────────────────────
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
//   Debounce = wait for silence, then run ONCE
//   Throttle  = run at a steady rate, no matter how many calls come in
//
// We use throttle for the INFINITE SCROLL scroll handler below.
// ─────────────────────────────────────────────────────────────

export function throttle(fn, limit) {
  // Track when we last ran the function
  let lastRun = 0;

  return function (...args) {
    const now = Date.now(); // current time in milliseconds

    // Only run if enough time has passed since the last run
    if (now - lastRun >= limit) {
      lastRun = now;         // update the last-run timestamp
      fn.apply(this, args);  // call the original function
    }
    // Otherwise: silently skip this call (throttle in action)
  };
}
