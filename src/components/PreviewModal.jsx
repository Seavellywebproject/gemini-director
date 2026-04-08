import React from 'react';
import { X, Download } from 'lucide-react';
import { useFlowStore } from '../store/useFlowStore';

export default function PreviewModal() {
  const { previewMedia, clearPreviewMedia } = useFlowStore();

  if (!previewMedia) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = previewMedia.url;
    a.download = `preview_${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="preview-modal-backdrop" onClick={clearPreviewMedia}>
      <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-header">
          <span className="preview-modal-title">Preview</span>
          <div className="preview-modal-actions">
            <button className="preview-modal-btn" onClick={handleDownload} title="Download">
              <Download size={16} />
            </button>
            <button className="preview-modal-btn preview-modal-btn--close" onClick={clearPreviewMedia} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="preview-modal-content">
          {previewMedia.type === 'video' ? (
            <video src={previewMedia.url} controls autoPlay className="preview-media" />
          ) : (
            <img src={previewMedia.url} alt="Preview" className="preview-media" />
          )}
        </div>
      </div>
    </div>
  );
}
