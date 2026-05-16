# FAB-LabCode — Technical Documentation

## File Structure

```text
fablabcode/
├── index.html        # Application shell + all markup
├── style.css         # All styles (CSS custom properties, Flexbox/Grid layouts)
├── script.js         # Frontend interactions + rendering
├── package.json      # Local run/test scripts
├── server.js         # Node HTTP entrypoint
├── server/lib/
│   ├── ai-assistant.js   # Structured AI sandbox responses
│   ├── gcode-service.js  # Server-side G-code parsing and generation
│   └── http.js           # JSON/static response helpers
├── server/tests/
│   └── integration.test.js
├── CONTEXT.md        # Product context and rationale
└── DOCUMENTATION.md  # This file — technical reference
```

---

## Backend

### Runtime

- Node.js built-in HTTP server
- No third-party dependencies
- Serves the static frontend and API routes from the same process

### API Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health/status check |
| `POST` | `/api/chat` | Returns structured AI sandbox output |
| `POST` | `/api/gcode/generate` | Parses instruction and returns generated G-code |

### Response Shape — `/api/chat`

```json
{
  "reply": "Assistant bubble text",
  "output": {
    "filename": "calculator.js",
    "language": "JavaScript",
    "code": "class Calculator { ... }",
    "explanation": "...",
    "steps": ["...", "..."],
    "tips": ["...", "..."],
    "complexity": {
      "level": "Low",
      "time": "O(1)",
      "space": "O(1)",
      "pattern": "State Machine",
      "paradigm": "OOP / ES6"
    },
    "preview": {
      "kind": "calculator"
    }
  }
}
```

### Response Shape — `/api/gcode/generate`

```json
{
  "code": ["G21", "G90", "..."],
  "explanation": "This G-code draws...",
  "steps": ["...", "..."],
  "summary": {
    "time": "< 1 min",
    "length": "40 mm",
    "moves": 8,
    "bounds": "X: 0–10 / Y: 0–10"
  },
  "shape": "square"
}
```

---

## index.html

### Structure

```
<nav class="navbar">          — sticky top nav with logo + mode toggle buttons
<main class="main-content">
  <section id="mode-sandbox"> — AI Sandbox section (hidden by default)
  <section id="mode-gcode">   — G-code mode section (shown by default)
<div class="toast">           — global toast notification
```

### Mode Sections

**AI Sandbox** uses `.sandbox-layout` (CSS Grid, 2 columns):
- `.chat-panel` — chat messages list + input area
- `.output-panel` — tabbed output (Code / Explanation / Preview)

**G-code Mode** uses `.gcode-layout` (CSS Grid, 3 columns):
- `.gcode-input-panel` — textarea, example chips, settings, generate button
- `.gcode-preview-panel` — canvas toolpath + summary cards
- `.gcode-output-panel` — syntax-highlighted G-code editor + actions + explanation

---

## style.css

### CSS Custom Properties (`:root`)

| Variable | Value | Usage |
|---|---|---|
| `--accent` | `#6366f1` | Primary interactive colour (buttons, active states) |
| `--accent-dark` | `#4f46e5` | Hover / pressed states |
| `--accent-light` | `#e0e7ff` | Subtle backgrounds, chips, tips |
| `--accent-2` | `#8b5cf6` | Gradient endpoint for buttons |
| `--bg-dark` | `#0f1117` | Code editor background |
| `--bg-dark-2` | `#161b22` | Editor header |
| `--font-mono` | JetBrains Mono | All code and G-code rendering |
| `--shadow` | 4px 12px... | Panel card shadow |

### Layout System

- **Navbar**: Flexbox, `position: sticky`, backdrop blur
- **Mode Sections**: full-height (`calc(100vh - 60px)`), overflow hidden
- **Sandbox Layout**: `grid-template-columns: 420px 1fr`
- **G-code Layout**: `grid-template-columns: 320px 1fr 340px`
- **Responsive**: 3 breakpoints — 1200px, 960px, 640px

### Component Classes

| Class | Description |
|---|---|
| `.panel` | White card with border, shadow, flex-column |
| `.panel-header` | Flex row for title + actions |
| `.btn-ghost` | Light outline button with hover state |
| `.btn-generate` | Gradient CTA button with shadow |
| `.chip` / `.chip-active` | Pill-shaped example selector |
| `.gcode-line` | Single row in G-code editor (line num + code) |
| `.action-btn` | Coloured action buttons (green/blue/purple/red) |
| `.toast` | Fixed bottom notification with slide-up animation |

### Syntax Highlight Classes (CSS only)

Applied inside `.code-block` and G-code editor:

| Class | Colour | Meaning |
|---|---|---|
| `.code-keyword` | `#ff7b72` | `class`, `const`, `if` |
| `.code-class` | `#ffa657` | Class names |
| `.code-fn` | `#d2a8ff` | Function names |
| `.code-string` | `#a5d6ff` | String literals |
| `.code-comment` | `#8b949e` | Comments |
| `.gline-cmd` | `#79c0ff` | G/M codes (G0, G1, M2) |
| `.gline-param` | `#a5d6ff` | Axis letters (X, Y, Z, F) |
| `.gline-val` | `#ffa657` | Numeric values |
| `.gline-comment` | `#4a5568` | Inline G-code comments |

---

## script.js

### Mode Switcher

```js
switchMode(mode)  // 'sandbox' | 'gcode'
```
Shows/hides the two `<section>` elements and toggles `.active` on nav buttons.

### Toast System

```js
showToast(msg, duration?)
```
Animates a pill notification from bottom-center. Auto-dismisses after `duration` ms (default 2400).

---

### AI Sandbox

#### Chat

| Function | Description |
|---|---|
| `sendMessage()` | Reads textarea, posts to `/api/chat`, appends the backend reply |
| `appendBubble(text, type)` | Creates and appends a `.chat-bubble` element |
| `showTyping()` | Adds animated dots bubble, returns element ID |
| `removeTyping(id)` | Removes the typing indicator |
| `clearChat()` | Clears all messages, appends greeting |
| `handleChatKey(e)` | Sends on Enter (not Shift+Enter) |
| `autoResize(el)` | Grows textarea up to 120px |
| `usePrompt(text)` | Fills textarea from suggestion chips |

#### Output Tabs

```js
switchTab(tabName, btn)  // 'code' | 'explanation' | 'preview'
```
Toggles `.active` on both `.tab-btn` and `.tab-content` elements.

#### Calculator Preview

State: `calcState = { current, prev, op, justEvaluated }`

```js
calcAction(val)  // digit, operator, '=', 'clear', '.'
```
Implements a simple two-operand calculator using an ops lookup object. Guards division by zero and multiple decimal points.

---

### G-code Mode

#### `generateGcode()`

1. Reads the instruction/settings from the UI
2. Posts them to `/api/gcode/generate`
3. Calls `renderGcodeEditor()`, `updateSummary()`, `updateExplanation()`, `drawToolpath()`, `drawCoordDiagram()`

#### Server-side templates

Templates now live in [server/lib/gcode-service.js](/Users/atulenv/Desktop/Projects/waproject/fablabcode/server/lib/gcode-service.js).
Each template returns a data object shaped like:

```js
{
  code: string[],      // lines of G-code
  explanation: string, // one-sentence description
  steps: string[],     // ordered step list
  summary: { time, length, moves, bounds },
  shape: 'square'|'rect'|'circle'|'triangle'|'line'|'engrave',
  // shape-specific dimensions (size, w, h, r, x1, y1, x2, y2, text)
}
```

| Template | Trigger pattern | Example |
|---|---|---|
| `square` | `/square (\d+)/` | `draw a square 10x10` |
| `rectangle` | `/rect(?:angle)? (\d+)x(\d+)/` | `draw a rectangle 20x10` |
| `circle` | `/circle (?:radius )?(\d+)/` | `draw a circle radius 10` |
| `engrave` | `/engrave (\w+)/` | `engrave HELLO` |
| `triangle` | `/triangle (\d+)/` | `triangle 15` |
| `line` | `/line from (x,y) to (x,y)/` | `line from (0,0) to (20,0)` |

Unrecognised input falls back to a 10mm square on the server.

#### `renderGcodeEditor(lines)`

Renders each line as `.gcode-line` with `.gline-num` and colourised `.gline-code`.

#### `colorizeGcode(line)`

Regex-based colouring: splits on `;`, highlights G/M codes with `.gline-cmd`, axis letters with `.gline-param`, numeric values with `.gline-val`, comments with `.gline-comment`.

#### Canvas Drawing — `drawToolpath(data)`

1. Reads canvas pixel dimensions
2. Computes `scale = min((W-pad*2)/maxX, (H-pad*2)/maxY)` to fit shape
3. Draws grid lines and axis labels
4. Draws shape-specific paths using `ctx.beginPath()` + `ctx.stroke()`
5. Calls `drawArrow(ctx, x1, y1, x2, y2, color)` for direction arrows
6. Places coordinate labels for corner/key points

`toCanvasX(x)` and `toCanvasY(y)` map G-code coordinates to canvas pixels (Y is inverted).

#### `drawArrow(ctx, x1, y1, x2, y2, color)`

Draws a filled triangle at the midpoint of the segment, rotated to match the segment angle.

#### `drawCoordDiagram(data)`

Smaller version of `drawToolpath` rendered on the 220×160 `#coord-diagram` canvas in the right panel.

#### `animateToolpath(data)` (Simulate)

Animates a red dot along the toolpath waypoints using `requestAnimationFrame`. Each segment uses a 600ms linear interpolation. Redraws the base toolpath on each frame, then overlays the moving tool indicator.

#### Utility Functions

| Function | Description |
|---|---|
| `copyGcode()` | Clipboard API copy of G-code lines |
| `downloadGcode()` | Triggers `.nc` file download |
| `saveGcode()` | Saves to `sessionStorage` |
| `clearGcode()` | Resets editor, canvas, summary, explanation |
| `setStatus(type, label, text)` | Updates the status bar (ready/generating/done) |
| `triggerDownload(content, filename, type)` | Creates Blob URL and simulates anchor click |
| `setExample(text, chipEl)` | Fills textarea, toggles `.chip-active` |
| `updateCharCount(el)` | Updates `17 / 200` counter |
| `setView(view, btn)` | Switches 2D/3D view button state |

---

## Responsive Behaviour

| Breakpoint | Layout change |
|---|---|
| ≤ 1200px | G-code columns narrow slightly |
| ≤ 960px | G-code → 2-column (input+preview top, output full-width below) |
| ≤ 640px | All panels stack vertically; actions wrap; settings single-column |

---

## Adding a New Shape

1. Add a new template in [server/lib/gcode-service.js](/Users/atulenv/Desktop/Projects/waproject/fablabcode/server/lib/gcode-service.js):
```js
myShape: (params, feed, safeZ, units) => ({
  code: [ /* lines */ ],
  explanation: '...',
  steps: ['...'],
  summary: { time, length, moves, bounds },
  shape: 'myShape',
  // custom dimensions
})
```

2. Add a regex branch inside the server-side `generateGcode()` matcher:
```js
else if (/mypattern/.test(raw)) {
  data = myShape(...);
}
```

3. Add a drawing branch in `drawToolpath()` and `drawCoordDiagram()`:
```js
if (data.shape === 'myShape') {
  // ctx drawing calls
}
```

4. Optionally add waypoints in `animateToolpath()` for simulation support.

---

## Browser Support

Requires a modern browser with:
- `Canvas 2D API`
- `Clipboard API` (for copy buttons — falls back silently)
- `CSS Custom Properties`
- `CSS Grid + Flexbox`
- `ES6+` (classes, arrow functions, template literals, destructuring)

Tested: Chrome 120+, Firefox 121+, Safari 17+, Edge 120+
