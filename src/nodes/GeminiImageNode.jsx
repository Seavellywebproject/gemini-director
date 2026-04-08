import React from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { ImageIcon, Loader2, CheckCircle2, XCircle, Download, Eye } from 'lucide-react';

function StatusBadge({ status, error }) {
  if (status === 'loading') return <div className="status-badge status--loading"><Loader2 size={11} className="spin" /> Running</div>;
  if (status === 'success') return <div className="status-badge status--success"><CheckCircle2 size={11} /> Done</div>;
  if (status === 'error') return <div className="status-badge status--error"><XCircle size={11} /> Error</div>;
  return null;
}

export default function GeminiImageNode({ id, data, selected }) {
  const { nodeOutputs, nodeStatuses, nodeErrors, setPreviewMedia } = useFlowStore();
  const output = nodeOutputs[id];
  const status = nodeStatuses[id] || 'idle';
  const error = nodeErrors?.[id];

  const modelName = data?.model?.name || data?.label || 'Gemini Image';

  const handleDownload = () => {
    if (!output?.image) return;
    const a = document.createElement('a');
    a.href = output.image;
    a.download = `gemini-image-${id}.png`;
    a.click();
  };

  return (
    <div className={`node node--gemini-image ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="prompt" className="handle handle--prompt" style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="image" className="handle handle--image" style={{ top: '65%' }} />

      <div className="node-header">
        <div className="node-icon node-icon--image"><ImageIcon size={12} /></div>
        <span className="node-title">{modelName}</span>
        <StatusBadge status={status} error={error} />
      </div>

      <div className="node-body">
        {status === 'loading' ? (
          <div className="node-loading">
            <Loader2 size={28} className="spin" />
            <span>Generating...</span>
          </div>
        ) : output?.image ? (
          <div className="node-output-img-wrap">
            <img src={output.image} alt="generated" className="node-output-img" />
            <div className="node-dl-actions">
              <button className="node-dl-btn" onClick={() => setPreviewMedia({ url: output.image, type: 'image' })} title="Preview">
                <Eye size={12} />
              </button>
              <button className="node-dl-btn" onClick={handleDownload} title="Download">
                <Download size={12} />
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="node-error-msg">{error}</div>
        ) : (
          <div className="node-placeholder">
            <ImageIcon size={28} />
            <span>Connect Prompt → Run</span>
          </div>
        )}
      </div>

      <div className="node-footer">
        <span className="char-count">
          {data?.model?.description || 'AI Image Generation'}
        </span>
        <button className="node-add-btn">+ Add image input</button>
      </div>

      <Handle type="source" position={Position.Right} id="image" className="handle handle--image" />
    </div>
  );
}
