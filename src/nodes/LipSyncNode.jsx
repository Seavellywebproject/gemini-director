import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { Mic2, Download, Eye, AlertCircle, Loader2 } from 'lucide-react';

export default function LipSyncNode({ id, data, selected }) {
  const { nodeOutputs, nodeStatuses, nodeErrors, nodeSettings, updateNodeData, setPreviewMedia } = useFlowStore();
  const output  = nodeOutputs[id];
  const status  = nodeStatuses[id] || 'idle';
  const error   = nodeErrors?.[id];
  const settings = nodeSettings[id] || {};

  const dialogue = data.dialogue || settings.dialogue || '';

  const handleDownload = () => {
    if (!output?.video) return;
    const a = document.createElement('a');
    a.href = output.video;
    a.download = `lipsync-${id}.mp4`;
    a.click();
  };

  const isRunning = status === 'running';
  const isDone    = status === 'done';
  const isError   = status === 'error';

  return (
    <div className={`node node--lipsync ${selected ? 'node--selected' : ''}`}>
      {/* Input handles */}
      <Handle type="target" position={Position.Left} id="video" style={{ top: '35%' }} className="handle handle--video" />
      <Handle type="target" position={Position.Left} id="audio" style={{ top: '65%' }} className="handle handle--audio" title="Optional: audio input (overrides TTS)" />

      {/* Header */}
      <div className="node-header">
        <div className="node-icon node-icon--lipsync"><Mic2 size={12} /></div>
        <span className="node-title">{data.label || 'LipSync'}</span>
        <span className={`node-status-badge node-status-badge--${status}`}>
          {isRunning ? <><Loader2 size={10} className="spin" /> Syncing…</> : status === 'idle' ? 'Idle' : isDone ? '✓ Done' : isError ? '✗ Error' : status}
        </span>
      </div>

      {/* Dialogue input */}
      <div className="node-field">
        <label className="node-field-label">Dialogue / Script</label>
        <textarea
          className="node-textarea nodrag nopan"
          value={dialogue}
          onChange={e => updateNodeData(id, { dialogue: e.target.value })}
          placeholder="Type what the character should say… The AI will generate the voice and sync the lips."
          rows={3}
        />
      </div>

      {/* Error */}
      {isError && error && (
        <div className="node-error">
          <AlertCircle size={11} /> {error}
        </div>
      )}

      {/* Preview */}
      {output?.video ? (
        <div className="node-video-preview">
          <video src={output.video} className="node-preview-video" controls muted />
          <div className="node-video-actions">
            <button className="node-dl-btn" onClick={() => setPreviewMedia({ url: output.video, type: 'video' })} title="Preview fullscreen"><Eye size={13} /></button>
            <button className="node-dl-btn" onClick={handleDownload} title="Download"><Download size={13} /></button>
          </div>
        </div>
      ) : !isRunning ? (
        <div className="node-placeholder">
          <Mic2 size={22} opacity={0.2} />
          <span>Connect video + write dialogue → Run Pipeline</span>
        </div>
      ) : null}

      {/* Output handle */}
      <Handle type="source" position={Position.Right} id="video" className="handle handle--video" />
    </div>
  );
}
