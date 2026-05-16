# FAB-LabCode — Project Context

## What is FAB-LabCode?

FAB-LabCode is a browser-based developer tool dashboard designed for **fabrication labs and CNC workflows**. It combines an AI coding assistant with a G-code generator in a single, unified interface — think VS Code + ChatGPT + CNC dashboard, all in a light theme with purple/blue accents.

The application has **two modes**:

| Mode | Purpose |
|---|---|
| AI Sandbox | Chat-driven code generation with live preview and explanation |
| G-code Mode | Natural-language to G-code conversion with toolpath visualisation |

---

## Why this project?

Modern fabrication labs often require operators to write G-code manually, which is error-prone and inaccessible to beginners. FAB-LabCode bridges that gap by letting users describe what they want to cut/draw/engrave in plain English and immediately see:
1. The generated G-code
2. A 2D visual toolpath preview on a canvas
3. A step-by-step explanation of each command

Simultaneously, the AI Sandbox provides a general-purpose coding assistant experience — useful for lab technicians and developers who want quick code snippets without leaving the tool.

---

## Audience

- Fabrication lab students and technicians
- Hobbyist CNC/laser-cutter/pen-plotter users
- Developers who want a lightweight AI code assistant
- Educators demonstrating G-code to students

---

## Technology Choices

| Choice | Reason |
|---|---|
| Vanilla HTML/CSS/JS | Zero dependencies — runs in any browser, no build step |
| Canvas API | Toolpath rendering with arrows, grid lines, and animations |
| CSS Custom Properties | Consistent theming across all components |
| JetBrains Mono + Inter | Professional dev-tool typography |
| Node.js HTTP backend | Serves the app locally and exposes chat/G-code APIs without extra dependencies |

---

## Current Scope (v1.1)

- Local backend serves the frontend and exposes `/api/chat` and `/api/gcode/generate`
- G-code generation now runs on the server and returns structured data to the browser
- Canvas toolpath rendering remains client-side for fast visual feedback
- AI Sandbox responses are returned from the backend as structured code/explanation/preview payloads
- Calculator preview in AI Sandbox remains fully functional in the browser

---

## Planned Enhancements (future)

- Real AI provider integration for chat and G-code generation
- 3D toolpath visualisation (Three.js)
- Export to multiple formats (.nc, .gcode, .svg)
- CNC machine connection via Web Serial API
- Save/load sessions with localStorage
- Dark mode toggle
