# FAB-LabCode — Project Context

## Product Direction

FAB-LabCode is a browser-based workspace for two adjacent jobs:

1. AI-assisted software prototyping in an interactive sandbox
2. Natural-language to G-code generation for fabrication workflows

The app is deliberately lightweight: plain HTML, CSS, and JavaScript on the frontend, with a small Node.js backend that serves the UI, handles auth, stores chat history, and returns structured AI/G-code responses.

## Core Experience

### AI Sandbox

The AI Sandbox is no longer just a chat box with a hardcoded mock preview. The backend now returns a single stored artifact that contains:

- runnable preview source
- code files
- explanation text
- ordered implementation steps
- best-practice notes
- a compact complexity summary

The frontend renders that artifact into one workspace so the user can inspect the live preview, explanation, and source code at the same time.

### G-code Mode

The G-code tool converts plain-English fabrication prompts into structured G-code output with:

- generated command lines
- a client-rendered toolpath preview
- bounds, move count, and path-length summary
- a human-readable explanation of the generated sequence

## Runtime Modes

### Real AI Mode

If a real provider key is configured, `/api/chat` uses that provider and asks it to return a strict JSON artifact schema that matches the frontend renderer.

### Fallback Mode

If no supported provider key is configured, the backend still works with curated sandbox artifacts for common requests such as calculators and todo apps. This keeps the full UI flow testable without external dependencies.

### Supported Providers

- Gemini via `GEMINI_API_KEY`
- OpenAI via `OPENAI_API_KEY`

If both are configured, the backend defaults to OpenAI unless `AI_PROVIDER=gemini` is set explicitly.

### Storage Modes

- `DATABASE_URL` set: users, sessions, and chat history persist in PostgreSQL
- `DATABASE_URL` missing: the app falls back to in-memory storage for local development and tests

## Audience

- fabrication lab students and technicians
- CNC / laser / plotting hobbyists
- developers who want a small, local-first AI coding surface
- educators demonstrating both browser code and G-code generation in one tool

## Current Scope

### Implemented

- local Node server plus Vercel-compatible API handlers
- signup, login, logout, and bearer-token auth
- per-user chat history storage
- backend-driven AI artifact schema with files + live preview payloads
- simultaneous preview/code/explanation rendering in the sandbox UI
- server-side G-code generation with client-side visualization
- integration tests covering health, auth, chat persistence, and G-code generation

### Still Needed For Production-Grade Usage

- a real provider key such as `GEMINI_API_KEY` or `OPENAI_API_KEY` for non-template AI output
- a real `DATABASE_URL` for persistent multi-session storage
- a non-default `SESSION_SECRET`
- broader prompt coverage for more UI/app archetypes if you want the fallback mode to behave like a wider real-AI demo

## Near-Term Priorities

- expand live-preview capable artifact types beyond calculator/todo templates
- add richer file handling in the sandbox if generated artifacts grow beyond a few files
- improve G-code template coverage and machine-specific export paths
- add deployment notes for hosted environments using the existing Vercel-compatible handlers
