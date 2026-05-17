# FAB-LabCode — Technical Documentation

## Architecture

FAB-LabCode has one static frontend and one small Node backend.

- `index.html`, `style.css`, `script.js`: the full browser UI
- `server.js`: local HTTP entrypoint for static files + `/api/*`
- `server/lib/*`: storage, AI, G-code, routing, and HTTP helpers
- `api/*.mjs`: Vercel-compatible route adapters that delegate to the same backend logic

The important design constraint is that the frontend should render backend artifacts, not invent them. The AI sandbox now follows that rule.

## File Structure

```text
fablabcode/
├── api/
│   ├── _shared.mjs
│   ├── health.mjs
│   ├── chat.mjs
│   ├── chat/history.mjs
│   └── gcode/generate.mjs
├── server/
│   ├── lib/
│   │   ├── ai-assistant.js
│   │   ├── chat-service.js
│   │   ├── config.js
│   │   ├── errors.js
│   │   ├── gcode-service.js
│   │   ├── http.js
│   │   ├── openai-service.js
│   │   ├── repository.js
│   │   ├── routes.js
│   │   └── vercel-handler.js
│   └── tests/
│       └── integration.test.js
├── index.html
├── script.js
├── style.css
├── server.js
├── CONTEXT.md
└── DOCUMENTATION.md
```

## Environment Variables

`server/lib/config.js` reads these values:

| Variable | Required | Purpose |
|---|---|---|
| `AI_PROVIDER` | No | Explicitly choose `gemini` or `openai` when both are configured |
| `AI_REQUEST_TIMEOUT_MS` | No | Timeout for provider requests before falling back locally, defaults to `15000` |
| `GEMINI_API_KEY` | No | Enables Gemini-backed chat output |
| `GEMINI_MODEL` | No | Overrides the default Gemini model (`gemini-2.5-flash`) |
| `OPENAI_API_KEY` | No | Enables real OpenAI-backed chat output |
| `OPENAI_MODEL` | No | Overrides the default chat model (`gpt-5.5`) |
| `DATABASE_URL` | No | Enables PostgreSQL persistence |
| `PORT` | No | Local server port, defaults to `3000` |

## Backend

### Local Server

`server.js`:

- serves `index.html`, `style.css`, and `script.js`
- sends `/api/*` requests into `routeRequest()`
- uses `server/lib/http.js` for JSON parsing and response helpers

### Vercel-Compatible Handlers

`api/_shared.mjs` bridges Vercel-style handlers to the same Node route logic through `server/lib/vercel-handler.js`.

That means the local server and the hosted API shape stay aligned.

### Routing

`server/lib/routes.js` owns the route table:

| Method | Route | Behavior |
|---|---|---|
| `GET` | `/api/health` | health + runtime mode details |
| `POST` | `/api/chat` | shared AI sandbox response |
| `GET` | `/api/chat/history` | shared chat history |
| `DELETE` | `/api/chat/history` | clear shared chat history |
| `POST` | `/api/gcode/generate` | generate structured G-code payload |

## Storage

### Repository Layer

`server/lib/repository.js` supports two storage modes:

- memory mode when `DATABASE_URL` is absent
- PostgreSQL mode when `DATABASE_URL` is present

When PostgreSQL is enabled, it auto-creates:

- `users`
- `chat_messages`

The `chat_messages.artifact` column stores the full structured AI artifact as JSONB. Chat history is shared across the local workspace, and PostgreSQL mode uses a single internal workspace record to keep schema compatibility with older databases.

## AI Sandbox Contract

### Chat Flow

1. Frontend calls `POST /api/chat`
2. `chat-service.js` loads recent shared history
3. Backend chooses:
   - `gemini-service.js` if Gemini is the resolved provider
   - `openai-service.js` if `OPENAI_API_KEY` exists
   - `ai-assistant.js` fallback templates otherwise
4. Backend stores:
   - user message
   - assistant reply
   - assistant artifact
5. Frontend renders the stored artifact into the sandbox workspace

### Response Shape

`/api/chat` returns:

```json
{
  "reply": "Short assistant bubble text",
  "output": {
    "title": "JavaScript Calculator",
    "summary": "A small browser calculator with keyboard shortcuts.",
    "filename": "calculator.js",
    "language": "JavaScript",
    "code": "class Calculator { ... }",
    "files": [
      {
        "filename": "index.html",
        "language": "HTML",
        "content": "<!DOCTYPE html>...",
        "primary": false
      },
      {
        "filename": "styles.css",
        "language": "CSS",
        "content": "body { ... }",
        "primary": false
      },
      {
        "filename": "calculator.js",
        "language": "JavaScript",
        "content": "class Calculator { ... }",
        "primary": true
      }
    ],
    "explanation": "Detailed explanation text",
    "steps": ["...", "..."],
    "tips": ["...", "..."],
    "complexity": {
      "level": "Low",
      "time": "O(1)",
      "space": "O(1)",
      "pattern": "State Machine",
      "paradigm": "DOM-driven OOP"
    },
    "preview": {
      "mode": "live",
      "title": "Interactive calculator",
      "body": "Preview summary text",
      "markup": "<main>...</main>",
      "styles": "body { ... }",
      "script": "class Calculator { ... }"
    },
    "stats": {
      "lines": 78,
      "files": 3,
      "language": "JavaScript",
      "status": "Live preview ready"
    }
  }
}
```

### Preview Modes

`preview.mode` can be:

- `live`: frontend builds an isolated iframe from `markup`, `styles`, and `script`
- `note`: frontend shows a non-runnable explanation card instead of an iframe

For backward compatibility, `script.js` also tolerates older stored artifacts that used `preview.kind`.

### OpenAI Path

`server/lib/openai-service.js`:

- calls `https://api.openai.com/v1/responses`
- uses strict JSON schema output
- requires at least one file in `output.files`
- asks the model to provide browser-runnable preview pieces only when the request is suitable for a plain HTML/CSS/JS sandbox

### Gemini Path

`server/lib/gemini-service.js`:

- calls Gemini `models.generateContent` over REST
- uses the official `x-goog-api-key` header
- uses structured JSON output through `generationConfig.responseMimeType = "application/json"`
- passes the shared artifact schema through `generationConfig.responseJsonSchema`
- maps stored chat history into Gemini conversation turns with `user` and `model` roles

### Fallback Path

`server/lib/ai-assistant.js` currently contains curated artifacts for:

- calculator
- todo app
- REST API client
- merge sort
- generic implementation starter

Calculator and todo responses include real live preview payloads and multi-file artifacts.

## Frontend Sandbox Renderer

### Main Renderer

`script.js` now treats the AI sandbox as an artifact viewer:

- `renderAiOutput(output)`
- `renderAiFileTabs(files)`
- `setActiveAiFile(index)`
- `renderAiExplanation(output)`
- `renderAiPreview(preview)`

### Simultaneous Workspace

The right-hand sandbox panel now shows all three surfaces together:

- code pane with file chips
- preview pane
- explanation pane

This replaces the older one-tab-at-a-time behavior.

### Preview Isolation

Live previews render in an iframe with:

- `sandbox="allow-scripts allow-forms allow-modals"`
- `referrerpolicy="no-referrer"`
- inline CSP in `srcdoc`

That keeps previews isolated from the parent page while still allowing plain client-side interactivity.

## G-code Mode

`server/lib/gcode-service.js` still returns structured server-side output:

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
  "shape": "rect"
}
```

The frontend remains responsible for:

- G-code editor rendering
- toolpath canvas drawing
- coordinate diagram
- explanation list updates

## Testing

`server/tests/integration.test.js` covers:

- health endpoint
- removed auth routes returning `404`
- shared chat persistence
- live-preview artifact persistence for chat output
- G-code generation

Run with:

```bash
npm test
```

## Current Constraints

- Without `GEMINI_API_KEY` or `OPENAI_API_KEY`, AI output is limited to curated fallback artifacts.
- Without `DATABASE_URL`, chat history is memory-only.
- The live preview contract is currently best for plain HTML/CSS/JavaScript results, not framework builds.
