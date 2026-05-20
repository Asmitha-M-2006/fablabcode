import React, { useState } from 'react';

// ── Big O Graph constants ───────────────────────────────────────
const SVG_W = 420, SVG_H = 230;
const PAD = { t: 24, r: 28, b: 44, l: 48 };
const PW = SVG_W - PAD.l - PAD.r;
const PH = SVG_H - PAD.t - PAD.b;

const CURVES = [
  { id: 'o1',     label: 'O(1)',       color: '#10b981', fn: () => 0.04 },
  { id: 'ologn',  label: 'O(log n)',   color: '#06b6d4', fn: n => Math.log(1 + n * 12) / Math.log(13) * 0.42 },
  { id: 'on',     label: 'O(n)',       color: '#3b82f6', fn: n => n * 0.66 },
  { id: 'onlogn', label: 'O(n log n)', color: '#8b5cf6', fn: n => n === 0 ? 0 : n * Math.log(1 + n * 12) / Math.log(13) * 0.86 },
  { id: 'on2',    label: 'O(n²)',      color: '#f59e0b', fn: n => Math.pow(n, 2) * 0.96 },
  { id: 'o2n',    label: 'O(2ⁿ)',      color: '#ef4444', fn: n => (Math.pow(1.7, n * 10) - 1) / (Math.pow(1.7, 10) - 1) * 0.96 },
];

function buildPath(fn, numPts = 72) {
  return Array.from({ length: numPts }, (_, i) => {
    const t = i / (numPts - 1);
    const y = Math.min(1, Math.max(0, fn(t)));
    const sx = (PAD.l + t * PW).toFixed(1);
    const sy = (PAD.t + (1 - y) * PH).toFixed(1);
    return `${i === 0 ? 'M' : 'L'} ${sx},${sy}`;
  }).join(' ');
}

function detectCurve(complexity) {
  if (!complexity) return 'on';
  const t = (complexity.time || '').toLowerCase();
  const l = (complexity.level || '').toLowerCase();
  if (/2\^n|exponential|n!/.test(t))             return 'o2n';
  if (/n²|n\^2|quadratic/.test(t))               return 'on2';
  if (/n log|nlog|n·log|linearithmic/.test(t))   return 'onlogn';
  if (/log n|log\(n\)/.test(t))                  return 'ologn';
  if (/o\(n\)|linear/.test(t))                   return 'on';
  if (/o\(1\)|constant/.test(t))                 return 'o1';
  if (l === 'low')    return 'o1';
  if (l === 'high')   return 'on2';
  return 'on';
}

function complexityColor(str) {
  const s = (str || '').toLowerCase();
  if (/o\(1\)|constant/.test(s))            return '#10b981';
  if (/log n/.test(s))                       return '#06b6d4';
  if (/n log|nlog/.test(s))                  return '#8b5cf6';
  if (/o\(n\)/i.test(s) && !/log/.test(s)) return '#3b82f6';
  if (/n²|n\^2/.test(s))                     return '#f59e0b';
  if (/2\^n|n!/.test(s))                     return '#ef4444';
  return '#6366f1';
}

function barPercent(str) {
  const s = (str || '').toLowerCase();
  if (/o\(1\)|constant/.test(s))             return 8;
  if (/log n/.test(s) && !/n log/.test(s)) return 22;
  if (/o\(n\)/i.test(s) && !/log/.test(s)) return 40;
  if (/n log|nlog/.test(s))                  return 62;
  if (/n²|n\^2/.test(s))                     return 80;
  if (/2\^n|n!/.test(s))                     return 96;
  return 40;
}

const LEVEL_CONFIG = {
  low:    { color: '#10b981', pct: 26 },
  medium: { color: '#f59e0b', pct: 55 },
  high:   { color: '#ef4444', pct: 84 },
};

// ── Component: BigOGraph ────────────────────────────────────────
export function BigOGraph({ complexity }) {
  const activeId = detectCurve(complexity);
  const active = CURVES.find(c => c.id === activeId) || CURVES[2];
  const endY = Math.min(1, Math.max(0, active.fn(1)));
  const dotX = PAD.l + PW;
  const dotY = PAD.t + (1 - endY) * PH;
  const labelY = Math.max(PAD.t + 14, dotY - 10);

  return (
    <div className="viz-bigo">
      <p className="viz-section-label">Big O Analysis</p>

      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="viz-bigo-svg">
        <defs>
          <filter id="bigo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="axis-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Background grid */}
        {[0.25, 0.5, 0.75, 1].map(v => (
          <line key={v}
            x1={PAD.l} y1={PAD.t + (1 - v) * PH}
            x2={PAD.l + PW} y2={PAD.t + (1 - v) * PH}
            stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4"
          />
        ))}
        {[0.25, 0.5, 0.75].map(v => (
          <line key={v}
            x1={PAD.l + v * PW} y1={PAD.t}
            x2={PAD.l + v * PW} y2={PAD.t + PH}
            stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4"
          />
        ))}

        {/* Axis background fill */}
        <rect x={PAD.l} y={PAD.t} width={PW} height={PH} fill="url(#axis-grad)" opacity="0.15" />

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + PH} stroke="#94a3b8" strokeWidth="1.5" />
        <line x1={PAD.l} y1={PAD.t + PH} x2={PAD.l + PW} y2={PAD.t + PH} stroke="#94a3b8" strokeWidth="1.5" />

        {/* Axis arrowheads */}
        <polygon points={`${PAD.l},${PAD.t - 7} ${PAD.l - 4},${PAD.t + 5} ${PAD.l + 4},${PAD.t + 5}`} fill="#94a3b8" />
        <polygon points={`${PAD.l + PW + 7},${PAD.t + PH} ${PAD.l + PW - 3},${PAD.t + PH - 4} ${PAD.l + PW - 3},${PAD.t + PH + 4}`} fill="#94a3b8" />

        {/* Axis labels */}
        <text x={PAD.l + PW / 2} y={SVG_H - 4} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="system-ui,sans-serif">Input size (n)</text>
        <text x={13} y={PAD.t + PH / 2} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="system-ui,sans-serif"
          transform={`rotate(-90,13,${PAD.t + PH / 2})`}>Operations</text>

        {/* Inactive curves */}
        {CURVES.filter(c => c.id !== activeId).map(c => (
          <path key={c.id} d={buildPath(c.fn)} fill="none" stroke={c.color} strokeWidth="1.5" opacity="0.18" />
        ))}

        {/* Active curve glow layer */}
        <path d={buildPath(active.fn)} fill="none" stroke={active.color} strokeWidth="7" opacity="0.12" strokeLinecap="round" />

        {/* Active curve main */}
        <path
          d={buildPath(active.fn)}
          fill="none"
          stroke={active.color}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#bigo-glow)"
          className="viz-active-curve"
          pathLength="1"
        />

        {/* Active curve end dot — pulse ring */}
        <circle cx={dotX} cy={dotY} r={10} fill={active.color} opacity="0.15" className="viz-dot-ring" />
        <circle cx={dotX} cy={dotY} r={5}  fill={active.color} filter="url(#bigo-glow)" />
        <circle cx={dotX} cy={dotY} r={2.5} fill="#fff" />

        {/* "You are here" label */}
        <text x={dotX - 8} y={labelY} fill={active.color} fontSize="10.5" fontWeight="700" textAnchor="end" fontFamily="system-ui,sans-serif">
          {active.label}
        </text>
        <text x={dotX - 8} y={labelY + 11} fill={active.color} fontSize="9" textAnchor="end" fontFamily="system-ui,sans-serif" opacity="0.7">
          ← you are here
        </text>
      </svg>

      {/* Legend */}
      <div className="viz-bigo-legend">
        {CURVES.map(c => (
          <span key={c.id} className={`viz-legend-chip${c.id === activeId ? ' active' : ''}`}
            style={c.id === activeId ? { background: `${c.color}1a`, border: `1.5px solid ${c.color}`, color: c.color } : {}}>
            <span className="viz-legend-dot" style={{ background: c.color, opacity: c.id === activeId ? 1 : 0.35 }} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Component: ComplexityBreakdown ──────────────────────────────
export function ComplexityBreakdown({ complexity }) {
  if (!complexity) return null;
  const lvl = (complexity.level || 'medium').toLowerCase();
  const cfg = LEVEL_CONFIG[lvl] || LEVEL_CONFIG.medium;
  const timePct   = barPercent(complexity.time);
  const spacePct  = barPercent(complexity.space);
  const timeColor  = complexityColor(complexity.time);
  const spaceColor = complexityColor(complexity.space);

  return (
    <div className="viz-complexity">
      <p className="viz-section-label">Complexity Breakdown</p>

      <div className="viz-gauge-row">
        <span className="viz-gauge-label">Level</span>
        <div className="viz-gauge-track">
          <div className="viz-gauge-fill" style={{ width: `${cfg.pct}%`, background: cfg.color }} />
        </div>
        <span className="viz-gauge-val" style={{ color: cfg.color }}>{complexity.level}</span>
      </div>

      <div className="viz-gauge-row">
        <span className="viz-gauge-label">Time</span>
        <div className="viz-gauge-track">
          <div className="viz-gauge-fill" style={{ width: `${timePct}%`, background: timeColor }} />
        </div>
        <span className="viz-gauge-val" style={{ color: timeColor }}>{complexity.time || '—'}</span>
      </div>

      <div className="viz-gauge-row">
        <span className="viz-gauge-label">Space</span>
        <div className="viz-gauge-track">
          <div className="viz-gauge-fill" style={{ width: `${spacePct}%`, background: spaceColor }} />
        </div>
        <span className="viz-gauge-val" style={{ color: spaceColor }}>{complexity.space || '—'}</span>
      </div>

      {(complexity.pattern || complexity.paradigm) && (
        <div className="viz-badges">
          {complexity.pattern  && <span className="viz-badge pattern">{complexity.pattern}</span>}
          {complexity.paradigm && <span className="viz-badge paradigm">{complexity.paradigm}</span>}
        </div>
      )}
    </div>
  );
}

// ── Component: FlowDiagram ──────────────────────────────────────
export function FlowDiagram({ steps }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="viz-flow">
      <p className="viz-section-label">Execution Flow</p>

      <div className="viz-flow-nodes">
        <div className="viz-flow-terminal start">◉ START</div>

        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div className="viz-flow-connector">
              <div className="viz-flow-pulse" style={{ animationDelay: `${i * 0.22}s` }} />
            </div>

            <div className="viz-flow-node" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="viz-flow-num">{i + 1}</div>
              <div className="viz-flow-text">{step}</div>
            </div>
          </React.Fragment>
        ))}

        <div className="viz-flow-connector">
          <div className="viz-flow-pulse" style={{ animationDelay: `${steps.length * 0.22}s` }} />
        </div>
        <div className="viz-flow-terminal end">✓ DONE</div>
      </div>
    </div>
  );
}

// ── Component: FileArchitecture ─────────────────────────────────
// ── Component: AlgorithmTrace ───────────────────────────────────
export function AlgorithmTrace({ trace, inputExample, outputExample, keyInsight }) {
  const hasContent = (trace && trace.length > 0) || inputExample || outputExample || keyInsight;
  if (!hasContent) return null;

  return (
    <div className="viz-algo-trace">
      <p className="viz-section-label">Algorithm Trace</p>

      {keyInsight && (
        <div className="viz-key-insight">
          <span className="viz-key-insight-icon">💡</span>
          <span className="viz-key-insight-text">{keyInsight}</span>
        </div>
      )}

      {(inputExample || outputExample) && (
        <div className="viz-io-row">
          {inputExample && (
            <div className="viz-io-box input">
              <span className="viz-io-label">Input</span>
              <code className="viz-io-value">{inputExample}</code>
            </div>
          )}
          {outputExample && (
            <div className="viz-io-box output">
              <span className="viz-io-label">Output</span>
              <code className="viz-io-value">{outputExample}</code>
            </div>
          )}
        </div>
      )}

      {trace && trace.length > 0 && (
        <div className="viz-trace-steps">
          {trace.map((step, i) => (
            <div key={i} className="viz-trace-step" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="viz-trace-step-num">{i + 1}</div>
              <code className="viz-trace-step-text">{step}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Component: UserInteractionFlow ─────────────────────────────
// Renders userFlow strings (format "User action → System response")
// as a beautiful two-column interaction diagram.
export function UserInteractionFlow({ userFlow }) {
  if (!userFlow || userFlow.length === 0) return null;

  const steps = userFlow.map(s => {
    const parts = s.split(/→|->/).map(p => p.trim());
    return { action: parts[0] || s, response: parts[1] || '' };
  });

  return (
    <div className="viz-interact">
      <p className="viz-section-label">Product Interaction Flow</p>

      {/* Column headers */}
      <div className="viz-interact-header">
        <span className="viz-interact-col-label user-col">👤 You</span>
        <span className="viz-interact-col-label app-col">⚡ App</span>
      </div>

      <div className="viz-interact-rows">
        {steps.map((step, i) => (
          <div key={i} className="viz-interact-row" style={{ animationDelay: `${i * 60}ms` }}>
            {/* User action */}
            <div className="viz-interact-cell user-cell">
              <span className="viz-interact-text">{step.action}</span>
            </div>

            {/* Animated arrow */}
            <div className="viz-interact-arrow">
              <div className="viz-interact-arrow-line" />
              <div className="viz-interact-arrow-head" />
              <div className="viz-interact-arrow-dot" style={{ animationDelay: `${i * 0.4}s` }} />
            </div>

            {/* System response */}
            <div className="viz-interact-cell app-cell">
              <span className="viz-interact-text">{step.response}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component: ConceptChips ─────────────────────────────────────
const CONCEPT_ICONS = {
  'state machine': '🔄', 'event delegation': '⚡', 'event': '⚡',
  'keyboard': '⌨️', 'dom': '🌐', 'oop': '📦', 'class': '📦',
  'array': '📋', 'async': '⏳', 'await': '⏳', 'fetch': '🌐',
  'http': '🌐', 'recursion': '🔁', 'performance': '⚡',
  'animation': '🎞️', 'timing': '⏱️', 'closure': '🔒',
  'functional': 'λ', 'sort': '🔢', 'css': '🎨', 'theme': '🎨',
  'dry': '✨', 'service': '🔌', 'json': '📄', 'error': '🛡️',
  'math': '🔢', 'single source': '🏛️', 'form': '📝', 'render': '🖼️',
};
const CHIP_COLORS = [
  { bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce' },
  { bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
  { bg: '#fef9c3', border: '#fde047', text: '#713f12' },
];
function conceptIcon(name) {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CONCEPT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '💡';
}

export function ConceptChips({ concepts }) {
  if (!concepts || concepts.length === 0) return null;
  return (
    <div className="viz-concepts">
      <p className="viz-section-label">Concepts Used</p>
      <div className="viz-concepts-grid">
        {concepts.map((c, i) => {
          const col = CHIP_COLORS[i % CHIP_COLORS.length];
          return (
            <div key={i} className="viz-concept-chip"
              style={{ background: col.bg, border: `1.5px solid ${col.border}`, color: col.text }}>
              <span className="viz-concept-icon">{conceptIcon(c)}</span>
              <span className="viz-concept-name">{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Component: FeatureList ──────────────────────────────────────
const FEATURE_ACCENTS = ['#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

export function FeatureList({ features }) {
  if (!features || features.length === 0) return null;
  return (
    <div className="viz-features">
      <p className="viz-section-label">Key Features</p>
      <div className="viz-features-grid">
        {features.map((f, i) => (
          <div key={i} className="viz-feature-card">
            <span className="viz-feature-check" style={{ color: FEATURE_ACCENTS[i % FEATURE_ACCENTS.length] }}>✓</span>
            <span className="viz-feature-text">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const LANG_COLORS = {
  html: '#e34c26', css: '#1572b6', javascript: '#f0db4f', js: '#f0db4f',
  typescript: '#3178c6', ts: '#3178c6', python: '#3776ab', py: '#3776ab',
  default: '#6366f1',
};

export function FileArchitecture({ files }) {
  if (!files || files.length <= 1) return null;

  return (
    <div className="viz-arch">
      <p className="viz-section-label">File Architecture</p>
      <div className="viz-arch-nodes">
        {files.map((f, i) => {
          const lang = (f.language || '').toLowerCase();
          const color = LANG_COLORS[lang] || LANG_COLORS.default;
          return (
            <React.Fragment key={i}>
              <div className={`viz-arch-node${f.primary ? ' primary' : ''}`} style={{ borderColor: color }}>
                <div className="viz-arch-lang-dot" style={{ background: color }}>
                  {(f.language || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="viz-arch-info">
                  <div className="viz-arch-filename">{f.filename}</div>
                  <div className="viz-arch-lang-name">{f.language}</div>
                </div>
                {f.primary && <div className="viz-arch-main-badge">MAIN</div>}
              </div>
              {i < files.length - 1 && (
                <div className="viz-arch-arrow-wrap">
                  <div className="viz-arch-line" />
                  <div className="viz-arch-arrowhead" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
