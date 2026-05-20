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

// ─── LANGUAGE DETECTION ───────────────────────────────────────
function detectLang(combined) {
  if (/\bpython\b|\.py\b/.test(combined))       return 'python';
  if (/c\+\+|\bcpp\b|\.cpp\b/.test(combined))   return 'cpp';   // c++ has non-word chars, no \b needed
  if (/\bjava\b(?!script)/.test(combined))       return 'java';
  return 'javascript';
}

// ─── DSA IMPLEMENTATIONS ──────────────────────────────────────

const BINARY_SEARCH_CODE = `function binarySearch(sortedArray, target) {
  let left  = 0;
  let right = sortedArray.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (sortedArray[mid] === target) return mid;      // found
    if (sortedArray[mid] < target)  left  = mid + 1; // discard left half
    else                            right = mid - 1; // discard right half
  }

  return -1; // not found
}

// Example
const arr = [1, 3, 5, 7, 9, 11, 13];
console.log(binarySearch(arr, 7));  // → 3
console.log(binarySearch(arr, 6));  // → -1`;

const STACK_CODE = `class Stack {
  constructor() {
    this.items = [];
  }

  push(item) { this.items.push(item); return this; }
  pop()      { return this.isEmpty() ? null : this.items.pop(); }
  peek()     { return this.isEmpty() ? null : this.items[this.items.length - 1]; }
  isEmpty()  { return this.items.length === 0; }
  size()     { return this.items.length; }
  clear()    { this.items = []; return this; }

  toArray()  { return [...this.items]; }
}

// Real-world use: balanced parentheses checker
function isBalanced(str) {
  const stack = new Stack();
  const pairs = { ')': '(', ']': '[', '}': '{' };

  for (const ch of str) {
    if ('([{'.includes(ch)) stack.push(ch);
    else if (')]}'.includes(ch) && stack.pop() !== pairs[ch]) return false;
  }

  return stack.isEmpty();
}

console.log(isBalanced('({[]})'));  // true
console.log(isBalanced('([)]'));    // false`;

const LINKED_LIST_CODE = `class Node {
  constructor(value) {
    this.value = value;
    this.next  = null;
  }
}

class LinkedList {
  constructor() {
    this.head   = null;
    this.length = 0;
  }

  prepend(value) {
    const node = new Node(value);
    node.next  = this.head;
    this.head  = node;
    this.length++;
    return this;
  }

  append(value) {
    const node = new Node(value);
    if (!this.head) { this.head = node; }
    else {
      let cur = this.head;
      while (cur.next) cur = cur.next;
      cur.next = node;
    }
    this.length++;
    return this;
  }

  remove(value) {
    if (!this.head) return false;
    if (this.head.value === value) {
      this.head = this.head.next;
      this.length--;
      return true;
    }
    let cur = this.head;
    while (cur.next) {
      if (cur.next.value === value) {
        cur.next = cur.next.next;
        this.length--;
        return true;
      }
      cur = cur.next;
    }
    return false;
  }

  reverse() {
    let prev = null, cur = this.head;
    while (cur) {
      const next = cur.next;
      cur.next   = prev;
      prev       = cur;
      cur        = next;
    }
    this.head = prev;
    return this;
  }

  toArray() {
    const result = [];
    let cur = this.head;
    while (cur) { result.push(cur.value); cur = cur.next; }
    return result;
  }
}`;

const QUICK_SORT_CODE = `function quickSort(array, low = 0, high = array.length - 1) {
  if (low < high) {
    const pi = partition(array, low, high);
    quickSort(array, low, pi - 1);
    quickSort(array, pi + 1, high);
  }
  return array;
}

function partition(array, low, high) {
  const pivot = array[high]; // last element as pivot
  let i = low - 1;

  for (let j = low; j < high; j++) {
    if (array[j] <= pivot) {
      i++;
      [array[i], array[j]] = [array[j], array[i]]; // swap smaller to left
    }
  }
  [array[i + 1], array[high]] = [array[high], array[i + 1]]; // place pivot
  return i + 1;
}

const arr = [10, 80, 30, 90, 40, 50, 70];
console.log(quickSort([...arr])); // → [10, 30, 40, 50, 70, 80, 90]`;

const HASH_MAP_CODE = `class HashMap {
  constructor(capacity = 16) {
    this.capacity = capacity;
    this.size     = 0;
    this.buckets  = Array.from({ length: capacity }, () => []);
  }

  hash(key) {
    let h = 0;
    for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % this.capacity;
    return h;
  }

  set(key, value) {
    const bucket = this.buckets[this.hash(key)];
    const entry  = bucket.find(([k]) => k === key);
    if (entry) entry[1] = value;
    else { bucket.push([key, value]); this.size++; }
    return this;
  }

  get(key) {
    const entry = this.buckets[this.hash(key)].find(([k]) => k === key);
    return entry ? entry[1] : undefined;
  }

  has(key)    { return this.get(key) !== undefined; }
  delete(key) {
    const bucket = this.buckets[this.hash(key)];
    const idx    = bucket.findIndex(([k]) => k === key);
    if (idx === -1) return false;
    bucket.splice(idx, 1);
    this.size--;
    return true;
  }

  keys()    { return this.buckets.flatMap(b => b.map(([k])   => k)); }
  values()  { return this.buckets.flatMap(b => b.map(([,v])  => v)); }
  entries() { return this.buckets.flatMap(b => [...b]); }
}`;

const GRAPH_CODE = `class Graph {
  constructor() {
    this.list = new Map(); // adjacency list
  }

  addVertex(v)      { if (!this.list.has(v)) this.list.set(v, []); return this; }
  addEdge(v1, v2)   { this.list.get(v1)?.push(v2); this.list.get(v2)?.push(v1); return this; }

  bfs(start) {
    const visited = new Set([start]);
    const queue   = [start];
    const result  = [];

    while (queue.length) {
      const v = queue.shift();
      result.push(v);
      for (const n of this.list.get(v) || []) {
        if (!visited.has(n)) { visited.add(n); queue.push(n); }
      }
    }
    return result;
  }

  dfs(start, visited = new Set(), result = []) {
    visited.add(start);
    result.push(start);
    for (const n of this.list.get(start) || []) {
      if (!visited.has(n)) this.dfs(n, visited, result);
    }
    return result;
  }
}

// Build a sample graph and traverse it
const g = new Graph();
['A','B','C','D','E'].forEach(v => g.addVertex(v));
g.addEdge('A','B').addEdge('A','C').addEdge('B','D').addEdge('C','E');
console.log('BFS:', g.bfs('A')); // → ['A','B','C','D','E']
console.log('DFS:', g.dfs('A')); // → ['A','B','D','C','E']`;

// ─── PYTHON VARIANTS ──────────────────────────────────────────

const DSA_PYTHON = {
  'binary-search': `def binary_search(sorted_array: list, target: int) -> int:
    left, right = 0, len(sorted_array) - 1

    while left <= right:
        mid = (left + right) // 2

        if sorted_array[mid] == target:
            return mid
        elif sorted_array[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1  # not found


# Example
arr = [1, 3, 5, 7, 9, 11, 13]
print(binary_search(arr, 7))   # → 3
print(binary_search(arr, 6))   # → -1`,

  'merge-sort': `def merge_sort(arr: list) -> list:
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    return merge(left, right)


def merge(left: list, right: list) -> list:
    result, i, j = [], 0, 0

    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1

    result.extend(left[i:])
    result.extend(right[j:])
    return result


# Example
arr = [38, 27, 43, 3, 9, 82, 10]
print(merge_sort(arr))  # → [3, 9, 10, 27, 38, 43, 82]`,

  'stack': `class Stack:
    def __init__(self):
        self._items = []

    def push(self, item):
        self._items.append(item)

    def pop(self):
        return self._items.pop() if self._items else None

    def peek(self):
        return self._items[-1] if self._items else None

    def is_empty(self) -> bool:
        return len(self._items) == 0

    def size(self) -> int:
        return len(self._items)


# Real-world use: balanced parentheses checker
def is_balanced(s: str) -> bool:
    stack = Stack()
    pairs = {')': '(', ']': '[', '}': '{'}

    for ch in s:
        if ch in '([{':
            stack.push(ch)
        elif ch in ')]}':
            if stack.pop() != pairs[ch]:
                return False

    return stack.is_empty()


print(is_balanced('({[]})'))  # True
print(is_balanced('([)]'))    # False`,

  'linked-list': `class Node:
    def __init__(self, value):
        self.value = value
        self.next  = None


class LinkedList:
    def __init__(self):
        self.head   = None
        self.length = 0

    def prepend(self, value):
        node      = Node(value)
        node.next = self.head
        self.head = node
        self.length += 1

    def append(self, value):
        node = Node(value)
        if not self.head:
            self.head = node
        else:
            cur = self.head
            while cur.next:
                cur = cur.next
            cur.next = node
        self.length += 1

    def remove(self, value) -> bool:
        if not self.head:
            return False
        if self.head.value == value:
            self.head = self.head.next
            self.length -= 1
            return True
        cur = self.head
        while cur.next:
            if cur.next.value == value:
                cur.next = cur.next.next
                self.length -= 1
                return True
            cur = cur.next
        return False

    def to_list(self) -> list:
        result, cur = [], self.head
        while cur:
            result.append(cur.value)
            cur = cur.next
        return result


ll = LinkedList()
ll.prepend(3); ll.prepend(2); ll.prepend(1)
print(ll.to_list())   # [1, 2, 3]
ll.remove(2)
print(ll.to_list())   # [1, 3]`,

  'quick-sort': `def quick_sort(arr: list, low: int = 0, high: int = None) -> list:
    if high is None:
        high = len(arr) - 1
    if low < high:
        pi = partition(arr, low, high)
        quick_sort(arr, low, pi - 1)
        quick_sort(arr, pi + 1, high)
    return arr


def partition(arr: list, low: int, high: int) -> int:
    pivot = arr[high]
    i = low - 1

    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]

    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1


arr = [10, 80, 30, 90, 40, 50, 70]
print(quick_sort(arr[:]))  # → [10, 30, 40, 50, 70, 80, 90]`,

  'merge-sort': `def merge_sort(arr: list) -> list:
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)


def merge(left: list, right: list) -> list:
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result


arr = [38, 27, 43, 3, 9, 82, 10]
print(merge_sort(arr))  # → [3, 9, 10, 27, 38, 43, 82]`,

  'graph': `from collections import deque

class Graph:
    def __init__(self):
        self.adjacency = {}

    def add_vertex(self, v):
        if v not in self.adjacency:
            self.adjacency[v] = []

    def add_edge(self, v1, v2):
        self.adjacency[v1].append(v2)
        self.adjacency[v2].append(v1)

    def bfs(self, start) -> list:
        visited = {start}
        queue   = deque([start])
        result  = []

        while queue:
            v = queue.popleft()
            result.append(v)
            for n in self.adjacency.get(v, []):
                if n not in visited:
                    visited.add(n)
                    queue.append(n)
        return result

    def dfs(self, start, visited=None, result=None) -> list:
        if visited is None: visited, result = set(), []
        visited.add(start)
        result.append(start)
        for n in self.adjacency.get(start, []):
            if n not in visited:
                self.dfs(n, visited, result)
        return result


g = Graph()
for v in ['A','B','C','D','E']:
    g.add_vertex(v)
g.add_edge('A','B'); g.add_edge('A','C')
g.add_edge('B','D'); g.add_edge('C','E')

print('BFS:', g.bfs('A'))  # ['A', 'B', 'C', 'D', 'E']
print('DFS:', g.dfs('A'))  # ['A', 'B', 'D', 'C', 'E']`,
};

// ─── C++ VARIANTS ─────────────────────────────────────────────

const DSA_CPP = {
  'binary-search': `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int left = 0, right = (int)arr.size() - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2; // avoids overflow

        if (arr[mid] == target) return mid;
        if (arr[mid] < target)  left  = mid + 1;
        else                    right = mid - 1;
    }
    return -1; // not found
}

int main() {
    vector<int> arr = {1, 3, 5, 7, 9, 11, 13};
    cout << binarySearch(arr, 7)  << endl; // 3
    cout << binarySearch(arr, 6)  << endl; // -1
    return 0;
}`,

  'merge-sort': `#include <iostream>
#include <vector>
using namespace std;

void merge(vector<int>& arr, int left, int mid, int right) {
    vector<int> L(arr.begin() + left, arr.begin() + mid + 1);
    vector<int> R(arr.begin() + mid + 1, arr.begin() + right + 1);

    int i = 0, j = 0, k = left;
    while (i < L.size() && j < R.size())
        arr[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];
    while (i < L.size()) arr[k++] = L[i++];
    while (j < R.size()) arr[k++] = R[j++];
}

void mergeSort(vector<int>& arr, int left, int right) {
    if (left >= right) return;
    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

int main() {
    vector<int> arr = {38, 27, 43, 3, 9, 82, 10};
    mergeSort(arr, 0, arr.size() - 1);
    for (int x : arr) cout << x << " "; // 3 9 10 27 38 43 82
    return 0;
}`,

  'stack': `#include <iostream>
#include <stack>
#include <string>
using namespace std;

// Custom stack wrapper
template<typename T>
class Stack {
    stack<T> s;
public:
    void push(T item)  { s.push(item); }
    T    pop()         { T top = s.top(); s.pop(); return top; }
    T    peek()        { return s.top(); }
    bool isEmpty()     { return s.empty(); }
    int  size()        { return s.size(); }
};

// Balanced parentheses checker
bool isBalanced(const string& str) {
    Stack<char> stk;
    for (char ch : str) {
        if (ch == '(' || ch == '[' || ch == '{') stk.push(ch);
        else if (!stk.isEmpty()) {
            char top = stk.pop();
            if ((ch == ')' && top != '(') ||
                (ch == ']' && top != '[') ||
                (ch == '}' && top != '{')) return false;
        } else return false;
    }
    return stk.isEmpty();
}

int main() {
    cout << isBalanced("({[]})") << endl; // 1 (true)
    cout << isBalanced("([)]")   << endl; // 0 (false)
    return 0;
}`,

  'merge-sort': `#include <iostream>
#include <vector>
using namespace std;

void merge(vector<int>& arr, int l, int m, int r) {
    vector<int> L(arr.begin()+l, arr.begin()+m+1);
    vector<int> R(arr.begin()+m+1, arr.begin()+r+1);
    int i=0, j=0, k=l;
    while (i<L.size() && j<R.size())
        arr[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];
    while (i<L.size()) arr[k++] = L[i++];
    while (j<R.size()) arr[k++] = R[j++];
}

void mergeSort(vector<int>& arr, int l, int r) {
    if (l >= r) return;
    int m = l + (r-l)/2;
    mergeSort(arr, l, m);
    mergeSort(arr, m+1, r);
    merge(arr, l, m, r);
}

int main() {
    vector<int> arr = {38,27,43,3,9,82,10};
    mergeSort(arr, 0, arr.size()-1);
    for (int x : arr) cout << x << " "; // 3 9 10 27 38 43 82
    return 0;
}`,

  'quick-sort': `#include <iostream>
#include <vector>
using namespace std;

int partition(vector<int>& arr, int low, int high) {
    int pivot = arr[high], i = low - 1;
    for (int j = low; j < high; j++)
        if (arr[j] <= pivot) swap(arr[++i], arr[j]);
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quickSort(vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    vector<int> arr = {10, 80, 30, 90, 40, 50, 70};
    quickSort(arr, 0, arr.size() - 1);
    for (int x : arr) cout << x << " "; // 10 30 40 50 70 80 90
    return 0;
}`,
};

// Pick the right code + file metadata for the requested language
function langVariant(key, jsCode) {
  const LANG_META = {
    python:     { ext: '.py',  label: 'Python',     base: DSA_PYTHON[key] || jsCode },
    cpp:        { ext: '.cpp', label: 'C++',         base: DSA_CPP[key]   || jsCode },
    javascript: { ext: '.js',  label: 'JavaScript',  base: jsCode },
    java:       { ext: '.js',  label: 'JavaScript',  base: jsCode }, // fallback to JS for now
  };
  return LANG_META;
}

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
  title, summary, files, explanation, steps, tips,
  complexity, preview, userFlow, concepts, features,
  trace, inputExample, outputExample, keyInsight,
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
    userFlow:     Array.isArray(userFlow)  ? userFlow  : [],
    concepts:     Array.isArray(concepts)  ? concepts  : [],
    features:     Array.isArray(features)  ? features  : [],
    trace:        Array.isArray(trace)     ? trace     : [],
    inputExample: typeof inputExample  === 'string' ? inputExample  : '',
    outputExample:typeof outputExample === 'string' ? outputExample : '',
    keyInsight:   typeof keyInsight    === 'string' ? keyInsight    : '',
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
    userFlow: [
      'Click a digit or press a number key → display updates immediately',
      'Click + − × ÷ → first operand saved, operator stored',
      'Type the second number → input buffer starts fresh',
      'Press = or Enter → result computed and shown on display',
      'Press Backspace → last digit removed from buffer',
      'Click AC → all state cleared, display resets to 0',
    ],
    concepts: ['State Machine', 'Event Delegation', 'Keyboard Events', 'DOM API', 'OOP Class', 'Arithmetic Logic'],
    features: ['Full keyboard shortcuts', 'Expression history row', 'Divide-by-zero handled', 'Decimal precision', 'Backspace support'],
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
    userFlow: [
      'Type a task name and press Enter → item added to the top of the list',
      'Checkbox clicked → item toggled to done, text gets strikethrough',
      'Delete button clicked → item removed from the array',
      'render() fires → entire list re-built from current array state',
      'Open-count badge → auto-updates every time render() runs',
      'All tasks deleted → empty-state message shown automatically',
    ],
    concepts: ['Event Delegation', 'Array State', 'Single Source of Truth', 'Form Handling', 'DOM Re-render', 'OOP Class'],
    features: ['Add tasks via keyboard', 'Toggle completion state', 'Delete individual tasks', 'Live open-item counter', 'Empty-state feedback'],
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
    userFlow: [
      'Click Start → requestAnimationFrame loop begins ticking',
      'Each frame: elapsed = now − startTime → formatted MM:SS.t',
      'Click Pause → frame loop cancelled, elapsed time preserved',
      'Click Start again → loop resumes from the saved elapsed offset',
      'Click Reset → elapsed cleared to 0, button label restored',
    ],
    concepts: ['requestAnimationFrame', 'Performance API', 'State Machine', 'Timing Math', 'DOM API', 'Closure'],
    features: ['Sub-second precision', 'Pause and resume', 'Frame-based animation', 'Three-variable state', 'No external libraries'],
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
    userFlow: [
      'new ApiClient(baseUrl) → URL normalized and headers stored',
      'client.get("/users") → GET method + default headers merged',
      'client.post("/users", body) → body serialized to JSON automatically',
      'fetch() executes → response status checked first',
      'Non-2xx response → rich error thrown with status code + message',
      '204 No Content → returns null safely, no JSON parse crash',
    ],
    concepts: ['Async / Await', 'Fetch API', 'HTTP Methods', 'Error Handling', 'DRY Principle', 'Service Layer'],
    features: ['Centralized fetch config', 'Auto JSON serialize', 'Status-aware parsing', 'Rich error messages', 'GET / POST / PUT / DELETE'],
    preview: createNotePreview(
      'Code-first output',
      'REST clients are better validated through the code contract than a visual sandbox, so this response focuses on the implementation details.',
    ),
  });
}

function sortingOutput(lang = 'javascript') {
  const meta = langVariant('merge-sort', MERGE_SORT_CODE)[lang] || langVariant('merge-sort', MERGE_SORT_CODE).javascript;
  return createOutput({
    title: `Merge Sort (${meta.label})`,
    summary: 'A classic divide-and-conquer implementation with a clean merge helper.',
    files: [
      createFile(`merge-sort${meta.ext}`, meta.label, meta.base, true),
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

// Detect visual theme — current message takes priority over history.
function detectTheme(normalized, historyText = '') {
  // Check current message first so "change to dark" beats "neo brutalism" in old history.
  const checks = [
    [/neo.?brutalism|brutalist|brutal/,        'neo-brutalism'],
    [/dark.?mode|dark.?theme|dark.?ui|\bdark\b/,'dark'],
    [/glassmorphism|\bglass\b/,                 'glass'],
    [/\bminimal\b|\bclean\b/,                   'minimal'],
    [/\bretro\b|\bvintage\b/,                   'retro'],
    [/\bneon\b|cyberpunk/,                      'neon'],
  ];
  for (const [re, theme] of checks) if (re.test(normalized))   return theme;
  for (const [re, theme] of checks) if (re.test(historyText))  return theme;
  return 'default';
}

const NEO_BRUTALISM_CALC_STYLES = `
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:#F5F0E8;font-family:"Arial Black",Arial,sans-serif;display:grid;place-items:center;padding:20px}
.calc-shell{width:100%;display:grid;place-items:center}
.calc-card{background:#fff;border:4px solid #000;box-shadow:8px 8px 0 #000;padding:20px;width:min(100%,320px)}
.calc-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;border-bottom:3px solid #000;padding-bottom:10px}
.calc-header p{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:3px}
.calc-header span{font-size:9px;color:#555;text-align:right;text-transform:uppercase;letter-spacing:1px;max-width:100px}
.history{min-height:18px;text-align:right;color:#888;font-family:"Courier New",monospace;font-size:12px;margin-bottom:6px;border-bottom:2px dashed #000;padding-bottom:6px}
.display{background:#000;color:#F5F500;font-size:44px;text-align:right;padding:14px 12px;margin-bottom:14px;border:4px solid #000;font-family:"Courier New",monospace;font-weight:700;word-break:break-all}
.keys{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.key{border:3px solid #000;background:#fff;min-height:60px;font-family:"Arial Black",Arial,sans-serif;font-size:18px;font-weight:900;cursor:pointer;box-shadow:4px 4px 0 #000;transition:box-shadow .06s,transform .06s;border-radius:0}
.key:hover{background:#F5F500}
.key:active{box-shadow:0 0 0 #000;transform:translate(4px,4px)}
.key-muted{background:#ddd}
.key-accent{background:#F5F500}
.key-wide{grid-column:span 2}
`;

const DARK_CALC_STYLES = `
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#0d1117;font-family:"Inter",system-ui,sans-serif;display:grid;place-items:center;padding:24px}
.calc-shell{width:100%;display:grid;place-items:center}
.calc-card{width:min(100%,340px);background:#161b22;border:1px solid #30363d;border-radius:16px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.calc-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.calc-header p{font-size:13px;font-weight:600;color:#e6edf3}
.calc-header span{font-size:11px;color:#8b949e;text-align:right;max-width:110px;line-height:1.4}
.history{min-height:18px;text-align:right;color:#6e7681;font-family:"JetBrains Mono","Fira Code",monospace;font-size:12px;margin-bottom:6px}
.display{text-align:right;font-size:44px;line-height:1;font-family:"JetBrains Mono","Fira Code",monospace;color:#58a6ff;margin-bottom:16px;min-height:48px}
.keys{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.key{border:none;border-radius:10px;min-height:56px;font:inherit;font-size:18px;cursor:pointer;background:#21262d;color:#e6edf3;transition:background .12s,transform .08s}
.key:hover{background:#30363d}
.key:active{transform:scale(.96)}
.key-muted{background:#30363d;color:#8b949e}
.key-accent{background:linear-gradient(135deg,#1f6feb,#388bfd);color:#fff}
.key-wide{grid-column:span 2}
`;

function themedCalculatorOutput(theme) {
  const styles = theme === 'neo-brutalism' ? NEO_BRUTALISM_CALC_STYLES
    : theme === 'dark' ? DARK_CALC_STYLES
    : CALCULATOR_STYLES;

  const themeLabel = {
    'neo-brutalism': 'Neo-Brutalist',
    'dark':          'Dark Mode',
    'default':       'Classic',
  }[theme] || 'Styled';

  const files = [
    createFile('index.html', 'HTML', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${themeLabel} Calculator</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${CALCULATOR_MARKUP}
    <script src="calculator.js"></script>
  </body>
</html>`),
    createFile('styles.css', 'CSS', styles),
    createFile('calculator.js', 'JavaScript', CALCULATOR_CODE, true),
  ];

  return createOutput({
    title: `${themeLabel} Calculator`,
    summary: `A keyboard-enabled calculator with a ${themeLabel.toLowerCase()} design — same state-machine logic, reskinned.`,
    files,
    explanation: `This calculator uses a state machine with three variables: the current input buffer, the stored left operand, and the pending operator. The ${themeLabel.toLowerCase()} theme is applied purely through CSS — the JavaScript logic is identical to any other version.`,
    steps: [
      'The constructor wires keyboard and button events then renders the initial zero state.',
      'Digit presses append to the active buffer; duplicate decimals are rejected before state changes.',
      'Operator clicks store the left operand and write the pending expression to the history row.',
      'Pressing = resolves the operation, handles divide-by-zero, and pushes the result through render().',
    ],
    tips: [
      'Keep business logic (arithmetic) completely separate from presentation (CSS theme).',
      'Render from state — never mutate the display directly from multiple code paths.',
      'CSS custom properties make theme-switching trivial without touching JavaScript.',
    ],
    complexity: { level: 'Low', time: 'O(1)', space: 'O(1)', pattern: 'State Machine', paradigm: 'DOM-driven OOP' },
    userFlow: [
      'Click digit or press key → display updates immediately',
      'Click operator → first operand saved, history row shows pending expression',
      'Type second number → fresh input appears on display',
      'Press = or Enter → result computed and shown',
      'Press Backspace → last digit removed from buffer',
      'Click AC → all state cleared, display resets to 0',
    ],
    concepts: ['State Machine', 'Event Delegation', 'Keyboard Events', 'DOM API', 'CSS Theming', 'OOP Class'],
    features: ['Full keyboard shortcuts', 'History row', 'Divide-by-zero safe', 'Decimal handling', `${themeLabel} design`],
    preview: createLivePreview({
      title: `${themeLabel} Calculator`,
      body: `A live preview of the ${themeLabel.toLowerCase()} calculator with the same keyboard-ready logic.`,
      markup: CALCULATOR_MARKUP,
      styles,
      script: CALCULATOR_CODE,
    }),
  });
}

// ─── DSA OUTPUT FUNCTIONS ────────────────────────────────────

function binarySearchOutput(lang = 'javascript') {
  const meta = langVariant('binary-search', BINARY_SEARCH_CODE)[lang] || langVariant('binary-search', BINARY_SEARCH_CODE).javascript;
  return createOutput({
    title: `Binary Search (${meta.label})`,
    summary: 'Finds a target in a sorted array in O(log n) by halving the search space on every comparison.',
    files: [createFile(`binary-search${meta.ext}`, meta.label, meta.base, true)],
    keyInsight: 'Each comparison eliminates half the remaining candidates — so 1,000,000 elements need at most 20 comparisons.',
    explanation: 'Binary search keeps two pointers (left, right) around the unsearched window. It checks the middle element and discards the half that cannot contain the target. The window shrinks by half each iteration until the element is found or the window collapses.',
    steps: [
      'Start with left=0 and right=array.length−1 bounding the entire array.',
      'Compute mid = ⌊(left + right) / 2⌋ — the middle index of the current window.',
      'If arr[mid] equals the target, return mid immediately.',
      'If arr[mid] < target, discard the left half — set left = mid + 1.',
      'Otherwise discard the right half — set right = mid − 1.',
      'If left > right the window is empty; target is absent — return −1.',
    ],
    tips: [
      'Array MUST be sorted — binary search gives wrong answers on unsorted input.',
      'Use Math.floor((left + right) / 2) to avoid integer overflow in other languages.',
      'For insertion point problems, return left when the loop ends instead of −1.',
      'Works on any monotonic function, not just arrays — this is bisect / binary search on answer.',
    ],
    complexity: { level: 'Low', time: 'O(log n)', space: 'O(1)', pattern: 'Divide and Conquer', paradigm: 'Iterative' },
    inputExample: 'sortedArray = [1, 3, 5, 7, 9, 11, 13]  target = 7',
    outputExample: '3  (arr[3] === 7)',
    trace: [
      'left=0  right=6  mid=3 → arr[3]=7 === 7 → FOUND ✓',
      'If target were 9: left=4  right=6  mid=5 → arr[5]=11 > 9 → right=4',
      '  left=4  right=4  mid=4 → arr[4]=9 === 9 → FOUND ✓',
      'If target were 6: window collapses → return −1 (not found)',
    ],
    userFlow: [
      'Pass sorted array + target → algorithm sets up [left, right] window',
      'mid computed → compared to target → window halved each iteration',
      'Target found → return index immediately',
      'Window collapses (left > right) → return −1',
    ],
    concepts: ['Binary Search', 'Two Pointers', 'Divide & Conquer', 'Sorted Array', 'O(log n)', 'Iterative'],
    features: ['O(log n) worst-case', 'O(1) space', 'Works on any sorted sequence', 'No recursion needed', 'Returns index or −1'],
    preview: createNotePreview('Algorithm output', 'Binary search operates on a sorted array — open the Sandbox tab to explore the code.'),
  });
}

function stackOutput(lang = 'javascript') {
  const meta = langVariant('stack', STACK_CODE)[lang] || langVariant('stack', STACK_CODE).javascript;
  return createOutput({
    title: `Stack — LIFO (${meta.label})`,
    summary: 'A Last-In-First-Out structure with O(1) push, pop, and peek — used for undo, call stacks, and expression parsing.',
    files: [createFile(`stack${meta.ext}`, meta.label, meta.base, true)],
    keyInsight: 'The most recently added item is always the first to leave — the same shape as a stack of plates, browser back-history, or the call stack.',
    explanation: 'A stack wraps a plain array and exposes only four operations. Restricting the interface to push/pop/peek enforces LIFO order and makes the intent explicit. The balanced-parentheses checker shows a canonical real-world use.',
    steps: [
      'push(item) — appends to the top of the internal array in O(1).',
      'pop() — removes and returns the top element in O(1); returns null if empty.',
      'peek() — reads the top element without removing it; safe on empty stacks.',
      'isBalanced() uses the stack to match opening and closing brackets in one pass.',
    ],
    tips: [
      'Always check isEmpty() before pop() in production code.',
      'A stack naturally reverses order — useful for iterative DFS and expression evaluation.',
      'Min-stack (tracking the current minimum) is a classic interview extension.',
    ],
    complexity: { level: 'Low', time: 'O(1)', space: 'O(n)', pattern: 'LIFO', paradigm: 'OOP / Data Structure' },
    inputExample: 'stack.push(1).push(2).push(3)',
    outputExample: 'peek() → 3 | pop() → 3 | pop() → 2',
    trace: [
      'push(1) → [1]        ← top',
      'push(2) → [1, 2]     ← top',
      'push(3) → [1, 2, 3]  ← top',
      'pop()   → returns 3, stack = [1, 2]',
      'peek()  → 2, stack unchanged',
    ],
    userFlow: [
      'push(item) → item lands on top of the stack',
      'peek() → see the top without removing it',
      'pop() → remove and return top item',
      'isEmpty() → check before accessing to avoid null errors',
    ],
    concepts: ['LIFO', 'Stack ADT', 'Array Wrapper', 'O(1) Operations', 'Recursion Analogy', 'Expression Parsing'],
    features: ['O(1) push/pop/peek', 'Null-safe on empty', 'Chainable push', 'Balanced bracket checker', 'toArray snapshot'],
    preview: createNotePreview('Data structure', 'The Stack is a pure code artifact — explore the implementation in the Sandbox tab.'),
  });
}

function linkedListOutput(lang = 'javascript') {
  const meta = langVariant('linked-list', LINKED_LIST_CODE)[lang] || langVariant('linked-list', LINKED_LIST_CODE).javascript;
  return createOutput({
    title: `Linked List (${meta.label})`,
    summary: 'A chain of nodes where each node holds a value and a pointer to the next — O(1) insert at head, O(n) traversal.',
    files: [createFile(`linked-list${meta.ext}`, meta.label, meta.base, true)],
    keyInsight: 'Nodes are scattered in memory and connected by pointers — insert at the head is O(1) because you only rewire one pointer.',
    explanation: 'Each Node stores a value and a next pointer. LinkedList tracks only the head. prepend() rewires one pointer (O(1)); append() must walk to the tail (O(n)); remove() splices out a node by relinking its predecessor. reverse() walks once and flips all pointers.',
    steps: [
      'prepend(v): create node, point node.next at current head, move head to node — O(1).',
      'append(v): walk to the last node (where next === null), attach new node there — O(n).',
      'remove(v): track the predecessor; when cur.next.value matches, skip it by setting cur.next = cur.next.next — O(n).',
      'reverse(): walk once swapping next pointers; update head to the old tail — O(n).',
    ],
    tips: [
      'Always handle the empty-list edge case first (head === null).',
      'Doubly-linked lists add a prev pointer for O(1) removal when you already have the node.',
      'Slow/fast pointer (Floyd\'s cycle detection) uses two pointers moving at different speeds.',
      'For interview problems, draw the before/after pointer diagram before writing code.',
    ],
    complexity: { level: 'Medium', time: 'O(n) traversal, O(1) prepend', space: 'O(n)', pattern: 'Pointer Manipulation', paradigm: 'OOP' },
    inputExample: 'list.prepend(3).prepend(2).prepend(1) → 1 → 2 → 3',
    outputExample: 'list.reverse().toArray() → [3, 2, 1]',
    trace: [
      'prepend(1): head → [1|→null]',
      'prepend(2): head → [2|→1] → [1|→null]',
      'prepend(3): head → [3|→2] → [2|→1] → [1|→null]',
      'reverse():  head → [1|→2] → [2|→3] → [3|→null]',
      'toArray():  [1, 2, 3]',
    ],
    userFlow: [
      'prepend(value) → new node becomes the head in O(1)',
      'append(value) → walk to tail, attach node in O(n)',
      'remove(value) → scan list, splice node by relinking in O(n)',
      'reverse() → flip all pointers in a single O(n) pass',
      'toArray() → collect all values for inspection',
    ],
    concepts: ['Pointer Manipulation', 'Singly Linked', 'Node / Reference', 'O(1) Head Insert', 'Traversal', 'Reversal'],
    features: ['O(1) prepend', 'O(n) append / remove', 'In-place reverse', 'Null-safe ops', 'toArray snapshot'],
    preview: createNotePreview('Data structure', 'Linked list nodes live in the code — explore via the Sandbox tab.'),
  });
}

function quickSortOutput(lang = 'javascript') {
  const meta = langVariant('quick-sort', QUICK_SORT_CODE)[lang] || langVariant('quick-sort', QUICK_SORT_CODE).javascript;
  return createOutput({
    title: `Quick Sort (${meta.label})`,
    summary: 'In-place divide-and-conquer sort averaging O(n log n) by partitioning around a pivot.',
    files: [createFile(`quick-sort${meta.ext}`, meta.label, meta.base, true)],
    keyInsight: 'Pick a pivot, place every smaller element left of it and every larger element right — then recurse on each side. The pivot is in its final position after partition.',
    explanation: 'quickSort divides the array around a pivot (here the last element). partition() rearranges elements so everything ≤ pivot sits left and everything > pivot sits right, returning the pivot\'s final index. Recursive calls sort each half until subarrays of size 1 remain.',
    steps: [
      'Choose the last element as the pivot (other strategies: first, median-of-three, random).',
      'partition() sweeps left to right — elements ≤ pivot are swapped into the left region.',
      'Place the pivot at the boundary between the two regions (index i+1).',
      'Recursively quickSort the left subarray [low … pivotIndex−1].',
      'Recursively quickSort the right subarray [pivotIndex+1 … high].',
    ],
    tips: [
      'Worst case O(n²) happens on already-sorted input with the last-element pivot — use random pivot to avoid this.',
      'Quick sort is often faster than merge sort in practice because it is cache-friendly and in-place.',
      'For tiny subarrays (≤ 10 elements), switch to insertion sort for a real speedup.',
      'Quick select (a variant) finds the k-th smallest element in expected O(n).',
    ],
    complexity: { level: 'Medium', time: 'O(n log n) avg / O(n²) worst', space: 'O(log n) stack', pattern: 'Divide and Conquer', paradigm: 'Recursion + In-place' },
    inputExample: '[10, 80, 30, 90, 40, 50, 70]',
    outputExample: '[10, 30, 40, 50, 70, 80, 90]',
    trace: [
      'pivot=70  partition → [10, 30, 40, 50, 70, 80, 90]  pivot lands at index 4',
      'Left  [10, 30, 40, 50]: pivot=50 → [10, 30, 40, 50] sorted',
      'Right [80, 90]:          pivot=90 → [80, 90] sorted',
      'Combined → [10, 30, 40, 50, 70, 80, 90] ✓',
    ],
    userFlow: [
      'quickSort([10,80,30,90,40,50,70]) called',
      'partition chooses pivot=70, sweeps array → pivot at index 4',
      'Recursively sort left half [10,80,30,90,40] and right half [80,90]',
      'Base case: subarrays of size 1 need no sorting',
      'Array sorted in-place — same memory, no extra array needed',
    ],
    concepts: ['Divide & Conquer', 'In-place Sort', 'Pivot Selection', 'Partition', 'Recursion', 'O(n log n) avg'],
    features: ['In-place (O(log n) stack)', 'O(n log n) average', 'Cache-friendly', 'Customizable pivot', 'Classic interview algorithm'],
    preview: createNotePreview('Algorithm', 'Quick sort operates in-place — examine the partition logic in the Sandbox tab.'),
  });
}

function hashMapOutput() {
  return createOutput({
    title: 'Hash Map',
    summary: 'O(1) average get/set/delete using a hash function to map keys to bucket indices.',
    files: [createFile('hash-map.js', 'JavaScript', HASH_MAP_CODE, true)],
    keyInsight: 'A hash function converts any key into an array index — collisions are handled by chaining (each bucket is a list of entries).',
    explanation: 'HashMap computes a bucket index from the key using a polynomial hash (h = h*31 + charCode). Each bucket is an array of [key, value] pairs to handle collisions via chaining. set() updates an existing entry or appends a new pair. get() finds the entry in O(1) expected time.',
    steps: [
      'hash(key) multiplies a running hash by 31 and adds the char code — a classic polynomial hash.',
      'set(key, value) finds the bucket, searches for an existing entry and updates it, or appends a new pair.',
      'get(key) hashes the key, scans the (usually short) bucket for the matching key.',
      'delete(key) splices the entry out of its bucket array.',
    ],
    tips: [
      'Load factor (size / capacity) determines when to resize — resize at 0.75 for balanced performance.',
      'The polynomial 31 is prime, which reduces hash collisions.',
      'In JavaScript you can use a plain object {} or Map for most use cases — implement HashMap when you need to understand internals.',
      'Open addressing (probing) is an alternative to chaining — used by many C++ implementations.',
    ],
    complexity: { level: 'Medium', time: 'O(1) average, O(n) worst', space: 'O(n)', pattern: 'Hash Table', paradigm: 'Hashing + Chaining' },
    inputExample: 'map.set("name", "Alice").set("age", 30)',
    outputExample: 'map.get("name") → "Alice"  |  map.has("age") → true',
    trace: [
      'set("name","Alice"): hash("name")=3 → bucket[3].push(["name","Alice"])',
      'set("age", 30):      hash("age")=7  → bucket[7].push(["age", 30])',
      'get("name"):         hash("name")=3 → bucket[3].find(k==="name") → "Alice"',
      'delete("age"):       hash("age")=7  → splice entry from bucket[7]',
    ],
    userFlow: [
      'set(key, value) → hash key to bucket index → store or update pair',
      'get(key) → hash key → scan bucket → return value or undefined',
      'has(key) → get(key) !== undefined',
      'delete(key) → splice entry from bucket',
    ],
    concepts: ['Hash Function', 'Collision Chaining', 'O(1) Lookup', 'Polynomial Hash', 'Bucket Array', 'Key-Value Store'],
    features: ['O(1) avg set/get/delete', 'Collision handling via chaining', 'keys() / values() / entries()', 'Custom hash function', 'Any primitive key'],
    preview: createNotePreview('Data structure', 'HashMap is a code-first artifact — explore the hash and chaining logic in the Sandbox tab.'),
  });
}

function graphOutput(lang = 'javascript') {
  const meta = langVariant('graph', GRAPH_CODE)[lang] || langVariant('graph', GRAPH_CODE).javascript;
  return createOutput({
    title: `Graph — BFS & DFS (${meta.label})`,
    summary: 'Adjacency-list graph with breadth-first search (level order) and depth-first search (full path exploration).',
    files: [createFile(`graph${meta.ext}`, meta.label, meta.base, true)],
    keyInsight: 'BFS uses a queue (FIFO) so it explores level by level — ideal for shortest path. DFS uses the call stack (LIFO recursion) so it goes as deep as possible first.',
    explanation: 'The graph stores an adjacency list (Map of vertex → neighbor array). BFS starts at a source, enqueues it, then repeatedly dequeues a vertex and enqueues its unvisited neighbors — producing level-order traversal. DFS marks the current vertex and recurses into each unvisited neighbor.',
    steps: [
      'addVertex(v): create an empty neighbor list for v if it does not exist yet.',
      'addEdge(v1, v2): push v2 into v1\'s list and v1 into v2\'s list (undirected).',
      'BFS: dequeue vertex, record it, enqueue unvisited neighbors — repeat until queue empty.',
      'DFS: mark vertex as visited, record it, recurse into each unvisited neighbor.',
    ],
    tips: [
      'BFS gives shortest path in an unweighted graph — DFS does not.',
      'Use a visited Set to avoid infinite loops in cyclic graphs.',
      'For directed graphs, remove the symmetric addEdge line.',
      'Dijkstra\'s algorithm extends BFS with a priority queue for weighted shortest paths.',
    ],
    complexity: { level: 'Medium', time: 'O(V + E)', space: 'O(V)', pattern: 'Graph Traversal', paradigm: 'Queue (BFS) / Recursion (DFS)' },
    inputExample: 'Vertices: A B C D E  |  Edges: A-B, A-C, B-D, C-E  |  Start: A',
    outputExample: 'BFS: [A, B, C, D, E]  |  DFS: [A, B, D, C, E]',
    trace: [
      'BFS — queue: [A]  visited: {A}',
      '  Dequeue A → enqueue neighbors B, C  →  queue: [B, C]  result: [A]',
      '  Dequeue B → enqueue D              →  queue: [C, D]  result: [A, B]',
      '  Dequeue C → enqueue E              →  queue: [D, E]  result: [A, B, C]',
      '  Dequeue D → no new neighbors       →  queue: [E]     result: [A, B, C, D]',
      '  Dequeue E → queue empty            →  result: [A, B, C, D, E] ✓',
    ],
    userFlow: [
      'Build graph: addVertex + addEdge',
      'BFS(start) → level-by-level exploration via queue',
      'DFS(start) → deep-path exploration via recursion',
      'visited Set prevents revisiting nodes in cycles',
    ],
    concepts: ['Adjacency List', 'BFS Queue', 'DFS Recursion', 'Visited Set', 'O(V+E)', 'Graph Theory'],
    features: ['Undirected graph', 'BFS (shortest path shape)', 'DFS (recursive)', 'Cycle-safe via visited Set', 'Easy to extend to directed/weighted'],
    preview: createNotePreview('Algorithm', 'Graph traversal is best studied through the code — open the Sandbox tab to trace BFS and DFS.'),
  });
}

// selectOutput picks a canned response based on the message text.
// It also checks recent history so follow-up messages like
// "change the theme" or "make it dark" still resolve to the right product.
function selectOutput(message, history) {
  const normalized = message.toLowerCase();
  const lang       = detectLang(normalized); // language from CURRENT message only

  // History text — used ONLY for UI follow-ups like "change theme" or "make it dark".
  // DSA routes intentionally do NOT use this to avoid history pollution.
  const historyText = (Array.isArray(history) ? history : [])
    .slice(-8)
    .map(m => String(m.content || '').toLowerCase())
    .join(' ');

  // theme: current message wins; history is fallback for "change to dark" follow-ups
  const theme    = detectTheme(normalized, historyText);
  // combined = current + history — only used for UI/product context
  const combined = normalized + ' ' + historyText;

  // ══════════════════════════════════════════════════════════════
  // STEP 1 — DSA routes check ONLY the current message (normalized).
  // This prevents history like "calculator" or "neo brutalism" from
  // hijacking a fresh DSA question like "teach me 2pointer merge sort".
  // ══════════════════════════════════════════════════════════════

  if (/binary.?search|bisect/.test(normalized)) {
    return {
      reply: `Binary search cuts the search space in half on every step — O(log n) even for a million elements. Here it is in ${lang === 'python' ? 'Python' : lang === 'cpp' ? 'C++' : 'JavaScript'}.`,
      output: binarySearchOutput(lang),
    };
  }

  if (/\bstack\b|lifo|balanced.?paren/.test(normalized)) {
    return {
      reply: 'Here is a Stack (LIFO) with a real-world balanced-parentheses checker included.',
      output: stackOutput(lang),
    };
  }

  if (/linked.?list|linkedlist|singly.?linked|doubly.?linked/.test(normalized)) {
    return {
      reply: 'Here is a Linked List with prepend, append, remove, and in-place reverse.',
      output: linkedListOutput(lang),
    };
  }

  if (/quick.?sort|quicksort/.test(normalized)) {
    return {
      reply: 'Quick sort partitions in-place around a pivot — O(n log n) average with O(log n) stack space.',
      output: quickSortOutput(lang),
    };
  }

  if (/hash.?map|hashmap|hash.?table|hashtable/.test(normalized)) {
    return {
      reply: 'Here is a HashMap built from scratch — polynomial hashing with chaining for collision handling.',
      output: hashMapOutput(),
    };
  }

  if (/\bgraph\b|\bbfs\b|\bdfs\b|breadth.?first|depth.?first|adjacency/.test(normalized)) {
    return {
      reply: 'Here is a Graph with BFS (level-order) and DFS (deep-path) traversal — both explained step by step.',
      output: graphOutput(lang),
    };
  }

  // sort/merge/algorithm check — also current message only to avoid false positives
  if (/\bsort\b|merge.?sort|two.?pointer|2.?pointer|\brecurs|\bdynamic.?program|\bgreedy\b/.test(normalized)
      || /\balgorithm\b/.test(normalized)) {
    return {
      reply: 'Merge sort splits the array recursively and merges sorted halves — O(n log n) with predictable worst-case.',
      output: sortingOutput(lang),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2 — UI / product routes use combined (history matters here).
  // "change theme to dark" needs history to know we were on calculator.
  // ══════════════════════════════════════════════════════════════

  if (combined.includes('calculator') || combined.includes('calc')) {
    return {
      reply: theme !== 'default'
        ? `Here is your ${theme.replace('-', ' ')} calculator — same logic, completely reskinned.`
        : 'I generated a keyboard-enabled calculator with keyboard shortcuts and a live preview.',
      output: themedCalculatorOutput(theme),
    };
  }

  if (combined.includes('todo') || combined.includes('task list') || combined.includes('checklist')) {
    return {
      reply: 'I built a working todo app with delegated events and a live preview.',
      output: todoOutput(),
    };
  }

  if (combined.includes('timer') || combined.includes('stopwatch') || combined.includes('countdown')) {
    return {
      reply: 'I built a stopwatch-style timer with start, pause, and reset controls plus a live preview.',
      output: timerOutput(),
    };
  }

  if (combined.includes('rest api') || combined.includes('api client') || combined.includes('fetch wrapper')) {
    return {
      reply: 'I returned a reusable REST client wrapper with the transport logic centralized into one request layer.',
      output: apiClientOutput(),
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

  // Pass history into selectOutput so follow-up messages have context
  const selected = selectOutput(message, history);

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
