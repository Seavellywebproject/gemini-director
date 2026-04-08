import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { X, Images } from 'lucide-react';

/**
 * ImagePickerModal
 * Shows all images already generated on the canvas.
 * Lets the user pick one to use as a scene image or character reference.
 *
 * Props:
 *  - onSelect(base64)  called when user picks an image
 *  - onClose()         called when modal is dismissed
 *  - title             optional heading override
 */
export default function ImagePickerModal({ onSelect, onClose, title = 'Pick an Image from Canvas' }) {
  const getCanvasImages = useFlowStore(s => s.getCanvasImages);
  const images = getCanvasImages();

  return (
    <div className="img-picker-backdrop" onClick={onClose}>
      <div className="img-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="img-picker-header">
          <span className="img-picker-title">
            <Images size={14} /> {title}
          </span>
          <button className="img-picker-close" onClick={onClose}><X size={14} /></button>
        </div>

        {images.length === 0 ? (
          <div className="img-picker-empty">
            <Images size={28} />
            <p>No images generated on the canvas yet.</p>
            <p>Generate images using the canvas nodes first, then come back here to use them.</p>
          </div>
        ) : (
          <div className="img-picker-grid">
            {images.map(item => (
              <button
                key={item.nodeId}
                className="img-picker-item"
                onClick={() => { onSelect(item.image); onClose(); }}
                title={item.label}
              >
                <img src={item.image} alt={item.label} className="img-picker-thumb" />
                <span className="img-picker-label">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
