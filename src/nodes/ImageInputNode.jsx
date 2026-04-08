import React, { useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { Upload, ImageIcon } from 'lucide-react';

export default function ImageInputNode({ id, data, selected }) {
  const { updateNodeData, setNodeOutput } = useFlowStore();
  const inputRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      updateNodeData(id, { image: base64, filename: file.name });
      setNodeOutput(id, { image: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleFile(fakeEvent);
    }
  };

  return (
    <div className={`node node--import ${selected ? 'node--selected' : ''}`}>
      <div className="node-header">
        <div className="node-icon node-icon--import"><Upload size={12} /></div>
        <span className="node-title">Image Input</span>
      </div>
      <div
        className="node-dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {data.image ? (
          <img src={data.image} alt="input" className="node-preview-img" />
        ) : (
          <div className="node-dropzone-inner">
            <ImageIcon size={22} />
            <span>Drop image or click</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
      {data.filename && (
        <div className="node-footer">
          <span className="char-count">{data.filename}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} id="image" className="handle handle--image" />
    </div>
  );
}
