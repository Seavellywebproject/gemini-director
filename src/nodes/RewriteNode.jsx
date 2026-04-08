import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { PenLine, Loader2, CheckCircle2, XCircle, Copy, ChevronDown } from 'lucide-react';

const REWRITE_MODES = [
  { id: 'cinematic',    label: '🎬 Cinematic',    desc: 'Vivid, visual, present tense' },
  { id: 'emotional',   label: '❤️ Emotional',    desc: 'Raw, human, visceral' },
  { id: 'concise',     label: '✂️ Concise',      desc: 'Tight, no fat, punchy' },
  { id: 'screenplay',  label: '📄 Screenplay',   desc: 'Proper format & action lines' },
  { id: 'dialogue',    label: '💬 Dialogue',     desc: 'Natural, subtext-driven speech' },
  { id: 'poetic',      label: '✨ Poetic',       desc: 'Lyrical, metaphorical language' },
];

export default function RewriteNode({ id, data, selected }) {
  const { nodeOutputs, nodeStatuses, nodeErrors, updateNodeData } = useFlowStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const output   = nodeOutputs[id];
  const status   = nodeStatuses[id] || 'idle';
  const error    = nodeErrors?.[id];
  const mode     = data?.rewriteMode || 'cinematic';
  const modeLabel = REWRITE_MODES.find(m => m.id === mode)?.label || '🎬 Cinematic';

  const copyText = () => {
    if (output?.text) navigator.clipboard.writeText(output.text);
  };

  return (
    <div className={`node node--rewrite ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="text" className="handle handle--prompt" />

      {/* Header */}
      <div className="node-header">
        <div className="node-icon node-icon--rewrite"><PenLine size={12} /></div>
        <span className="node-title">Rewrite</span>
        {status === 'loading' && <div className="status-badge status--loading"><Loader2 size={11} className="spin" /></div>}
        {status === 'success' && <div className="status-badge status--success"><CheckCircle2 size={11} /></div>}
        {status === 'error'   && <div className="status-badge status--error"><XCircle size={11} /></div>}
      </div>

      {/* Mode selector */}
      <div className="rewrite-mode-selector">
        <button
          className="rewrite-mode-btn nodrag nopan"
          onClick={() => setDropdownOpen(o => !o)}
        >
          <span>{modeLabel}</span>
          <ChevronDown size={10} />
        </button>
        {dropdownOpen && (
          <div className="rewrite-mode-dropdown nodrag nopan">
            {REWRITE_MODES.map(m => (
              <button
                key={m.id}
                className={`rewrite-mode-option ${mode === m.id ? 'rewrite-mode-option--active' : ''}`}
                onClick={() => { updateNodeData(id, { rewriteMode: m.id }); setDropdownOpen(false); }}
              >
                <span className="rewrite-option-label">{m.label}</span>
                <span className="rewrite-option-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Output body */}
      <div className="node-body">
        {status === 'loading' ? (
          <div className="node-loading"><Loader2 size={22} className="spin" /><span>Rewriting...</span></div>
        ) : output?.text ? (
          <div className="node-text-output nodrag nopan nowheel">
            <div className="node-text-content">{output.text}</div>
            <button className="node-copy-btn" onClick={copyText}><Copy size={11} /></button>
          </div>
        ) : error ? (
          <div className="node-error-msg">{error}</div>
        ) : (
          <div className="node-placeholder"><PenLine size={22} /><span>Connect text → Run</span></div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="text" className="handle handle--text" />
    </div>
  );
}
