import React from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { MessageSquare, Loader2, CheckCircle2, XCircle, Copy } from 'lucide-react';

export default function GeminiTextNode({ id, data, selected }) {
  const { nodeOutputs, nodeStatuses, nodeErrors } = useFlowStore();
  const output = nodeOutputs[id];
  const status = nodeStatuses[id] || 'idle';
  const error = nodeErrors?.[id];
  const modelName = data?.model?.name || data?.label || 'Gemini Text';

  const copyText = () => {
    if (output?.text) navigator.clipboard.writeText(output.text);
  };

  return (
    <div className={`node node--gemini-text ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="prompt" className="handle handle--prompt" />

      <div className="node-header">
        <div className="node-icon node-icon--text"><MessageSquare size={12} /></div>
        <span className="node-title">{modelName}</span>
        {status === 'loading' && <div className="status-badge status--loading"><Loader2 size={11} className="spin" /></div>}
        {status === 'success' && <div className="status-badge status--success"><CheckCircle2 size={11} /></div>}
        {status === 'error' && <div className="status-badge status--error"><XCircle size={11} /></div>}
      </div>

      <div className="node-body">
        {status === 'loading' ? (
          <div className="node-loading"><Loader2 size={22} className="spin" /><span>Thinking...</span></div>
        ) : output?.text ? (
          <div className="node-text-output nodrag nopan nowheel">
            <div className="node-text-content">{output.text}</div>
            <button className="node-copy-btn" onClick={copyText}><Copy size={11} /></button>
          </div>
        ) : error ? (
          <div className="node-error-msg">{error}</div>
        ) : (
          <div className="node-placeholder"><MessageSquare size={22} /><span>Connect Prompt → Run</span></div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="text" className="handle handle--text" />
    </div>
  );
}
