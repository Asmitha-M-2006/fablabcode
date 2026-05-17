'use strict';

const CALCULATOR_MARKUP = `<main class="calc-shell">
  <section class="calc-card">
    <header class="calc-header">
      <p>Keyboard-ready calculator</p>
      <span>Click inside the preview to focus it</span>
    </header>
    <div class="history"></div>
    <div class="display">0</div>
    <div class="keys">
      <button class="key key-muted" data-value="clear">AC</button>
      <button class="key key-muted" data-value="%">%</button>
      <button class="key key-accent" data-value="/">/</button>
      <button class="key" data-value="7">7</button>
      <button class="key" data-value="8">8</button>
      <button class="key" data-value="9">9</button>
      <button class="key key-accent" data-value="*">*</button>
      <button class="key" data-value="4">4</button>
      <button class="key" data-value="5">5</button>
      <button class="key" data-value="6">6</button>
      <button class="key key-accent" data-value="-">-</button>
      <button class="key" data-value="1">1</button>
      <button class="key" data-value="2">2</button>
      <button class="key" data-value="3">3</button>
      <button class="key key-accent" data-value="+">+</button>
      <button class="key key-wide" data-value="0">0</button>
      <button class="key" data-value=".">.</button>
      <button class="key key-accent" data-value="=">=</button>
    </div>
  </section>
</main>`;

const CALCULATOR_STYLES = `:root {
  color-scheme: light;
  font-family: "Inter", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(99, 102, 241, 0.18), transparent 40%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  color: #0f172a;
}

.calc-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px;
}

.calc-card {
  width: min(100%, 340px);
  background: rgba(15, 23, 42, 0.96);
  color: #fff;
  border-radius: 28px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}

.calc-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.calc-header p {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.calc-header span {
  max-width: 120px;
  text-align: right;
  color: rgba(226, 232, 240, 0.72);
  font-size: 11px;
  line-height: 1.45;
}

.history {
  min-height: 20px;
  text-align: right;
  color: rgba(226, 232, 240, 0.54);
  font-family: "JetBrains Mono", "Fira Code", monospace;
  margin-bottom: 8px;
}

.display {
  text-align: right;
  font-size: 46px;
  line-height: 1;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  margin-bottom: 18px;
  min-height: 48px;
}

.keys {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.key {
  border: none;
  border-radius: 18px;
  min-height: 58px;
  font: inherit;
  font-size: 20px;
  cursor: pointer;
  background: rgba(51, 65, 85, 0.92);
  color: #fff;
  transition: transform 120ms ease, filter 120ms ease;
}

.key:hover {
  filter: brightness(1.08);
}

.key:active {
  transform: scale(0.97);
}

.key-muted {
  background: rgba(148, 163, 184, 0.95);
  color: #020617;
}

.key-accent {
  background: linear-gradient(135deg, #f97316, #fb7185);
}

.key-wide {
  grid-column: span 2;
}
`;

const CALCULATOR_CODE = `class Calculator {
  constructor(displaySelector, historySelector) {
    this.display = document.querySelector(displaySelector);
    this.history = document.querySelector(historySelector);
    this.current = '';
    this.operator = null;
    this.previous = null;
    this.bindKeyboard();
    this.bindButtons();
    this.render();
  }

  bindKeyboard() {
    document.addEventListener('keydown', (event) => {
      if (/[0-9.]/.test(event.key)) return this.input(event.key);
      if (['+', '-', '*', '/', '%'].includes(event.key)) return this.setOperator(event.key);
      if (event.key === 'Enter') return this.evaluate();
      if (event.key === 'Backspace') return this.backspace();
      if (event.key === 'Escape') return this.clear();
    });
  }

  bindButtons() {
    document.querySelectorAll('[data-value]').forEach((button) => {
      button.addEventListener('click', () => {
        const { value } = button.dataset;
        if (value === '=') return this.evaluate();
        if (value === 'clear') return this.clear();
        if (['+', '-', '*', '/', '%'].includes(value)) return this.setOperator(value);
        this.input(value);
      });
    });
  }

  input(value) {
    if (value === '.' && this.current.includes('.')) return;
    if (this.current === '0' && value !== '.') this.current = '';
    this.current += value;
    this.render();
  }

  setOperator(operator) {
    if (this.current === '') return;
    this.previous = Number(this.current);
    this.operator = operator;
    this.history.textContent = \`\${this.previous} \${operator}\`;
    this.current = '';
    this.render();
  }

  evaluate() {
    if (this.operator === null || this.current === '') return;

    const value = Number(this.current);
    const operations = {
      '+': (a, b) => a + b,
      '-': (a, b) => a - b,
      '*': (a, b) => a * b,
      '/': (a, b) => (b === 0 ? 'Error' : a / b),
      '%': (a, b) => a % b,
    };

    const result = operations[this.operator](this.previous, value);
    this.history.textContent = \`\${this.previous} \${this.operator} \${value} =\`;
    this.current = String(result);
    this.operator = null;
    this.previous = null;
    this.render();
  }

  backspace() {
    this.current = this.current.slice(0, -1);
    this.render();
  }

  clear() {
    this.current = '';
    this.operator = null;
    this.previous = null;
    this.history.textContent = '';
    this.render();
  }

  render() {
    this.display.textContent = this.current || '0';
  }
}

new Calculator('.display', '.history');`;

const TODO_MARKUP = `<main class="todo-shell">
  <section class="todo-card">
    <header class="todo-header">
      <div>
        <p>Todo workspace</p>
        <span>Interactive preview rendered from backend files</span>
      </div>
      <strong id="todo-count">0 open</strong>
    </header>

    <form id="todo-form" class="todo-form">
      <input id="todo-input" type="text" placeholder="Add a task for the sandbox" autocomplete="off" />
      <button type="submit">Add</button>
    </form>

    <ul id="todo-list" class="todo-list"></ul>
  </section>
</main>`;

const TODO_STYLES = `:root {
  color-scheme: light;
  font-family: "Inter", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(34, 197, 94, 0.18), transparent 35%),
    linear-gradient(180deg, #f8fafc 0%, #ecfeff 100%);
  color: #0f172a;
}

.todo-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px;
}

.todo-card {
  width: min(100%, 540px);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 28px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
}

.todo-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.todo-header p {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
}

.todo-header span {
  color: #64748b;
  font-size: 12px;
}

.todo-header strong {
  padding: 8px 12px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
}

.todo-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin-bottom: 18px;
}

.todo-form input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 14px 16px;
  font: inherit;
}

.todo-form button {
  border: none;
  border-radius: 14px;
  padding: 0 18px;
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.todo-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
}

.todo-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.todo-item input {
  width: 18px;
  height: 18px;
}

.todo-item span {
  font-size: 14px;
}

.todo-item.is-done span {
  text-decoration: line-through;
  color: #94a3b8;
}

.todo-item button {
  border: none;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fee2e2;
  color: #991b1b;
  font: inherit;
  cursor: pointer;
}

.todo-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 18px;
  padding: 22px 18px;
  text-align: center;
  color: #64748b;
  background: rgba(248, 250, 252, 0.8);
}
`;

const TODO_CODE = `class TodoApp {
  constructor(formSelector, inputSelector, listSelector, countSelector) {
    this.form = document.querySelector(formSelector);
    this.input = document.querySelector(inputSelector);
    this.list = document.querySelector(listSelector);
    this.count = document.querySelector(countSelector);
    this.todos = [];
    this.nextId = 1;

    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
    this.list.addEventListener('change', (event) => this.handleToggle(event));
    this.list.addEventListener('click', (event) => this.handleRemove(event));

    this.render();
  }

  handleSubmit(event) {
    event.preventDefault();
    const title = this.input.value.trim();
    if (!title) return;

    this.todos.unshift({
      id: String(this.nextId++),
      title,
      done: false,
    });

    this.input.value = '';
    this.render();
  }

  handleToggle(event) {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    const item = checkbox.closest('[data-id]');
    if (!item) return;

    this.toggle(item.dataset.id);
  }

  handleRemove(event) {
    const button = event.target.closest('[data-action="remove"]');
    if (!button) return;

    const item = button.closest('[data-id]');
    if (!item) return;

    this.remove(item.dataset.id);
  }

  toggle(id) {
    this.todos = this.todos.map((todo) => (
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
    this.render();
  }

  remove(id) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
    this.render();
  }

  render() {
    const openItems = this.todos.filter((todo) => !todo.done).length;
    this.count.textContent = \`\${openItems} open\`;

    if (this.todos.length === 0) {
      this.list.innerHTML = '<li class="todo-empty">Add your first task to see the live preview update.</li>';
      return;
    }

    this.list.innerHTML = this.todos.map((todo) => \`
      <li class="todo-item \${todo.done ? 'is-done' : ''}" data-id="\${todo.id}">
        <input type="checkbox" \${todo.done ? 'checked' : ''} />
        <span>\${todo.title}</span>
        <button type="button" data-action="remove">Delete</button>
      </li>
    \`).join('');
  }
}

new TodoApp('#todo-form', '#todo-input', '#todo-list', '#todo-count');`;

const TIMER_MARKUP = `<main class="timer-shell">
  <section class="timer-card">
    <p>Simple stopwatch</p>
    <h1 id="timer-display">00:00.0</h1>
    <div class="timer-actions">
      <button data-action="toggle">Start</button>
      <button data-action="reset">Reset</button>
    </div>
  </section>
</main>`;

const TIMER_STYLES = `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, sans-serif;
  background: radial-gradient(circle at top, #1e293b, #020617 72%);
  color: #e2e8f0;
}

.timer-shell {
  width: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
}

.timer-card {
  width: min(100%, 320px);
  padding: 28px;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.45);
  text-align: center;
}

.timer-card p {
  margin: 0 0 14px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 11px;
  color: #94a3b8;
}

.timer-card h1 {
  margin: 0 0 20px;
  font-size: 56px;
  line-height: 1;
  font-family: "JetBrains Mono", monospace;
}

.timer-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.timer-actions button {
  min-width: 110px;
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  color: #0f172a;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
}

.timer-actions button:last-child {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}`;

const TIMER_CODE = `class Stopwatch {
  constructor(displaySelector) {
    this.display = document.querySelector(displaySelector);
    this.toggleButton = document.querySelector('[data-action="toggle"]');
    this.resetButton = document.querySelector('[data-action="reset"]');
    this.startedAt = 0;
    this.elapsed = 0;
    this.frame = 0;
    this.running = false;

    this.toggleButton.addEventListener('click', () => this.toggle());
    this.resetButton.addEventListener('click', () => this.reset());
    this.render();
  }

  format(ms) {
    const totalTenths = Math.floor(ms / 100);
    const minutes = Math.floor(totalTenths / 600);
    const seconds = Math.floor((totalTenths % 600) / 10);
    const tenths = totalTenths % 10;
    return \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}.\${tenths}\`;
  }

  tick() {
    if (!this.running) return;
    this.elapsed = performance.now() - this.startedAt;
    this.render();
    this.frame = requestAnimationFrame(() => this.tick());
  }

  toggle() {
    if (this.running) {
      this.running = false;
      cancelAnimationFrame(this.frame);
      this.toggleButton.textContent = 'Start';
      return;
    }

    this.running = true;
    this.startedAt = performance.now() - this.elapsed;
    this.toggleButton.textContent = 'Pause';
    this.tick();
  }

  reset() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.elapsed = 0;
    this.toggleButton.textContent = 'Start';
    this.render();
  }

  render() {
    this.display.textContent = this.format(this.elapsed);
  }
}

new Stopwatch('#timer-display');`;

const API_CLIENT_CODE = `class ApiClient {
  constructor(baseUrl, defaultHeaders = {}) {
    this.baseUrl = baseUrl.replace(/\\/$/, '');
    this.defaultHeaders = defaultHeaders;
  }

  async request(path, options = {}) {
    const response = await fetch(\`\${this.baseUrl}\${path}\`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(\`Request failed (\${response.status}): \${details}\`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  get(path) {
    return this.request(path, { method: 'GET' });
  }

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(path, body) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
}`;

const MERGE_SORT_CODE = `function mergeSort(values) {
  if (values.length <= 1) {
    return values;
  }

  const midpoint = Math.floor(values.length / 2);
  const left = mergeSort(values.slice(0, midpoint));
  const right = mergeSort(values.slice(midpoint));

  return merge(left, right);
}

function merge(left, right) {
  const output = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] <= right[rightIndex]) {
      output.push(left[leftIndex]);
      leftIndex += 1;
    } else {
      output.push(right[rightIndex]);
      rightIndex += 1;
    }
  }

  return output
    .concat(left.slice(leftIndex))
    .concat(right.slice(rightIndex));
}`;

function lineCount(code) {
  return String(code || '').split('\n').length;
}

function createFile(filename, language, content, primary = false) {
  return {
    filename,
    language,
    content,
    primary,
  };
}

function createLivePreview({ title, body, markup, styles, script }) {
  return {
    mode: 'live',
    title,
    body,
    markup,
    styles,
    script,
  };
}

function createNotePreview(title, body) {
  return {
    mode: 'note',
    title,
    body,
    markup: '',
    styles: '',
    script: '',
  };
}

function createOutput({
  title,
  summary,
  files,
  explanation,
  steps,
  tips,
  complexity,
  preview,
}) {
  const normalizedFiles = Array.isArray(files) && files.length > 0
    ? files
    : [createFile('snippet.js', 'JavaScript', '// No code was generated.', true)];

  const primaryFile = normalizedFiles.find((file) => file.primary) || normalizedFiles[0];

  return {
    title,
    summary,
    filename: primaryFile.filename,
    language: primaryFile.language,
    code: primaryFile.content,
    files: normalizedFiles,
    explanationTitle: 'How it works',
    explanation,
    steps,
    tips,
    complexity,
    preview,
    stats: {
      lines: lineCount(primaryFile.content),
      files: normalizedFiles.length,
      language: primaryFile.language,
      status: preview.mode === 'live' ? 'Live preview ready' : 'Code ready',
    },
  };
}

function calculatorOutput() {
  const files = [
    createFile('index.html', 'HTML', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Keyboard Calculator</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${CALCULATOR_MARKUP}
    <script src="calculator.js"></script>
  </body>
</html>`),
    createFile('styles.css', 'CSS', CALCULATOR_STYLES),
    createFile('calculator.js', 'JavaScript', CALCULATOR_CODE, true),
  ];

  return createOutput({
    title: 'JavaScript Calculator',
    summary: 'A small browser calculator with keyboard shortcuts, clear state ownership, and a live preview.',
    files,
    explanation: 'This calculator keeps only the active input, the previous operand, and the pending operator in memory, so every click or keypress becomes a small, predictable state transition.',
    steps: [
      'The constructor grabs the display nodes, wires both keyboard and button events, and renders the initial state.',
      'Digits and decimals append into the active buffer while duplicate decimals are rejected before the state changes.',
      'Operator selection stores the left operand, clears the active buffer, and writes the pending expression into the history row.',
      'Evaluation resolves the pending operation, handles divide-by-zero safely, and pushes the final value back through render().',
    ],
    tips: [
      'Treat the display as a projection of state instead of mutating it from several code paths.',
      'Give keyboard shortcuts the same ownership path as button clicks so behavior does not diverge.',
      'Store arithmetic state in a small object and re-render after every transition.',
      'Handle invalid cases such as divide-by-zero explicitly instead of relying on implicit JavaScript behavior.',
    ],
    complexity: {
      level: 'Low',
      time: 'O(1)',
      space: 'O(1)',
      pattern: 'State Machine',
      paradigm: 'DOM-driven OOP',
    },
    preview: createLivePreview({
      title: 'Interactive calculator',
      body: 'The preview is rendered from backend-provided HTML, CSS, and JavaScript so the UI, explanation, and code all describe the same artifact.',
      markup: CALCULATOR_MARKUP,
      styles: CALCULATOR_STYLES,
      script: CALCULATOR_CODE,
    }),
  });
}

function todoOutput() {
  const files = [
    createFile('index.html', 'HTML', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Todo Workspace</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${TODO_MARKUP}
    <script src="todo-app.js"></script>
  </body>
</html>`),
    createFile('styles.css', 'CSS', TODO_STYLES),
    createFile('todo-app.js', 'JavaScript', TODO_CODE, true),
  ];

  return createOutput({
    title: 'Todo List App',
    summary: 'A small single-page todo UI with real add, toggle, and delete behavior running inside the preview sandbox.',
    files,
    explanation: 'This todo app keeps all records in a single array, listens for form and list events in one place, and re-renders from state after every mutation so the interface stays honest.',
    steps: [
      'The constructor captures the form, list, and counter elements, then registers submit, change, and click listeners.',
      'Submitting the form normalizes input into a new todo record with a stable id before re-rendering the list.',
      'Checkbox changes and delete clicks use event delegation so freshly rendered items keep working without extra wiring.',
      'render() updates both the open-item count and the list markup from the current array, including an empty state.',
    ],
    tips: [
      'Use event delegation for list UIs that frequently replace their children.',
      'Keep the data model tiny so rendering logic stays easy to reason about.',
      'Prefer a single render pass over ad hoc DOM updates when the UI is small.',
      'Make empty states explicit so the preview stays informative before any data exists.',
    ],
    complexity: {
      level: 'Low',
      time: 'O(n)',
      space: 'O(n)',
      pattern: 'Single Source of Truth',
      paradigm: 'Event-driven UI',
    },
    preview: createLivePreview({
      title: 'Interactive todo preview',
      body: 'This preview is fully functional: add tasks, mark them done, and delete them to verify the returned code path.',
      markup: TODO_MARKUP,
      styles: TODO_STYLES,
      script: TODO_CODE,
    }),
  });
}

function timerOutput() {
  return createOutput({
    title: 'Browser Stopwatch',
    summary: 'A compact stopwatch UI with start, pause, and reset behavior running directly in the preview sandbox.',
    files: [
      createFile('index.html', 'HTML', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stopwatch</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${TIMER_MARKUP}
    <script src="timer.js"></script>
  </body>
</html>`),
      createFile('styles.css', 'CSS', TIMER_STYLES),
      createFile('timer.js', 'JavaScript', TIMER_CODE, true),
    ],
    explanation: 'This stopwatch keeps only elapsed time and a running flag in memory. It uses `requestAnimationFrame` for smooth updates and derives the visible time from the difference between the current frame timestamp and the stored start time.',
    steps: [
      'Cache the display and button elements once when the stopwatch boots.',
      'Start records the reference time and begins a frame loop that updates the elapsed duration.',
      'Pause stops the frame loop without discarding elapsed time so the next start resumes cleanly.',
      'Reset clears elapsed time, cancels any active frame loop, and restores the initial label state.',
    ],
    tips: [
      'Use `requestAnimationFrame` for lightweight UI timing instead of stacking multiple intervals.',
      'Derive the display from elapsed milliseconds instead of mutating the string directly.',
      'Keep start and reset actions explicit so pause and resume logic stays easy to reason about.',
    ],
    complexity: {
      level: 'Low',
      time: 'O(1) per frame',
      space: 'O(1)',
      pattern: 'State Machine',
      paradigm: 'DOM-driven UI',
    },
    preview: {
      mode: 'live',
      title: 'Interactive stopwatch',
      body: 'A start, pause, and reset timer rendered from backend-provided HTML, CSS, and JavaScript.',
      markup: TIMER_MARKUP,
      styles: TIMER_STYLES,
      script: TIMER_CODE,
    },
  });
}

function apiClientOutput() {
  return createOutput({
    title: 'REST API Client',
    summary: 'A reusable client wrapper that centralizes fetch setup, JSON parsing, and error handling.',
    files: [
      createFile('api-client.js', 'JavaScript', API_CLIENT_CODE, true),
    ],
    explanation: 'The client pushes every request through one request() method, which keeps headers, parsing rules, and failure behavior consistent instead of scattering fetch details across the app.',
    steps: [
      'The constructor stores the normalized base URL and default headers once.',
      'request() merges per-call options into the shared configuration and performs the fetch.',
      'Non-2xx responses are converted into rich errors that include the failing status code and payload text.',
      'Convenience helpers expose GET, POST, PUT, and DELETE while keeping the real network contract in one place.',
    ],
    tips: [
      'Centralize transport logic so retries and logging can be added in one layer.',
      'Throw rich errors early so callers have enough context to decide whether to retry or surface the problem.',
      'Normalize the base URL once in the constructor instead of on every request.',
      'Keep body serialization in the transport layer to avoid inconsistent call sites.',
    ],
    complexity: {
      level: 'Medium',
      time: 'O(1)',
      space: 'O(1)',
      pattern: 'Service Wrapper',
      paradigm: 'Async / Await',
    },
    preview: createNotePreview(
      'Code-first output',
      'REST clients are better validated through the code contract than a visual sandbox, so this response focuses on the implementation details.',
    ),
  });
}

function sortingOutput() {
  return createOutput({
    title: 'Merge Sort',
    summary: 'A classic divide-and-conquer implementation with a clean merge helper.',
    files: [
      createFile('merge-sort.js', 'JavaScript', MERGE_SORT_CODE, true),
    ],
    explanation: 'Merge sort recursively splits the input into smaller halves and then merges those sorted halves back together, producing predictable O(n log n) runtime at the cost of extra memory for the merged output.',
    steps: [
      'The array is divided around its midpoint until only one-element subarrays remain.',
      'Each recursive call returns a sorted left half and a sorted right half.',
      'merge() advances two pointers and emits the smaller next value into the output array.',
      'Any remaining tail values are appended once one side is exhausted.',
    ],
    tips: [
      'Use merge sort when predictable runtime matters more than in-place mutation.',
      'Keep the merge helper isolated so the recursive flow stays easy to read.',
      'Reason about sorted subproblems instead of adjacent swaps.',
      'Watch recursion depth and allocation pressure if you scale this pattern up to very large inputs.',
    ],
    complexity: {
      level: 'Medium',
      time: 'O(n log n)',
      space: 'O(n)',
      pattern: 'Divide and Conquer',
      paradigm: 'Recursion',
    },
    preview: createNotePreview(
      'Algorithm output',
      'Algorithms like merge sort benefit more from the step breakdown and code walkthrough than from a static visual preview.',
    ),
  });
}

function genericOutput(message) {
  const task = message.trim();
  const code = `function buildFeaturePlan() {
  return {
    task: ${JSON.stringify(task)},
    goals: [
      'Define the input and output contract',
      'Implement the happy path first',
      'Handle validation and failures explicitly',
      'Add a thin integration layer for the UI or API surface'
    ]
  };
}`;

  return createOutput({
    title: 'Implementation Starter',
    summary: 'A structured implementation outline that keeps the sandbox useful when a request does not map cleanly to a browser preview template.',
    files: [
      createFile('feature-plan.js', 'JavaScript', code, true),
    ],
    explanation: 'This fallback response turns the request into a concrete implementation outline so the sandbox still returns a stored artifact with code, reasoning, and a predictable backend contract.',
    steps: [
      'Capture the task description as an explicit requirement.',
      'List the minimal goals the implementation has to satisfy.',
      'Build the happy path before optional abstractions.',
      'Add validation and integration details once the core path is solid.',
    ],
    tips: [
      'Define the contract before writing code.',
      'Prefer a thin first version over speculative abstraction.',
      'Add failure handling deliberately instead of scattering guards everywhere.',
      'Use the outline as a bridge into a more specific implementation pass.',
    ],
    complexity: {
      level: 'Low',
      time: 'O(1)',
      space: 'O(1)',
      pattern: 'Feature Planning',
      paradigm: 'Structured Scaffolding',
    },
    preview: createNotePreview(
      'Planning output',
      'This request was mapped to a concrete implementation outline rather than a live browser preview.',
    ),
  });
}

function selectOutput(message) {
  const normalized = message.toLowerCase();

  if (normalized.includes('calculator')) {
    return {
      reply: 'I generated a keyboard-enabled calculator and attached a real preview payload so the code, explanation, and running UI stay aligned.',
      output: calculatorOutput(),
    };
  }

  if (normalized.includes('todo')) {
    return {
      reply: 'I built a working todo app artifact with delegated events and a live preview that matches the returned files.',
      output: todoOutput(),
    };
  }

  if (normalized.includes('timer') || normalized.includes('stopwatch')) {
    return {
      reply: 'I built a stopwatch-style timer with start, pause, and reset controls plus a live preview.',
      output: timerOutput(),
    };
  }

  if (normalized.includes('rest api') || normalized.includes('api client')) {
    return {
      reply: 'I returned a reusable REST client wrapper with the transport logic centralized into one request layer.',
      output: apiClientOutput(),
    };
  }

  if (normalized.includes('sort')) {
    return {
      reply: 'I used merge sort here because it is a compact example of divide-and-conquer with predictable runtime.',
      output: sortingOutput(),
    };
  }

  return {
    reply: 'I mapped your request into a structured implementation artifact so the backend still returns code, explanation, and preview metadata through one stable contract.',
    output: genericOutput(message),
  };
}

function generateAssistantReply(input = {}) {
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  const history = Array.isArray(input.history) ? input.history : [];

  if (!message) {
    const error = new Error('Message is required');
    error.statusCode = 400;
    throw error;
  }

  const selected = selectOutput(message);

  return {
    reply: selected.reply,
    output: selected.output,
    meta: {
      historyItemsReceived: history.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = { generateAssistantReply };
