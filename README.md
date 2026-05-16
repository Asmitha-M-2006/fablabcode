# FAB-LabCode

FAB-LabCode is a browser-based developer dashboard for fabrication workflows. It combines:

- An AI sandbox that returns structured code, explanation, and preview data
- A G-code generator that converts plain-English instructions into toolpaths
- A built-in Node backend that serves the frontend and exposes the API layer

## Run locally

```bash
npm start
```

Then open `http://localhost:3000`.

For auto-reload during development:

```bash
npm run dev
```

To enable authenticated chat with a real model, provide env vars through your shell or a local `.env` / `.env.local` file:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
DATABASE_URL=your_postgres_url
SESSION_SECRET=your_random_secret
```

## Test

```bash
npm test
```

## API endpoints

- `GET /api/health` returns backend status
- `POST /api/chat` returns a structured AI sandbox response
- `POST /api/gcode/generate` returns generated G-code plus metadata for rendering

## Project structure

```text
fablabcode/
├── index.html
├── style.css
├── script.js
├── package.json
├── server.js
├── server/
│   ├── lib/
│   │   ├── ai-assistant.js
│   │   ├── gcode-service.js
│   │   └── http.js
│   └── tests/
│       └── integration.test.js
├── CONTEXT.md
└── DOCUMENTATION.md
```
