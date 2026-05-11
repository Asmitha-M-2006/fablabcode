/* ===================================================
   FAB-LabCode — script.js
   Vanilla JS — no frameworks, no backend
   =================================================== */

'use strict';

/* ================================================
   MODE SWITCHER
================================================ */
function switchMode(mode) {
  const sandbox = document.getElementById('mode-sandbox');
  const gcode   = document.getElementById('mode-gcode');
  const btnS    = document.getElementById('btn-sandbox');
  const btnG    = document.getElementById('btn-gcode');

  if (mode === 'sandbox') {
    sandbox.style.display = 'block';
    gcode.style.display   = 'none';
    btnS.classList.add('active');
    btnG.classList.remove('active');
  } else {
    sandbox.style.display = 'none';
    gcode.style.display   = 'block';
    btnS.classList.remove('active');
    btnG.classList.add('active');
  }
}

/* ================================================
   TOAST
================================================ */
let toastTimer = null;
function showToast(msg, duration = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ================================================
   AI SANDBOX — CHAT
================================================ */
const aiResponses = [
  { text: "Here's the code you requested! I've generated a clean, well-structured solution. Check the Code tab to explore the implementation.", code: true },
  { text: "Great question! I've broken this down into manageable components. The solution follows best practices for performance and readability.", code: false },
  { text: "I've analyzed your request and built a complete solution with error handling, keyboard shortcuts, and responsive design.", code: true },
  { text: "Done! The implementation uses modern ES6+ syntax. Check the Explanation tab for a full walkthrough of how it works.", code: false },
];

let msgIndex = 0;

function sendMessage() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  appendBubble(msg, 'user');
  input.value = '';
  autoResize(input);

  // Typing indicator
  const typingId = showTyping();

  setTimeout(() => {
    removeTyping(typingId);
    const resp = aiResponses[msgIndex % aiResponses.length];
    msgIndex++;
    appendBubble(resp.text, 'ai');
  }, 1000 + Math.random() * 800);
}

function appendBubble(text, type) {
  const container = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (type === 'ai') {
    bubble.innerHTML = `
      <div class="bubble-avatar ai-avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      </div>
      <div class="bubble-content">
        <p>${escapeHtml(text)}</p>
        <span class="bubble-time">${time}</span>
      </div>`;
  } else {
    bubble.innerHTML = `
      <div class="bubble-content">
        <p>${escapeHtml(text)}</p>
        <span class="bubble-time">${time}</span>
      </div>
      <div class="bubble-avatar user-avatar">You</div>`;
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById('chat-messages');
  const id = 'typing-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'chat-bubble ai';
  el.innerHTML = `
    <div class="bubble-avatar ai-avatar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
    <div class="bubble-content" style="padding:12px 16px;">
      <div style="display:flex;gap:4px;align-items:center;">
        <span style="width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:pulse 1s infinite;"></span>
        <span style="width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:pulse 1s .2s infinite;"></span>
        <span style="width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:pulse 1s .4s infinite;"></span>
      </div>
    </div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function clearChat() {
  document.getElementById('chat-messages').innerHTML = '';
  appendBubble("Chat cleared. How can I help you?", 'ai');
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function usePrompt(text) {
  const input = document.getElementById('chat-input');
  input.value = text;
  autoResize(input);
  input.focus();
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ================================================
   AI SANDBOX — OUTPUT TABS
================================================ */
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabName).classList.add('active');
}

function copyCode() {
  const code = document.querySelector('#code-output pre')?.innerText || '';
  navigator.clipboard.writeText(code).then(() => showToast('Code copied to clipboard'));
}

function downloadCode() {
  const code = document.querySelector('#code-output pre')?.innerText || '';
  triggerDownload(code, 'calculator.js', 'text/javascript');
}

/* ================================================
   CALCULATOR PREVIEW
================================================ */
let calcState = { current: '', prev: null, op: null, justEvaluated: false };

function calcAction(val) {
  const display = document.getElementById('calc-display');
  const history = document.getElementById('calc-history');
  const s = calcState;

  if (val === 'clear') {
    s.current = ''; s.prev = null; s.op = null; s.justEvaluated = false;
    display.textContent = '0'; history.textContent = '';
    return;
  }

  if (val === '=') {
    if (s.op === null || s.current === '') return;
    const b = parseFloat(s.current);
    const ops = { '+': (a,b) => a+b, '-': (a,b) => a-b, '*': (a,b) => a*b, '/': (a,b) => b===0 ? 'Error' : a/b, '%': (a,b) => a%b };
    const result = ops[s.op](s.prev, b);
    history.textContent = `${s.prev} ${s.op} ${b} =`;
    s.current = String(parseFloat(result.toFixed(10)));
    display.textContent = s.current;
    s.prev = null; s.op = null; s.justEvaluated = true;
    return;
  }

  if (['+','-','*','/','%'].includes(val)) {
    if (s.current === '' && s.prev === null) return;
    if (s.current !== '') {
      s.prev = parseFloat(s.current);
    }
    s.op = val;
    history.textContent = `${s.prev} ${val}`;
    s.current = '';
    s.justEvaluated = false;
    return;
  }

  if (val === '.' && s.current.includes('.')) return;
  if (s.justEvaluated && /[0-9]/.test(val)) { s.current = ''; s.justEvaluated = false; }
  s.current += val;
  display.textContent = s.current || '0';
}

/* ================================================
   G-CODE GENERATOR
================================================ */
const gcodeTemplates = {
  square: (size, feed, safeZ, units) => ({
    code: [
      `; FAB-LabCode - Generated G-code`,
      `; Instruction: draw a square ${size}x${size}`,
      `; Units: ${units}`,
      `; Tool: Pen (Drawing)`,
      ``,
      `G21            ; Set units to ${units === 'mm' ? 'millimeters' : 'inches'}`,
      `G90            ; Use absolute positioning`,
      `G0 Z${safeZ}         ; Move tool to safe Z`,
      `G0 X0 Y0       ; Rapid move to start point`,
      `G0 Z0          ; Pen down / tool to drawing height`,
      `G1 X${size} Y0 F${feed}  ; Line 1`,
      `G1 X${size} Y${size} F${feed}  ; Line 2`,
      `G1 X0 Y${size} F${feed}  ; Line 3`,
      `G1 X0 Y0 F${feed}  ; Line 4`,
      `G0 Z${safeZ}         ; Pen up / tool to safe Z`,
      `M2             ; Program end`,
    ],
    explanation: `This G-code draws a square with side length ${size} ${units} starting from (0,0).`,
    steps: ['Moves to (0,0)', `Draws 4 lines to form a ${size}x${size} square`, 'Returns to starting point', 'Lifts the tool up'],
    summary: { time: '~ 1 min', length: `${size*4} ${units}`, moves: 8, bounds: `X: 0–${size} / Y: 0–${size}` },
    shape: 'square', size,
  }),
  rectangle: (w, h, feed, safeZ, units) => ({
    code: [
      `; FAB-LabCode - Generated G-code`,
      `; Instruction: draw a rectangle ${w}x${h}`,
      `; Units: ${units}`,
      ``,
      `G21`,
      `G90`,
      `G0 Z${safeZ}`,
      `G0 X0 Y0`,
      `G0 Z0`,
      `G1 X${w} Y0 F${feed}`,
      `G1 X${w} Y${h} F${feed}`,
      `G1 X0 Y${h} F${feed}`,
      `G1 X0 Y0 F${feed}`,
      `G0 Z${safeZ}`,
      `M2`,
    ],
    explanation: `This G-code draws a rectangle ${w}x${h} ${units} starting from (0,0).`,
    steps: [`Moves to (0,0)`, `Draws width line (${w} ${units})`, `Draws height line (${h} ${units})`, 'Closes the rectangle', 'Lifts the tool'],
    summary: { time: '~ 1 min', length: `${(w+h)*2} ${units}`, moves: 7, bounds: `X: 0–${w} / Y: 0–${h}` },
    shape: 'rect', w, h,
  }),
  circle: (r, feed, safeZ, units) => ({
    code: [
      `; FAB-LabCode - Generated G-code`,
      `; Instruction: draw a circle radius ${r}`,
      `; Units: ${units}`,
      ``,
      `G21`,
      `G90`,
      `G0 Z${safeZ}`,
      `G0 X${r} Y0`,
      `G0 Z0`,
      `G2 X${r} Y0 I-${r} J0 F${feed}  ; Full CW circle`,
      `G0 Z${safeZ}`,
      `M2`,
    ],
    explanation: `This G-code draws a circle with radius ${r} ${units} centered at (0,0).`,
    steps: [`Moves to start point (${r},0)`, `Draws a full CW arc`, 'Returns to start', 'Lifts the tool'],
    summary: { time: '~ 1 min', length: `${Math.round(2*Math.PI*r)} ${units}`, moves: 4, bounds: `X: -${r}–${r} / Y: -${r}–${r}` },
    shape: 'circle', r,
  }),
  engrave: (text, feed, safeZ, units) => ({
    code: [
      `; FAB-LabCode - Generated G-code`,
      `; Instruction: engrave "${text}"`,
      `; Units: ${units}`,
      ``,
      `G21`,
      `G90`,
      `G0 Z${safeZ}`,
      ...text.split('').flatMap((ch, i) => [
        `G0 X${i*6} Y0`,
        `G0 Z0`,
        `G1 X${i*6} Y8 F${feed}  ; Char: ${ch}`,
        `G0 Z${safeZ}`,
      ]),
      `M2`,
    ],
    explanation: `This G-code engraves the text "${text}" using vertical strokes as approximations.`,
    steps: text.split('').map((c,i) => `Engrave character '${c}' at X=${i*6}`),
    summary: { time: `~ ${text.length} min`, length: `${text.length*8} ${units}`, moves: text.length*4, bounds: `X: 0–${text.length*6} / Y: 0–8` },
    shape: 'engrave', text,
  }),
  triangle: (size, feed, safeZ, units) => ({
    code: [
      `; FAB-LabCode - Generated G-code`,
      `; Instruction: triangle ${size}`,
      `; Units: ${units}`,
      ``,
      `G21`,
      `G90`,
      `G0 Z${safeZ}`,
      `G0 X0 Y0`,
      `G0 Z0`,
      `G1 X${size} Y0 F${feed}`,
      `G1 X${size/2} Y${Math.round(size*0.866)} F${feed}`,
      `G1 X0 Y0 F${feed}`,
      `G0 Z${safeZ}`,
      `M2`,
    ],
    explanation: `This G-code draws an equilateral triangle with side ${size} ${units}.`,
    steps: ['Moves to (0,0)', `Draws base (${size} ${units})`, 'Draws right side to apex', 'Closes back to start', 'Lifts tool'],
    summary: { time: '~ 1 min', length: `${size*3} ${units}`, moves: 6, bounds: `X: 0–${size} / Y: 0–${Math.round(size*.866)}` },
    shape: 'triangle', size,
  }),
  line: (x1,y1,x2,y2, feed, safeZ, units) => ({
    code: [
      `; FAB-LabCode - Generated G-code`,
      `; Instruction: line from (${x1},${y1}) to (${x2},${y2})`,
      ``,
      `G21`,
      `G90`,
      `G0 Z${safeZ}`,
      `G0 X${x1} Y${y1}`,
      `G0 Z0`,
      `G1 X${x2} Y${y2} F${feed}`,
      `G0 Z${safeZ}`,
      `M2`,
    ],
    explanation: `Draws a straight line from (${x1},${y1}) to (${x2},${y2}).`,
    steps: [`Rapid move to (${x1},${y1})`, 'Pen down', `Linear cut to (${x2},${y2})`, 'Pen up'],
    summary: {
      time: '< 1 min',
      length: `${Math.round(Math.hypot(x2-x1,y2-y1))} ${units}`,
      moves: 4,
      bounds: `X: ${Math.min(x1,x2)}–${Math.max(x1,x2)} / Y: ${Math.min(y1,y2)}–${Math.max(y1,y2)}`
    },
    shape: 'line', x1, y1, x2, y2,
  }),
};

let currentGcodeData = null;

function generateGcode() {
  const raw    = document.getElementById('gcode-instruction').value.trim().toLowerCase();
  const units  = document.getElementById('units-select').value;
  const feed   = parseInt(document.getElementById('feed-rate').value) || 1000;
  const safeZ  = parseInt(document.getElementById('safe-z').value) || 2;

  let data = null;

  if (/square\s+(\d+)/.test(raw)) {
    const size = parseInt(raw.match(/square\s+(\d+)/)[1]);
    data = gcodeTemplates.square(size, feed, safeZ, units);
  } else if (/rect(?:angle)?\s+(\d+)x(\d+)/.test(raw)) {
    const m = raw.match(/rect(?:angle)?\s+(\d+)x(\d+)/);
    data = gcodeTemplates.rectangle(+m[1], +m[2], feed, safeZ, units);
  } else if (/circle\s+(?:radius\s+)?(\d+)/.test(raw)) {
    const r = parseInt(raw.match(/circle\s+(?:radius\s+)?(\d+)/)[1]);
    data = gcodeTemplates.circle(r, feed, safeZ, units);
  } else if (/engrave\s+(\w+)/.test(raw)) {
    const text = raw.match(/engrave\s+(\w+)/)[1].toUpperCase();
    data = gcodeTemplates.engrave(text, feed, safeZ, units);
  } else if (/triangle\s+(\d+)/.test(raw)) {
    const size = parseInt(raw.match(/triangle\s+(\d+)/)[1]);
    data = gcodeTemplates.triangle(size, feed, safeZ, units);
  } else if (/line\s+from\s+\(?(\d+),(\d+)\)?\s+to\s+\(?(\d+),(\d+)\)?/.test(raw)) {
    const m = raw.match(/line\s+from\s+\(?(\d+),(\d+)\)?\s+to\s+\(?(\d+),(\d+)\)?/);
    data = gcodeTemplates.line(+m[1],+m[2],+m[3],+m[4], feed, safeZ, units);
  } else {
    // Fallback: default square
    data = gcodeTemplates.square(10, feed, safeZ, units);
  }

  currentGcodeData = data;
  renderGcodeEditor(data.code);
  updateSummary(data.summary);
  updateExplanation(data.explanation, data.steps);
  drawToolpath(data);
  drawCoordDiagram(data);
  setStatus('done', 'G-code generated!', `${data.code.filter(l=>l.trim()).length} lines ready.`);
  showToast('G-code generated successfully!');
}

function renderGcodeEditor(lines) {
  const container = document.getElementById('gcode-lines');
  container.innerHTML = '';
  lines.forEach((line, i) => {
    const div = document.createElement('div');
    div.className = 'gcode-line';
    div.innerHTML = `<span class="gline-num">${i+1}</span><span class="gline-code">${colorizeGcode(line)}</span>`;
    container.appendChild(div);
  });
}

function colorizeGcode(line) {
  if (!line.trim()) return '';
  const semiIdx = line.indexOf(';');
  let code = semiIdx >= 0 ? line.slice(0, semiIdx) : line;
  let comment = semiIdx >= 0 ? line.slice(semiIdx) : '';
  let html = '';

  code = code.replace(/\b([GM]\d+)\b/g, '<span class="gline-cmd">$1</span>');
  code = code.replace(/\b([XYZIJKRF])(-?[\d.]+)/g, (_, p, v) => `<span class="gline-param">${p}</span><span class="gline-val">${v}</span>`);

  html = code;
  if (comment) html += `<span class="gline-comment">${escapeHtml(comment)}</span>`;
  return html;
}

function updateSummary(s) {
  document.getElementById('est-time').textContent   = s.time;
  document.getElementById('path-length').textContent = s.length;
  document.getElementById('total-moves').textContent = s.moves;
  document.getElementById('bounds').textContent      = s.bounds;
}

function updateExplanation(text, steps) {
  document.getElementById('gcode-explanation').textContent = text;
  const stepList = document.getElementById('gcode-steps');
  stepList.innerHTML = steps.map(s => `<li>${escapeHtml(s)}</li>`).join('');
}

function setStatus(type, label, text) {
  const bar = document.getElementById('gcode-status');
  const icons = {
    ready:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    generating: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    done:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
  };
  const cls = { ready: 'status-ready', generating: 'status-generating', done: 'status-done' };
  bar.innerHTML = `
    <div class="status-indicator ${cls[type]}">${icons[type]} ${escapeHtml(label)}</div>
    <span class="status-text">${escapeHtml(text)}</span>`;
}

/* ================================================
   CANVAS — TOOLPATH DRAWING
================================================ */
function drawToolpath(data) {
  const canvas = document.getElementById('toolpath-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.offsetWidth  || 500;
  const H = canvas.offsetHeight || 300;
  canvas.width  = W;
  canvas.height = H;

  ctx.clearRect(0, 0, W, H);

  const pad = 60;
  let maxX = 20, maxY = 20;

  if (data.shape === 'square')    { maxX = data.size + 4;  maxY = data.size + 4; }
  if (data.shape === 'rect')      { maxX = data.w + 4;     maxY = data.h + 4; }
  if (data.shape === 'circle')    { maxX = data.r*2+4;     maxY = data.r*2+4; }
  if (data.shape === 'triangle')  { maxX = data.size+4;    maxY = Math.round(data.size*.866)+4; }
  if (data.shape === 'line')      { maxX = Math.max(data.x1,data.x2)+4; maxY = Math.max(data.y1,data.y2)+4; }
  if (data.shape === 'engrave')   { maxX = data.text.length*6+4; maxY = 12; }

  const scaleX = (W - pad*2) / maxX;
  const scaleY = (H - pad*2) / maxY;
  const scale  = Math.min(scaleX, scaleY);

  const toCanvasX = x => pad + x * scale;
  const toCanvasY = y => H - pad - y * scale;

  // Grid
  ctx.strokeStyle = '#e8edf5';
  ctx.lineWidth = 1;
  const step = Math.ceil(maxX / 6);
  for (let gx = 0; gx <= maxX; gx += step) {
    ctx.beginPath();
    ctx.moveTo(toCanvasX(gx), pad);
    ctx.lineTo(toCanvasX(gx), H - pad);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gx, toCanvasX(gx), H - pad + 16);
  }
  const stepY = Math.ceil(maxY / 5);
  for (let gy = 0; gy <= maxY; gy += stepY) {
    ctx.beginPath();
    ctx.moveTo(pad, toCanvasY(gy));
    ctx.lineTo(W - pad, toCanvasY(gy));
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(gy, pad - 8, toCanvasY(gy) + 4);
  }

  // Axes
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, H - pad);
  ctx.lineTo(W - pad + 10, H - pad);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pad, H - pad);
  ctx.lineTo(pad, pad - 10);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillText('X', W - pad + 14, H - pad + 4);
  ctx.fillStyle = '#10b981';
  ctx.fillText('Y', pad - 4, pad - 14);

  // Draw shape
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#3b82f6';
  ctx.setLineDash([]);

  if (data.shape === 'square' || data.shape === 'rect') {
    const w = data.shape === 'square' ? data.size : data.w;
    const h = data.shape === 'square' ? data.size : data.h;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(w), toCanvasY(0));
    ctx.lineTo(toCanvasX(w), toCanvasY(h));
    ctx.lineTo(toCanvasX(0), toCanvasY(h));
    ctx.closePath();
    ctx.stroke();
    drawArrow(ctx, toCanvasX(0), toCanvasY(0), toCanvasX(w), toCanvasY(0), '#3b82f6');
    drawArrow(ctx, toCanvasX(w), toCanvasY(0), toCanvasX(w), toCanvasY(h), '#3b82f6');
    drawArrow(ctx, toCanvasX(w), toCanvasY(h), toCanvasX(0), toCanvasY(h), '#3b82f6');
    drawArrow(ctx, toCanvasX(0), toCanvasY(h), toCanvasX(0), toCanvasY(0), '#3b82f6');
    // Corner dots
    [[0,0],[w,0],[w,h],[0,h]].forEach(([x,y]) => {
      ctx.beginPath();
      ctx.arc(toCanvasX(x), toCanvasY(y), 4, 0, Math.PI*2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
    });
    // Labels
    ctx.fillStyle = '#3b82f6';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`(0,0)`, toCanvasX(0), toCanvasY(0) + 18);
    ctx.fillText(`(${w},0)`, toCanvasX(w), toCanvasY(0) + 18);
    ctx.fillText(`(0,${h})`, toCanvasX(0), toCanvasY(h) - 8);
    ctx.fillText(`(${w},${h})`, toCanvasX(w), toCanvasY(h) - 8);
  }

  if (data.shape === 'circle') {
    const r = data.r;
    const cx = r, cy = r;
    ctx.beginPath();
    ctx.arc(toCanvasX(cx), toCanvasY(cy), r * scale, 0, Math.PI * 2, false);
    ctx.strokeStyle = '#3b82f6';
    ctx.stroke();
    // Center
    ctx.beginPath();
    ctx.arc(toCanvasX(cx), toCanvasY(cy), 3, 0, Math.PI*2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    // Radius line
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(cx), toCanvasY(cy));
    ctx.lineTo(toCanvasX(cx+r), toCanvasY(cy));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`r=${r}`, toCanvasX(cx + r/2), toCanvasY(cy) - 6);
  }

  if (data.shape === 'triangle') {
    const s = data.size, h2 = Math.round(s * 0.866);
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(s), toCanvasY(0));
    ctx.lineTo(toCanvasX(s/2), toCanvasY(h2));
    ctx.closePath();
    ctx.stroke();
    [[0,0],[s,0],[s/2,h2]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.arc(toCanvasX(x),toCanvasY(y),4,0,Math.PI*2);
      ctx.fillStyle='#3b82f6'; ctx.fill();
    });
  }

  if (data.shape === 'line') {
    ctx.beginPath();
    ctx.moveTo(toCanvasX(data.x1), toCanvasY(data.y1));
    ctx.lineTo(toCanvasX(data.x2), toCanvasY(data.y2));
    ctx.stroke();
    drawArrow(ctx, toCanvasX(data.x1), toCanvasY(data.y1), toCanvasX(data.x2), toCanvasY(data.y2), '#3b82f6');
  }

  if (data.shape === 'engrave') {
    data.text.split('').forEach((c, i) => {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(i*6), toCanvasY(0));
      ctx.lineTo(toCanvasX(i*6), toCanvasY(8));
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c, toCanvasX(i*6), toCanvasY(9));
    });
  }

  // Rapid move dashed (to origin)
  ctx.setLineDash([5, 3]);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(toCanvasX(0) - 20, toCanvasY(0) - 20);
  ctx.lineTo(toCanvasX(0), toCanvasY(0));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
  const angle = Math.atan2(y2-y1, x2-x1);
  const mx = (x1+x2)/2, my = (y1+y2)/2;
  const aLen = 8;
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(mx, my);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-aLen, -aLen/2);
  ctx.lineTo(-aLen,  aLen/2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ================================================
   COORDINATE DIAGRAM (small right panel)
================================================ */
function drawCoordDiagram(data) {
  const canvas = document.getElementById('coord-diagram');
  const ctx = canvas.getContext('2d');
  const W = 220, H = 160;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const pad = 28;
  let maxX = 12, maxY = 12;
  if (data.shape === 'square')   { maxX = data.size + 2; maxY = data.size + 2; }
  if (data.shape === 'rect')     { maxX = data.w + 2;    maxY = data.h + 2; }
  if (data.shape === 'circle')   { maxX = data.r*2+2;    maxY = data.r*2+2; }
  if (data.shape === 'triangle') { maxX = data.size+2;   maxY = Math.round(data.size*.866)+2; }

  const scale = Math.min((W - pad*2) / maxX, (H - pad*2) / maxY);
  const toX = x => pad + x * scale;
  const toY = y => H - pad - y * scale;

  // Axes
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(W-8, H-pad); ctx.stroke();
  ctx.strokeStyle = '#10b981';
  ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(pad, 8); ctx.stroke();

  ctx.fillStyle = '#ef4444'; ctx.font = 'bold 11px Inter,sans-serif';
  ctx.fillText('X', W-7, H-pad+4);
  ctx.fillStyle = '#10b981';
  ctx.fillText('Y', pad-4, 7);

  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;

  if (data.shape === 'square' || data.shape === 'rect') {
    const w = data.shape === 'square' ? data.size : data.w;
    const h = data.shape === 'square' ? data.size : data.h;
    ctx.beginPath();
    ctx.moveTo(toX(0),toY(0)); ctx.lineTo(toX(w),toY(0));
    ctx.lineTo(toX(w),toY(h)); ctx.lineTo(toX(0),toY(h));
    ctx.closePath(); ctx.stroke();
    // Labels
    ctx.fillStyle = '#3b82f6'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign='center';
    ctx.fillText(`(0,0)`,   toX(0),   toY(0)+12);
    ctx.fillText(`(${w},0)`,toX(w),   toY(0)+12);
    ctx.fillText(`(0,${h})`,toX(0)-4, toY(h)-4);
    ctx.fillText(`(${w},${h})`,toX(w), toY(h)-4);
    [[0,0],[w,0],[w,h],[0,h]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.arc(toX(x),toY(y),3,0,Math.PI*2);
      ctx.fillStyle='#3b82f6'; ctx.fill();
    });
    drawArrow(ctx, toX(0),toY(0), toX(w),toY(0), '#3b82f6');
    drawArrow(ctx, toX(w),toY(0), toX(w),toY(h), '#3b82f6');
    drawArrow(ctx, toX(w),toY(h), toX(0),toY(h), '#3b82f6');
    drawArrow(ctx, toX(0),toY(h), toX(0),toY(0), '#3b82f6');
  }

  if (data.shape === 'circle') {
    const r = data.r;
    ctx.beginPath();
    ctx.arc(toX(r), toY(r), r*scale, 0, Math.PI*2);
    ctx.stroke();
  }
}

/* ================================================
   VIEW TOGGLE (2D / 3D)
================================================ */
function setView(view, btn) {
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (view === '3d') {
    showToast('3D view coming soon — displaying 2D preview');
  } else if (currentGcodeData) {
    drawToolpath(currentGcodeData);
  }
}

/* ================================================
   EXAMPLE CHIPS
================================================ */
function setExample(text, chipEl) {
  document.getElementById('gcode-instruction').value = text;
  updateCharCount(document.getElementById('gcode-instruction'));
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-active'));
  chipEl.classList.add('chip-active');
}

function updateCharCount(el) {
  const count = el.value.length;
  document.getElementById('char-count').textContent = `${count} / 200`;
}

/* ================================================
   COPY / DOWNLOAD
================================================ */
function copyGcode() {
  if (!currentGcodeData) { showToast('Generate G-code first'); return; }
  navigator.clipboard.writeText(currentGcodeData.code.join('\n'))
    .then(() => showToast('G-code copied to clipboard!'));
}

function downloadGcode() {
  if (!currentGcodeData) { showToast('Generate G-code first'); return; }
  triggerDownload(currentGcodeData.code.join('\n'), 'toolpath.nc', 'text/plain');
  showToast('Downloading toolpath.nc');
}

function saveGcode() {
  if (!currentGcodeData) { showToast('Generate G-code first'); return; }
  showToast('Saved to session storage');
  sessionStorage.setItem('fab_gcode', currentGcodeData.code.join('\n'));
}

function clearGcode() {
  currentGcodeData = null;
  document.getElementById('gcode-lines').innerHTML = '';
  const canvas = document.getElementById('toolpath-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const coord = document.getElementById('coord-diagram');
  coord.getContext('2d').clearRect(0, 0, coord.width, coord.height);
  document.getElementById('gcode-explanation').textContent = 'Generate G-code to see explanation.';
  document.getElementById('gcode-steps').innerHTML = '';
  updateSummary({ time: '—', length: '—', moves: '—', bounds: '—' });
  setStatus('ready', 'Ready to generate', 'Enter an instruction and click generate.');
  showToast('Cleared');
}

function simulateGcode() {
  if (!currentGcodeData) { showToast('Generate G-code first'); return; }
  showToast('Simulation: animating toolpath...');
  animateToolpath(currentGcodeData);
}

function triggerDownload(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ================================================
   TOOLPATH ANIMATION (simulate)
================================================ */
function animateToolpath(data) {
  const canvas = document.getElementById('toolpath-canvas');
  const ctx    = canvas.getContext('2d');
  drawToolpath(data); // reset

  const W = canvas.width, H = canvas.height;
  const pad = 60;
  let maxX = 20, maxY = 20;
  if (data.shape === 'square')   { maxX = data.size+4;  maxY = data.size+4; }
  if (data.shape === 'rect')     { maxX = data.w+4;     maxY = data.h+4; }
  if (data.shape === 'circle')   { maxX = data.r*2+4;   maxY = data.r*2+4; }
  if (data.shape === 'triangle') { maxX = data.size+4;  maxY = Math.round(data.size*.866)+4; }
  const scale = Math.min((W-pad*2)/maxX, (H-pad*2)/maxY);
  const toX = x => pad + x * scale;
  const toY = y => H - pad - y * scale;

  let points = [];
  if (data.shape === 'square' || data.shape === 'rect') {
    const w = data.shape==='square' ? data.size : data.w;
    const h = data.shape==='square' ? data.size : data.h;
    points = [[0,0],[w,0],[w,h],[0,h],[0,0]];
  } else if (data.shape === 'triangle') {
    const s=data.size, h2=Math.round(s*.866);
    points = [[0,0],[s,0],[s/2,h2],[0,0]];
  } else if (data.shape === 'line') {
    points = [[data.x1,data.y1],[data.x2,data.y2]];
  } else { return; }

  let idx = 0;
  const tool = { x: toX(points[0][0]), y: toY(points[0][1]) };

  function step() {
    if (idx >= points.length - 1) return;
    const [tx, ty] = [toX(points[idx+1][0]), toY(points[idx+1][1])];
    const duration = 600;
    const start = performance.now();
    const sx = tool.x, sy = tool.y;
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      tool.x = sx + (tx - sx) * t;
      tool.y = sy + (ty - sy) * t;
      drawToolpath(data);
      ctx.beginPath();
      ctx.arc(tool.x, tool.y, 6, 0, Math.PI*2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tool.x, tool.y, 10, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(239,68,68,.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (t < 1) requestAnimationFrame(frame);
      else { idx++; setTimeout(step, 100); }
    }
    requestAnimationFrame(frame);
  }
  step();
}

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Default to G-code mode (matches reference image)
  switchMode('gcode');

  // Render default G-code on load
  generateGcode();

  // Resize canvas when window resizes
  window.addEventListener('resize', () => {
    if (currentGcodeData) {
      drawToolpath(currentGcodeData);
      drawCoordDiagram(currentGcodeData);
    }
  });
});
