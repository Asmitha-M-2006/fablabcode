// ─────────────────────────────────────────────────────────────
// PAGE 4 — G-CODE LAB
// File: src/pages/GCodePage.jsx
//
// What this file teaches:
//   ✅ fetch + API    → POST /api/gcode/generate to our backend
//   ✅ async/await    → generateGcode() waits for the server response
//   ✅ Error handling → try/catch + error state shown in the UI
//   ✅ Controlled inputs → value + onChange on every form element
//   ✅ Form submit event → e.preventDefault() stops page reload
//   ✅ HOFs           → .map() to render G-code lines and example chips
//   ✅ Clipboard API  → navigator.clipboard.writeText()
//   ✅ useState       → 8 separate pieces of form + UI state
//
// Purpose:
//   The G-code Lab lets a user type a plain-English CNC instruction
//   (e.g. "draw a square 50") and get real G-code output back from
//   the server, along with a 3D toolpath visualization.
//
// G-code primer:
//   G-code is the language CNC machines, laser cutters, and 3D printers use.
//   G0 = rapid move (no cutting)  — tool moves quickly through air
//   G1 = linear cut move           — tool moves and cuts at the feedrate
//   G2 = clockwise arc             — circular interpolation CW
//   G3 = counter-clockwise arc     — circular interpolation CCW
//   G20 = use inches               — imperial units
//   G21 = use millimetres          — metric units
//   G90 = absolute positioning     — coordinates are from machine origin
//   M2  = program end              — signals the CNC to stop
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Copy, Check, Loader, Play } from 'lucide-react';
import GCode3DViewer from '../components/GCode3DViewer'; // Three.js 3D viewer

// Example instructions the user can click to auto-fill the input.
// These map to specific shape templates on the backend (gcode-service.js).
const EXAMPLES = [
  'draw a square 50',       // squareTemplate — 4 G1 moves
  'draw a circle radius 30',// circleTemplate — G2 arc command
  'draw a sphere radius 25',// sphereTemplate — multiple Z-height passes
  'draw a rectangle 80x40', // rectangleTemplate — width x height
  'draw a triangle 60',     // triangleTemplate — equilateral triangle
  'draw a hexagon 30',      // polygonTemplate(6, ...) — 6-sided polygon
  'engrave HELLO',          // engraveTemplate — vertical stroke per letter
  'line from (0,0) to (100,80)', // lineTemplate — single G1 move
];

/**
 * GCodePage — G-code Lab: converts plain English to CNC G-code.
 *
 * @param {Function} showToast - Notification function passed from App.jsx.
 */
function GCodePage({ showToast }) {

  // ── STATE ────────────────────────────────────────────────
  // All form inputs are "controlled" — their value is driven by state.
  // Every onChange event calls the matching setter to keep them in sync.

  // The text instruction typed or clicked by the user
  const [instruction, setInstruction] = useState('');

  // Units: 'mm' (metric, default) or 'inch' (imperial)
  // G21 is emitted for mm, G20 for inch
  const [units,       setUnits]       = useState('mm');

  // Feed rate in mm/min — how fast the tool moves during cutting (G1) moves
  // Higher = faster but may sacrifice cut quality; lower = precise but slow
  const [feed,        setFeed]        = useState(1000);

  // Safe Z — the height the tool retracts to between moves (G0 Z{safeZ})
  // Must be above the workpiece so the tool doesn't drag across it
  const [safeZ,       setSafeZ]       = useState(2);

  // Tool type — changes the labels in the G-code header comments
  const [tool,        setTool]        = useState('Pen (Drawing)');

  // result: the full server response: { code, toolpath, explanation, summary }
  // null until the first successful generation
  const [result,      setResult]      = useState(null);

  // loading: true while the fetch is in progress → shows spinner on the button
  const [loading,     setLoading]     = useState(false);

  // error: message to show if the fetch fails or the server returns an error
  const [error,       setError]       = useState('');

  // copied: true for 2s after the user copies G-code → shows "Copied" label
  const [copied,      setCopied]      = useState(false);

  // ── generateGcode(e) ─────────────────────────────────────
  // Called when the form is submitted (user presses Enter or clicks Generate).
  // e.preventDefault() stops the browser's default form behavior (page reload).
  //
  // Sends a POST request to our backend with the form values.
  // The backend (gcode-service.js) returns:
  //   { code: string[], toolpath: {cmd,x,y,z}[], explanation, summary }
  async function generateGcode(e) {
    e.preventDefault(); // stop default HTML form submit (prevents page reload)
    if (!instruction.trim()) return; // ignore if the input is empty

    try {
      setLoading(true);
      setError('');
      setResult(null); // clear previous result while loading

      // POST /api/gcode/generate — sends the form values as JSON
      const res = await fetch('/api/gcode/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: instruction.trim(), // e.g. "draw a square 50"
          units,                           // 'mm' or 'inch' → G21 or G20
          feed: Number(feed),              // feedrate as a number (not string)
          safeZ: Number(safeZ),            // safe height as a number
          tool,                            // tool label for the header comment
        }),
      });

      // Handle HTTP-level errors (4xx / 5xx responses)
      if (!res.ok) {
        const body = await res.json();
        // Use the error message from the server if available, else generic status
        throw new Error(body?.error?.message || `Error ${res.status}`);
      }

      const data = await res.json(); // parse the successful response
      setResult(data);               // store result → re-render shows G-code + 3D view

    } catch (err) {
      // Error handling — display a readable message in the UI
      setError(err.message || 'Failed to generate G-code.');
    } finally {
      // finally always runs — always hide the spinner when done
      setLoading(false);
    }
  }

  // ── copyGcode() ──────────────────────────────────────────
  // Copies all G-code lines to the clipboard as a newline-joined string.
  // Uses the Clipboard API which is async and promise-based.
  // Shows "Copied" label for 2 seconds using a setTimeout timer.
  function copyGcode() {
    if (!result?.code) return; // do nothing if there's no result yet
    navigator.clipboard.writeText(result.code.join('\n')); // join array into multi-line string
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // reset after 2s
  }

  return (
    <div className="gcode-page">

      {/* ── LEFT COLUMN: instruction form ────────────────── */}
      <div className="gcode-input">
        <h2 className="page-h2">G-code Lab</h2>
        <p className="gcode-hint">
          Type a plain-English instruction and get real G-code back.
        </p>

        {/* ── Example chips ─────────────────────────────── */}
        {/* .map() is a Higher-Order Function: transforms EXAMPLES array into buttons.
            Each click sets the instruction input to that example text,
            which also highlights the chip as 'active'. */}
        <div className="example-chips">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              className={`ex-chip ${instruction === ex ? 'active' : ''}`}
              onClick={() => setInstruction(ex)} // click event: auto-fill the input
            >
              {ex}
            </button>
          ))}
        </div>

        {/* ── Main form ─────────────────────────────────── */}
        {/* onSubmit fires when user presses Enter or clicks the Generate button.
            We call generateGcode() which does the async fetch. */}
        <form onSubmit={generateGcode} className="gcode-form">

          {/* Controlled text input: value = state, onChange updates state */}
          <input
            className="gcode-text-input"
            type="text"
            placeholder="e.g. draw a square 50"
            value={instruction}
            onChange={e => setInstruction(e.target.value)} // updates state on every keystroke
          />

          {/* ── Settings row ──────────────────────────── */}
          {/* Each input is controlled: its value comes from state,
              and onChange updates state. Number inputs cast to Number on submit. */}
          <div className="gcode-settings">

            {/* Units selector: mm → G21, inch → G20 in the G-code output */}
            <label>
              Units
              <select value={units} onChange={e => setUnits(e.target.value)}>
                <option value="mm">mm</option>
                <option value="inch">inch</option>
              </select>
            </label>

            {/* Feed rate: speed of G1 (cutting) moves in mm/min.
                G1 X50 Y0 F{feed} — the F parameter sets the feedrate. */}
            <label>
              Feed (mm/min)
              <input type="number" value={feed} min={100} max={5000} step={100}
                onChange={e => setFeed(e.target.value)} />
            </label>

            {/* Safe Z: height the tool retracts to between cuts.
                G0 Z{safeZ} appears before every rapid move to avoid dragging. */}
            <label>
              Safe Z
              <input type="number" value={safeZ} min={0} max={20} step={1}
                onChange={e => setSafeZ(e.target.value)} />
            </label>

            {/* Tool type: used for the G-code header comment only */}
            <label>
              Tool
              <select value={tool} onChange={e => setTool(e.target.value)}>
                <option>Pen (Drawing)</option>
                <option>Laser</option>
                <option>End Mill</option>
                <option>Drag Knife</option>
              </select>
            </label>
          </div>

          {/* Submit button — disabled during loading or if instruction is empty.
              Shows a spinner icon while the request is in progress. */}
          <button className="btn-generate" type="submit" disabled={loading || !instruction.trim()}>
            {loading ? <Loader size={16} className="spin" /> : <Play size={16} />}
            {loading ? 'Generating…' : 'Generate G-code'}
          </button>
        </form>

        {/* Error message — only shown if the fetch or server returned an error */}
        {error && <div className="gcode-error">{error}</div>}

        {/* ── Summary stats ─────────────────────────────── */}
        {/* result.summary is an object like { time: '< 1 min', length: '200 mm', moves: 8, bounds: '...' }
            Object.entries() returns [[key, value], ...] which we .map() into chips */}
        {result?.summary && (
          <div className="gcode-summary">
            {Object.entries(result.summary).map(([k, v]) => (
              <div key={k} className="summary-chip">
                <span className="summary-key">{k}</span>
                <span className="summary-val">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT COLUMN: 3D viewer + G-code output ──────── */}
      <div className="gcode-output">

        {/* 3D toolpath viewer (Three.js component).
            Receives the toolpath array [{cmd, x, y, z}, ...] from the result.
            null before first generation → shows the empty state placeholder. */}
        <GCode3DViewer toolpath={result?.toolpath ?? null} />

        {/* ── G-code editor display ─────────────────────── */}
        {/* result.code is an array of strings like ['G21', 'G90', 'G0 Z2', 'G0 X0 Y0', ...]
            .map() renders each line with a line number and colour-codes comment lines (;). */}
        {result?.code && (
          <div className="gcode-editor">
            <div className="gcode-editor-header">
              <span className="gcode-title">Generated G-code</span>
              {/* Copy button — calls copyGcode() which uses the Clipboard API */}
              <button className="btn-copy-sm" onClick={copyGcode}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Each line rendered with a gutter line number.
                Lines starting with ';' get the gline-comment CSS class (greyed out).
                This is a HOF: .map() transforms the array of strings to JSX. */}
            <div className="gcode-lines">
              {result.code.map((line, i) => (
                <div key={i} className="gcode-line">
                  {/* Line number gutter — 1-based */}
                  <span className="gline-num">{i + 1}</span>

                  {/* G-code line text. Comment lines start with ';'.
                      CSS class gline-comment gives them a muted colour. */}
                  <span className={`gline-code ${line.startsWith(';') ? 'gline-comment' : ''}`}>
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Natural language explanation of what the G-code does */}
        {result?.explanation && (
          <p className="gcode-explanation">{result.explanation}</p>
        )}
      </div>
    </div>
  );
}

export default GCodePage;
