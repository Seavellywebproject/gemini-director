import React from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { Monitor, Download, Eye, Clapperboard } from 'lucide-react';

export default function OutputNode({ id, data, selected }) {
  const { nodeOutputs, edges, setPreviewMedia } = useFlowStore();

  const inputEdge = edges.find((e) => e.target === id);
  const inputOutput = inputEdge ? nodeOutputs[inputEdge.source] : null;

  const handleDownload = () => {
    if (!inputOutput) return;
    const { image, video, audio, text } = inputOutput;
    if (image) { const a = document.createElement('a'); a.href = image; a.download = `output-${id}.png`; a.click(); }
    else if (video) { const a = document.createElement('a'); a.href = video; a.download = `output-${id}.mp4`; a.click(); }
    else if (audio) { const a = document.createElement('a'); a.href = audio; a.download = `output-${id}.mp3`; a.click(); }
    else if (text) { const b = new Blob([text], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `output-${id}.txt`; a.click(); }
  };

  // Fire a custom event so the storyboard panel opens and receives the output
  const handleContinueInDirector = () => {
    const payload = inputOutput || {};
    window.dispatchEvent(new CustomEvent('director:open', { detail: payload }));
  };

  const renderContent = () => {
    if (!inputOutput) return <div className="node-placeholder"><Monitor size={28} /><span>Connect a node to see output</span></div>;
    const { image, video, audio, text } = inputOutput;
    if (image) return <img src={image} alt="output" className="node-output-img" />;
    if (video) return <video src={video} controls className="node-output-img" style={{ background: '#000' }} />;
    if (audio) return <audio src={audio} controls className="node-audio-player" />;
    if (text) return <div className="node-text-content" style={{ maxHeight: 160, overflow: 'auto' }}>{text}</div>;
    return <div className="node-placeholder"><Monitor size={28} /><span>Waiting for output...</span></div>;
  };

  return (
    <div className={`node node--output ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="input" className="handle handle--any" />

      <div className="node-header">
        <div className="node-icon node-icon--output"><Monitor size={12} /></div>
        <span className="node-title">Output</span>
        {inputOutput && (
          <div className="node-dl-actions" style={{ position: 'static', display: 'flex', gap: '4px' }}>
            {(inputOutput.image || inputOutput.video) && (
              <button className="node-dl-btn" style={{ position: 'static' }} onClick={() => setPreviewMedia({ url: inputOutput.image || inputOutput.video, type: inputOutput.video ? 'video' : 'image' })} title="Preview">
                <Eye size={12} />
              </button>
            )}
            <button className="node-dl-btn" style={{ position: 'static' }} onClick={handleDownload} title="Download output">
              <Download size={12} />
            </button>
            <button
              className="node-dl-btn"
              style={{ position: 'static', color: '#818cf8' }}
              onClick={handleContinueInDirector}
              title="Continue this in the Director / Storyboard"
            >
              <Clapperboard size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="node-body" style={{ minHeight: 120 }}>
        {renderContent()}
      </div>
    </div>
  );
}
