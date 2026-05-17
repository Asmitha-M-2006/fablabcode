import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Copy, ExternalLink, Info, Activity, Layers, Play, Check } from 'lucide-react';

/**
 * OutputPanel component displays the results of the AI's processing.
 * Refactored to match the CSS grid structure (.output-workspace, .output-pane).
 * 
 * @param {Object} output - The artifact returned by the AI.
 */
function OutputPanel({ output }) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Normalize files from output artifact
  const files = useMemo(() => {
    if (!output) return [];
    
    let normalized = [];
    if (Array.isArray(output.files)) {
      normalized = output.files.map(f => ({
        filename: f.filename || 'snippet.txt',
        language: f.language || 'Text',
        content: f.content || '',
        primary: f.primary
      }));
    } else {
      normalized = [{
        filename: output.filename || 'snippet.txt',
        language: output.language || 'Text',
        content: output.code || '',
        primary: true
      }];
    }
    return normalized.filter(f => f.content);
  }, [output]);

  // Set active file when output changes
  useEffect(() => {
    if (files.length > 0) {
      const primaryIndex = files.findIndex(f => f.primary);
      setActiveFileIndex(primaryIndex >= 0 ? primaryIndex : 0);
    }
  }, [files]);

  if (!output) {
    return (
      <div className="panel output-panel">
        <div className="panel-header">
           <div className="panel-title"><Terminal size={18} /> AI Output</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
          <Terminal size={48} />
          <h3>No artifact generated</h3>
          <p>Send a message to start building.</p>
        </div>
      </div>
    );
  }

  const activeFile = files[activeFileIndex] || files[0];

  /**
   * Copy current code to clipboard.
   */
  const copyCode = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="panel output-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title">
          <Terminal size={18} />
          AI Output Artifacts
        </div>
        <div className="output-actions">
          <button className="btn-ghost btn-sm" onClick={copyCode}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="output-tabs">
        {files.map((file, idx) => (
          <button 
            key={idx}
            className={`tab-btn ${idx === activeFileIndex ? 'active' : ''}`}
            onClick={() => setActiveFileIndex(idx)}
          >
            <Layers size={13} />
            {file.filename}
          </button>
        ))}
      </div>

      {/* Main Workspace Grid */}
      <div className="output-workspace">
        
        {/* Pane 1: Code Editor (Full Height on Left) */}
        <div className="output-pane output-pane-code">
          <div className="pane-heading">
            <span className="pane-kicker">{activeFile?.language || 'Code'}</span>
            <div className="pane-caption">{activeFile?.filename}</div>
          </div>
          <div className="code-block-wrapper" style={{ flex: 1, overflow: 'auto', background: '#0f1117', borderRadius: '8px', marginTop: '10px' }}>
            <pre style={{ margin: 0, padding: '16px', color: '#e2e8f0', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
              <code>{activeFile?.content}</code>
            </pre>
          </div>
        </div>

        {/* Pane 2: Preview (Top Right) */}
        <div className="output-pane output-pane-preview">
          <div className="pane-heading">
            <span className="pane-kicker">Preview</span>
            <div className="pane-caption">{output.preview?.title || 'Interactive Preview'}</div>
          </div>
          <div className="preview-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '8px', background: '#fff', marginTop: '10px' }}>
            {output.preview?.mode === 'live' ? (
              <div style={{ textAlign: 'center' }}>
                <Play size={24} color="var(--accent)" />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Live preview ready</p>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{output.preview?.note || 'No preview available'}</p>
            )}
          </div>
        </div>

        {/* Pane 3: Explanation (Bottom Right) */}
        <div className="output-pane output-pane-explanation">
          <div className="pane-heading">
            <span className="pane-kicker">Logic & Flow</span>
            <div className="pane-caption">{output.summary || 'Implementation details'}</div>
          </div>
          <div className="explanation-scroll" style={{ flex: 1, overflowY: 'auto', marginTop: '10px' }}>
             <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
               {output.explanation}
             </div>
             {(output.steps || []).map((step, idx) => (
               <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                 <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-dark)', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                   {idx + 1}
                 </div>
                 <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{step}</div>
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default OutputPanel;
