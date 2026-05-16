'use strict';

const CALCULATOR_CODE = `class Calculator {
  constructor(displaySelector, historySelector) {
    this.display = document.querySelector(displaySelector);
    this.history = document.querySelector(historySelector);
    this.current = '';
    this.operator = null;
    this.previous = null;
    this.bindKeyboard();
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

const calculator = new Calculator('.display', '.history');`;

const TODO_CODE = `class TodoApp {
  constructor(formSelector, inputSelector, listSelector) {
    this.form = document.querySelector(formSelector);
    this.input = document.querySelector(inputSelector);
    this.list = document.querySelector(listSelector);
    this.todos = [];
    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
  }

  handleSubmit(event) {
    event.preventDefault();
    const title = this.input.value.trim();
    if (!title) return;

    this.todos.unshift({
      id: crypto.randomUUID(),
      title,
      done: false,
    });

    this.input.value = '';
    this.render();
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
    this.list.innerHTML = this.todos.map((todo) => \`
      <li data-id="\${todo.id}">
        <label>
          <input type="checkbox" \${todo.done ? 'checked' : ''} />
          <span>\${todo.title}</span>
        </label>
        <button type="button" data-action="remove">Delete</button>
      </li>
    \`).join('');
  }
}

const app = new TodoApp('#todo-form', '#todo-input', '#todo-list');`;

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
  return code.split('\n').length;
}

function createOutput({
  title,
  filename,
  language,
  code,
  explanation,
  steps,
  tips,
  complexity,
  preview,
}) {
  return {
    title,
    filename,
    language,
    code,
    explanationTitle: 'How it works',
    explanation,
    steps,
    tips,
    complexity,
    preview,
    stats: {
      lines: lineCount(code),
      language,
      status: 'Ready',
    },
  };
}

function calculatorOutput() {
  return createOutput({
    title: 'JavaScript Calculator',
    filename: 'calculator.js',
    language: 'JavaScript',
    code: CALCULATOR_CODE,
    explanation: 'This calculator keeps only the active input, the previous operand, and the pending operator in memory, so each interaction is just a small state transition.',
    steps: [
      'The constructor wires the display elements and installs global keyboard handlers.',
      'Number and decimal input append into the active buffer while guarding duplicate decimal points.',
      'Operator selection stores the left operand, clears the active input, and updates the history row.',
      'Evaluation resolves the pending operation, handles divide-by-zero safely, and re-renders the display.',
    ],
    tips: [
      'Keep the calculator state tiny so rendering remains straightforward.',
      'Treat keyboard shortcuts as first-class input, not an afterthought.',
      'Handle invalid arithmetic states such as divide-by-zero explicitly.',
      'Render from state after every action instead of mutating scattered DOM nodes.',
    ],
    complexity: {
      level: 'Low',
      time: 'O(1)',
      space: 'O(1)',
      pattern: 'State Machine',
      paradigm: 'OOP / ES6',
    },
    preview: {
      kind: 'calculator',
      note: 'Try it yourself — click buttons or use your keyboard.',
    },
  });
}

function todoOutput() {
  return createOutput({
    title: 'Todo List App',
    filename: 'todo-app.js',
    language: 'JavaScript',
    code: TODO_CODE,
    explanation: 'This todo implementation keeps all items in a single in-memory array and re-renders the list from that source of truth after every state change.',
    steps: [
      'The app binds one submit handler to capture new items from the form.',
      'New todos are normalized into small records with stable ids and a done flag.',
      'Toggle and delete actions transform the array rather than mutating DOM in place.',
      'Rendering maps the current array into markup so the UI always reflects the latest state.',
    ],
    tips: [
      'Model todo items as plain objects with stable ids.',
      'Prefer re-rendering from state over manual DOM patching when the UI is small.',
      'Normalize user input by trimming it before inserting records.',
      'Keep event ownership close to the component that owns the data.',
    ],
    complexity: {
      level: 'Low',
      time: 'O(n)',
      space: 'O(n)',
      pattern: 'Single Source of Truth',
      paradigm: 'Event-Driven UI',
    },
    preview: {
      kind: 'todo',
      note: 'This preview shows the structure of the list UI that the code manages.',
    },
  });
}

function apiClientOutput() {
  return createOutput({
    title: 'REST API Client',
    filename: 'api-client.js',
    language: 'JavaScript',
    code: API_CLIENT_CODE,
    explanation: 'The client funnels every request through one request method, which centralizes header handling, response parsing, and failure behavior.',
    steps: [
      'The constructor stores the base URL and any default headers.',
      'request() builds the fetch call and merges per-request options with defaults.',
      'Unsuccessful responses are turned into errors with the status code and response text.',
      'Convenience helpers expose GET, POST, PUT, and DELETE without repeating the core flow.',
    ],
    tips: [
      'Centralize HTTP behavior so retries, auth, and logging stay consistent.',
      'Throw rich errors that preserve the failing status code and payload.',
      'Normalize the base URL once in the constructor instead of every request.',
      'Keep body serialization in one place to avoid inconsistent APIs.',
    ],
    complexity: {
      level: 'Medium',
      time: 'O(1)',
      space: 'O(1)',
      pattern: 'Service Wrapper',
      paradigm: 'Async / Await',
    },
    preview: {
      kind: 'note',
      title: 'Code-first output',
      body: 'REST clients do not have a meaningful live UI preview here, so the response focuses on the implementation structure.',
    },
  });
}

function sortingOutput() {
  return createOutput({
    title: 'Merge Sort',
    filename: 'merge-sort.js',
    language: 'JavaScript',
    code: MERGE_SORT_CODE,
    explanation: 'Merge sort recursively splits the input into smaller halves and then merges those sorted halves back together in linear time per merge pass.',
    steps: [
      'The array is divided around its midpoint until single-item subarrays remain.',
      'Each recursion level returns a sorted left half and a sorted right half.',
      'merge() walks both halves with two pointers and builds the sorted output.',
      'Any remaining tail elements are appended once one side is exhausted.',
    ],
    tips: [
      'Use merge sort when predictable O(n log n) performance matters more than in-place mutation.',
      'Keep the merge helper isolated so the recursive flow stays readable.',
      'Think in terms of sorted subproblems rather than swapping adjacent values.',
      'For very large inputs, watch the recursion depth and allocation costs.',
    ],
    complexity: {
      level: 'Medium',
      time: 'O(n log n)',
      space: 'O(n)',
      pattern: 'Divide and Conquer',
      paradigm: 'Recursion',
    },
    preview: {
      kind: 'note',
      title: 'Algorithm output',
      body: 'Sorting algorithms are best explained through the code and step breakdown rather than a static UI preview.',
    },
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
    filename: 'feature-plan.js',
    language: 'JavaScript',
    code,
    explanation: 'This fallback response turns the request into a concrete implementation outline so the UI still returns structured output even when the prompt does not match one of the curated templates.',
    steps: [
      'Capture the task description as a stable requirement.',
      'List the minimal goals the implementation has to satisfy.',
      'Build the happy path before optional enhancements.',
      'Add validation and integration details after the core logic is solid.',
    ],
    tips: [
      'Define the contract before writing code.',
      'Prefer a thin first version over a speculative abstraction.',
      'Add failure handling deliberately instead of scattering guards everywhere.',
      'Use the outline as the basis for a more specific implementation pass.',
    ],
    complexity: {
      level: 'Low',
      time: 'O(1)',
      space: 'O(1)',
      pattern: 'Feature Planning',
      paradigm: 'Structured Scaffolding',
    },
    preview: {
      kind: 'note',
      title: 'Planning output',
      body: 'This request was mapped to a structured implementation outline instead of a live preview widget.',
    },
  });
}

function selectOutput(message) {
  const normalized = message.toLowerCase();

  if (normalized.includes('calculator')) {
    return {
      reply: 'I generated a keyboard-enabled calculator implementation and mapped the important state transitions into the explanation tab.',
      output: calculatorOutput(),
    };
  }

  if (normalized.includes('todo')) {
    return {
      reply: 'I built a small todo app structure with a single source of truth for items and clean add, toggle, and delete flows.',
      output: todoOutput(),
    };
  }

  if (normalized.includes('rest api') || normalized.includes('api client')) {
    return {
      reply: 'I returned a reusable REST client wrapper so the fetch logic, error handling, and JSON parsing live in one place.',
      output: apiClientOutput(),
    };
  }

  if (normalized.includes('sort')) {
    return {
      reply: 'I used merge sort here because it is a clean example of divide-and-conquer with predictable runtime.',
      output: sortingOutput(),
    };
  }

  return {
    reply: 'I mapped your request into a concrete implementation starter so the project still returns structured output through the backend.',
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
