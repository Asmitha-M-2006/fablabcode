// ─────────────────────────────────────────────────────────────
// PAGE 4 — G-CODE LAB
// Concepts used:
//   ✅ fetch + API    → POST /api/gcode/generate to our backend
//   ✅ async/await    → async generateGcode()
//   ✅ Error handling → try/catch + error state in UI
//   ✅ Events         → form submit, chip click, select change
//   ✅ HOFs           → .map() to render G-code lines and example chips
// ─────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Check, Loader, Play } from 'lucide-react';

// Example instructions the user can click to auto-fill
const EXAMPLES = [
  'draw a square 50',
  'draw a circle radius 30',
  'draw a rectangle 80x40',
  'draw a triangle 60',
  'engrave HELLO',
  'line from (0,0) to (100,80)',
];

function GCodePage({ showToast }) {
  const [instruction, setInstruction] = useState('');
  const [units,       setUnits]       = useState('mm');
  const [feed,        setFeed]        = useState(1000);
  const [safeZ,       setSafeZ]       = useState(2);
  const [tool,        setTool]        = useState('Pen (Drawing)');
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [copied,      setCopied]      = useState(false);
  const canvasRef = useRef(null);

  // Draw toolpath preview on canvas whenever result changes
  useEffect(() => {
    if (result) drawPreview(result);
  }, [result]);

  // ── async: send instruction to backend, get G-code back ───
  async function generateGcode(e) {
    e.preventDefault(); // prevent default form submit (page reload)
    if (!instruction.trim()) return;

    try {
      setLoading(true);
      setError('');
      setResult(null);

      // fetch() POST to our own backend
      const res = await fetch('/api/gcode/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: instruction.trim(),
          units,
          feed: Number(feed),
          safeZ: Number(safeZ),
          tool,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message || `Error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      // Error handling — show a readable message
      setError(err.message || 'Failed to generate G-code.');
    } finally {
      setLoading(false);
    }
  }

  // ── Draw a simple toolpath preview on the canvas ──────────
  function drawPreview(data) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const W    = canvas.width;
    const H    = canvas.height;
    const PAD  = 30;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    // Draw grid lines
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 1;
    for (let x = PAD; x < W - PAD; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, H - PAD); ctx.stroke();
    }
    for (let y = PAD; y < H - PAD; y += 20) {
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    }

    const draw = W - PAD * 2; // drawable area
    const { shape } = data;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';

    // Scale to fit in the canvas
    function sc(val, max) { return PAD + (val / max) * draw; }

    if (shape === 'square') {
      const s = Math.min(draw * 0.7, draw);
      const x = (W - s) / 2; const y = (H - s) / 2;
      ctx.strokeRect(x, y, s, s);
    } else if (shape === 'rect') {
      const ratio = data.w / data.h;
      const rh = draw * 0.55; const rw = rh * ratio;
      const x  = (W - rw) / 2; const y = (H - rh) / 2;
      ctx.strokeRect(x, y, rw, rh);
    } else if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, draw * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape === 'triangle') {
      const cx = W / 2; const size = draw * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, H / 2 - size * 0.5);
      ctx.lineTo(cx + size * 0.5, H / 2 + size * 0.35);
      ctx.lineTo(cx - size * 0.5, H / 2 + size * 0.35);
      ctx.closePath(); ctx.stroke();
    } else if (shape === 'line') {
      const maxD = Math.max(Math.abs(data.x2 - data.x1), Math.abs(data.y2 - data.y1), 1);
      ctx.beginPath();
      ctx.moveTo(sc(data.x1, maxD * 1.2), H - sc(data.y1, maxD * 1.2));
      ctx.lineTo(sc(data.x2, maxD * 1.2), H - sc(data.y2, maxD * 1.2));
      ctx.stroke();
    } else if (shape === 'engrave' && data.text) {
      ctx.fillStyle = '#6366f1';
      ctx.font      = `bold ${Math.min(36, draw / data.text.length * 1.5)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.text, W / 2, H / 2);
    }

    // Origin dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(PAD, H - PAD, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Copy G-code to clipboard ───────────────────────────────
  function copyGcode() {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="gcode-page">

      {/* Left: input panel */}
      <div className="gcode-input">
        <h2 className="page-h2">G-code Lab</h2>
        <p className="gcode-hint">
          Type a plain-English instruction and get real G-code back.
        </p>

        {/* Example chips — .map() is a HOF rendering each example */}
        <div className="example-chips">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              className={`ex-chip ${instruction === ex ? 'active' : ''}`}
              onClick={() => setInstruction(ex)}  // click event
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Form — submit event calls generateGcode */}
        <form onSubmit={generateGcode} className="gcode-form">
          <input
            className="gcode-text-input"
            type="text"
            placeholder="e.g. draw a square 50"
            value={instruction}
            onChange={e => setInstruction(e.target.value)} // change event
          />

          {/* Settings row */}
          <div className="gcode-settings">
            <label>
              Units
              <select value={units} onChange={e => setUnits(e.target.value)}>
                <option value="mm">mm</option>
                <option value="inch">inch</option>
              </select>
            </label>
            <label>
              Feed (mm/min)
              <input type="number" value={feed} min={100} max={5000} step={100}
                onChange={e => setFeed(e.target.value)} />
            </label>
            <label>
              Safe Z
              <input type="number" value={safeZ} min={0} max={20} step={1}
                onChange={e => setSafeZ(e.target.value)} />
            </label>
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

          <button className="btn-generate" type="submit" disabled={loading || !instruction.trim()}>
            {loading ? <Loader size={16} className="spin" /> : <Play size={16} />}
            {loading ? 'Generating…' : 'Generate G-code'}
          </button>
        </form>

        {error && <div className="gcode-error">{error}</div>}

        {/* Summary stats */}
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

      {/* Right: canvas + G-code output */}
      <div className="gcode-output">
        {/* Canvas toolpath preview */}
        <div className="gcode-canvas-wrap">
          <canvas ref={canvasRef} width={340} height={220} className="gcode-canvas" />
          {!result && (
            <div className="canvas-placeholder">
              <Terminal size={28} />
              <span>Toolpath will appear here</span>
            </div>
          )}
        </div>

        {/* G-code lines — .map() renders each line with a line number */}
        {result?.code && (
          <div className="gcode-editor">
            <div className="gcode-editor-header">
              <span className="gcode-title">Generated G-code</span>
              <button className="btn-copy-sm" onClick={copyGcode}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="gcode-lines">
              {/* HOF .map() — renders each G-code line */}
              {result.code.map((line, i) => (
                <div key={i} className="gcode-line">
                  <span className="gline-num">{i + 1}</span>
                  <span className={`gline-code ${line.startsWith(';') ? 'gline-comment' : ''}`}>
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        {result?.explanation && (
          <p className="gcode-explanation">{result.explanation}</p>
        )}
      </div>
    </div>
  );
}

export default GCodePage;
