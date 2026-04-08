import React from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { Volume2, Loader2, Download, Music } from 'lucide-react';

export default function GeminiSpeechNode({ id, data, selected }) {
  const { nodeOutputs, nodeStatuses } = useFlowStore();
  const output = nodeOutputs[id];
  const status = nodeStatuses[id] || 'idle';
  const modelName = data?.model?.name || 'TTS';

  return (
    <div className={`node node--gemini-speech ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="text" className="handle handle--text" />
      <div className="node-header">
        <div className="node-icon node-icon--speech"><Volume2 size={12} /></div>
        <span className="node-title">{modelName}</span>
        {status === 'loading' && <div className="status-badge status--loading"><Loader2 size={11} className="spin" /></div>}
      </div>
      <div className="node-body">
        {output?.audio ? (
          <audio controls className="node-audio-player" src={output.audio} />
        ) : status === 'loading' ? (
          <div className="node-loading"><Loader2 size={22} className="spin" /><span>Synthesizing...</span></div>
        ) : (
          <div className="node-placeholder"><Volume2 size={22} /><span>Connect Text → Run</span></div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="audio" className="handle handle--audio" />
    </div>
  );
}

export function GeminiMusicNode({ id, data, selected }) {
  const { nodeOutputs, nodeStatuses } = useFlowStore();
  const output = nodeOutputs[id];
  const status = nodeStatuses[id] || 'idle';
  const modelName = data?.model?.name || 'Lyria';

  return (
    <div className={`node node--gemini-music ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="prompt" className="handle handle--prompt" />
      <div className="node-header">
        <div className="node-icon node-icon--music"><Music size={12} /></div>
        <span className="node-title">{modelName}</span>
        {status === 'loading' && <div className="status-badge status--loading"><Loader2 size={11} className="spin" /></div>}
      </div>
      <div className="node-body">
        {output?.audio ? (
          <audio controls className="node-audio-player" src={output.audio} />
        ) : status === 'loading' ? (
          <div className="node-loading"><Loader2 size={22} className="spin" /><span>Composing...</span></div>
        ) : (
          <div className="node-placeholder"><Music size={22} /><span>Connect Prompt → Run</span></div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="audio" className="handle handle--audio" />
    </div>
  );
}
