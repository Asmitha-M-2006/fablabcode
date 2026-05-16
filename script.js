/* ===================================================
   FAB-LabCode — script.js
   Vanilla JS frontend backed by auth + chat APIs
   =================================================== */

'use strict';

const API_BASE = '/api';
const AUTH_TOKEN_KEY = 'fab_auth_token';

let toastTimer = null;
let currentGcodeData = null;
let currentAiOutput = null;
let defaultAiOutput = null;
let currentAiFiles = [];
let currentAiFileIndex = 0;
let chatHistory = [];
let calcState = { current: '', prev: null, op: null, justEvaluated: false };
let authMode = 'login';
let authState = {
  token: '',
  user: null,
};

/* ================================================
   MODE SWITCHER
================================================ */
function switchMode(mode) {
  const sandbox = document.getElementById('mode-sandbox');
  const gcode = document.getElementById('mode-gcode');
  const btnSandbox = document.getElementById('btn-sandbox');
  const btnGcode = document.getElementById('btn-gcode');

  if (mode === 'sandbox') {
    sandbox.style.display = 'block';
    gcode.style.display = 'none';
    btnSandbox.classList.add('active');
    btnGcode.classList.remove('active');
  } else {
    sandbox.style.display = 'none';
    gcode.style.display = 'block';
    btnSandbox.classList.remove('active');
    btnGcode.classList.add('active');
  }
}

/* ================================================
   TOAST
================================================ */
function showToast(message, duration = 2400) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ================================================
   API
================================================ */
function getAuthHeaders() {
  return authState.token
    ? { Authorization: `Bearer ${authState.token}` }
    : {};
}

async function requestJson(path, options = {}, { auth = false } = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (auth) {
    Object.assign(headers, getAuthHeaders());
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body?.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

function postJson(path, payload, options = {}) {
  return requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, options);
}

function getJson(path, options = {}) {
  return requestJson(path, { method: 'GET' }, options);
}

function deleteJson(path, options = {}) {
  return requestJson(path, { method: 'DELETE' }, options);
}

/* ================================================
   AUTH
================================================ */
function openAuthModal(mode = 'login') {
  setAuthMode(mode);
  document.getElementById('auth-modal-backdrop').style.display = 'flex';
  document.getElementById('auth-error').textContent = '';
  setTimeout(() => {
    const target = mode === 'signup'
      ? document.getElementById('auth-name')
      : document.getElementById('auth-email');
    target?.focus();
  }, 10);
}

function closeAuthModal(event) {
  if (event && event.target !== document.getElementById('auth-modal-backdrop')) {
    return;
  }

  document.getElementById('auth-modal-backdrop').style.display = 'none';
  document.getElementById('auth-error').textContent = '';
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';

  document.getElementById('auth-tab-login').classList.toggle('active', !isSignup);
  document.getElementById('auth-tab-signup').classList.toggle('active', isSignup);
  document.getElementById('auth-name-field').style.display = isSignup ? 'flex' : 'none';
  document.getElementById('auth-modal-title').textContent = isSignup
    ? 'Create your FAB-LabCode account'
    : 'Log in to FAB-LabCode';
  document.getElementById('auth-submit-btn').textContent = isSignup ? 'Create account' : 'Log in';
  document.getElementById('auth-password').setAttribute('autocomplete', isSignup ? 'new-password' : 'current-password');
  document.getElementById('auth-error').textContent = '';
}

function setAuthBusy(isBusy) {
  const submitButton = document.getElementById('auth-submit-btn');
  submitButton.disabled = isBusy;
}

function storeAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  authState.token = token;
}

function clearStoredAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  authState.token = '';
}

function updateAuthUi() {
  const chip = document.getElementById('auth-user-chip');
  const loginButton = document.getElementById('auth-login-btn');
  const signupButton = document.getElementById('auth-signup-btn');
  const logoutButton = document.getElementById('auth-logout-btn');

  if (authState.user) {
    chip.textContent = authState.user.name;
    chip.style.display = 'inline-flex';
    loginButton.style.display = 'none';
    signupButton.style.display = 'none';
    logoutButton.style.display = 'inline-flex';
  } else {
    chip.textContent = '';
    chip.style.display = 'none';
    loginButton.style.display = 'inline-flex';
    signupButton.style.display = 'inline-flex';
    logoutButton.style.display = 'none';
  }
}

async function submitAuthForm(event) {
  event.preventDefault();

  const payload = {
    email: document.getElementById('auth-email').value.trim(),
    password: document.getElementById('auth-password').value,
  };

  if (authMode === 'signup') {
    payload.name = document.getElementById('auth-name').value.trim();
  }

  setAuthBusy(true);
  document.getElementById('auth-error').textContent = '';

  try {
    const result = await postJson(`/auth/${authMode}`, payload);
    storeAuthToken(result.token);
    authState.user = result.user;
    updateAuthUi();
    closeAuthModal();
    document.getElementById('auth-form').reset();
    await loadChatHistory();
    showToast(authMode === 'signup' ? 'Account created' : 'Logged in');
  } catch (error) {
    document.getElementById('auth-error').textContent = error.message;
  } finally {
    setAuthBusy(false);
  }
}

async function hydrateSession() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || '';

  if (!token) {
    renderSignedOutChatState();
    updateAuthUi();
    return;
  }

  authState.token = token;

  try {
    const result = await getJson('/auth/me', { auth: true });
    authState.user = result.user;
    updateAuthUi();
    await loadChatHistory();
  } catch {
    authState.user = null;
    clearStoredAuthToken();
    updateAuthUi();
    renderSignedOutChatState();
  }
}

async function logout() {
  try {
    if (authState.token) {
      await postJson('/auth/logout', {}, { auth: true });
    }
  } catch {
    // Logout should still clear client state even if the request fails.
  }

  authState.user = null;
  clearStoredAuthToken();
  updateAuthUi();
  renderSignedOutChatState();
  renderAiOutput(defaultAiOutput);
  showToast('Logged out');
}

/* ================================================
   AI SANDBOX — CHAT
================================================ */
function renderSignedOutChatState() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  chatHistory = [];
  appendBubble('Log in to use the real AI backend and keep your chat history in PostgreSQL.', 'ai');
}

function renderEmptyAuthenticatedChatState() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  chatHistory = [];
  appendBubble(`You are signed in${authState.user ? ` as ${authState.user.name}` : ''}. Ask me to build code, explain an algorithm, or debug an issue.`, 'ai');
}

async function loadChatHistory() {
  if (!authState.token) {
    renderSignedOutChatState();
    return;
  }

  const result = await getJson('/chat/history', { auth: true });
  const messages = Array.isArray(result.messages) ? result.messages : [];
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  chatHistory = [];

  if (messages.length === 0) {
    renderEmptyAuthenticatedChatState();
    renderAiOutput(defaultAiOutput);
    return;
  }

  messages.forEach((message) => {
    appendBubble(message.content, message.role === 'assistant' ? 'ai' : 'user', message.createdAt);
    chatHistory.push({ role: message.role, content: message.content });
  });

  const latestArtifact = [...messages].reverse().find((message) => (
    message.role === 'assistant' && message.artifact
  ));

  if (latestArtifact?.artifact) {
    renderAiOutput(latestArtifact.artifact);
  } else {
    renderAiOutput(defaultAiOutput);
  }

  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  if (!message) {
    return;
  }

  if (!authState.token) {
    openAuthModal('login');
    showToast('Log in to use the AI sandbox');
    return;
  }

  appendBubble(message, 'user');
  chatHistory.push({ role: 'user', content: message });

  input.value = '';
  autoResize(input);
  setChatBusy(true);

  const typingId = showTyping();

  try {
    const payload = await postJson('/chat', { message }, { auth: true });
    removeTyping(typingId);
    appendBubble(payload.reply, 'ai', payload.meta?.generatedAt);
    chatHistory.push({ role: 'assistant', content: payload.reply });
    renderAiOutput(payload.output);
  } catch (error) {
    removeTyping(typingId);
    appendBubble('The backend request failed. Check your auth session and environment variables.', 'ai');
    showToast(error.message);
  } finally {
    setChatBusy(false);
  }
}

function appendBubble(text, type, timestamp) {
  const container = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;

  const time = formatBubbleTime(timestamp);
  const safeText = escapeHtml(text).replace(/\n/g, '<br>');

  if (type === 'ai') {
    bubble.innerHTML = `
      <div class="bubble-avatar ai-avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      </div>
      <div class="bubble-content">
        <p>${safeText}</p>
        <span class="bubble-time">${time}</span>
      </div>`;
  } else {
    bubble.innerHTML = `
      <div class="bubble-content">
        <p>${safeText}</p>
        <span class="bubble-time">${time}</span>
      </div>
      <div class="bubble-avatar user-avatar">You</div>`;
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function formatBubbleTime(timestamp) {
  if (!timestamp) {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const value = new Date(timestamp);
  return value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function showTyping() {
  const container = document.getElementById('chat-messages');
  const id = `typing-${Date.now()}`;
  const element = document.createElement('div');
  element.id = id;
  element.className = 'chat-bubble ai';
  element.innerHTML = `
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
  container.appendChild(element);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
}

async function clearChat() {
  if (!authState.token) {
    renderSignedOutChatState();
    return;
  }

  try {
    await deleteJson('/chat/history', { auth: true });
    renderEmptyAuthenticatedChatState();
    renderAiOutput(defaultAiOutput);
    showToast('Chat history cleared');
  } catch (error) {
    showToast(error.message);
  }
}

function handleChatKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function autoResize(element) {
  element.style.height = 'auto';
  element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
}

function usePrompt(text) {
  const input = document.getElementById('chat-input');
  input.value = text;
  autoResize(input);
  input.focus();
}

function setChatBusy(isBusy) {
  const input = document.getElementById('chat-input');
  const sendButton = document.getElementById('chat-send-btn');
  input.disabled = isBusy;
  sendButton.disabled = isBusy;
}

/* ================================================
   AI SANDBOX — OUTPUT RENDERER
================================================ */
function switchTab() {
  // Legacy no-op. The sandbox now renders code, explanation, and preview together.
}

function normalizeAiFiles(output = {}) {
  const files = Array.isArray(output.files)
    ? output.files
      .map((file) => ({
        filename: String(file?.filename || '').trim() || 'snippet.txt',
        language: String(file?.language || '').trim() || inferLanguageFromFilename(file?.filename),
        content: String(file?.content || '').trim(),
        primary: file?.primary === true,
      }))
      .filter((file) => file.content)
    : [];

  if (files.length > 0) {
    if (!files.some((file) => file.primary)) {
      files[0].primary = true;
    }
    return files;
  }

  return [{
    filename: String(output.filename || 'snippet.txt').trim() || 'snippet.txt',
    language: String(output.language || inferLanguageFromFilename(output.filename)).trim() || 'Text',
    content: String(output.code || '').trim(),
    primary: true,
  }];
}

function inferLanguageFromFilename(filename) {
  const lower = String(filename || '').toLowerCase();

  if (lower.endsWith('.html')) return 'HTML';
  if (lower.endsWith('.css')) return 'CSS';
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'JavaScript';
  if (lower.endsWith('.json')) return 'JSON';
  return 'Text';
}

function renderAiOutput(output) {
  if (!output) {
    return;
  }

  currentAiOutput = output;
  currentAiFiles = normalizeAiFiles(output);
  currentAiFileIndex = Math.max(0, currentAiFiles.findIndex((file) => file.primary));

  document.getElementById('ai-file-count').textContent = String(output.stats?.files || currentAiFiles.length);

  const statusText = output.stats?.status || 'Ready';
  document.getElementById('ai-output-status').innerHTML = `<span class="status-dot"></span> ${escapeHtml(statusText)}`;

  renderAiFileTabs(currentAiFiles);
  setActiveAiFile(currentAiFileIndex);
  renderAiTips(output.tips || []);
  renderAiExplanation(output);
  renderAiPreview(output.preview || { mode: 'note', title: 'Preview unavailable', body: 'No preview was returned for this output.' });
}

function renderAiFileTabs(files) {
  const container = document.getElementById('ai-file-tabs');
  container.innerHTML = files.map((file, index) => `
    <button class="file-tab${index === currentAiFileIndex ? ' active' : ''}" type="button" data-file-index="${index}">
      ${escapeHtml(file.filename)}
    </button>
  `).join('');

  container.querySelectorAll('[data-file-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number.parseInt(button.dataset.fileIndex, 10);
      setActiveAiFile(index);
    });
  });
}

function setActiveAiFile(index) {
  const safeIndex = currentAiFiles[index] ? index : 0;
  const file = currentAiFiles[safeIndex] || currentAiFiles[0];

  if (!file) {
    return;
  }

  currentAiFileIndex = safeIndex;

  document.getElementById('ai-editor-filename').textContent = file.filename;
  document.getElementById('ai-editor-language-label').textContent = file.language || 'Text';
  document.getElementById('ai-lines').textContent = String(countLines(file.content || ''));
  document.getElementById('ai-language').textContent = file.language || 'Text';

  document.querySelectorAll('#ai-file-tabs .file-tab').forEach((button) => {
    const buttonIndex = Number.parseInt(button.dataset.fileIndex, 10);
    button.classList.toggle('active', buttonIndex === currentAiFileIndex);
  });

  renderCodeBlock(file.content || '');
}

function renderCodeBlock(code) {
  const container = document.getElementById('code-output');
  container.innerHTML = `<pre><code>${escapeHtml(code)}</code></pre>`;
}

function renderAiTips(tips) {
  const tipsList = document.getElementById('ai-tips');
  const normalizedTips = Array.isArray(tips) && tips.length > 0
    ? tips
    : ['Ask for a browser UI if you want a live preview artifact.'];

  tipsList.innerHTML = normalizedTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('');
}

function renderAiExplanation(output) {
  document.getElementById('ai-summary-text').textContent = output.summary || '';
  document.getElementById('ai-explanation-text').textContent = output.explanation || '';

  const stepList = document.getElementById('ai-step-list');
  stepList.innerHTML = (output.steps || []).map((step, index) => `
    <div class="step-item">
      <div class="step-num">${index + 1}</div>
      <div class="step-body">${escapeHtml(step)}</div>
    </div>
  `).join('');

  document.getElementById('ai-time-complexity').textContent = output.complexity?.time || 'O(1)';
  document.getElementById('ai-space-complexity').textContent = output.complexity?.space || 'O(1)';
  document.getElementById('ai-pattern').textContent = output.complexity?.pattern || 'General';
  document.getElementById('ai-paradigm').textContent = output.complexity?.paradigm || 'JavaScript';
}

function resolveAiPreview(preview, files = []) {
  if (preview?.mode === 'live') {
    const htmlFile = files.find((file) => file.language.toLowerCase() === 'html');
    const cssFile = files.find((file) => file.language.toLowerCase() === 'css');
    const jsFile = files.find((file) => file.primary) || files.find((file) => file.language.toLowerCase().includes('javascript'));

    return {
      mode: 'live',
      title: String(preview.title || 'Live preview').trim() || 'Live preview',
      body: String(preview.body || 'Rendered inside an isolated sandbox using the backend response artifact.').trim(),
      markup: String(preview.markup || htmlFile?.content || '').trim(),
      styles: String(preview.styles || cssFile?.content || '').trim(),
      script: String(preview.script || jsFile?.content || '').trim(),
    };
  }

  if (preview?.kind === 'calculator' || preview?.kind === 'todo') {
    return {
      kind: preview.kind,
      note: String(preview.note || '').trim(),
      title: String(preview.title || 'Preview').trim(),
      body: String(preview.body || '').trim(),
    };
  }

  return {
    mode: 'note',
    title: String(preview?.title || 'Preview unavailable').trim() || 'Preview unavailable',
    body: String(preview?.body || preview?.note || 'No live preview was provided for this response.').trim(),
    markup: '',
    styles: '',
    script: '',
  };
}

function renderAiPreview(preview) {
  const container = document.getElementById('ai-preview-body');
  const resolvedPreview = resolveAiPreview(preview, currentAiFiles);

  document.getElementById('ai-preview-caption').textContent = resolvedPreview.body || 'Rendered from the current artifact.';

  if (resolvedPreview.mode === 'live' && (resolvedPreview.markup || resolvedPreview.script || resolvedPreview.styles)) {
    container.innerHTML = getLivePreviewMarkup(resolvedPreview);
    const frame = document.getElementById('ai-preview-frame');
    frame.srcdoc = buildPreviewSrcdoc(resolvedPreview);
    return;
  }

  if (resolvedPreview.kind === 'calculator') {
    container.innerHTML = getCalculatorPreviewMarkup(resolvedPreview.note);
    resetCalculatorState();
    return;
  }

  if (resolvedPreview.kind === 'todo') {
    container.innerHTML = getTodoPreviewMarkup(resolvedPreview.note);
    return;
  }

  container.innerHTML = getNotePreviewMarkup(
    resolvedPreview.title,
    resolvedPreview.body || 'No live preview was provided for this response.',
  );
}

function buildPreviewSrcdoc(preview) {
  const inlineScript = String(preview.script || '').replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src https: data:; connect-src https:;">
    <style>
      html, body { margin: 0; min-height: 100%; }
      ${preview.styles || ''}
    </style>
  </head>
  <body>
    ${preview.markup || ''}
    <script>${inlineScript}<\/script>
  </body>
</html>`;
}

function getLivePreviewMarkup(preview) {
  return `
    <div class="preview-meta">
      <span class="preview-badge">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        ${escapeHtml(preview.title || 'Live preview')}
      </span>
      <span class="preview-badge">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
        Isolated iframe sandbox
      </span>
    </div>
    <div class="preview-frame-shell">
      <iframe
        id="ai-preview-frame"
        class="preview-frame"
        title="${escapeHtml(preview.title || 'AI preview')}"
        sandbox="allow-scripts allow-forms allow-modals"
        referrerpolicy="no-referrer"
      ></iframe>
    </div>
  `;
}

function getCalculatorPreviewMarkup(note) {
  return `
    <div class="preview-label">Legacy Preview</div>
    <div class="calculator-preview">
      <div class="calc-screen">
        <div class="calc-history" id="calc-history"></div>
        <div class="calc-display" id="calc-display">0</div>
      </div>
      <div class="calc-buttons">
        <button class="calc-btn btn-clear span-2" onclick="calcAction('clear')">AC</button>
        <button class="calc-btn btn-op" onclick="calcAction('%')">%</button>
        <button class="calc-btn btn-op" onclick="calcAction('/')">&divide;</button>

        <button class="calc-btn" onclick="calcAction('7')">7</button>
        <button class="calc-btn" onclick="calcAction('8')">8</button>
        <button class="calc-btn" onclick="calcAction('9')">9</button>
        <button class="calc-btn btn-op" onclick="calcAction('*')">&times;</button>

        <button class="calc-btn" onclick="calcAction('4')">4</button>
        <button class="calc-btn" onclick="calcAction('5')">5</button>
        <button class="calc-btn" onclick="calcAction('6')">6</button>
        <button class="calc-btn btn-op" onclick="calcAction('-')">−</button>

        <button class="calc-btn" onclick="calcAction('1')">1</button>
        <button class="calc-btn" onclick="calcAction('2')">2</button>
        <button class="calc-btn" onclick="calcAction('3')">3</button>
        <button class="calc-btn btn-op" onclick="calcAction('+')">+</button>

        <button class="calc-btn span-2" onclick="calcAction('0')">0</button>
        <button class="calc-btn" onclick="calcAction('.')">.</button>
        <button class="calc-btn btn-equals" onclick="calcAction('=')">=</button>
      </div>
    </div>
    <div class="preview-note">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      ${escapeHtml(note || 'This preview was generated from an older stored artifact.')}
    </div>
  `;
}

function getTodoPreviewMarkup(note) {
  return `
    <div class="preview-label">Legacy Preview</div>
    <div class="calculator-preview" style="padding:24px;display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;gap:10px;">
        <input class="setting-input" value="Ship backend integration" readonly />
        <button class="btn-generate" style="padding:12px 18px;">Add</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#f8fafc;border:1px solid #dbe4f0;border-radius:14px;">
          <span>Review generated code</span>
          <button class="btn-ghost btn-sm">Done</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#f8fafc;border:1px solid #dbe4f0;border-radius:14px;">
          <span>Polish the UI states</span>
          <button class="btn-ghost btn-sm">Delete</button>
        </div>
      </div>
    </div>
    <div class="preview-note">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      ${escapeHtml(note || 'This preview was generated from an older stored artifact.')}
    </div>
  `;
}

function getNotePreviewMarkup(title, body) {
  return `
    <div class="preview-meta">
      <span class="preview-badge note">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        ${escapeHtml(title)}
      </span>
    </div>
    <div class="preview-note-card">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function getActiveAiFile() {
  return currentAiFiles[currentAiFileIndex] || currentAiFiles[0] || null;
}

function copyCode() {
  const file = getActiveAiFile();

  if (!file?.content) {
    showToast('No code available to copy');
    return;
  }

  navigator.clipboard.writeText(file.content).then(() => {
    showToast(`Copied ${file.filename}`);
  });
}

function downloadCode() {
  const file = getActiveAiFile();

  if (!file?.content) {
    showToast('No code available to download');
    return;
  }

  triggerDownload(file.content, file.filename, getDownloadMimeType(file));
  showToast(`Downloading ${file.filename}`);
}

function getDownloadMimeType(file) {
  const language = String(file?.language || '').toLowerCase();
  const filename = String(file?.filename || '').toLowerCase();

  if (language === 'html' || filename.endsWith('.html')) return 'text/html';
  if (language === 'css' || filename.endsWith('.css')) return 'text/css';
  if (language === 'json' || filename.endsWith('.json')) return 'application/json';
  if (language.includes('javascript') || filename.endsWith('.js') || filename.endsWith('.mjs')) return 'text/javascript';
  return 'text/plain';
}

function createDefaultAiOutput() {
  const markup = `<main class="demo-shell">
  <section class="demo-card">
    <header>
      <p>FAB-LabCode Sandbox</p>
      <span>Interactive calculator sample</span>
    </header>
    <div id="history" class="history"></div>
    <div id="display" class="display">0</div>
    <div class="pad">
      <button data-value="7">7</button>
      <button data-value="8">8</button>
      <button data-value="9">9</button>
      <button data-value="/">/</button>
      <button data-value="4">4</button>
      <button data-value="5">5</button>
      <button data-value="6">6</button>
      <button data-value="*">*</button>
      <button data-value="1">1</button>
      <button data-value="2">2</button>
      <button data-value="3">3</button>
      <button data-value="-">-</button>
      <button class="wide" data-value="0">0</button>
      <button data-value=".">.</button>
      <button data-value="+">+</button>
      <button class="accent" data-value="=">=</button>
      <button class="wide muted" data-value="clear">AC</button>
    </div>
  </section>
</main>`;

  const styles = `body {
  margin: 0;
  min-height: 100vh;
  font-family: Inter, system-ui, sans-serif;
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
}

.demo-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.demo-card {
  width: min(100%, 320px);
  border-radius: 24px;
  padding: 22px;
  background: #0f172a;
  color: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}

header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

header p {
  margin: 0;
  font-weight: 700;
}

header span {
  font-size: 11px;
  color: rgba(226, 232, 240, 0.72);
}

.history {
  min-height: 18px;
  text-align: right;
  color: rgba(226, 232, 240, 0.55);
  font-family: "JetBrains Mono", monospace;
}

.display {
  text-align: right;
  font-size: 42px;
  font-family: "JetBrains Mono", monospace;
  margin: 8px 0 18px;
}

.pad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.pad button {
  min-height: 54px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  background: rgba(51, 65, 85, 0.96);
  color: #fff;
  font: inherit;
  font-size: 18px;
}

.pad button.accent {
  background: linear-gradient(135deg, #f97316, #fb7185);
}

.pad button.muted {
  background: rgba(148, 163, 184, 0.95);
  color: #020617;
}

.pad button.wide {
  grid-column: span 2;
}`;

  const script = `class DemoCalculator {
  constructor() {
    this.display = document.getElementById('display');
    this.history = document.getElementById('history');
    this.current = '';
    this.previous = null;
    this.operator = null;

    document.querySelectorAll('[data-value]').forEach((button) => {
      button.addEventListener('click', () => this.handle(button.dataset.value));
    });
  }

  handle(value) {
    if (value === 'clear') {
      this.current = '';
      this.previous = null;
      this.operator = null;
      this.history.textContent = '';
      this.render();
      return;
    }

    if (value === '=') {
      if (this.operator === null || this.current === '') return;
      const right = Number(this.current);
      const operations = {
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '*': (a, b) => a * b,
        '/': (a, b) => (b === 0 ? 'Error' : a / b),
      };
      const result = operations[this.operator](this.previous, right);
      this.history.textContent = \`\${this.previous} \${this.operator} \${right} =\`;
      this.current = String(result);
      this.operator = null;
      this.previous = null;
      this.render();
      return;
    }

    if (['+', '-', '*', '/'].includes(value)) {
      if (!this.current) return;
      this.previous = Number(this.current);
      this.operator = value;
      this.history.textContent = \`\${this.previous} \${value}\`;
      this.current = '';
      this.render();
      return;
    }

    if (value === '.' && this.current.includes('.')) return;
    this.current += value;
    this.render();
  }

  render() {
    this.display.textContent = this.current || '0';
  }
}

new DemoCalculator();`;

  const jsFile = 'demo-calculator.js';

  return {
    title: 'Sandbox Demo Artifact',
    summary: 'This built-in sample uses the same renderer as the backend responses: real files, a live preview sandbox, and a detailed explanation block.',
    filename: jsFile,
    language: 'JavaScript',
    code: script,
    files: [
      {
        filename: 'index.html',
        language: 'HTML',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FAB-LabCode Sandbox Demo</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${markup}
    <script src="${jsFile}"></script>
  </body>
</html>`,
      },
      {
        filename: 'styles.css',
        language: 'CSS',
        content: styles,
      },
      {
        filename: jsFile,
        language: 'JavaScript',
        content: script,
        primary: true,
      },
    ],
    explanation: 'The frontend now treats the sandbox as a backend artifact renderer. The same response payload drives the live preview iframe, the code viewer, and the explanation panel, so the three surfaces stay in sync.',
    steps: [
      'The artifact defines concrete files instead of only a single code snippet.',
      'The preview section composes a sandboxed iframe from backend-provided markup, styles, and script.',
      'The code pane exposes the underlying files directly so you can inspect the exact implementation that powers the preview.',
      'The explanation pane summarizes the flow and gives complexity and implementation notes without leaving the workspace.',
    ],
    tips: [
      'Ask for browser-based UIs when you want a runnable preview.',
      'Keep generated files small and explicit so the preview remains debuggable.',
      'Prefer plain HTML, CSS, and JavaScript if you want the sandbox to execute the result immediately.',
      'Use the file chips to inspect support files such as HTML and CSS alongside the main code file.',
    ],
    complexity: {
      level: 'Low',
      time: 'O(1)',
      space: 'O(1)',
      pattern: 'Artifact Rendering',
      paradigm: 'Browser Sandbox',
    },
    preview: {
      mode: 'live',
      title: 'Interactive sample preview',
      body: 'The iframe runs the same artifact data you see in the code viewer.',
      markup,
      styles,
      script,
    },
    stats: {
      lines: countLines(script),
      files: 3,
      language: 'JavaScript',
      status: 'Live preview ready',
    },
  };
}

/* ================================================
   CALCULATOR PREVIEW
================================================ */
function resetCalculatorState() {
  calcState = { current: '', prev: null, op: null, justEvaluated: false };
  const display = document.getElementById('calc-display');
  const history = document.getElementById('calc-history');

  if (display) {
    display.textContent = '0';
  }

  if (history) {
    history.textContent = '';
  }
}

function calcAction(value) {
  const display = document.getElementById('calc-display');
  const history = document.getElementById('calc-history');

  if (!display || !history) {
    return;
  }

  const state = calcState;

  if (value === 'clear') {
    resetCalculatorState();
    return;
  }

  if (value === '=') {
    if (state.op === null || state.current === '') {
      return;
    }

    const right = Number.parseFloat(state.current);
    const operations = {
      '+': (a, b) => a + b,
      '-': (a, b) => a - b,
      '*': (a, b) => a * b,
      '/': (a, b) => (b === 0 ? 'Error' : a / b),
      '%': (a, b) => a % b,
    };
    const result = operations[state.op](state.prev, right);

    history.textContent = `${state.prev} ${state.op} ${right} =`;
    state.current = typeof result === 'number' ? String(Number.parseFloat(result.toFixed(10))) : String(result);
    state.prev = null;
    state.op = null;
    state.justEvaluated = true;
    display.textContent = state.current;
    return;
  }

  if (['+', '-', '*', '/', '%'].includes(value)) {
    if (state.current === '' && state.prev === null) {
      return;
    }

    if (state.current !== '') {
      state.prev = Number.parseFloat(state.current);
    }

    state.op = value;
    history.textContent = `${state.prev} ${value}`;
    state.current = '';
    state.justEvaluated = false;
    display.textContent = '0';
    return;
  }

  if (value === '.' && state.current.includes('.')) {
    return;
  }

  if (state.justEvaluated && /[0-9]/.test(value)) {
    state.current = '';
    state.justEvaluated = false;
  }

  state.current += value;
  display.textContent = state.current || '0';
}

/* ================================================
   G-CODE GENERATOR
================================================ */
async function generateGcode() {
  const instruction = document.getElementById('gcode-instruction').value.trim();

  if (!instruction) {
    showToast('Enter an instruction first');
    return;
  }

  const button = document.getElementById('generate-gcode-btn');
  const units = document.getElementById('units-select').value;
  const feed = Number.parseFloat(document.getElementById('feed-rate').value) || 1000;
  const safeZ = Number.parseFloat(document.getElementById('safe-z').value) || 2;
  const tool = document.getElementById('tool-select').value;

  setStatus('generating', 'Generating...', 'Sending instruction to the backend.');
  button.disabled = true;

  try {
    const data = await postJson('/gcode/generate', {
      instruction,
      units,
      feed,
      safeZ,
      tool,
    });

    currentGcodeData = data;
    renderGcodeEditor(data.code);
    updateSummary(data.summary);
    updateExplanation(data.explanation, data.steps);
    drawToolpath(data);
    drawCoordDiagram(data);
    setStatus('done', 'G-code generated!', `${data.code.filter((line) => line.trim()).length} lines ready.`);
    showToast('G-code generated successfully');
  } catch (error) {
    setStatus('ready', 'Ready to generate', 'The backend request failed.');
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

function renderGcodeEditor(lines) {
  const container = document.getElementById('gcode-lines');
  container.innerHTML = '';

  lines.forEach((line, index) => {
    const row = document.createElement('div');
    row.className = 'gcode-line';
    row.innerHTML = `<span class="gline-num">${index + 1}</span><span class="gline-code">${colorizeGcode(line)}</span>`;
    container.appendChild(row);
  });
}

function colorizeGcode(line) {
  if (!line.trim()) {
    return '';
  }

  const commentIndex = line.indexOf(';');
  let code = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  const comment = commentIndex >= 0 ? line.slice(commentIndex) : '';

  code = escapeHtml(code);
  code = code.replace(/\b([GM]\d+)\b/g, '<span class="gline-cmd">$1</span>');
  code = code.replace(/\b([XYZIJKRF])(-?[\d.]+)/g, (_, param, value) => `<span class="gline-param">${param}</span><span class="gline-val">${value}</span>`);

  return comment ? `${code}<span class="gline-comment">${escapeHtml(comment)}</span>` : code;
}

function updateSummary(summary) {
  document.getElementById('est-time').textContent = summary.time;
  document.getElementById('path-length').textContent = summary.length;
  document.getElementById('total-moves').textContent = summary.moves;
  document.getElementById('bounds').textContent = summary.bounds;
}

function updateExplanation(text, steps) {
  document.getElementById('gcode-explanation').textContent = text;
  document.getElementById('gcode-steps').innerHTML = steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
}

function setStatus(type, label, text) {
  const bar = document.getElementById('gcode-status');
  const icons = {
    ready: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    generating: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    done: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  };
  const classes = {
    ready: 'status-ready',
    generating: 'status-generating',
    done: 'status-done',
  };

  bar.innerHTML = `
    <div class="status-indicator ${classes[type]}">${icons[type]} ${escapeHtml(label)}</div>
    <span class="status-text">${escapeHtml(text)}</span>`;
}

/* ================================================
   CANVAS — TOOLPATH DRAWING
================================================ */
function drawToolpath(data) {
  const canvas = document.getElementById('toolpath-canvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.offsetWidth || 500;
  const height = canvas.offsetHeight || 300;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  const pad = 60;
  let maxX = 20;
  let maxY = 20;

  if (data.shape === 'square') {
    maxX = data.size + 4;
    maxY = data.size + 4;
  }
  if (data.shape === 'rect') {
    maxX = data.w + 4;
    maxY = data.h + 4;
  }
  if (data.shape === 'circle') {
    maxX = data.r * 2 + 4;
    maxY = data.r * 2 + 4;
  }
  if (data.shape === 'triangle') {
    maxX = data.size + 4;
    maxY = Math.round(data.size * 0.866) + 4;
  }
  if (data.shape === 'line') {
    maxX = Math.max(data.x1, data.x2) + 4;
    maxY = Math.max(data.y1, data.y2) + 4;
  }
  if (data.shape === 'engrave') {
    maxX = data.text.length * 6 + 4;
    maxY = 12;
  }

  const scaleX = (width - pad * 2) / Math.max(maxX, 1);
  const scaleY = (height - pad * 2) / Math.max(maxY, 1);
  const scale = Math.min(scaleX, scaleY);

  const toCanvasX = (x) => pad + x * scale;
  const toCanvasY = (y) => height - pad - y * scale;

  ctx.strokeStyle = '#e8edf5';
  ctx.lineWidth = 1;

  const stepX = Math.max(1, Math.ceil(maxX / 6));
  for (let gridX = 0; gridX <= maxX; gridX += stepX) {
    ctx.beginPath();
    ctx.moveTo(toCanvasX(gridX), pad);
    ctx.lineTo(toCanvasX(gridX), height - pad);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gridX, toCanvasX(gridX), height - pad + 16);
  }

  const stepY = Math.max(1, Math.ceil(maxY / 5));
  for (let gridY = 0; gridY <= maxY; gridY += stepY) {
    ctx.beginPath();
    ctx.moveTo(pad, toCanvasY(gridY));
    ctx.lineTo(width - pad, toCanvasY(gridY));
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(gridY, pad - 8, toCanvasY(gridY) + 4);
  }

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, height - pad);
  ctx.lineTo(width - pad + 10, height - pad);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pad, height - pad);
  ctx.lineTo(pad, pad - 10);
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillText('X', width - pad + 14, height - pad + 4);
  ctx.fillStyle = '#10b981';
  ctx.fillText('Y', pad - 4, pad - 14);

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#3b82f6';
  ctx.setLineDash([]);

  if (data.shape === 'square' || data.shape === 'rect') {
    const boxWidth = data.shape === 'square' ? data.size : data.w;
    const boxHeight = data.shape === 'square' ? data.size : data.h;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(boxWidth), toCanvasY(0));
    ctx.lineTo(toCanvasX(boxWidth), toCanvasY(boxHeight));
    ctx.lineTo(toCanvasX(0), toCanvasY(boxHeight));
    ctx.closePath();
    ctx.stroke();

    drawArrow(ctx, toCanvasX(0), toCanvasY(0), toCanvasX(boxWidth), toCanvasY(0), '#3b82f6');
    drawArrow(ctx, toCanvasX(boxWidth), toCanvasY(0), toCanvasX(boxWidth), toCanvasY(boxHeight), '#3b82f6');
    drawArrow(ctx, toCanvasX(boxWidth), toCanvasY(boxHeight), toCanvasX(0), toCanvasY(boxHeight), '#3b82f6');
    drawArrow(ctx, toCanvasX(0), toCanvasY(boxHeight), toCanvasX(0), toCanvasY(0), '#3b82f6');

    [[0, 0], [boxWidth, 0], [boxWidth, boxHeight], [0, boxHeight]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(toCanvasX(x), toCanvasY(y), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
    });

    ctx.fillStyle = '#3b82f6';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('(0,0)', toCanvasX(0), toCanvasY(0) + 18);
    ctx.fillText(`(${boxWidth},0)`, toCanvasX(boxWidth), toCanvasY(0) + 18);
    ctx.fillText(`(0,${boxHeight})`, toCanvasX(0), toCanvasY(boxHeight) - 8);
    ctx.fillText(`(${boxWidth},${boxHeight})`, toCanvasX(boxWidth), toCanvasY(boxHeight) - 8);
  }

  if (data.shape === 'circle') {
    const radius = data.r;
    const cx = radius;
    const cy = radius;
    ctx.beginPath();
    ctx.arc(toCanvasX(cx), toCanvasY(cy), radius * scale, 0, Math.PI * 2, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(toCanvasX(cx), toCanvasY(cy), 3, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(cx), toCanvasY(cy));
    ctx.lineTo(toCanvasX(cx + radius), toCanvasY(cy));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`r=${radius}`, toCanvasX(cx + radius / 2), toCanvasY(cy) - 6);
  }

  if (data.shape === 'triangle') {
    const side = data.size;
    const apexY = Math.round(side * 0.866);
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(side), toCanvasY(0));
    ctx.lineTo(toCanvasX(side / 2), toCanvasY(apexY));
    ctx.closePath();
    ctx.stroke();

    [[0, 0], [side, 0], [side / 2, apexY]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(toCanvasX(x), toCanvasY(y), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
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
    data.text.split('').forEach((character, index) => {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(index * 6), toCanvasY(0));
      ctx.lineTo(toCanvasX(index * 6), toCanvasY(8));
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(character, toCanvasX(index * 6), toCanvasY(9));
    });
  }

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
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const arrowLength = 8;

  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(midX, midY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-arrowLength, -arrowLength / 2);
  ctx.lineTo(-arrowLength, arrowLength / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ================================================
   COORDINATE DIAGRAM
================================================ */
function drawCoordDiagram(data) {
  const canvas = document.getElementById('coord-diagram');
  const ctx = canvas.getContext('2d');
  const width = 220;
  const height = 160;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const pad = 28;
  let maxX = 12;
  let maxY = 12;

  if (data.shape === 'square') {
    maxX = data.size + 2;
    maxY = data.size + 2;
  }
  if (data.shape === 'rect') {
    maxX = data.w + 2;
    maxY = data.h + 2;
  }
  if (data.shape === 'circle') {
    maxX = data.r * 2 + 2;
    maxY = data.r * 2 + 2;
  }
  if (data.shape === 'triangle') {
    maxX = data.size + 2;
    maxY = Math.round(data.size * 0.866) + 2;
  }

  const scale = Math.min((width - pad * 2) / Math.max(maxX, 1), (height - pad * 2) / Math.max(maxY, 1));
  const toX = (x) => pad + x * scale;
  const toY = (y) => height - pad - y * scale;

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, height - pad);
  ctx.lineTo(width - 8, height - pad);
  ctx.stroke();

  ctx.strokeStyle = '#10b981';
  ctx.beginPath();
  ctx.moveTo(pad, height - pad);
  ctx.lineTo(pad, 8);
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText('X', width - 7, height - pad + 4);
  ctx.fillStyle = '#10b981';
  ctx.fillText('Y', pad - 4, 7);

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;

  if (data.shape === 'square' || data.shape === 'rect') {
    const boxWidth = data.shape === 'square' ? data.size : data.w;
    const boxHeight = data.shape === 'square' ? data.size : data.h;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(0));
    ctx.lineTo(toX(boxWidth), toY(0));
    ctx.lineTo(toX(boxWidth), toY(boxHeight));
    ctx.lineTo(toX(0), toY(boxHeight));
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#3b82f6';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('(0,0)', toX(0), toY(0) + 12);
    ctx.fillText(`(${boxWidth},0)`, toX(boxWidth), toY(0) + 12);
    ctx.fillText(`(0,${boxHeight})`, toX(0) - 4, toY(boxHeight) - 4);
    ctx.fillText(`(${boxWidth},${boxHeight})`, toX(boxWidth), toY(boxHeight) - 4);

    [[0, 0], [boxWidth, 0], [boxWidth, boxHeight], [0, boxHeight]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(toX(x), toY(y), 3, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
    });

    drawArrow(ctx, toX(0), toY(0), toX(boxWidth), toY(0), '#3b82f6');
    drawArrow(ctx, toX(boxWidth), toY(0), toX(boxWidth), toY(boxHeight), '#3b82f6');
    drawArrow(ctx, toX(boxWidth), toY(boxHeight), toX(0), toY(boxHeight), '#3b82f6');
    drawArrow(ctx, toX(0), toY(boxHeight), toX(0), toY(0), '#3b82f6');
  }

  if (data.shape === 'circle') {
    const radius = data.r;
    ctx.beginPath();
    ctx.arc(toX(radius), toY(radius), radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ================================================
   VIEW TOGGLE
================================================ */
function setView(view, btn) {
  document.querySelectorAll('.view-btn').forEach((button) => button.classList.remove('active'));
  btn.classList.add('active');

  if (view === '3d') {
    showToast('3D view is not implemented yet. Showing the 2D toolpath instead.');
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
  document.querySelectorAll('.chip').forEach((chip) => chip.classList.remove('chip-active'));
  chipEl.classList.add('chip-active');
}

function updateCharCount(element) {
  const count = element.value.length;
  document.getElementById('char-count').textContent = `${count} / 200`;
}

/* ================================================
   COPY / DOWNLOAD / STORAGE
================================================ */
function copyGcode() {
  if (!currentGcodeData) {
    showToast('Generate G-code first');
    return;
  }

  navigator.clipboard.writeText(currentGcodeData.code.join('\n')).then(() => {
    showToast('G-code copied to clipboard');
  });
}

function downloadGcode() {
  if (!currentGcodeData) {
    showToast('Generate G-code first');
    return;
  }

  triggerDownload(currentGcodeData.code.join('\n'), 'toolpath.nc', 'text/plain');
  showToast('Downloading toolpath.nc');
}

function saveGcode() {
  if (!currentGcodeData) {
    showToast('Generate G-code first');
    return;
  }

  sessionStorage.setItem('fab_gcode', currentGcodeData.code.join('\n'));
  showToast('Saved to session storage');
}

function clearGcode() {
  currentGcodeData = null;
  document.getElementById('gcode-lines').innerHTML = '';

  const canvas = document.getElementById('toolpath-canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  const coord = document.getElementById('coord-diagram');
  coord.getContext('2d').clearRect(0, 0, coord.width, coord.height);

  document.getElementById('gcode-explanation').textContent = 'Generate G-code to see explanation.';
  document.getElementById('gcode-steps').innerHTML = '';
  updateSummary({ time: '—', length: '—', moves: '—', bounds: '—' });
  setStatus('ready', 'Ready to generate', 'Enter an instruction and click generate.');
  showToast('Cleared');
}

function simulateGcode() {
  if (!currentGcodeData) {
    showToast('Generate G-code first');
    return;
  }

  showToast('Simulation: animating toolpath...');
  animateToolpath(currentGcodeData);
}

function triggerDownload(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* ================================================
   TOOLPATH ANIMATION
================================================ */
function animateToolpath(data) {
  const canvas = document.getElementById('toolpath-canvas');
  const ctx = canvas.getContext('2d');
  drawToolpath(data);

  const width = canvas.width;
  const height = canvas.height;
  const pad = 60;
  let maxX = 20;
  let maxY = 20;

  if (data.shape === 'square') {
    maxX = data.size + 4;
    maxY = data.size + 4;
  }
  if (data.shape === 'rect') {
    maxX = data.w + 4;
    maxY = data.h + 4;
  }
  if (data.shape === 'circle') {
    maxX = data.r * 2 + 4;
    maxY = data.r * 2 + 4;
  }
  if (data.shape === 'triangle') {
    maxX = data.size + 4;
    maxY = Math.round(data.size * 0.866) + 4;
  }

  const scale = Math.min((width - pad * 2) / Math.max(maxX, 1), (height - pad * 2) / Math.max(maxY, 1));
  const toX = (x) => pad + x * scale;
  const toY = (y) => height - pad - y * scale;

  let points = [];
  if (data.shape === 'square' || data.shape === 'rect') {
    const boxWidth = data.shape === 'square' ? data.size : data.w;
    const boxHeight = data.shape === 'square' ? data.size : data.h;
    points = [[0, 0], [boxWidth, 0], [boxWidth, boxHeight], [0, boxHeight], [0, 0]];
  } else if (data.shape === 'triangle') {
    const side = data.size;
    const apexY = Math.round(side * 0.866);
    points = [[0, 0], [side, 0], [side / 2, apexY], [0, 0]];
  } else if (data.shape === 'line') {
    points = [[data.x1, data.y1], [data.x2, data.y2]];
  } else {
    return;
  }

  let index = 0;
  const tool = { x: toX(points[0][0]), y: toY(points[0][1]) };

  function step() {
    if (index >= points.length - 1) {
      return;
    }

    const [targetX, targetY] = [toX(points[index + 1][0]), toY(points[index + 1][1])];
    const duration = 600;
    const start = performance.now();
    const startX = tool.x;
    const startY = tool.y;

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      tool.x = startX + (targetX - startX) * progress;
      tool.y = startY + (targetY - startY) * progress;

      drawToolpath(data);
      ctx.beginPath();
      ctx.arc(tool.x, tool.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tool.x, tool.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239,68,68,.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        index += 1;
        setTimeout(step, 100);
      }
    }

    requestAnimationFrame(frame);
  }

  step();
}

/* ================================================
   UTILS
================================================ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countLines(text) {
  return text ? text.split('\n').length : 0;
}

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  switchMode('gcode');
  defaultAiOutput = createDefaultAiOutput();
  currentAiOutput = defaultAiOutput;
  renderAiOutput(defaultAiOutput);
  updateCharCount(document.getElementById('gcode-instruction'));
  updateAuthUi();
  renderSignedOutChatState();

  await Promise.allSettled([
    generateGcode(),
    hydrateSession(),
  ]);

  window.addEventListener('resize', () => {
    if (currentGcodeData) {
      drawToolpath(currentGcodeData);
      drawCoordDiagram(currentGcodeData);
    }
  });
});
