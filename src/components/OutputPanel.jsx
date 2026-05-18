import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Copy, Layers, Check, Play, BookOpen, Code2, Eye } from 'lucide-react';

const TABS = [
  { id: 'plan',    label: 'Plan',    Icon: BookOpen },
  { id: 'sandbox', label: 'Sandbox', Icon: Code2    },
  { id: 'preview', label: 'Preview', Icon: Eye      },
];

function OutputPanel({ output }) {
  const [activeTab, setActiveTab]             = useState('plan');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied]                   = useState(false);
  // editedFiles stores user edits per file index: { 0: 'new content', 1: '...' }
  const [editedFiles, setEditedFiles]         = useState({});

  const files = useMemo(() => {
    if (!output) return [];
    if (Array.isArray(output.files) && output.files.length > 0) {
      return output.files
        .map(f => ({ filename: f.filename || 'snippet.txt', language: f.language || 'Text', content: f.content || '', primary: f.primary }))
        .filter(f => f.content);
    }
    return output.code ? [{ filename: output.filename || 'snippet.txt', language: output.language || 'Text', content: output.code, primary: true }] : [];
  }, [output]);

  // When new output arrives, auto-switch to sandbox and clear edits
  useEffect(() => {
    if (output) {
      setActiveTab('sandbox');
      setEditedFiles({});  // reset edits on new output
      const pri = files.findIndex(f => f.primary);
      setActiveFileIndex(pri >= 0 ? pri : 0);
    }
  }, [output]);  // eslint-disable-line

  const activeFile = files[activeFileIndex] ?? files[0];
  const tabIndex   = TABS.findIndex(t => t.id === activeTab);

  // Get the current content for a file — edited version takes priority
  const getContent = (idx) =>
    editedFiles[idx] !== undefined ? editedFiles[idx] : (files[idx]?.content ?? '');

  // Handle user edits in the textarea
  const handleEdit = (idx, value) =>
    setEditedFiles(prev => ({ ...prev, [idx]: value }));

  // Reset a file back to the original AI-generated content
  const handleReset = (idx) =>
    setEditedFiles(prev => { const n = { ...prev }; delete n[idx]; return n; });

  const copyCode = () => {
    const content = getContent(activeFileIndex);
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ── Empty state ─────────────────────────────── */
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

  /* ── Build preview from edited file contents ────────────
     We look for CSS, JS, and HTML files by language.
     If the user has edited one of those files, we use the
     edited version — so Preview always reflects your changes.
  ───────────────────────────────────────────────────────── */
  const cssIdx  = files.findIndex(f => f.language.toLowerCase() === 'css');
  const jsIdx   = files.findIndex(f => f.primary) !== -1
    ? files.findIndex(f => f.primary)
    : files.findIndex(f => f.language.toLowerCase().includes('javascript'));
  const htmlIdx = files.findIndex(f => f.language.toLowerCase() === 'html');

  // Use edited content if available, otherwise fall back to AI-generated preview parts
  const previewStyles = cssIdx  >= 0 ? getContent(cssIdx)  : (output.preview?.styles  || '');
  const previewScript = jsIdx   >= 0 ? getContent(jsIdx)   : (output.preview?.script  || '');
  const previewMarkup = htmlIdx >= 0 ? getContent(htmlIdx) : (output.preview?.markup  || '');

  const iframeSrc = output.preview?.mode === 'live'
    ? `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${previewStyles}</style></head><body>${previewMarkup}<script>${previewScript}<\/script></body></html>`
    : null;

  /* ── Render ──────────────────────────────────── */
  return (
    <div className="panel output-panel">

      {/* Header */}
      <div className="panel-header output-panel-header">
        <div className="panel-title">
          <Terminal size={18} />
          {output.title || 'AI Output'}
        </div>

        {/* Sliding tab toggle */}
        <div className="output-toggle">
          <div
            className="output-toggle-slider"
            style={{ transform: `translateX(${tabIndex * 100}%)`, width: `${100 / TABS.length}%` }}
          />
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`output-toggle-btn${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <button className="btn-ghost btn-sm" onClick={copyCode}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* ── TAB: PLAN ──────────────────────────── */}
      {activeTab === 'plan' && (
        <div className="tab-pane plan-pane">
          <div className="plan-summary-block">
            <p className="plan-title">{output.title}</p>
            <p className="plan-summary">{output.summary}</p>
          </div>

          {output.explanation && (
            <div className="plan-section">
              <h4 className="plan-section-title">How it works</h4>
              <p className="plan-text">{output.explanation}</p>
            </div>
          )}

          {Array.isArray(output.steps) && output.steps.length > 0 && (
            <div className="plan-section">
              <h4 className="plan-section-title">Implementation steps</h4>
              <ol className="plan-steps">
                {output.steps.map((step, i) => (
                  <li key={i} className="plan-step">
                    <span className="plan-step-num">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {Array.isArray(output.tips) && output.tips.length > 0 && (
            <div className="plan-section plan-tips-block">
              <h4 className="plan-section-title">Best practices</h4>
              <ul className="plan-tips">
                {output.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          )}

          {output.complexity && (
            <div className="plan-section">
              <h4 className="plan-section-title">Complexity</h4>
              <div className="plan-complexity">
                {[
                  ['Level',     output.complexity.level],
                  ['Time',      output.complexity.time],
                  ['Space',     output.complexity.space],
                  ['Pattern',   output.complexity.pattern],
                  ['Paradigm',  output.complexity.paradigm],
                ].map(([k, v]) => (
                  <div key={k} className="plan-complexity-item">
                    <span className="plan-complexity-key">{k}</span>
                    <span className="plan-complexity-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SANDBOX ───────────────────────── */}
      {activeTab === 'sandbox' && (
        <div className="tab-pane sandbox-pane">
          {/* File tabs */}
          <div className="sandbox-file-tabs">
            {files.map((f, i) => (
              <button
                key={i}
                className={`sandbox-file-tab${i === activeFileIndex ? ' active' : ''}`}
                onClick={() => setActiveFileIndex(i)}
              >
                <Layers size={12} />
                {f.filename}
              </button>
            ))}
          </div>

          {/* Language badge + reset button if file was edited */}
          <div className="sandbox-file-meta">
            <span className="sandbox-lang-badge">{activeFile?.language}</span>
            <span className="sandbox-filename">{activeFile?.filename}</span>
            {editedFiles[activeFileIndex] !== undefined && (
              <button
                className="sandbox-reset-btn"
                onClick={() => handleReset(activeFileIndex)}
                title="Reset to original"
              >
                ↺ Reset
              </button>
            )}
          </div>

          {/* Editable code textarea */}
          <div className="sandbox-code-wrap">
            <textarea
              className="sandbox-code-editor"
              value={getContent(activeFileIndex)}
              onChange={e => handleEdit(activeFileIndex, e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>
      )}

      {/* ── TAB: PREVIEW ───────────────────────── */}
      {activeTab === 'preview' && (
        <div className="tab-pane preview-pane">
          {/* Show a small badge if user has edited files */}
          {Object.keys(editedFiles).length > 0 && iframeSrc && (
            <div className="preview-edited-badge">✎ Showing your edits</div>
          )}
          {iframeSrc ? (
            <iframe
              key={iframeSrc}          /* key forces re-mount when content changes */
              srcDoc={iframeSrc}
              sandbox="allow-scripts"
              className="preview-iframe"
              title="Live preview"
            />
          ) : (
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
