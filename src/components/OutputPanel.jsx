// ============================================================
// OUTPUTPANEL.JSX — Multi-tab AI output panel
// File: src/components/OutputPanel.jsx
//
// What this file teaches:
//   • useState  — activeTab, activeFileIndex, copied, editedFiles
//   • useEffect — auto-switches to Sandbox tab when new output arrives
//   • useMemo   — derives `files` array from `output` without re-computing
//                 on every render (only recomputes when `output` changes)
//   • Controlled textarea — user can edit AI-generated code in the Sandbox tab
//   • JSZip     — creating and downloading ZIP archives in the browser
//   • Clipboard API — navigator.clipboard.writeText()
//   • Sliding tab indicator — CSS transform moves an indicator strip
//   • Iframe sandbox — rendering HTML/CSS/JS in an isolated preview frame
//   • Derived state vs. stored state — editedFiles[idx] overrides original
//
// Tabs:
//   Plan    — AI explanation, Big O graph, flow diagram, concepts
//   Sandbox — editable code view (one tab per file)
//   Preview — live iframe preview or a "no preview" note card
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Copy, Layers, Check, Play, BookOpen, Code2, Eye, Download } from 'lucide-react';
import JSZip from 'jszip';
// Visualization sub-components (all defined in PlanVisualization.jsx)
import {
  BigOGraph, ComplexityBreakdown, FlowDiagram, FileArchitecture,
  UserInteractionFlow, ConceptChips, FeatureList, AlgorithmTrace,
} from './PlanVisualization';

// The three tab definitions: id (internal key), label (display text), Icon (component).
const TABS = [
  { id: 'plan',    label: 'Plan',    Icon: BookOpen },
  { id: 'sandbox', label: 'Sandbox', Icon: Code2    },
  { id: 'preview', label: 'Preview', Icon: Eye      },
];

/**
 * OutputPanel — Shows the AI's response in three tabs: Plan, Sandbox, Preview.
 *
 * @param {object|null} output - The AI artifact from SandboxMode.
 *   Contains title, summary, files, explanation, steps, complexity, preview, etc.
 *   null = no output yet → shows empty state.
 */
function OutputPanel({ output }) {

  // ── STATE ─────────────────────────────────────────────────

  // activeTab: which tab is currently visible. 'plan' | 'sandbox' | 'preview'
  const [activeTab, setActiveTab]             = useState('plan');

  // activeFileIndex: which file is selected in the Sandbox tab's file tab bar.
  // Index into the `files` array derived from output.
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // copied: true for 2s after the user copies code → button shows "Copied" label
  const [copied, setCopied]                   = useState(false);

  // editedFiles: stores user edits keyed by file index.
  // Format: { 0: 'edited content of file 0', 1: 'edited content of file 1' }
  // An index is only present if the user actually edited that file.
  // If absent, we use the original AI-generated content.
  const [editedFiles, setEditedFiles]         = useState({});

  // ── useMemo: derive files from output ─────────────────────
  // useMemo recomputes `files` ONLY when `output` changes.
  // Without useMemo, this computation would run on every render (including
  // when typing in the textarea), which is wasteful.
  //
  // Returns: [{ filename, language, content, primary }]
  const files = useMemo(() => {
    if (!output) return []; // no output → empty array

    // Prefer the structured `files` array from the AI response
    if (Array.isArray(output.files) && output.files.length > 0) {
      return output.files
        .map(f => ({
          filename: f.filename || 'snippet.txt',
          language: f.language || 'Text',
          content:  f.content  || '',
          primary:  f.primary,
        }))
        .filter(f => f.content); // remove any files with empty content
    }

    // Fallback: single file from the legacy `code` + `filename` fields
    return output.code
      ? [{ filename: output.filename || 'snippet.txt', language: output.language || 'Text', content: output.code, primary: true }]
      : [];
  }, [output]); // recompute only when `output` prop changes

  // ── useEffect: react to new output ────────────────────────
  // When new output arrives (user sent a new message), automatically:
  //   1. Switch to the Sandbox tab so they see the code immediately
  //   2. Clear any previous edits (fresh slate for the new output)
  //   3. Select the primary file (the most important file in the response)
  useEffect(() => {
    if (output) {
      setActiveTab('sandbox');       // jump to code view
      setEditedFiles({});            // discard edits from the previous output
      // Find the primary file index. If none is marked primary, default to 0.
      const pri = files.findIndex(f => f.primary);
      setActiveFileIndex(pri >= 0 ? pri : 0);
    }
  }, [output]);  // eslint-disable-line — `files` would cause infinite loop here

  // The file object for the currently selected tab
  const activeFile = files[activeFileIndex] ?? files[0];

  // tabIndex: used to position the sliding indicator (0=Plan, 1=Sandbox, 2=Preview)
  const tabIndex   = TABS.findIndex(t => t.id === activeTab);

  // ── getContent(idx) ───────────────────────────────────────
  // Returns the current content for a file.
  // If the user has edited file `idx`, return their edit.
  // Otherwise return the original AI-generated content.
  // This pattern is called "derived state with override".
  //
  // @param {number} idx - Index into the `files` array.
  // @returns {string}   - The current (possibly edited) file content.
  const getContent = (idx) =>
    editedFiles[idx] !== undefined ? editedFiles[idx] : (files[idx]?.content ?? '');

  // ── handleEdit(idx, value) ────────────────────────────────
  // Called by the textarea's onChange event when the user edits code.
  // Stores the new value in editedFiles, keyed by file index.
  // Uses the functional form of setState to merge without losing other edits.
  //
  // @param {number} idx   - Which file was edited.
  // @param {string} value - The new textarea content.
  const handleEdit = (idx, value) =>
    setEditedFiles(prev => ({ ...prev, [idx]: value }));

  // ── handleReset(idx) ──────────────────────────────────────
  // Discards the user's edit for file `idx`, reverting to the original AI content.
  // Deletes the key from editedFiles — if the key is absent, getContent falls
  // back to the original content automatically.
  //
  // @param {number} idx - Which file to reset.
  const handleReset = (idx) =>
    setEditedFiles(prev => { const n = { ...prev }; delete n[idx]; return n; });

  // ── copyCode() ────────────────────────────────────────────
  // Copies the currently visible file's content to the clipboard.
  // Uses the Clipboard API (browser async API).
  // The "Copied" label is shown for 2 seconds via a setTimeout.
  const copyCode = () => {
    const content = getContent(activeFileIndex);
    if (content) {
      navigator.clipboard.writeText(content); // async write to system clipboard
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reset after 2s
    }
  };

  // ── exportProject() ───────────────────────────────────────
  // Creates and downloads a ZIP archive of all project files using JSZip.
  // If the user edited any files, their edits are included in the ZIP.
  //
  // Process:
  //   1. Create a JSZip instance
  //   2. Create a folder with the project name (slugified)
  //   3. Add each file (using edited content if available)
  //   4. If there's only a JS file and no HTML, generate a minimal HTML wrapper
  //   5. Generate the ZIP as a Blob → create an object URL → trigger download
  const exportProject = async () => {
    if (!files.length) return; // nothing to export

    const zip      = new JSZip();
    // Slugify the project title: "JS Calculator" → "js-calculator"
    const folder   = (output.title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const projDir  = zip.folder(folder); // create a folder inside the ZIP

    // Add each file to the ZIP, using edited content if the user made changes
    files.forEach((f, idx) => {
      projDir.file(f.filename, getContent(idx));
    });

    // If there's only one file and it's a JS file without a matching HTML file,
    // generate a minimal HTML wrapper so the project can run in a browser directly
    const hasHtml = files.some(f => f.language?.toLowerCase() === 'html');
    if (!hasHtml && files.length === 1) {
      const ext  = files[0].filename.split('.').pop().toLowerCase();
      const lang = files[0].language?.toLowerCase();
      if (lang === 'javascript' || ext === 'js') {
        projDir.file('index.html',
          `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width,initial-scale=1" />\n  <title>${output.title || 'Project'}</title>\n</head>\n<body>\n  <script src="${files[0].filename}"><\/script>\n</body>\n</html>`
        );
      }
    }

    // Generate the ZIP file asynchronously as a binary Blob
    const blob = await zip.generateAsync({ type: 'blob' });

    // Create a temporary object URL pointing to the Blob
    const url  = URL.createObjectURL(blob);

    // Programmatically click a temporary <a> element to trigger the browser download
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${folder}.zip`; // suggested filename for the download dialog
    a.click();

    // Release the object URL from memory once the download has started
    URL.revokeObjectURL(url);
  };

  /* ── Empty state ─────────────────────────────────────────── */
  // When there's no output yet, show a placeholder instead of empty content.
  if (!output) {
    return (
      <div className="panel output-panel">
        <div className="panel-header">
          <div className="panel-title"><Terminal size={18} /> AI Output</div>
        </div>
        <div className="output-empty">
          <Terminal size={44} />
          <h3>Nothing generated yet</h3>
          <p>Send a message to start building.</p>
        </div>
      </div>
    );
  }

  /* ── Preview iframe assembly ──────────────────────────────
     We look for CSS, JS, and HTML files by language in the files array.
     If the user edited any of those files, we use the edited version
     so Preview always reflects their latest changes.

     The preview is assembled into a full HTML document string
     which is passed to the iframe via srcDoc. This approach:
       - Keeps the preview isolated from the outer app (no CSS bleed)
       - Avoids the need for a real HTTP server to serve the preview
       - Lets the AI control the full preview body/styles/script
  ────────────────────────────────────────────────────────────── */

  // Find indices for each file type in the files array
  const cssIdx  = files.findIndex(f => f.language.toLowerCase() === 'css');

  // For JS: prefer the primary file, fall back to any JS file
  const jsIdx   = files.findIndex(f => f.primary) !== -1
    ? files.findIndex(f => f.primary)
    : files.findIndex(f => f.language.toLowerCase().includes('javascript'));

  const htmlIdx = files.findIndex(f => f.language.toLowerCase() === 'html');

  // Use edited content if available, otherwise fall back to the AI-provided
  // preview parts (output.preview.styles / script / markup).
  // This means user edits in the Sandbox tab immediately update the Preview tab.
  const previewStyles = cssIdx  >= 0 ? getContent(cssIdx)  : (output.preview?.styles  || '');
  const previewScript = jsIdx   >= 0 ? getContent(jsIdx)   : (output.preview?.script  || '');
  const previewMarkup = htmlIdx >= 0 ? getContent(htmlIdx) : (output.preview?.markup  || '');

  // Build the full HTML document string for the iframe.
  // Only built for 'live' preview mode — note mode shows a card instead.
  const iframeSrc = output.preview?.mode === 'live'
    ? `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${previewStyles}</style></head><body>${previewMarkup}<script>${previewScript}<\/script></body></html>`
    : null;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="panel output-panel">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="panel-header output-panel-header">
        <div className="panel-title">
          <Terminal size={18} />
          {output.title || 'AI Output'}
        </div>

        {/* ── Sliding tab toggle ──────────────────────── */}
        {/* The slider div moves with CSS transform based on tabIndex.
            translateX(0%) = Plan, translateX(100%) = Sandbox, translateX(200%) = Preview */}
        <div className="output-toggle">
          <div
            className="output-toggle-slider"
            style={{
              transform: `translateX(${tabIndex * 100}%)`,  // sliding highlight
              width: `${100 / TABS.length}%`,               // one third of the container
            }}
          />
          {/* Render one button per tab. onClick changes activeTab state. */}
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`output-toggle-btn${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)} // click event: switch tab
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Copy and Export action buttons */}
        <div className="output-header-actions">
          <button className="btn-ghost btn-sm" onClick={copyCode}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="btn-ghost btn-sm btn-export" onClick={exportProject} title="Download all files as .zip">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: PLAN — AI explanation, visualizations, flow
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'plan' && (
        <div className="tab-pane plan-pane">

          {/* Title + Summary + Complexity badge */}
          <div className="plan-summary-block">
            <div className="plan-title-row">
              <p className="plan-title">{output.title}</p>
              {/* Complexity badge: Low / Medium / High */}
              {output.complexity?.level && (
                <span className={`plan-level-badge lvl-${(output.complexity.level || '').toLowerCase()}`}>
                  {output.complexity.level} complexity
                </span>
              )}
            </div>
            <p className="plan-summary">{output.summary}</p>
          </div>

          {/* "How it works" explanation card */}
          {output.explanation && (
            <div className="plan-explanation-card">
              <div className="plan-explanation-glyph">✦</div>
              <div className="plan-explanation-body">
                <span className="plan-explanation-eyebrow">How it works</span>
                <p className="plan-explanation-text">{output.explanation}</p>
              </div>
            </div>
          )}

          {/* Algorithm Trace — concrete step-by-step trace with variable values.
              Only shown for DSA requests (trace array is populated).
              For UI requests, trace is [] so this doesn't render. */}
          {(output.trace?.length > 0 || output.inputExample || output.keyInsight) && (
            <AlgorithmTrace
              trace={output.trace}
              inputExample={output.inputExample}
              outputExample={output.outputExample}
              keyInsight={output.keyInsight}
            />
          )}

          {/* User Interaction Flow — shows "User action → System response" steps.
              Only shown for UI/app requests where userFlow array is populated. */}
          {Array.isArray(output.userFlow) && output.userFlow.length > 0 && (
            <UserInteractionFlow userFlow={output.userFlow} />
          )}

          {/* Concepts and Features side by side in a grid.
              concepts = CS concepts used (e.g. "State Machine", "Closure")
              features = specific features of this implementation */}
          {(Array.isArray(output.concepts) && output.concepts.length > 0) ||
           (Array.isArray(output.features) && output.features.length > 0) ? (
            <div className="viz-duo-grid">
              <ConceptChips concepts={output.concepts} />
              <FeatureList features={output.features} />
            </div>
          ) : null}

          {/* Big O graph + Complexity breakdown side by side.
              BigOGraph shows an SVG curve for the detected complexity class.
              ComplexityBreakdown shows time/space/level gauge bars. */}
          {output.complexity && (
            <div className="viz-duo-grid">
              <BigOGraph complexity={output.complexity} />
              <ComplexityBreakdown complexity={output.complexity} />
            </div>
          )}

          {/* Execution Flow Diagram — numbered steps like a flowchart */}
          {Array.isArray(output.steps) && output.steps.length > 0 && (
            <FlowDiagram steps={output.steps} />
          )}

          {/* File Architecture — shows which files are included and their languages.
              Only renders when there are 2+ files. */}
          <FileArchitecture files={files} />

          {/* Best Practices / Tips section */}
          {Array.isArray(output.tips) && output.tips.length > 0 && (
            <div className="viz-tips-block">
              <p className="viz-section-label">Best Practices</p>
              <div className="viz-tips-grid">
                {output.tips.map((tip, i) => (
                  <div key={i} className="viz-tip-card">
                    <span className="viz-tip-num">{i + 1}</span>
                    <span className="viz-tip-text">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: SANDBOX — Editable code viewer (one tab per file)
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'sandbox' && (
        <div className="tab-pane sandbox-pane">

          {/* File tab bar — one button per file.
              Clicking switches activeFileIndex to show that file's content. */}
          <div className="sandbox-file-tabs">
            {files.map((f, i) => (
              <button
                key={i}
                className={`sandbox-file-tab${i === activeFileIndex ? ' active' : ''}`}
                onClick={() => setActiveFileIndex(i)} // click event: select this file
              >
                <Layers size={12} />
                {f.filename}
              </button>
            ))}
          </div>

          {/* Language badge + filename + Reset button.
              Reset button only shown if the user has made edits to this file. */}
          <div className="sandbox-file-meta">
            <span className="sandbox-lang-badge">{activeFile?.language}</span>
            <span className="sandbox-filename">{activeFile?.filename}</span>
            {/* editedFiles[activeFileIndex] !== undefined means the user edited this file */}
            {editedFiles[activeFileIndex] !== undefined && (
              <button
                className="sandbox-reset-btn"
                onClick={() => handleReset(activeFileIndex)} // discard edits for this file
                title="Reset to original"
              >
                ↺ Reset
              </button>
            )}
          </div>

          {/* Editable code textarea.
              value = getContent() which returns edited content if available, else original.
              onChange = handleEdit() which stores the new content in editedFiles.
              spellCheck/autoComplete disabled so it behaves like a code editor. */}
          <div className="sandbox-code-wrap">
            <textarea
              className="sandbox-code-editor"
              value={getContent(activeFileIndex)}          // controlled: value from state
              onChange={e => handleEdit(activeFileIndex, e.target.value)} // update on change
              spellCheck={false}   // disable red squiggles for code
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: PREVIEW — Live iframe or note card
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'preview' && (
        <div className="tab-pane preview-pane">

          {/* Badge shown when user has made edits that affect the preview */}
          {Object.keys(editedFiles).length > 0 && iframeSrc && (
            <div className="preview-edited-badge">✎ Showing your edits</div>
          )}

          {/* Live preview — rendered inside an isolated iframe.
              sandbox="allow-scripts" lets the JS run but prevents
              top-level navigation or access to parent page storage.
              key={iframeSrc} forces React to fully re-mount the iframe
              whenever the HTML document string changes — this re-runs the script. */}
          {iframeSrc ? (
            <iframe
              key={iframeSrc}           // forces re-mount when content changes (re-runs scripts)
              srcDoc={iframeSrc}        // the full HTML document string built above
              sandbox="allow-scripts"   // run JS but isolate from parent page
              className="preview-iframe"
              title="Live preview"
            />
          ) : (
            /* Note card shown for DSA / algorithm outputs that have no live preview */
            <div className="preview-note-wrap">
              <div className="preview-note-card">
                <Play size={28} />
                <h4>{output.preview?.title || 'No live preview'}</h4>
                <p>{output.preview?.body || 'A live preview is not available for this artifact.'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OutputPanel;
