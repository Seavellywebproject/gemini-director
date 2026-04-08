import React from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { Film, Loader2, CheckCircle2, XCircle, Download, Eye } from 'lucide-react';

export default function GeminiVideoNode({ id, data, selected }) {
  const { nodeOutputs, nodeStatuses, nodeErrors, setPreviewMedia } = useFlowStore();
  const output = nodeOutputs[id];
  const status = nodeStatuses[id] || 'idle';
  const error = nodeErrors?.[id];
  const modelName = data?.model?.name || data?.label || 'Gemini Video';

  const handleDownload = () => {
    if (!output?.video) return;
    const a = document.createElement('a');
    a.href = output.video;
    a.download = `gemini-video-${id}.mp4`;
    a.click();
  };

  return (
    <div className={`node node--gemini-video ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="prompt" className="handle handle--prompt" style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="image" className="handle handle--image" style={{ top: '65%' }} />

      <div className="node-header">
        <div className="node-icon node-icon--video"><Film size={12} /></div>
        <span className="node-title">{modelName}</span>
        {status === 'loading' && <div className="status-badge status--loading"><Loader2 size={11} className="spin" /> Generating</div>}
        {status === 'success' && <div className="status-badge status--success"><CheckCircle2 size={11} /> Done</div>}
        {status === 'error' && <div className="status-badge status--error"><XCircle size={11} /> Error</div>}
      </div>

      <div className="node-body">
        {status === 'loading' ? (
          <div className="node-loading">
            <Loader2 size={28} className="spin" />
            <span>Generating video... (may take 1-3 min)</span>
          </div>
        ) : output?.video ? (
          <div className="node-output-img-wrap">
            <video
              src={output.video}
              controls
              className="node-output-img"
              style={{ background: '#000' }}
            />
            <div className="node-dl-actions">
              <button className="node-dl-btn" onClick={() => setPreviewMedia({ url: output.video, type: 'video' })} title="Preview">
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
            <Film size={28} />
            <span>Connect Prompt + Image → Run</span>
          </div>
        )}
      </div>

      <div className="node-footer">
        <span className="char-count">{data?.model?.description || 'AI Video Generation'}</span>
      </div>

      <Handle type="source" position={Position.Right} id="video" className="handle handle--video" />
    </div>
  );
}
